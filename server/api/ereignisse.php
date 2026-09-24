<?php
declare(strict_types=1);

require __DIR__ . '/_kern.php';
require __DIR__ . '/_sse.php';

/*
 * Die Klingel: meldet nur, dass es in einer Gruppe Neues gibt, und die
 * Nummer dazu. Die Aenderungen selbst holt die App wie beim Polling ueber
 * abgleich.php, mit ihrem Token. Deshalb braucht es hier keine Anmeldung –
 * EventSource kann ohnehin keine eigenen Koepfe schicken, und ein Token in
 * der Adresse landete in den Protokollen des Webservers.
 */
try {
    $k = konfiguration();
    if ($k['echtzeit'] === 'polling') {
        // 204 sagt EventSource: nicht wieder verbinden.
        http_response_code(204);
        exit;
    }
    $gruppe = (string) ($_GET['gruppe'] ?? '');
    $seit = (int) ($_SERVER['HTTP_LAST_EVENT_ID'] ?? $_GET['seit'] ?? 0);
    $abfrage = db()->prepare('SELECT zaehler FROM ' . t('gruppen') . ' WHERE id = ?');
    $abfrage->execute([$gruppe]);
    $zaehler = $abfrage->fetchColumn();
    $abfrage->closeCursor();
    if ($zaehler === false) {
        http_response_code(204);
        exit;
    }
} catch (Throwable $fehler) {
    http_response_code(204);
    exit;
}

sseBeginnen();
$ende = microtime(true) + 25;
$ruhe = microtime(true);
while (microtime(true) < $ende && !connection_aborted()) {
    // Cursor gleich wieder schliessen: Ein offener haelt bei SQLite eine
    // Lesesperre, und niemand koennte schreiben, solange die Klingel laeuft.
    $abfrage->execute([$gruppe]);
    $zaehler = (int) $abfrage->fetchColumn();
    $abfrage->closeCursor();
    if ($zaehler > $seit) {
        $seit = $zaehler;
        sseSenden('stand', $zaehler, (string) $zaehler);
        $ruhe = microtime(true);
    } elseif (microtime(true) - $ruhe > 10) {
        sseLebenszeichen();
        $ruhe = microtime(true);
    }
    usleep(500_000);
}
sseSenden('ende', null);
