# huntkit

Werkzeugkasten für Rätselrallyes und Puzzle Hunts – Dortmunder Nachtschicht,
MIT Mystery Hunt. Läuft als PWA auf Handy und Laptop, **vollständig offline**,
ohne Server und ohne Konto.

- Konzept: [konzept.md](konzept.md)
- Ideensammlung: [development.md](development.md)
- Veröffentlicht unter <https://huntkit.kanonenwiese.de>

## Stand

Phase 0 (Gerüst) und Phase 1 (Textcodes) stehen:

- **Werkbank** – ein gemeinsamer Textpuffer mit einer Kette von Schritten. Jeder
  Schritt einzeln abschaltbar, verschiebbar und mit eigenen Optionen; jeder
  Zwischenstand sichtbar.
- **Codes** – Morse, ABC123, ASCII (dezimal/binär/hexadezimal), NATO,
  Caesar, Zahlensysteme (Basis 2–36) und das Periodensystem als Schlüssel,
  jeweils mit Referenztabelle.
- **Brute-Force-Wand** – alle 26 Caesar-Verschiebungen auf einen Blick, jede
  per Tipp als neue Eingabe übernehmbar.

Aus Phase 2 (visuelle Codes):

- **Braille, Winkeralphabet, Hexahue, Templercode, Fingeralphabet** – jeweils
  mit Visual Picker: Zeichen antippen statt tippen, Text sammeln und an die
  Werkbank übergeben.
- **Umlaute** – Ä zu AE, ß zu SS und zurück, wie die Nachtschicht
  Lösungswörter schreibt.

Aus Phase 3 (Nachschlagen):

- **Periodensystem** als Gitter – 18 Spalten, 32 Spalten oder kompakt, mit Zoom,
  Suche (`gold`, `serie:edelgase`, `z>50`, `primzahl`, `radioaktiv`) und
  Detailkarte. Dazu Markierungsebenen mit Mengenoperationen, Musteransicht,
  Auslesen in wählbarer Reihenfolge und Sichern als Bild.
- **Widerstandsfarbcode** – 4, 5 oder 6 Ringe, in beide Richtungen.

Aus Phase 4 (Auto-Erkennung):

- **„Was ist das?"** – die Eingabe gegen alle Codes werfen und eine Rangliste
  bekommen. Ein Tipp übernimmt den Vorschlag als Schritt in die Kette.
- **Sprachwert** – bewertet, ob ein Ergebnis sich wie Deutsch oder Englisch
  liest. Er hebt in der Brute-Force-Wand die wahrscheinlichste der 26
  Verschiebungen hervor.

Grundlage der Zeichentabellen ist das Regelheft der Dortmunder Nachtschicht;
Herkunft und Proben stehen in [`src/codecs/QUELLE.md`](src/codecs/QUELLE.md).

Alle Zeichen sind eigene SVG-Zeichnungen. Einzige Ausnahme ist das
Fingeralphabet: Dessen Tafel stammt vom Landesverband Bayern der Gehörlosen
e. V. und steht unter CC BY-SA 4.0 – siehe
[`public/finger/LIZENZ.md`](public/finger/LIZENZ.md).

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
| `src/codecs/` | ein Modul je Code, dazu Registry und Schnittstelle |
| `src/lib/` | Werkbank, Router, Themes |
| `src/ui/` | wiederverwendete Bausteine der Oberfläche |
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
