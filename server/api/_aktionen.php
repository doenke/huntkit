<?php
declare(strict_types=1);

require_once __DIR__ . '/_kern.php';

/*
 * Die eigentlichen Anfragen, getrennt von HTTP: Jede Funktion bekommt
 * Methode, Adressparameter und Koerper und liefert ein Array. So lassen sie
 * sich ohne Webserver testen.
 */

/* ---------- Konto ---------- */

function kontoAnfrage(string $methode, array $get, array $post): array
{
    if ($methode === 'GET') {
        $k = konfiguration();
        $s = sitzung();
        return [
            'oidc' => $k['oidc'] !== null,
            'echtzeit' => $k['echtzeit'],
            'ich' => $s ? ich($s) : null
        ];
    }
    $aktion = $post['aktion'] ?? '';
    if ($aktion === 'einloesen') {
        // Der Einmalcode kommt aus der Weiterleitung nach der OIDC-Anmeldung.
        $code = text($post['code'] ?? null, 200, 'Code');
        $hash = hash('sha256', $code);
        $eintrag = zeile('SELECT * FROM ' . t('einmalcodes') . ' WHERE code_hash = ?', [$hash]);
        fuehreAus('DELETE FROM ' . t('einmalcodes') . ' WHERE code_hash = ? OR erstellt < ?', [$hash, jetzt() - 600_000]);
        if (!$eintrag || jetzt() - (int) $eintrag['erstellt'] > 300_000) {
            throw new ApiFehler(400, 'Der Anmeldecode ist abgelaufen. Bitte noch einmal anmelden.');
        }
        $token = neueSitzung((int) $eintrag['benutzer_id'], null);
        $GLOBALS['HUNTKIT_TOKEN'] = $token;
        return ['token' => $token, 'ich' => ich(braucheSitzung())];
    }
    if ($aktion === 'abmelden') {
        $token = anfrageToken();
        if ($token !== null) fuehreAus('DELETE FROM ' . t('sitzungen') . ' WHERE token_hash = ?', [hash('sha256', $token)]);
        return ['ok' => true];
    }
    throw new ApiFehler(400, 'Unbekannte Aktion.');
}

/* ---------- Gruppen ---------- */

function gruppeLesen(string $id): array
{
    $g = zeile('SELECT * FROM ' . t('gruppen') . ' WHERE id = ?', [$id]);
    if (!$g) throw new ApiFehler(404, 'Diese Gruppe gibt es nicht.');
    return $g;
}

function mitgliederListe(string $gruppe): array
{
    $liste = zeilen(
        'SELECT m.id, m.anzeigename, m.rolle, m.benutzer_id, b.name, b.avatar_stand
         FROM ' . t('mitglieder') . ' m LEFT JOIN ' . t('benutzer') . ' b ON b.id = m.benutzer_id
         WHERE m.gruppe = ? AND m.entfernt = 0 ORDER BY m.id',
        [$gruppe]
    );
    return array_map(fn ($m) => [
        'id' => (int) $m['id'],
        'name' => $m['benutzer_id'] !== null ? ($m['name'] ?: 'Unbenannt') : $m['anzeigename'],
        'art' => $m['benutzer_id'] !== null ? 'oidc' : 'gast',
        'rolle' => $m['rolle'],
        'avatar' => $m['benutzer_id'] !== null
            ? avatarAdresse(['id' => $m['benutzer_id'], 'avatar_stand' => $m['avatar_stand']])
            : null
    ], $liste);
}

/**
 * Alle, die je in der Gruppe waren – auch Entfernte. Das Protokoll soll
 * weiterhin sagen koennen, wer eine Zelle geaendert hat.
 */
function ehemalige(string $gruppe): array
{
    $liste = zeilen(
        'SELECT m.id, m.anzeigename, m.benutzer_id, b.name
         FROM ' . t('mitglieder') . ' m LEFT JOIN ' . t('benutzer') . ' b ON b.id = m.benutzer_id
         WHERE m.gruppe = ? AND m.entfernt = 1',
        [$gruppe]
    );
    return array_map(fn ($m) => [
        'id' => (int) $m['id'],
        'name' => $m['benutzer_id'] !== null ? ($m['name'] ?: 'Unbenannt') : $m['anzeigename']
    ], $liste);
}

function gruppeDetails(string $id, array $mitglied): array
{
    $g = gruppeLesen($id);
    return [
        'id' => $g['id'],
        'name' => $g['name'],
        'einladung' => $g['einladung'],
        'rolle' => $mitglied['rolle'],
        'ich' => (int) $mitglied['id'],
        'mitglieder' => mitgliederListe($id),
        'ehemalige' => ehemalige($id)
    ];
}

function gruppenAnfrage(string $methode, array $get, array $post): array
{
    if ($methode === 'GET') {
        if (!empty($get['gruppe'])) {
            if (!empty($get['bekannte'])) {
                braucheAdmin($get['gruppe']);
                $liste = zeilen('SELECT id, name, email, avatar_stand FROM ' . t('benutzer') . ' ORDER BY name');
                return ['benutzer' => array_map(fn ($b) => [
                    'id' => (int) $b['id'],
                    'name' => $b['name'],
                    'email' => $b['email'],
                    'avatar' => avatarAdresse($b)
                ], $liste)];
            }
            return gruppeDetails($get['gruppe'], braucheMitglied($get['gruppe']));
        }
        $s = braucheSitzung();
        $liste = $s['benutzer_id'] !== null
            ? zeilen(
                'SELECT g.id, g.name, m.rolle FROM ' . t('mitglieder') . ' m JOIN ' . t('gruppen') . ' g ON g.id = m.gruppe
                 WHERE m.benutzer_id = ? AND m.entfernt = 0 ORDER BY g.name',
                [$s['benutzer_id']]
            )
            : zeilen(
                'SELECT g.id, g.name, m.rolle FROM ' . t('mitglieder') . ' m JOIN ' . t('gruppen') . ' g ON g.id = m.gruppe
                 WHERE m.id = ? AND m.entfernt = 0',
                [$s['mitglied_id']]
            );
        return ['gruppen' => $liste];
    }

    $aktion = $post['aktion'] ?? '';
    switch ($aktion) {
        case 'anlegen':
            $s = braucheSitzung();
            $b = $s['benutzer_id'] !== null
                ? zeile('SELECT * FROM ' . t('benutzer') . ' WHERE id = ?', [$s['benutzer_id']])
                : null;
            if (!$b || !$b['darf_anlegen']) {
                $gruppe = konfiguration()['oidc']['anlegegruppe'] ?? 'huntkit-admin';
                throw new ApiFehler(403, "Gruppen anlegen darf nur, wer in der Gruppe „{$gruppe}“ ist.");
            }
            $name = text($post['name'] ?? null, 200, 'Name');
            $id = kennung();
            return inTransaktion(function () use ($id, $name, $b) {
                fuehreAus(
                    'INSERT INTO ' . t('gruppen') . ' (id, name, einladung, zaehler, erstellt) VALUES (?, ?, ?, 0, ?)',
                    [$id, $name, zufall(24), jetzt()]
                );
                fuehreAus(
                    'INSERT INTO ' . t('mitglieder') . " (gruppe, benutzer_id, rolle, erstellt) VALUES (?, ?, 'admin', ?)",
                    [$id, $b['id'], jetzt()]
                );
                $m = zeile('SELECT * FROM ' . t('mitglieder') . ' WHERE gruppe = ? AND benutzer_id = ?', [$id, $b['id']]);
                return gruppeDetails($id, $m);
            });

        case 'umbenennen':
            $m = braucheAdmin($post['gruppe'] ?? null);
            fuehreAus('UPDATE ' . t('gruppen') . ' SET name = ? WHERE id = ?', [text($post['name'] ?? null, 200, 'Name'), $m['gruppe']]);
            return gruppeDetails($m['gruppe'], $m);

        case 'hinzufuegen':
            $m = braucheAdmin($post['gruppe'] ?? null);
            $benutzer = zeile('SELECT * FROM ' . t('benutzer') . ' WHERE id = ?', [(int) ($post['benutzer'] ?? 0)]);
            if (!$benutzer) throw new ApiFehler(404, 'Diesen Benutzer gibt es nicht.');
            $vorhanden = zeile(
                'SELECT * FROM ' . t('mitglieder') . ' WHERE gruppe = ? AND benutzer_id = ?',
                [$m['gruppe'], $benutzer['id']]
            );
            if ($vorhanden) {
                fuehreAus('UPDATE ' . t('mitglieder') . ' SET entfernt = 0 WHERE id = ?', [$vorhanden['id']]);
            } else {
                fuehreAus(
                    'INSERT INTO ' . t('mitglieder') . " (gruppe, benutzer_id, rolle, erstellt) VALUES (?, ?, 'mitglied', ?)",
                    [$m['gruppe'], $benutzer['id'], jetzt()]
                );
            }
            return gruppeDetails($m['gruppe'], $m);

        case 'entfernen':
            $m = braucheAdmin($post['gruppe'] ?? null);
            $ziel = (int) ($post['mitglied'] ?? 0);
            if ($ziel === (int) $m['id']) throw new ApiFehler(400, 'Sich selbst entfernt man mit „Gruppe verlassen“.');
            fuehreAus('UPDATE ' . t('mitglieder') . ' SET entfernt = 1 WHERE id = ? AND gruppe = ?', [$ziel, $m['gruppe']]);
            // Gaeste haben nur diese eine Mitgliedschaft – ihre Sitzungen sind damit wertlos.
            fuehreAus('DELETE FROM ' . t('sitzungen') . ' WHERE mitglied_id = ?', [$ziel]);
            return gruppeDetails($m['gruppe'], $m);

        case 'rolle':
            $m = braucheAdmin($post['gruppe'] ?? null);
            $rolle = ($post['rolle'] ?? '') === 'admin' ? 'admin' : 'mitglied';
            $ziel = zeile(
                'SELECT * FROM ' . t('mitglieder') . ' WHERE id = ? AND gruppe = ? AND entfernt = 0',
                [(int) ($post['mitglied'] ?? 0), $m['gruppe']]
            );
            if (!$ziel) throw new ApiFehler(404, 'Dieses Mitglied gibt es nicht.');
            if ($ziel['benutzer_id'] === null && $rolle === 'admin') {
                throw new ApiFehler(400, 'Gäste können keine Admins werden.');
            }
            if ((int) $ziel['id'] === (int) $m['id'] && $rolle !== 'admin' && anzahlAdmins($m['gruppe']) < 2) {
                throw new ApiFehler(400, 'Die Gruppe braucht mindestens einen Admin.');
            }
            fuehreAus('UPDATE ' . t('mitglieder') . ' SET rolle = ? WHERE id = ?', [$rolle, $ziel['id']]);
            return gruppeDetails($m['gruppe'], zeile('SELECT * FROM ' . t('mitglieder') . ' WHERE id = ?', [$m['id']]));

        case 'einladung_erneuern':
            $m = braucheAdmin($post['gruppe'] ?? null);
            fuehreAus('UPDATE ' . t('gruppen') . ' SET einladung = ? WHERE id = ?', [zufall(24), $m['gruppe']]);
            return gruppeDetails($m['gruppe'], $m);

        case 'verlassen':
            $m = braucheMitglied($post['gruppe'] ?? null);
            if ($m['rolle'] === 'admin' && anzahlAdmins($m['gruppe']) < 2 && anzahlMitglieder($m['gruppe']) > 1) {
                throw new ApiFehler(400, 'Du bist der einzige Admin. Mach vorher jemand anderen zum Admin.');
            }
            fuehreAus('UPDATE ' . t('mitglieder') . ' SET entfernt = 1 WHERE id = ?', [$m['id']]);
            if ($m['benutzer_id'] === null) fuehreAus('DELETE FROM ' . t('sitzungen') . ' WHERE mitglied_id = ?', [$m['id']]);
            return ['ok' => true];
    }
    throw new ApiFehler(400, 'Unbekannte Aktion.');
}

function anzahlAdmins(string $gruppe): int
{
    return (int) (zeile(
        'SELECT COUNT(*) AS n FROM ' . t('mitglieder') . " WHERE gruppe = ? AND rolle = 'admin' AND entfernt = 0",
        [$gruppe]
    )['n'] ?? 0);
}

function anzahlMitglieder(string $gruppe): int
{
    return (int) (zeile('SELECT COUNT(*) AS n FROM ' . t('mitglieder') . ' WHERE gruppe = ? AND entfernt = 0', [$gruppe])['n'] ?? 0);
}

/* ---------- Einladung ---------- */

function einladungAnfrage(string $methode, array $get, array $post): array
{
    $code = $methode === 'GET' ? ($get['e'] ?? null) : ($post['e'] ?? null);
    if (!is_string($code) || $code === '') throw new ApiFehler(400, 'Einladung fehlt.');
    $g = zeile('SELECT * FROM ' . t('gruppen') . ' WHERE einladung = ?', [$code]);
    if (!$g) throw new ApiFehler(404, 'Diese Einladung gilt nicht mehr. Frag nach einem neuen Link.');

    if ($methode === 'GET') {
        $s = sitzung();
        return [
            'gruppe' => ['id' => $g['id'], 'name' => $g['name']],
            'schonMitglied' => $s && mitgliedschaft($s, $g['id']) !== null
        ];
    }

    // Wer mit OIDC angemeldet ist, tritt als er selbst bei, nicht als Gast.
    $s = sitzung();
    if ($s && $s['benutzer_id'] !== null) {
        $vorhanden = zeile(
            'SELECT * FROM ' . t('mitglieder') . ' WHERE gruppe = ? AND benutzer_id = ?',
            [$g['id'], $s['benutzer_id']]
        );
        if ($vorhanden) {
            fuehreAus('UPDATE ' . t('mitglieder') . ' SET entfernt = 0 WHERE id = ?', [$vorhanden['id']]);
        } else {
            fuehreAus(
                'INSERT INTO ' . t('mitglieder') . " (gruppe, benutzer_id, rolle, erstellt) VALUES (?, ?, 'mitglied', ?)",
                [$g['id'], $s['benutzer_id'], jetzt()]
            );
        }
        return ['token' => null, 'gruppe' => gruppeDetails($g['id'], mitgliedschaft($s, $g['id']))];
    }

    $name = text($post['name'] ?? null, 100, 'Name');
    return inTransaktion(function () use ($g, $name) {
        fuehreAus(
            'INSERT INTO ' . t('mitglieder') . " (gruppe, anzeigename, rolle, erstellt) VALUES (?, ?, 'gast', ?)",
            [$g['id'], $name, jetzt()]
        );
        $id = (int) db()->lastInsertId();
        $token = neueSitzung(null, $id);
        $m = zeile('SELECT * FROM ' . t('mitglieder') . ' WHERE id = ?', [$id]);
        return ['token' => $token, 'gruppe' => gruppeDetails($g['id'], $m)];
    });
}

/* ---------- Abgleich ---------- */

const MUSTER_KENNUNG = '/^[A-Za-z0-9_-]{1,64}$/';
const MUSTER_SCHLUESSEL = '/^[A-Za-z0-9_-]{1,64}(\/[A-Za-z0-9_-]{1,64}){0,3}$/';

function abgleichAnfrage(string $methode, array $get, array $post): array
{
    if ($methode === 'GET') {
        $m = braucheMitglied($get['gruppe'] ?? null);
        $seit = max(0, (int) ($get['seit'] ?? 0));
        $grenze = 2000;
        // Erst den Zaehler, dann die Zeilen bis dahin. Andersherum koennte
        // zwischen beiden Abfragen jemand schreiben: Der Zaehler waere dann
        // schon weiter als die gelieferten Zeilen, und das Geraet uebersprange
        // eine Aenderung fuer immer.
        $bis = (int) gruppeLesen($m['gruppe'])['zaehler'];
        $liste = zeilen(
            'SELECT werkbank, schluessel, wert, seq, mitglied_id, zeit FROM ' . t('stand') . '
             WHERE gruppe = ? AND seq > ? AND seq <= ? ORDER BY seq LIMIT ' . ($grenze + 1),
            [$m['gruppe'], $seit, $bis]
        );
        $weiter = count($liste) > $grenze;
        if ($weiter) array_pop($liste);
        return [
            'seq' => $weiter ? (int) end($liste)['seq'] : max($seit, $bis),
            'weiter' => $weiter,
            'aenderungen' => array_map(fn ($z) => [
                'werkbank' => $z['werkbank'],
                'schluessel' => $z['schluessel'],
                'wert' => $z['wert'] === null ? null : json_decode($z['wert'], true),
                'seq' => (int) $z['seq'],
                'von' => (int) $z['mitglied_id'],
                'zeit' => (int) $z['zeit']
            ], $liste)
        ];
    }

    $m = braucheMitglied($post['gruppe'] ?? null);
    $liste = $post['aenderungen'] ?? null;
    if (!is_array($liste) || count($liste) > 500) throw new ApiFehler(400, 'Änderungen fehlen oder sind zu viele.');
    $geprueft = [];
    foreach ($liste as $a) {
        if (!is_array($a)) throw new ApiFehler(400, 'Ungültige Änderung.');
        $op = $a['op'] ?? '';
        $werkbank = $a['werkbank'] ?? '';
        $schluessel = $a['schluessel'] ?? '';
        if (!is_string($op) || !preg_match(MUSTER_KENNUNG, $op)) throw new ApiFehler(400, 'Ungültige Änderungskennung.');
        if (!is_string($werkbank) || !preg_match(MUSTER_KENNUNG, $werkbank)) throw new ApiFehler(400, 'Ungültige Werkbank.');
        if (!is_string($schluessel) || !preg_match(MUSTER_SCHLUESSEL, $schluessel)) throw new ApiFehler(400, 'Ungültiger Schlüssel.');
        if ($schluessel === 'geloescht' && $m['rolle'] !== 'admin') {
            throw new ApiFehler(403, 'Werkbänke der Gruppe löschen dürfen nur Admins.');
        }
        $wert = array_key_exists('wert', $a) && $a['wert'] !== null
            ? json_encode($a['wert'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            : null;
        if ($wert !== null && strlen($wert) > 65_536) throw new ApiFehler(400, 'Ein Wert ist zu groß.');
        $geprueft[] = [$op, $werkbank, $schluessel, $wert];
    }

    return inTransaktion(function () use ($m, $geprueft) {
        $gruppe = $m['gruppe'];
        // Die Gruppe sperren: Nummern werden in genau der Reihenfolge sichtbar,
        // in der sie vergeben werden. Sonst koennte jemand, der gerade liest,
        // Nummer 11 sehen, bevor 10 festgeschrieben ist – und 10 nie bekommen.
        $sperre = istSqlite()
            ? 'SELECT zaehler FROM ' . t('gruppen') . ' WHERE id = ?'
            : 'SELECT zaehler FROM ' . t('gruppen') . ' WHERE id = ? FOR UPDATE';
        $zaehler = (int) (zeile($sperre, [$gruppe])['zaehler'] ?? 0);
        $bestaetigt = [];
        $fremd = [];
        foreach ($geprueft as [$op, $werkbank, $schluessel, $wert]) {
            $schonDa = zeile('SELECT seq FROM ' . t('aenderungen') . ' WHERE op_id = ?', [$op]);
            if ($schonDa) {
                $bestaetigt[] = ['op' => $op, 'seq' => (int) $schonDa['seq']];
                continue;
            }
            if (!array_key_exists($werkbank, $fremd)) {
                $besitzer = zeile('SELECT gruppe FROM ' . t('stand') . ' WHERE werkbank = ? LIMIT 1', [$werkbank]);
                $fremd[$werkbank] = $besitzer !== null && $besitzer['gruppe'] !== $gruppe;
            }
            if ($fremd[$werkbank]) throw new ApiFehler(403, 'Diese Werkbank gehört zu einer anderen Gruppe.');
            $alt = zeile('SELECT wert FROM ' . t('stand') . ' WHERE werkbank = ? AND schluessel = ?', [$werkbank, $schluessel]);
            $zaehler++;
            $zeit = jetzt();
            fuehreAus(
                'INSERT INTO ' . t('aenderungen') . ' (op_id, gruppe, werkbank, schluessel, alt, neu, seq, mitglied_id, zeit)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$op, $gruppe, $werkbank, $schluessel, $alt['wert'] ?? null, $wert, $zaehler, $m['id'], $zeit]
            );
            $upsert = istSqlite()
                ? ' ON CONFLICT(werkbank, schluessel) DO UPDATE SET wert = excluded.wert, seq = excluded.seq,
                    mitglied_id = excluded.mitglied_id, zeit = excluded.zeit'
                : ' ON DUPLICATE KEY UPDATE wert = VALUES(wert), seq = VALUES(seq),
                    mitglied_id = VALUES(mitglied_id), zeit = VALUES(zeit)';
            fuehreAus(
                'INSERT INTO ' . t('stand') . ' (gruppe, werkbank, schluessel, wert, seq, mitglied_id, zeit)
                 VALUES (?, ?, ?, ?, ?, ?, ?)' . $upsert,
                [$gruppe, $werkbank, $schluessel, $wert, $zaehler, $m['id'], $zeit]
            );
            $bestaetigt[] = ['op' => $op, 'seq' => $zaehler];
        }
        fuehreAus('UPDATE ' . t('gruppen') . ' SET zaehler = ? WHERE id = ?', [$zaehler, $gruppe]);
        return ['bestaetigt' => $bestaetigt, 'seq' => $zaehler];
    });
}

/* ---------- Protokoll ---------- */

function protokollAnfrage(string $methode, array $get, array $post): array
{
    $m = braucheMitglied($get['gruppe'] ?? null);
    $werkbank = $get['werkbank'] ?? '';
    if (!is_string($werkbank) || !preg_match(MUSTER_KENNUNG, $werkbank)) throw new ApiFehler(400, 'Werkbank fehlt.');
    $bedingung = 'gruppe = ? AND werkbank = ?';
    $werte = [$m['gruppe'], $werkbank];
    $schluessel = $get['schluessel'] ?? '';
    if (is_string($schluessel) && $schluessel !== '') {
        $bedingung .= ' AND schluessel = ?';
        $werte[] = $schluessel;
    }
    $vor = (int) ($get['vor'] ?? 0);
    if ($vor > 0) {
        $bedingung .= ' AND seq < ?';
        $werte[] = $vor;
    }
    $grenze = min(200, max(1, (int) ($get['anzahl'] ?? 100)));
    $liste = zeilen(
        'SELECT schluessel, alt, neu, seq, mitglied_id, zeit FROM ' . t('aenderungen') . "
         WHERE $bedingung ORDER BY seq DESC LIMIT $grenze",
        $werte
    );
    return ['eintraege' => array_map(fn ($z) => [
        'schluessel' => $z['schluessel'],
        'alt' => $z['alt'] === null ? null : json_decode($z['alt'], true),
        'neu' => $z['neu'] === null ? null : json_decode($z['neu'], true),
        'seq' => (int) $z['seq'],
        'von' => (int) $z['mitglied_id'],
        'zeit' => (int) $z['zeit']
    ], $liste)];
}
