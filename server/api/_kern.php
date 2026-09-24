<?php
declare(strict_types=1);

/*
 * Gemeinsamer Unterbau aller Endpunkte: Konfiguration, Datenbank, Anmeldung,
 * JSON hin und zurueck.
 *
 * Der Server weiss nichts ueber Werkbaenke. Er speichert Schluessel und Werte,
 * vergibt je Gruppe eine fortlaufende Nummer und fuehrt Buch, wer was
 * geaendert hat. Alles Fachliche passiert in der App.
 *
 * Dateien mit Unterstrich sind Bausteine und werden nie direkt aufgerufen –
 * die .htaccess sperrt sie, und ohne sie geben sie ohnehin nichts aus.
 */

final class ApiFehler extends Exception
{
    public function __construct(public readonly int $status, string $text)
    {
        parent::__construct($text);
    }
}

const SCHEMA_VERSION = 1;

/* ---------- Konfiguration ---------- */

/**
 * Die config.php liegt ausserhalb des hochgeladenen Ordners – sonst loeschte
 * sie das naechste Deployment (mirror --delete). Gesucht wird:
 * 1. HUNTKIT_CONFIG aus der Umgebung,
 * 2. neben dem App-Ordner: <app>-daten/config.php,
 * 3. hier im api-Ordner (nur fuer die Entwicklung).
 */
function konfiguration(): array
{
    if (isset($GLOBALS['HUNTKIT_KONFIGURATION'])) return $GLOBALS['HUNTKIT_KONFIGURATION'];
    $gelesen = null;
    $pfade = [getenv('HUNTKIT_CONFIG') ?: '', dirname(__DIR__) . '-daten/config.php', __DIR__ . '/config.php'];
    foreach ($pfade as $pfad) {
        if ($pfad !== '' && is_file($pfad)) {
            $gelesen = require $pfad;
            break;
        }
    }
    if (!is_array($gelesen)) throw new ApiFehler(503, 'Der Server ist noch nicht eingerichtet (config.php fehlt).');
    $GLOBALS['HUNTKIT_KONFIGURATION'] = mitStandards($gelesen);
    return $GLOBALS['HUNTKIT_KONFIGURATION'];
}

function mitStandards(array $k): array
{
    $k += ['praefix' => 'hk_', 'echtzeit' => 'polling', 'oidc' => null, 'app_url' => null, 'debug' => false, 'log' => null];
    if (is_array($k['oidc'])) {
        $k['oidc'] += [
            'scopes' => 'openid profile email',
            'gruppen_claim' => 'groups',
            'anlegegruppe' => 'huntkit-admin',
            'redirect_uri' => null,
            'client_auth' => 'post'
        ];
        if (empty($k['oidc']['issuer']) || empty($k['oidc']['client_id'])) $k['oidc'] = null;
    }
    if (!in_array($k['echtzeit'], ['auto', 'sse', 'polling'], true)) $k['echtzeit'] = 'polling';
    return $k;
}

/* ---------- Protokoll ---------- */

/**
 * Wohin das Server-Log geht: 'log' aus der config.php, sonst huntkit.log im
 * Daten-Ordner neben der App (dort, wo auch die config.php liegt). Klappt
 * beides nicht, landet es im error_log von PHP.
 */
function logdatei(): ?string
{
    $k = $GLOBALS['HUNTKIT_KONFIGURATION'] ?? null;
    if (is_array($k) && $k['log'] === false) return null;
    if (is_array($k) && is_string($k['log']) && $k['log'] !== '') return $k['log'];
    $ordner = dirname(__DIR__) . '-daten';
    return is_dir($ordner) && is_writable($ordner) ? "$ordner/huntkit.log" : null;
}

/**
 * Eine Zeile ins Log. Geheimes (Tokens, Codes, Passwörter) wird vorher
 * unkenntlich gemacht – das Log soll man herumzeigen können.
 */
function protokolliere(string $bereich, string $text, array $daten = []): void
{
    if (isset($GLOBALS['HUNTKIT_STILL'])) return;
    $zeile = date('Y-m-d H:i:s') . " [$bereich] $text";
    if ($daten) $zeile .= ' ' . json_encode(geschwaerzt($daten), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $datei = logdatei();
    if ($datei === null || @file_put_contents($datei, $zeile . "\n", FILE_APPEND | LOCK_EX) === false) {
        error_log('huntkit ' . $zeile);
    }
}

const GEHEIME_FELDER = ['access_token', 'id_token', 'refresh_token', 'code', 'code_verifier', 'client_secret',
    'passwort', 'token', 'state', 'nonce', 'verifier'];

function geschwaerzt(mixed $wert, int $tiefe = 0): mixed
{
    if (is_array($wert)) {
        if ($tiefe > 4) return '…';
        $aus = [];
        foreach ($wert as $k => $v) {
            $aus[$k] = is_string($k) && in_array(strtolower($k), GEHEIME_FELDER, true)
                ? (is_string($v) ? '***(' . strlen($v) . ')' : '***')
                : geschwaerzt($v, $tiefe + 1);
        }
        return $aus;
    }
    if (is_string($wert) && strlen($wert) > 500) return substr($wert, 0, 500) . '…';
    return $wert;
}

function debugAn(): bool
{
    return (bool) (($GLOBALS['HUNTKIT_KONFIGURATION'] ?? [])['debug'] ?? false);
}

/* ---------- Datenbank ---------- */

function db(): PDO
{
    if (isset($GLOBALS['HUNTKIT_DB'])) return $GLOBALS['HUNTKIT_DB'];
    $k = konfiguration();
    $d = $k['db'] ?? null;
    if (!is_array($d) || empty($d['dsn'])) throw new ApiFehler(503, 'Keine Datenbank eingerichtet.');
    try {
        $pdo = new PDO($d['dsn'], $d['benutzer'] ?? null, $d['passwort'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
    } catch (PDOException $fehler) {
        protokolliere('db', 'Verbindung fehlgeschlagen', ['dsn' => preg_replace('/password=[^;]*/i', 'password=***', $d['dsn']), 'fehler' => $fehler->getMessage()]);
        throw new ApiFehler(503, 'Keine Verbindung zur Datenbank' . (debugAn() ? ': ' . $fehler->getMessage() : ' – Details im Server-Log.'));
    }
    if (istSqlite($pdo)) {
        $pdo->exec('PRAGMA busy_timeout = 5000');
        // Mit WAL blockieren Lesende die Schreibenden nicht – wichtig, weil
        // die Ereignis-Verbindungen dauernd lesen.
        if (!str_contains($d['dsn'], ':memory:')) $pdo->exec('PRAGMA journal_mode = WAL');
    } else {
        $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_bin");
    }
    $GLOBALS['HUNTKIT_DB'] = $pdo;
    richteEin($pdo);
    return $pdo;
}

function istSqlite(?PDO $pdo = null): bool
{
    return ($pdo ?? db())->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
}

/** Tabellenname mit Praefix – mehrere Installationen koennen sich eine Datenbank teilen. */
function t(string $name): string
{
    return konfiguration()['praefix'] . $name;
}

/** Eine Zeile oder null. */
function zeile(string $sql, array $werte = []): ?array
{
    $abfrage = db()->prepare($sql);
    $abfrage->execute($werte);
    $z = $abfrage->fetch();
    return $z === false ? null : $z;
}

function zeilen(string $sql, array $werte = []): array
{
    $abfrage = db()->prepare($sql);
    $abfrage->execute($werte);
    return $abfrage->fetchAll();
}

function fuehreAus(string $sql, array $werte = []): int
{
    $abfrage = db()->prepare($sql);
    $abfrage->execute($werte);
    return $abfrage->rowCount();
}

/**
 * Alles in einer Transaktion. SQLite bekommt BEGIN IMMEDIATE: Sonst liest
 * die Transaktion erst und scheitert beim Schreiben an einer anderen, die
 * gleichzeitig dasselbe vorhat.
 */
function inTransaktion(callable $arbeit): mixed
{
    $pdo = db();
    if (istSqlite($pdo)) $pdo->exec('BEGIN IMMEDIATE');
    else $pdo->beginTransaction();
    try {
        $ergebnis = $arbeit();
        if (istSqlite($pdo)) $pdo->exec('COMMIT');
        else $pdo->commit();
        return $ergebnis;
    } catch (Throwable $fehler) {
        if (istSqlite($pdo)) $pdo->exec('ROLLBACK');
        else $pdo->rollBack();
        throw $fehler;
    }
}

/**
 * Legt die Tabellen an, wenn es sie noch nicht gibt. Einrichten heisst damit:
 * config.php hinlegen, fertig – kein Schema von Hand einspielen.
 */
function richteEin(PDO $pdo): void
{
    $sqlite = istSqlite($pdo);
    $meta = t('meta');
    $pdo->exec("CREATE TABLE IF NOT EXISTS $meta (schluessel VARCHAR(64) NOT NULL PRIMARY KEY, wert VARCHAR(255) NOT NULL)"
        . ($sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin'));
    $abfrage = $pdo->prepare("SELECT wert FROM $meta WHERE schluessel = 'schema'");
    $abfrage->execute();
    $version = (int) ($abfrage->fetchColumn() ?: 0);
    if ($version >= SCHEMA_VERSION) return;
    protokolliere('db', "Lege Tabellen an (Schema $version → " . SCHEMA_VERSION . ')', ['treiber' => $sqlite ? 'sqlite' : 'mysql']);

    $auto = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY';
    $blob = $sqlite ? 'BLOB' : 'MEDIUMBLOB';
    $text = $sqlite ? 'TEXT' : 'MEDIUMTEXT';
    $engine = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin';

    $befehle = [
        "CREATE TABLE " . t('benutzer') . " (
            id $auto,
            sub VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL DEFAULT '',
            email VARCHAR(255) NOT NULL DEFAULT '',
            darf_anlegen INTEGER NOT NULL DEFAULT 0,
            avatar $blob NULL,
            avatar_typ VARCHAR(40) NULL,
            avatar_stand VARCHAR(40) NULL,
            erstellt BIGINT NOT NULL,
            zuletzt BIGINT NOT NULL
        )$engine",
        "CREATE UNIQUE INDEX " . t('benutzer_sub') . " ON " . t('benutzer') . " (sub)",
        "CREATE TABLE " . t('gruppen') . " (
            id VARCHAR(40) NOT NULL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            einladung VARCHAR(64) NOT NULL,
            zaehler BIGINT NOT NULL DEFAULT 0,
            erstellt BIGINT NOT NULL
        )$engine",
        "CREATE UNIQUE INDEX " . t('gruppen_einladung') . " ON " . t('gruppen') . " (einladung)",
        "CREATE TABLE " . t('mitglieder') . " (
            id $auto,
            gruppe VARCHAR(40) NOT NULL,
            benutzer_id BIGINT NULL,
            anzeigename VARCHAR(100) NULL,
            rolle VARCHAR(10) NOT NULL,
            erstellt BIGINT NOT NULL,
            entfernt INTEGER NOT NULL DEFAULT 0
        )$engine",
        "CREATE INDEX " . t('mitglieder_gruppe') . " ON " . t('mitglieder') . " (gruppe)",
        "CREATE INDEX " . t('mitglieder_benutzer') . " ON " . t('mitglieder') . " (benutzer_id)",
        "CREATE TABLE " . t('sitzungen') . " (
            token_hash CHAR(64) NOT NULL PRIMARY KEY,
            benutzer_id BIGINT NULL,
            mitglied_id BIGINT NULL,
            erstellt BIGINT NOT NULL,
            zuletzt BIGINT NOT NULL
        )$engine",
        "CREATE TABLE " . t('stand') . " (
            gruppe VARCHAR(40) NOT NULL,
            werkbank VARCHAR(64) NOT NULL,
            schluessel VARCHAR(200) NOT NULL,
            wert $text NULL,
            seq BIGINT NOT NULL,
            mitglied_id BIGINT NOT NULL,
            zeit BIGINT NOT NULL,
            PRIMARY KEY (werkbank, schluessel)
        )$engine",
        "CREATE INDEX " . t('stand_seq') . " ON " . t('stand') . " (gruppe, seq)",
        "CREATE TABLE " . t('aenderungen') . " (
            id $auto,
            op_id VARCHAR(64) NOT NULL,
            gruppe VARCHAR(40) NOT NULL,
            werkbank VARCHAR(64) NOT NULL,
            schluessel VARCHAR(200) NOT NULL,
            alt $text NULL,
            neu $text NULL,
            seq BIGINT NOT NULL,
            mitglied_id BIGINT NOT NULL,
            zeit BIGINT NOT NULL
        )$engine",
        "CREATE UNIQUE INDEX " . t('aenderungen_op') . " ON " . t('aenderungen') . " (op_id)",
        "CREATE INDEX " . t('aenderungen_zelle') . " ON " . t('aenderungen') . " (werkbank, schluessel)",
        "CREATE INDEX " . t('aenderungen_werkbank') . " ON " . t('aenderungen') . " (werkbank, seq)",
        "CREATE TABLE " . t('oidc_vorgaenge') . " (
            state VARCHAR(64) NOT NULL PRIMARY KEY,
            verifier VARCHAR(128) NOT NULL,
            nonce VARCHAR(64) NOT NULL,
            erstellt BIGINT NOT NULL
        )$engine",
        "CREATE TABLE " . t('einmalcodes') . " (
            code_hash CHAR(64) NOT NULL PRIMARY KEY,
            benutzer_id BIGINT NOT NULL,
            erstellt BIGINT NOT NULL
        )$engine"
    ];
    foreach ($befehle as $sql) {
        try {
            $pdo->exec($sql);
        } catch (PDOException $fehler) {
            protokolliere('db', 'Anlegen fehlgeschlagen', ['sql' => preg_replace('/\s+/', ' ', $sql), 'fehler' => $fehler->getMessage()]);
            throw $fehler;
        }
    }
    protokolliere('db', 'Tabellen angelegt');
    $upsert = $sqlite
        ? "INSERT INTO $meta (schluessel, wert) VALUES ('schema', ?) ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert"
        : "INSERT INTO $meta (schluessel, wert) VALUES ('schema', ?) ON DUPLICATE KEY UPDATE wert = VALUES(wert)";
    $pdo->prepare($upsert)->execute([(string) SCHEMA_VERSION]);
}

/* ---------- Kleinkram ---------- */

function jetzt(): int
{
    return (int) round(microtime(true) * 1000);
}

/** Zufall in URL-tauglichen Zeichen. */
function zufall(int $bytes = 24): string
{
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}

function base64url(string $roh): string
{
    return rtrim(strtr(base64_encode($roh), '+/', '-_'), '=');
}

function kennung(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

function text(mixed $wert, int $hoechstens, string $feld): string
{
    if (!is_string($wert)) throw new ApiFehler(400, "$feld fehlt.");
    $wert = trim($wert);
    if ($wert === '') throw new ApiFehler(400, "$feld darf nicht leer sein.");
    if (mb_strlen($wert) > $hoechstens) throw new ApiFehler(400, "$feld ist zu lang.");
    return $wert;
}

/** Wo die App liegt: der Ordner ueber api/. Fuer Weiterleitungen nach der Anmeldung. */
function appAdresse(): string
{
    $k = konfiguration();
    if (!empty($k['app_url'])) return rtrim($k['app_url'], '/') . '/';
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $pfad = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/api/x.php'))), '/');
    return ($https ? 'https' : 'http') . "://$host$pfad/";
}

/* ---------- Anmeldung ---------- */

/**
 * Das Token kommt als eigener Kopf, nicht als Authorization: Den
 * verschlucken manche Webspaces auf dem Weg zu PHP.
 */
function anfrageToken(): ?string
{
    if (array_key_exists('HUNTKIT_TOKEN', $GLOBALS)) return $GLOBALS['HUNTKIT_TOKEN'];
    $token = $_SERVER['HTTP_X_HUNTKIT_TOKEN'] ?? '';
    return is_string($token) && $token !== '' ? $token : null;
}

function neueSitzung(?int $benutzerId, ?int $mitgliedId): string
{
    $token = zufall(32);
    fuehreAus(
        'INSERT INTO ' . t('sitzungen') . ' (token_hash, benutzer_id, mitglied_id, erstellt, zuletzt) VALUES (?, ?, ?, ?, ?)',
        [hash('sha256', $token), $benutzerId, $mitgliedId, jetzt(), jetzt()]
    );
    return $token;
}

/** Die Sitzung zur Anfrage oder null. */
function sitzung(): ?array
{
    $token = anfrageToken();
    if ($token === null) return null;
    $gefunden = zeile('SELECT * FROM ' . t('sitzungen') . ' WHERE token_hash = ?', [hash('sha256', $token)]);
    if (!$gefunden) return null;
    // Nur grob mitschreiben – nicht bei jeder Abfrage im Sekundentakt.
    if (jetzt() - (int) $gefunden['zuletzt'] > 3_600_000) {
        fuehreAus('UPDATE ' . t('sitzungen') . ' SET zuletzt = ? WHERE token_hash = ?', [jetzt(), $gefunden['token_hash']]);
    }
    return $gefunden;
}

function braucheSitzung(): array
{
    $s = sitzung();
    if (!$s) throw new ApiFehler(401, 'Nicht angemeldet.');
    return $s;
}

/** Die aktive Mitgliedschaft der Sitzung in einer Gruppe oder null. */
function mitgliedschaft(array $sitzung, string $gruppe): ?array
{
    if ($sitzung['mitglied_id'] !== null) {
        return zeile(
            'SELECT * FROM ' . t('mitglieder') . ' WHERE id = ? AND gruppe = ? AND entfernt = 0',
            [$sitzung['mitglied_id'], $gruppe]
        );
    }
    if ($sitzung['benutzer_id'] !== null) {
        return zeile(
            'SELECT * FROM ' . t('mitglieder') . ' WHERE benutzer_id = ? AND gruppe = ? AND entfernt = 0',
            [$sitzung['benutzer_id'], $gruppe]
        );
    }
    return null;
}

function braucheMitglied(mixed $gruppe): array
{
    if (!is_string($gruppe) || $gruppe === '') throw new ApiFehler(400, 'Gruppe fehlt.');
    $m = mitgliedschaft(braucheSitzung(), $gruppe);
    if (!$m) throw new ApiFehler(403, 'Kein Mitglied dieser Gruppe.');
    return $m;
}

function braucheAdmin(mixed $gruppe): array
{
    $m = braucheMitglied($gruppe);
    if ($m['rolle'] !== 'admin') throw new ApiFehler(403, 'Nur für Admins der Gruppe.');
    return $m;
}

/** Wer die Sitzung ist – so, wie die App es anzeigt. */
function ich(array $sitzung): ?array
{
    if ($sitzung['benutzer_id'] !== null) {
        $b = zeile('SELECT * FROM ' . t('benutzer') . ' WHERE id = ?', [$sitzung['benutzer_id']]);
        if (!$b) return null;
        return [
            'art' => 'oidc',
            'id' => (int) $b['id'],
            'name' => $b['name'],
            'email' => $b['email'],
            'darfAnlegen' => (bool) $b['darf_anlegen'],
            'avatar' => avatarAdresse($b)
        ];
    }
    $m = zeile('SELECT * FROM ' . t('mitglieder') . ' WHERE id = ? AND entfernt = 0', [$sitzung['mitglied_id']]);
    if (!$m) return null;
    return ['art' => 'gast', 'id' => (int) $m['id'], 'name' => $m['anzeigename'], 'gruppe' => $m['gruppe']];
}

function avatarAdresse(array $benutzer): ?string
{
    if (empty($benutzer['avatar_stand'])) return null;
    return 'avatar.php?id=' . $benutzer['id'] . '&v=' . $benutzer['avatar_stand'];
}

/* ---------- JSON ---------- */

function eingabe(): array
{
    if (isset($GLOBALS['HUNTKIT_EINGABE'])) return $GLOBALS['HUNTKIT_EINGABE'];
    $roh = file_get_contents('php://input', false, null, 0, 2_000_000);
    if ($roh === '' || $roh === false) return [];
    $daten = json_decode($roh, true);
    if (!is_array($daten)) throw new ApiFehler(400, 'Ungültiges JSON.');
    return $daten;
}

/** Fuehrt eine Anfrage aus und schreibt die Antwort als JSON. */
function antworte(callable $arbeit): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    try {
        $ergebnis = $arbeit();
        echo json_encode($ergebnis, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (ApiFehler $fehler) {
        if ($fehler->status >= 500) protokolliere('api', $fehler->getMessage(), ['adresse' => $_SERVER['REQUEST_URI'] ?? '']);
        http_response_code($fehler->status);
        echo json_encode(['fehler' => $fehler->getMessage()], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $fehler) {
        protokolliere('api', 'Unerwarteter Fehler: ' . $fehler->getMessage(), [
            'adresse' => $_SERVER['REQUEST_URI'] ?? '',
            'ort' => $fehler->getFile() . ':' . $fehler->getLine()
        ]);
        http_response_code(500);
        $text = debugAn() ? 'Fehler auf dem Server: ' . $fehler->getMessage() : 'Fehler auf dem Server – Details im Server-Log.';
        echo json_encode(['fehler' => $text], JSON_UNESCAPED_UNICODE);
    }
}
