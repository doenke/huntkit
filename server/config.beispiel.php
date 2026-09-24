<?php
/*
 * Vorlage fuer die Konfiguration des Gruppen-Servers.
 *
 * Kopieren nach <App-Ordner>-daten/config.php, also NEBEN den Ordner, in den
 * das Deployment hochlaedt – liegt die App in
 *   /home/webzwenka/kanonenwiese.de/huntkit
 * dann hierhin:
 *   /home/webzwenka/kanonenwiese.de/huntkit-daten/config.php
 *
 * Dort ueberlebt sie jedes Deployment (das spiegelt mit --delete) und ist
 * nicht aus dem Netz erreichbar. Alternativ zeigt die Umgebungsvariable
 * HUNTKIT_CONFIG auf die Datei.
 *
 * Die Tabellen legt der Server beim ersten Aufruf selbst an.
 */
return [
    'db' => [
        // MySQL/MariaDB:
        'dsn' => 'mysql:host=localhost;dbname=huntkit;charset=utf8mb4',
        'benutzer' => 'huntkit',
        'passwort' => 'geheim',
        // Zum Ausprobieren geht auch SQLite (Datei ausserhalb des Web-Ordners):
        // 'dsn' => 'sqlite:/home/webzwenka/kanonenwiese.de/huntkit-daten/huntkit.sqlite',
    ],

    // Vorsatz fuer alle Tabellennamen – so koennen sich Test- und
    // Produktivfassung eine Datenbank teilen.
    'praefix' => 'hk_',

    // Wie Aenderungen der anderen ankommen:
    //   'polling' – die App fragt alle 1,5 s nach (laeuft ueberall)
    //   'auto'    – Server-Sent Events, bei Problemen zurueck auf Polling
    //   'sse'     – nur Server-Sent Events
    // Erst umstellen, wenn „Serververbindung testen“ in der App gut ausgeht:
    // Jedes offene Geraet belegt dann einen PHP-Prozess.
    'echtzeit' => 'polling',

    // Anmeldung ueber OpenID Connect. Ohne diesen Block kann niemand Gruppen
    // anlegen – beitreten ueber Einladungslinks geht trotzdem.
    // Beim Anbieter als Rueckleitungsadresse eintragen:
    //   https://huntkit.kanonenwiese.de/api/oidc.php
    'oidc' => [
        'issuer' => 'https://login.example.org/realms/huntkit',
        'client_id' => 'huntkit',
        'client_secret' => 'geheim',
        // 'scopes' => 'openid profile email',
        // Wo die Gruppen im Token stehen (auch als Pfad, z. B. 'realm_access.roles'):
        // 'gruppen_claim' => 'groups',
        // Wer in dieser Gruppe ist, darf Gruppen anlegen:
        // 'anlegegruppe' => 'huntkit-admin',
        // 'client_auth' => 'post', // oder 'basic'
        // Nur noetig, wenn die Adresse nicht stimmt, die der Server selbst ermittelt:
        // 'redirect_uri' => 'https://huntkit.kanonenwiese.de/api/oidc.php',
    ],

    // Server-Log: Ohne Angabe schreibt der Server nach huntkit.log im
    // Daten-Ordner (dort, wo diese Datei liegt). Geheimes wird geschwaerzt.
    // 'log' => '/pfad/zu/huntkit.log',   // oder false: nur error_log von PHP
    // Fehler aus Datenbank und Code im Klartext in der App anzeigen – nur zum
    // Einrichten, sie koennen Hostnamen und Benutzernamen enthalten:
    // 'debug' => true,

    // Nur noetig, wenn der Server die Adresse der App falsch ermittelt
    // (etwa hinter einem Proxy):
    // 'app_url' => 'https://huntkit.kanonenwiese.de/',
];
