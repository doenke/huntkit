<?php
declare(strict_types=1);

require __DIR__ . '/_kern.php';

// Das Bild eines OIDC-Benutzers. Die Adresse enthält den Stand des Bildes –
// ohne ihn lässt sich nicht einfach durchzählen, und der Browser darf es
// lange aufheben, weil ein neues Bild eine neue Adresse bekommt.
try {
    $b = zeile(
        'SELECT avatar, avatar_typ, avatar_stand FROM ' . t('benutzer') . ' WHERE id = ?',
        [(int) ($_GET['id'] ?? 0)]
    );
    if (!$b || empty($b['avatar_stand']) || !hash_equals($b['avatar_stand'], (string) ($_GET['v'] ?? ''))) {
        http_response_code(404);
        exit;
    }
    $daten = is_resource($b['avatar']) ? stream_get_contents($b['avatar']) : (string) $b['avatar'];
    header('Content-Type: ' . $b['avatar_typ']);
    header('Content-Length: ' . strlen($daten));
    header('Cache-Control: public, max-age=31536000, immutable');
    header('ETag: "' . $b['avatar_stand'] . '"');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'");
    echo $daten;
} catch (Throwable $fehler) {
    error_log('huntkit avatar: ' . $fehler);
    http_response_code(500);
}
