<?php
declare(strict_types=1);

require __DIR__ . '/_aktionen.php';

antworte(fn () => kontoAnfrage($_SERVER['REQUEST_METHOD'] ?? 'GET', $_GET, ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' ? eingabe() : []));
