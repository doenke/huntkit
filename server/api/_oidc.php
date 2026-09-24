<?php
declare(strict_types=1);

require_once __DIR__ . '/_kern.php';

/*
 * Anmeldung ueber OpenID Connect, Authorization Code Flow mit PKCE.
 *
 * Bewusst ohne Bibliothek und ohne eigene Pruefung der Token-Signatur: Das
 * ID-Token kommt direkt vom Token-Endpunkt des Anbieters, ueber TLS und mit
 * dem Client-Secret abgeholt. Fuer diesen Weg erlaubt OIDC Core (3.1.3.7),
 * sich auf die TLS-Pruefung zu verlassen. Aussteller, Empfaenger und Nonce
 * werden trotzdem verglichen.
 */

function oidcKonfiguration(): array
{
    $o = konfiguration()['oidc'];
    if (!$o) throw new ApiFehler(404, 'OIDC ist auf diesem Server nicht eingerichtet.');
    return $o;
}

function oidcRueckadresse(): string
{
    $o = oidcKonfiguration();
    return $o['redirect_uri'] ?: appAdresse() . 'api/oidc.php';
}

/** Die Endpunkte des Anbieters aus seiner Discovery. */
function oidcAnbieter(): array
{
    $o = oidcKonfiguration();
    [$status, $roh] = httpAnfrage('GET', rtrim($o['issuer'], '/') . '/.well-known/openid-configuration');
    $d = json_decode($roh, true);
    if ($status !== 200 || !is_array($d) || empty($d['authorization_endpoint']) || empty($d['token_endpoint'])) {
        throw new ApiFehler(502, 'Der Anmeldedienst antwortet nicht wie erwartet.');
    }
    return $d;
}

/** Schritt 1: zum Anbieter schicken. Liefert die Adresse fuer die Weiterleitung. */
function oidcStart(): string
{
    $o = oidcKonfiguration();
    $anbieter = oidcAnbieter();
    $state = zufall(24);
    $verifier = zufall(48);
    $nonce = zufall(24);
    fuehreAus('DELETE FROM ' . t('oidc_vorgaenge') . ' WHERE erstellt < ?', [jetzt() - 900_000]);
    fuehreAus(
        'INSERT INTO ' . t('oidc_vorgaenge') . ' (state, verifier, nonce, erstellt) VALUES (?, ?, ?, ?)',
        [$state, $verifier, $nonce, jetzt()]
    );
    return $anbieter['authorization_endpoint'] . (str_contains($anbieter['authorization_endpoint'], '?') ? '&' : '?')
        . http_build_query([
            'response_type' => 'code',
            'client_id' => $o['client_id'],
            'redirect_uri' => oidcRueckadresse(),
            'scope' => $o['scopes'],
            'state' => $state,
            'nonce' => $nonce,
            'code_challenge' => base64url(hash('sha256', $verifier, true)),
            'code_challenge_method' => 'S256'
        ]);
}

/**
 * Schritt 2: Der Anbieter schickt zurueck. Liefert die Adresse in die App,
 * mit einem Einmalcode im Fragment – das Fragment erreicht nie einen Server,
 * und die App tauscht den Code sofort gegen ihr Token.
 */
function oidcRueckkehr(array $get): string
{
    $o = oidcKonfiguration();
    if (!empty($get['error'])) {
        return appAdresse() . '#/werkbank?anmeldefehler=' . rawurlencode((string) ($get['error_description'] ?? $get['error']));
    }
    $state = (string) ($get['state'] ?? '');
    $vorgang = zeile('SELECT * FROM ' . t('oidc_vorgaenge') . ' WHERE state = ?', [$state]);
    fuehreAus('DELETE FROM ' . t('oidc_vorgaenge') . ' WHERE state = ?', [$state]);
    if (!$vorgang || jetzt() - (int) $vorgang['erstellt'] > 900_000) {
        throw new ApiFehler(400, 'Die Anmeldung ist abgelaufen. Bitte noch einmal versuchen.');
    }
    $anbieter = oidcAnbieter();

    $felder = [
        'grant_type' => 'authorization_code',
        'code' => (string) ($get['code'] ?? ''),
        'redirect_uri' => oidcRueckadresse(),
        'code_verifier' => $vorgang['verifier'],
        'client_id' => $o['client_id']
    ];
    $koepfe = ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'];
    if (($o['client_auth'] ?? 'post') === 'basic') {
        $koepfe[] = 'Authorization: Basic ' . base64_encode(rawurlencode($o['client_id']) . ':' . rawurlencode($o['client_secret'] ?? ''));
    } elseif (!empty($o['client_secret'])) {
        $felder['client_secret'] = $o['client_secret'];
    }
    [$status, $roh] = httpAnfrage('POST', $anbieter['token_endpoint'], $koepfe, http_build_query($felder));
    $token = json_decode($roh, true);
    if ($status !== 200 || !is_array($token) || empty($token['id_token'])) {
        error_log('huntkit oidc token: ' . $status . ' ' . substr($roh, 0, 500));
        throw new ApiFehler(502, 'Der Anmeldedienst hat die Anmeldung nicht bestätigt.');
    }

    $claims = jwtNutzlast($token['id_token']);
    $aussteller = rtrim((string) ($claims['iss'] ?? ''), '/');
    $empfaenger = (array) ($claims['aud'] ?? []);
    if ($aussteller !== rtrim($o['issuer'], '/') || !in_array($o['client_id'], $empfaenger, true)
        || ($claims['nonce'] ?? '') !== $vorgang['nonce'] || empty($claims['sub'])) {
        throw new ApiFehler(400, 'Das Anmeldetoken passt nicht zu dieser Anmeldung.');
    }

    // Name, Bild und Gruppen stehen je nach Anbieter mal im Token, mal nur bei userinfo.
    if (!empty($anbieter['userinfo_endpoint']) && !empty($token['access_token'])) {
        [$st, $info] = httpAnfrage('GET', $anbieter['userinfo_endpoint'], [
            'Authorization: Bearer ' . $token['access_token'],
            'Accept: application/json'
        ]);
        $info = json_decode($info, true);
        if ($st === 200 && is_array($info) && ($info['sub'] ?? null) === $claims['sub']) {
            $claims = array_merge($claims, $info);
        }
    }

    $benutzerId = merkeBenutzer($claims, $o);
    $code = zufall(32);
    fuehreAus(
        'INSERT INTO ' . t('einmalcodes') . ' (code_hash, benutzer_id, erstellt) VALUES (?, ?, ?)',
        [hash('sha256', $code), $benutzerId, jetzt()]
    );
    return appAdresse() . '#/werkbank?anmeldung=' . $code;
}

function jwtNutzlast(string $jwt): array
{
    $teile = explode('.', $jwt);
    if (count($teile) !== 3) throw new ApiFehler(400, 'Ungültiges Anmeldetoken.');
    $nutzlast = json_decode((string) base64_decode(strtr($teile[1], '-_', '+/'), true), true);
    if (!is_array($nutzlast)) throw new ApiFehler(400, 'Ungültiges Anmeldetoken.');
    return $nutzlast;
}

/** Ein Claim ueber einen Pfad wie „realm_access.roles“. */
function claimNachPfad(array $claims, string $pfad): mixed
{
    $wert = $claims;
    foreach (explode('.', $pfad) as $teil) {
        if (!is_array($wert) || !array_key_exists($teil, $wert)) return null;
        $wert = $wert[$teil];
    }
    return $wert;
}

/**
 * Ist jemand in der Gruppe, die Gruppen anlegen darf? Keycloak schreibt
 * Gruppen gern als Pfad („/huntkit-admin“), andere nur den Namen.
 */
function inAnlegegruppe(array $claims, array $o): bool
{
    $gruppen = claimNachPfad($claims, $o['gruppen_claim']);
    if (is_string($gruppen)) $gruppen = preg_split('/[\s,]+/', $gruppen);
    if (!is_array($gruppen)) return false;
    $ziel = $o['anlegegruppe'];
    foreach ($gruppen as $g) {
        if (!is_string($g)) continue;
        if ($g === $ziel || $g === "/$ziel" || str_ends_with($g, "/$ziel")) return true;
    }
    return false;
}

/** Benutzer anlegen oder auffrischen – die Gruppenzugehoerigkeit bei jeder Anmeldung neu. */
function merkeBenutzer(array $claims, array $o): int
{
    $sub = (string) $claims['sub'];
    $name = (string) ($claims['name'] ?? $claims['preferred_username'] ?? $claims['email'] ?? 'Unbenannt');
    $email = (string) ($claims['email'] ?? '');
    $darf = inAnlegegruppe($claims, $o) ? 1 : 0;
    $vorhanden = zeile('SELECT id, avatar_stand FROM ' . t('benutzer') . ' WHERE sub = ?', [$sub]);
    if ($vorhanden) {
        fuehreAus(
            'UPDATE ' . t('benutzer') . ' SET name = ?, email = ?, darf_anlegen = ?, zuletzt = ? WHERE id = ?',
            [mb_substr($name, 0, 255), mb_substr($email, 0, 255), $darf, jetzt(), $vorhanden['id']]
        );
        $id = (int) $vorhanden['id'];
    } else {
        fuehreAus(
            'INSERT INTO ' . t('benutzer') . ' (sub, name, email, darf_anlegen, erstellt, zuletzt) VALUES (?, ?, ?, ?, ?, ?)',
            [$sub, mb_substr($name, 0, 255), mb_substr($email, 0, 255), $darf, jetzt(), jetzt()]
        );
        $id = (int) db()->lastInsertId();
    }
    if (!empty($claims['picture']) && is_string($claims['picture'])) merkeAvatar($id, $claims['picture']);
    return $id;
}

/**
 * Das Bild wird einmal hier abgelegt und von hier ausgeliefert. Die App
 * laedt nie etwas von fremden Servern, und der Anbieter erfaehrt nicht, wer
 * gerade welche Gruppe ansieht.
 */
function merkeAvatar(int $benutzerId, string $adresse): void
{
    if (!str_starts_with($adresse, 'https://')) return;
    try {
        [$status, $bild] = httpAnfrage('GET', $adresse, [], null, 262_144);
    } catch (Throwable) {
        return;
    }
    if ($status !== 200 || $bild === '' || strlen($bild) > 262_144) return;
    $typ = bildtyp($bild);
    if ($typ === null) return;
    $stand = substr(hash('sha256', $bild), 0, 16);
    $abfrage = db()->prepare('UPDATE ' . t('benutzer') . ' SET avatar = ?, avatar_typ = ?, avatar_stand = ? WHERE id = ?');
    $abfrage->bindValue(1, $bild, PDO::PARAM_LOB);
    $abfrage->bindValue(2, $typ);
    $abfrage->bindValue(3, $stand);
    $abfrage->bindValue(4, $benutzerId, PDO::PARAM_INT);
    $abfrage->execute();
}

/** Nur echte Bilder, erkannt am Inhalt statt an einer Angabe des Absenders. */
function bildtyp(string $daten): ?string
{
    if (str_starts_with($daten, "\x89PNG\r\n\x1a\n")) return 'image/png';
    if (str_starts_with($daten, "\xff\xd8\xff")) return 'image/jpeg';
    if (str_starts_with($daten, 'GIF87a') || str_starts_with($daten, 'GIF89a')) return 'image/gif';
    if (str_starts_with($daten, 'RIFF') && substr($daten, 8, 4) === 'WEBP') return 'image/webp';
    return null;
}

/**
 * Ein HTTP-Aufruf nach draussen – mit curl, wenn es da ist, sonst ueber die
 * Stream-Funktionen von PHP. Liefert [Status, Inhalt].
 */
function httpAnfrage(string $methode, string $adresse, array $koepfe = [], ?string $koerper = null, int $hoechstens = 1_000_000): array
{
    if (isset($GLOBALS['HUNTKIT_HTTP'])) return ($GLOBALS['HUNTKIT_HTTP'])($methode, $adresse, $koepfe, $koerper);
    if (function_exists('curl_init')) {
        $c = curl_init($adresse);
        $inhalt = '';
        curl_setopt_array($c, [
            CURLOPT_CUSTOMREQUEST => $methode,
            CURLOPT_HTTPHEADER => $koepfe,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
            CURLOPT_WRITEFUNCTION => function ($_, string $stueck) use (&$inhalt, $hoechstens) {
                $inhalt .= $stueck;
                return strlen($inhalt) > $hoechstens ? 0 : strlen($stueck);
            }
        ]);
        if ($koerper !== null) curl_setopt($c, CURLOPT_POSTFIELDS, $koerper);
        curl_exec($c);
        $status = (int) curl_getinfo($c, CURLINFO_RESPONSE_CODE);
        return [$status, $inhalt];
    }
    $kontext = stream_context_create(['http' => [
        'method' => $methode,
        'header' => implode("\r\n", $koepfe),
        'content' => $koerper ?? '',
        'timeout' => 10,
        'ignore_errors' => true
    ]]);
    $inhalt = @file_get_contents($adresse, false, $kontext, 0, $hoechstens + 1);
    $status = 0;
    foreach ($http_response_header ?? [] as $kopf) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $kopf, $treffer)) $status = (int) $treffer[1];
    }
    return [$status, $inhalt === false ? '' : $inhalt];
}
