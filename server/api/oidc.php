<?php
declare(strict_types=1);

require __DIR__ . '/_oidc.php';

// Ohne Parameter: Anmeldung beginnen. Mit code/state/error: Rückkehr vom Anbieter.
try {
    $ziel = isset($_GET['code']) || isset($_GET['error']) ? oidcRueckkehr($_GET) : oidcStart();
    header('Cache-Control: no-store');
    header('Location: ' . $ziel, true, 302);
} catch (Throwable $fehler) {
    protokolliere('oidc', 'Anmeldung abgebrochen: ' . $fehler->getMessage(), $fehler instanceof ApiFehler
        ? ['status' => $fehler->status]
        : ['art' => get_class($fehler), 'ort' => $fehler->getFile() . ':' . $fehler->getLine()]);
    // Fehler aus der Datenbank oder dem Code kommen nur mit debug im Klartext
    // in die App; im Log stehen sie immer.
    $text = $fehler instanceof ApiFehler || debugAn()
        ? $fehler->getMessage()
        : 'Die Anmeldung hat nicht geklappt – Details im Server-Log (huntkit.log).';
    try {
        header('Location: ' . appAdresse() . '#/gruppen?anmeldefehler=' . rawurlencode($text), true, 302);
    } catch (Throwable) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo $text;
    }
}
