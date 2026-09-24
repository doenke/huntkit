<?php
declare(strict_types=1);

/*
 * Server-Sent Events auf einfachem Webspace.
 *
 * Eine Verbindung haelt nur kurz (Standard 25 s) und endet dann von selbst;
 * der Browser verbindet sich neu. So belegt kein Geraet dauerhaft einen
 * PHP-Prozess, und kein Zeitlimit des Hosters schlaegt mitten hinein.
 *
 * Das Polster am Anfang ist fuer Zwischenstationen, die erst ab einer
 * gewissen Menge weiterreichen. Ob trotzdem gepuffert wird, zeigt der
 * Verbindungstest in der App.
 */

function sseBeginnen(): void
{
    @set_time_limit(90);
    ignore_user_abort(false);
    @ini_set('zlib.output_compression', '0');
    @ini_set('output_buffering', '0');
    @ini_set('implicit_flush', '1');
    if (function_exists('apache_setenv')) @apache_setenv('no-gzip', '1');
    while (ob_get_level() > 0) ob_end_flush();
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-transform');
    header('X-Accel-Buffering: no');
    header('Connection: keep-alive');
    echo ':' . str_repeat(' ', 2048) . "\n";
    echo "retry: 1500\n\n";
    flush();
}

function sseSenden(string $ereignis, mixed $daten, ?string $id = null): void
{
    if ($id !== null) echo "id: $id\n";
    echo "event: $ereignis\n";
    echo 'data: ' . json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
    flush();
}

function sseLebenszeichen(): void
{
    echo ": .\n\n";
    flush();
}
