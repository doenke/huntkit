# huntkit

Werkzeugkasten für Rätselrallyes und Puzzle Hunts – Dortmunder Nachtschicht,
MIT Mystery Hunt. Läuft als PWA auf Handy und Laptop, **vollständig offline**,
ohne Server und ohne Konto.

- Konzept: [konzept.md](konzept.md)
- Ideensammlung: [development.md](development.md)
- Veröffentlicht unter <https://huntkit.kanonenwiese.de>

## Stand

Phase 0 (Gerüst) steht: installierbare App, Offline-Betrieb, Themes,
automatisches Deployment. Die Werkzeuge selbst folgen ab Phase 1 – siehe
Roadmap im Konzept.

Bereits vorhanden: die Elementdaten für das Periodensystem
([`data/elements.json`](data/elements.json), 118 Elemente).

## Entwickeln

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests
npm run typecheck  # Typen prüfen
npm run build      # nach dist/ bauen
```

Gebraucht wird Node 22. Wer nur die fertige App will, braucht gar nichts: Das
Archiv jedes Builds hängt an der jeweiligen Action.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/` | Anwendung (Svelte, TypeScript) |
| `src/lib/` | Router, Themes – später die Codec-Registry |
| `data/` | Datensätze; Herkunft in [`data/QUELLE.md`](data/QUELLE.md) |
| `tools/` | Hilfsskripte: Datenimport, Icons, Deployment, Offline-Plugin |
| `.github/workflows/` | Bauen, Testen, Veröffentlichen |

## Veröffentlichen

Jeder Push auf `main` baut, testet und lädt das Ergebnis per SFTP auf den
Webspace. Von Hand ist nichts zu tun.

Die App benutzt ausschließlich relative Pfade und Hash-Routing. Das gebaute
`dist/` läuft deshalb unter jeder Domain und in jedem Unterverzeichnis, ohne
neu gebaut zu werden – auch ohne Server-Konfiguration.

Benötigte GitHub Secrets:

| Secret | Inhalt |
|---|---|
| `DEPLOY_HOST` | Servername |
| `DEPLOY_USER` | Benutzername |
| `DEPLOY_PASSWORD` | Passwort |
| `DEPLOY_PATH` | Zielverzeichnis auf dem Server |
| `DEPLOY_PORT` | optional, falls nicht der Standardport |
| `DEPLOY_PROTOCOL` | optional: `sftp` (Standard), `ftps` oder `ftp` |
| `DEPLOY_KNOWN_HOSTS` | optional, bei SFTP empfohlen – `ssh-keyscan`-Ausgabe des Servers |

## Abhängigkeiten

Zur Laufzeit **keine**: kein CDN, keine fremden Schriftarten, keine API. Alles
liegt im ausgelieferten Ordner – sonst wäre die App im Funkloch kaputt.

Zur Bauzeit: Vite, Svelte, TypeScript, Vitest (und `@types/node` für die
Build-Skripte).
