<?php
declare(strict_types=1);

/*
 * Durchlauf durch die Server-Logik gegen SQLite im Speicher – ohne Webserver.
 * Aufruf: php server/tests/test.php
 */

require __DIR__ . '/../api/_aktionen.php';
require __DIR__ . '/../api/_oidc.php';

$GLOBALS['HUNTKIT_STILL'] = true;
$GLOBALS['HUNTKIT_KONFIGURATION'] = mitStandards([
    'db' => ['dsn' => 'sqlite::memory:'],
    'oidc' => ['issuer' => 'https://idp.test', 'client_id' => 'huntkit', 'client_secret' => 's']
]);

$fehlschlaege = 0;
function pruefe(bool $bedingung, string $was): void
{
    global $fehlschlaege;
    echo ($bedingung ? '  ok   ' : '  FEHL ') . $was . "\n";
    if (!$bedingung) $fehlschlaege++;
}

function als(?string $token): void
{
    $GLOBALS['HUNTKIT_TOKEN'] = $token;
}

/** Erwartet einen ApiFehler mit Status. */
function scheitert(int $status, callable $f): bool
{
    try {
        $f();
    } catch (ApiFehler $e) {
        return $e->status === $status;
    }
    return false;
}

function oidcBenutzer(string $sub, string $name, array $gruppen, ?string $bild = null): string
{
    $claims = ['sub' => $sub, 'name' => $name, 'email' => "$sub@test", 'groups' => $gruppen];
    if ($bild) $claims['picture'] = $bild;
    $id = merkeBenutzer($claims, konfiguration()['oidc']);
    return neueSitzung($id, null);
}

echo "OIDC-Gruppen\n";
$o = konfiguration()['oidc'];
pruefe(inAnlegegruppe(['groups' => ['a', 'huntkit-admin']], $o), 'Name in der Liste');
pruefe(inAnlegegruppe(['groups' => ['/team/huntkit-admin']], $o), 'Keycloak-Pfad');
pruefe(!inAnlegegruppe(['groups' => ['huntkit-admins']], $o), 'kein Teilwort');
pruefe(!inAnlegegruppe([], $o), 'ohne Claim');
pruefe(inAnlegegruppe(['realm_access' => ['roles' => ['huntkit-admin']]], ['gruppen_claim' => 'realm_access.roles'] + $o), 'Claim als Pfad');

// Avatar: Der Download wird hier durch ein festes PNG ersetzt.
$png = "\x89PNG\r\n\x1a\n" . str_repeat("\0", 20);
$GLOBALS['HUNTKIT_HTTP'] = fn ($m, $url) => $url === 'https://bild.test/anna.png' ? [200, $png] : [404, ''];

$anna = oidcBenutzer('anna', 'Anna', ['huntkit-admin'], 'https://bild.test/anna.png');
$bernd = oidcBenutzer('bernd', 'Bernd', ['andere']);

echo "Konto\n";
als($anna);
$konto = kontoAnfrage('GET', [], []);
pruefe($konto['oidc'] === true && $konto['ich']['name'] === 'Anna', 'Anna ist angemeldet');
pruefe($konto['ich']['darfAnlegen'] === true, 'Anna darf anlegen');
pruefe(str_starts_with((string) $konto['ich']['avatar'], 'avatar.php?id='), 'Anna hat einen Avatar');
als($bernd);
pruefe(kontoAnfrage('GET', [], [])['ich']['darfAnlegen'] === false, 'Bernd darf nicht anlegen');
als(null);
pruefe(kontoAnfrage('GET', [], [])['ich'] === null, 'ohne Token niemand');

echo "Gruppe anlegen\n";
als($bernd);
pruefe(scheitert(403, fn () => gruppenAnfrage('POST', [], ['aktion' => 'anlegen', 'name' => 'X'])), 'Bernd bekommt 403');
als($anna);
$gruppe = gruppenAnfrage('POST', [], ['aktion' => 'anlegen', 'name' => 'Nachtschicht']);
$gid = $gruppe['id'];
pruefe($gruppe['rolle'] === 'admin', 'Anna ist Admin');
pruefe(strlen($gruppe['einladung']) >= 20, 'Einladung vorhanden');

echo "Einladung\n";
als(null);
$vorschau = einladungAnfrage('GET', ['e' => $gruppe['einladung']], []);
pruefe($vorschau['gruppe']['name'] === 'Nachtschicht', 'Vorschau zeigt den Namen');
$gast = einladungAnfrage('POST', [], ['e' => $gruppe['einladung'], 'name' => 'Carla']);
pruefe(is_string($gast['token']) && $gast['gruppe']['rolle'] === 'gast', 'Carla tritt als Gast bei');
$carla = $gast['token'];
als($carla);
$sicht = gruppenAnfrage('GET', ['gruppe' => $gid], []);
pruefe($sicht['einladung'] === $gruppe['einladung'], 'Gast sieht den Einladungslink');
pruefe(scheitert(403, fn () => gruppenAnfrage('POST', [], ['aktion' => 'einladung_erneuern', 'gruppe' => $gid])), 'Gast darf ihn nicht erneuern');
pruefe(scheitert(403, fn () => gruppenAnfrage('GET', ['gruppe' => $gid, 'bekannte' => 1], [])), 'Gast sieht keine Benutzerliste');
pruefe(scheitert(403, fn () => gruppenAnfrage('POST', [], ['aktion' => 'anlegen', 'name' => 'X'])), 'Gast darf nicht anlegen');

echo "Mitglieder\n";
als($anna);
$bekannte = gruppenAnfrage('GET', ['gruppe' => $gid, 'bekannte' => 1], [])['benutzer'];
$berndId = array_values(array_filter($bekannte, fn ($b) => $b['name'] === 'Bernd'))[0]['id'];
$nach = gruppenAnfrage('POST', [], ['aktion' => 'hinzufuegen', 'gruppe' => $gid, 'benutzer' => $berndId]);
pruefe(count($nach['mitglieder']) === 3, 'Bernd hinzugefügt, drei Mitglieder');
als($bernd);
pruefe(count(gruppenAnfrage('GET', [], [])['gruppen']) === 1, 'Bernd sieht die Gruppe');

echo "Abgleich\n";
als($carla);
$a = abgleichAnfrage('POST', [], ['gruppe' => $gid, 'aenderungen' => [
    ['op' => 'o1', 'werkbank' => 'w1', 'schluessel' => 'name', 'wert' => 'Station 1'],
    ['op' => 'o2', 'werkbank' => 'w1', 'schluessel' => 'z/r1/s1', 'wert' => '... --- ...']
]]);
pruefe($a['seq'] === 2 && $a['bestaetigt'] === [['op' => 'o1', 'seq' => 1], ['op' => 'o2', 'seq' => 2]], 'zwei Änderungen, Nummer 2');
$b = abgleichAnfrage('POST', [], ['gruppe' => $gid, 'aenderungen' => [
    ['op' => 'o2', 'werkbank' => 'w1', 'schluessel' => 'z/r1/s1', 'wert' => '... --- ...']
]]);
pruefe($b['seq'] === 2 && $b['bestaetigt'] === [['op' => 'o2', 'seq' => 2]], 'doppelt gesendet zählt einmal');
als($bernd);
abgleichAnfrage('POST', [], ['gruppe' => $gid, 'aenderungen' => [
    ['op' => 'o3', 'werkbank' => 'w1', 'schluessel' => 'z/r1/s1', 'wert' => 'SOS']
]]);
$alles = abgleichAnfrage('GET', ['gruppe' => $gid, 'seit' => 0], []);
pruefe($alles['seq'] === 3 && count($alles['aenderungen']) === 2, 'voller Stand: zwei Schlüssel');
$zelle = array_values(array_filter($alles['aenderungen'], fn ($x) => $x['schluessel'] === 'z/r1/s1'))[0];
pruefe($zelle['wert'] === 'SOS' && $zelle['seq'] === 3, 'die letzte Änderung gewinnt');
$neu = abgleichAnfrage('GET', ['gruppe' => $gid, 'seit' => 2], []);
pruefe(count($neu['aenderungen']) === 1, 'seit 2 nur eine');
pruefe(scheitert(403, fn () => abgleichAnfrage('POST', [], ['gruppe' => $gid, 'aenderungen' => [
    ['op' => 'o4', 'werkbank' => 'w1', 'schluessel' => 'geloescht', 'wert' => true]
]])), 'nur Admins löschen Werkbänke');
pruefe(scheitert(400, fn () => abgleichAnfrage('POST', [], ['gruppe' => $gid, 'aenderungen' => [
    ['op' => 'o5', 'werkbank' => 'w1', 'schluessel' => '../x', 'wert' => 1]
]])), 'ungültiger Schlüssel');

echo "Protokoll\n";
$p = protokollAnfrage('GET', ['gruppe' => $gid, 'werkbank' => 'w1', 'schluessel' => 'z/r1/s1'], [])['eintraege'];
pruefe(count($p) === 2, 'zwei Einträge für die Zelle');
pruefe($p[0]['neu'] === 'SOS' && $p[0]['alt'] === '... --- ...', 'alt und neu stehen drin');
pruefe($p[0]['von'] !== $p[1]['von'], 'von zwei verschiedenen Leuten');

echo "Fremde Gruppe\n";
als($anna);
$zweite = gruppenAnfrage('POST', [], ['aktion' => 'anlegen', 'name' => 'Andere']);
pruefe(scheitert(403, fn () => abgleichAnfrage('POST', [], ['gruppe' => $zweite['id'], 'aenderungen' => [
    ['op' => 'o6', 'werkbank' => 'w1', 'schluessel' => 'name', 'wert' => 'gekapert']
]])), 'fremde Werkbank-Kennung wird abgewiesen');
als($carla);
pruefe(scheitert(403, fn () => abgleichAnfrage('GET', ['gruppe' => $zweite['id']], [])), 'Gast sieht andere Gruppe nicht');

echo "Entfernen\n";
als($anna);
$carlaId = array_values(array_filter($nach['mitglieder'], fn ($m) => $m['name'] === 'Carla'))[0]['id'];
gruppenAnfrage('POST', [], ['aktion' => 'entfernen', 'gruppe' => $gid, 'mitglied' => $carlaId]);
als($carla);
pruefe(scheitert(401, fn () => abgleichAnfrage('GET', ['gruppe' => $gid], [])), 'entfernter Gast ist abgemeldet');
als($anna);
$details = gruppenAnfrage('GET', ['gruppe' => $gid], []);
pruefe(count($details['ehemalige']) === 1, 'Carla steht bei den Ehemaligen');
pruefe(scheitert(400, fn () => gruppenAnfrage('POST', [], ['aktion' => 'verlassen', 'gruppe' => $gid])), 'einziger Admin kann nicht gehen');

echo "Einmalcode\n";
fuehreAus('INSERT INTO ' . t('einmalcodes') . ' (code_hash, benutzer_id, erstellt) VALUES (?, 1, ?)', [hash('sha256', 'abc'), jetzt()]);
als(null);
$e = kontoAnfrage('POST', [], ['aktion' => 'einloesen', 'code' => 'abc']);
pruefe($e['ich']['name'] === 'Anna', 'Code gibt Annas Sitzung');
pruefe(scheitert(400, fn () => kontoAnfrage('POST', [], ['aktion' => 'einloesen', 'code' => 'abc'])), 'nur einmal einlösbar');

echo "Bildtyp\n";
pruefe(bildtyp($png) === 'image/png', 'PNG erkannt');
pruefe(bildtyp('<svg onload=alert(1)>') === null, 'SVG abgelehnt');

echo "Status\n";
$GLOBALS['HUNTKIT_HTTP'] = fn () => [200, json_encode(['authorization_endpoint' => 'https://idp.test/a', 'token_endpoint' => 'https://idp.test/t'])];
$st = statusAnfrage();
pruefe($st['datenbank']['verbunden'] === true && $st['datenbank']['schema'] === 1, 'Datenbank verbunden, Schema 1');
pruefe(count(array_filter($st['datenbank']['tabellen'], fn ($t) => $t['da'])) === 9, 'alle neun Tabellen da');
pruefe($st['oidc']['erreichbar'] === true, 'Anmeldedienst erreichbar');
pruefe(!str_contains(json_encode($st), 'geheim') && !str_contains(json_encode($st), '"s"'), 'keine Geheimnisse im Status');

echo $fehlschlaege === 0 ? "\nAlles gut.\n" : "\n$fehlschlaege fehlgeschlagen.\n";
exit($fehlschlaege === 0 ? 0 : 1);
