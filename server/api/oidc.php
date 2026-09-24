<?php
declare(strict_types=1);

require __DIR__ . '/_oidc.php';

// Ohne Parameter: Anmeldung beginnen. Mit code/state/error: Rückkehr vom Anbieter.
try {
    $ziel = isset($_GET['code']) || isset($_GET['error']) ? oidcRueckkehr($_GET) : oidcStart();
    header('Cache-Control: no-store');
    header('Location: ' . $ziel, true, 302);
} catch (Throwable $fehler) {
    if (!$fehler instanceof ApiFehler) error_log('huntkit oidc: ' . $fehler);
    $text = $fehler instanceof ApiFehler ? $fehler->getMessage() : 'Die Anmeldung hat nicht geklappt.';
    try {
        header('Location: ' . appAdresse() . '#/werkbank?anmeldefehler=' . rawurlencode($text), true, 302);
    } catch (Throwable) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        echo $text;
    }
}
