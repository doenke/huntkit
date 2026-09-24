<?php
declare(strict_types=1);

require __DIR__ . '/_sse.php';

/*
 * Verbindungstest fuer die App: sechs Ereignisse im Sekundentakt, danach ein
 * Lebenszeichen alle fuenf Sekunden, bis die Zeit um ist. Die App misst,
 * wann was ankommt. Kommen die ersten sechs gebuendelt statt einzeln, puffert
 * irgendwo etwas – dann taugt SSE hier nicht.
 *
 * Braucht weder Datenbank noch config.php.
 */
$dauer = min(120, max(5, (int) ($_GET['dauer'] ?? 60)));
sseBeginnen();
$start = microtime(true);
for ($i = 1; $i <= 6 && !connection_aborted(); $i++) {
    sseSenden('takt', ['nr' => $i, 'server' => (int) round((microtime(true) - $start) * 1000)]);
    sleep(1);
}
while (microtime(true) - $start < $dauer && !connection_aborted()) {
    sleep(5);
    sseSenden('lebt', ['server' => (int) round((microtime(true) - $start) * 1000)]);
}
sseSenden('ende', ['server' => (int) round((microtime(true) - $start) * 1000)]);
