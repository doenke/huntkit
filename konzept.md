# huntkit – Konzept

Vorschlag für Aufbau, Funktionsumfang und Umsetzung der in [development.md](development.md)
skizzierten App.

---

## 1. Strategische These: womit man Hunts tatsächlich gewinnt

Die Werkzeuge aus `development.md` sind einzeln alle im Netz verfügbar (dcode.fr, Rumkin,
CyberChef). Trotzdem kosten sie im Hunt Zeit, und genau da liegt der Hebel. Drei Engpässe
entscheiden über Minuten:

1. **Erkennen** – Man hat einen Schnipsel und weiß *nicht*, welcher Code das ist. Das Raten
   und Durchprobieren über fünf verschiedene Webseiten ist der größte Zeitfresser.
2. **Ablesen** – Bei visuellen Codes (Braille, Winker, Flaggen, Templer, Hexahue) hat man
   das Zeichen vor sich, kann es aber nicht eintippen. Man braucht das Nachschlagen in der
   *Gegenrichtung*: Bild antippen → Buchstabe.
3. **Extrahieren** – Der letzte Schritt fast jedes Rätsels ist „nimm jeden 3. Buchstaben",
   „lies die Diagonale", „sortiere nach Spalte 2". Das macht man sonst per Hand und
   verzählt sich.

Dazu kommt die harte Randbedingung der Nachtschicht: **kein Netz, kein Akku, wenig Licht.**

Daraus folgt der Produktkern: nicht 15 einzelne Tools, sondern **eine Werkbank mit einem
gemeinsamen Textpuffer**, auf den alle Codecs als austauschbare Bausteine wirken – plus
Auto-Erkennung, Bild-zu-Buchstabe-Nachschlagen und Extraktionshelfer. Offline, dunkel,
schnell.

---

## 2. Zwei Einsatzprofile

Die beiden Zielveranstaltungen stellen unterschiedliche Anforderungen. Eine App, zwei
Oberflächen-Modi:

| | **Dortmunder Nachtschicht** | **MIT Mystery Hunt** |
|---|---|---|
| Gerät | Handy, einhändig, im Stehen | Laptop, lange Sessions, Team |
| Netz | unzuverlässig bis keins | vorhanden |
| Licht | dunkel, Straßenlaterne | Zimmer |
| Typische Aufgabe | Zeichen vor Ort ablesen, kurz dekodieren | große Textmengen, Wortmuster, Metas |
| Kritisch | Offline, große Touch-Ziele, Taschenlampe, Akku | Tempo bei Bulk-Operationen, Teilen im Team |

**Konsequenz:** Mobile-First bauen, aber die Werkbank auf dem Desktop zu einem
mehrspaltigen Arbeitsbereich aufklappen. Kein separates Produkt, nur ein anderes Layout.

---

## 3. Produktkonzept: vier Bausteine

### 3.1 Werkbank (der gemeinsame Puffer)

Zentrales Element der App. Es gibt **einen aktuellen Text** und darauf eine **Kette von
Schritten**:

```
Eingabe:  -.-. .- . ... .- .-.
  ├─ Schritt 1: Morse → Text          → CAESAR
  ├─ Schritt 2: Caesar ROT-13         → PNRFNE
  └─ Schritt 3: jeden 2. Buchstaben   → NFE
```

Jeder Schritt ist einzeln editierbar, deaktivierbar, umsortierbar. Das ersetzt das
Copy-Paste-Pingpong zwischen Einzeltools und ist gleichzeitig ein Protokoll dessen, was man
schon probiert hat – im Hunt um 3 Uhr nachts mehr wert, als es klingt.

### 3.2 Codec-Registry (die Bausteine)

Jeder Code aus `development.md` ist kein eigener Bildschirm, sondern ein **Plugin mit
einheitlicher Schnittstelle**. Alles andere in der App ergibt sich daraus automatisch:
die Konverter-Ansicht, die Referenztabelle, die Auto-Erkennung, der Visual Picker.

Ein neuer Code = eine Datei. Das hält die App erweiterbar, wenn im Hunt ein exotischer
Code auftaucht.

### 3.3 Identify (Auto-Erkennung)

Text einwerfen → die App probiert **alle** Codecs durch und zeigt eine Rangliste
plausibler Deutungen. Zweistufig:

1. **Struktur-Check (billig):** Nur `.`, `-`, Leerzeichen → Morse. 8er-Gruppen aus 0/1 →
   Binär-ASCII. Zahlen 1–26 → ABC123. Zahlen 32–126 → ASCII dezimal. Nur A–F und Ziffern →
   Hex. Usw.
2. **Sprach-Score (entscheidend):** Das Dekodat wird gegen ein kleines
   n-Gramm-Modell (Deutsch + Englisch) bewertet. „Sieht aus wie Sprache" schlägt
   „Zeichensatz passt".

Dasselbe Scoring trägt die **Brute-Force-Wand**: alle 26 Caesar-Verschiebungen, Atbash,
Reverse, ABC123 gleichzeitig untereinander, das sprachlich beste Ergebnis hervorgehoben.
In der Praxis der mit Abstand am häufigsten benutzte Bildschirm.

### 3.4 Referenz & Visual Picker

Für jeden Codec automatisch generiert:

- **Tabelle** A–Z / 0–9 mit Darstellung – zum Ablesen, wenn man nur *schauen* will.
- **Visual Picker** für visuelle Codes: ein Raster aller Glyphen. Man tippt an, was man vor
  sich sieht, die App baut daraus den Text. Das ist die Kernfunktion für Braille,
  Winkeralphabet, Flaggen, Hexahue, Templer und Fingeralphabet – ohne sie sind diese Codes
  am Handy praktisch unbenutzbar.

Alle Glyphen werden **selbst als SVG gezeichnet**, nicht aus dem Netz kopiert: skaliert
scharf, funktioniert offline, keine Lizenzfragen.

---

## 4. Funktionsumfang

### 4.1 Kern (aus development.md)

| Funktion | Umsetzung | Aufwand |
|---|---|---|
| ABC123 (A1Z26) | Codec + Tabelle | S |
| ASCII dez / bin / hex | Codec mit Basis-Option | S |
| NATO-Alphabet | Codec + Tabelle | S |
| Morse | Codec + Tabelle + Tap-Eingabe | S |
| Caesar | Codec + Brute-Force-Wand (alle 26 auf einmal) | S |
| Zahlensysteme, Basis 2–36 | eigenes Rechen-Tool + Codec | S |
| Braille | Codec + SVG-Punktmuster + Visual Picker | M |
| Hexahue | Codec + SVG-Farbfelder + Visual Picker | M |
| Winkeralphabet (Semaphor) | SVG-Strichfiguren + Visual Picker | M |
| Flaggenalphabet | SVG-Flaggen + Visual Picker | M |
| Templercode | SVG-Glyphen + Visual Picker | M |
| Fingeralphabet | SVG-Handzeichen + Visual Picker (DGS *und* ASL – unterscheiden!) | L |
| Widerstandscode | eigenes Tool: 4/5/6 Ringe, beide Richtungen, Farbwähler | M |
| Periodensystem | eigene Ansicht: Zoom, Suche, Filter, Highlight, Detailkarte | L |

Der Aufwand bei den visuellen Codes steckt fast vollständig im Zeichnen der Glyphen, nicht
in der Logik.

### 4.2 Vorschläge zur Erweiterung

Nach Nutzen-pro-Aufwand sortiert – die oberen zahlen sich im Hunt am schnellsten aus:

| Funktion | Warum | Aufwand |
|---|---|---|
| **Extraktionshelfer** | jeden n-ten Buchstaben, Indexliste („3,1,4"), Gitter zeilen-/spalten-/diagonal lesen, Spalten sortieren – der Schlussschritt fast jedes Rätsels | S |
| **Weitere klassische Chiffren** | Atbash, Vigenère, Polybius, Bacon, Rail Fence, Tastatur-Shift, Handy-T9 – tauchen ständig auf | M |
| **Frequenzanalyse** | Buchstabenhäufigkeit + Koinzidenzindex sagen einem, *welche* Chiffre vorliegt | S |
| **Element-Symbol-Speller** | „Antwort in Elementsymbolen buchstabiert" ist ein Standard-Trick; fällt fast gratis ab, wenn das Periodensystem schon da ist | S |
| **Wortmuster-Suche** | Offline-Wörterbuch mit Platzhaltern (`?A??LE`) und Regex – ersetzt Nutrimatic im Funkloch | M |
| **Anagramm-Löser** | über dasselbe Wörterbuch | S |
| **QR-/Barcode-Scanner** | Kamera, offline, ohne fremde App mit Werbung | M |
| **Koordinaten-Umrechner** | DD ↔ DMS ↔ UTM, Peilung/Kompass – für einen Stadt-Hunt naheliegend | S |
| **Römische Zahlen, Base64/32** | Kleinkram, oft gebraucht | S |
| **Team-Sharing per Link** | kompletter Werkbank-Zustand im URL-Fragment → per Messenger teilen, ganz ohne Server | M |
| **Nacht-Ausrüstung** | Taschenlampe, Lupe, Wake Lock, Rotlicht-Theme, Notiz-/Checkpoint-Log | S |

### 4.3 Bewusst außen vor

Kein Konto, kein Login, keine Synchronisierung, keine Statistik, kein Tracking. Das würde
einen Server erfordern und widerspricht der Vorgabe. Teilen läuft über Links und Export.

---

## 5. UX-Konzept

**Ein Eingabefeld als Einstieg.** Oben eine Omnibox: Tippt man einen Werkzeugnamen, springt
man hin. Wirft man Text hinein, läuft sofort Identify. Kein Menü-Suchen.

**Mobil**
- Dark Theme als Standard, dazu ein **Rotlicht-Modus** (rot getönt, erhält die Nachtsicht
  und ist für Umstehende unauffällig).
- Sehr große Touch-Ziele, alles im Daumenbereich, unten eine Leiste mit Werkbank / Codes /
  Nachschlagen / Extras.
- Wake Lock, solange die Werkbank offen ist – das Display darf beim Abtippen nicht ausgehen.
- Favoriten und zuletzt benutzte Werkzeuge ganz oben.

**Desktop**
- Dieselbe Werkbank, dreispaltig: Eingabe | Schrittkette | Ergebnis.
- Tastaturgetrieben: Befehlspalette (`Strg+K`), Einfügen von überall, Ergebnis mit einem
  Tastendruck als neue Eingabe übernehmen.

**Durchgängig:** Jedes Ergebnis mit einem Tipp kopierbar, jedes Ergebnis mit einem Tipp als
neue Eingabe übernehmbar. Nichts geht beim Neuladen verloren.

---

## 6. Technisches Konzept

### 6.1 Stack

- **Vite + TypeScript + Svelte**, Ausgabe als rein statische Dateien.
  Begründung: kleine Bundles (wichtig fürs Offline-Caching und für schwache Netze),
  wenig Laufzeit-Overhead, Komponenten ohne Zeremonie. Ein Build-Schritt widerspricht der
  Vorgabe „statisch, ohne Serverseite" nicht – das Ergebnis ist reines HTML/JS/CSS.
  *Alternative, falls ausdrücklich gar kein Build gewünscht ist:* Vanilla-ES-Module +
  Web Components. Kostet Komfort, bleibt aber machbar.
- **Kein UI-Framework-Ballast**, eigenes CSS mit Custom Properties für die Themes.
- **TypeScript strikt** – die Codec-Tabellen sind fehleranfällig, Typen fangen das früh.

### 6.2 Projektstruktur

```
src/
  codecs/          # ein Modul pro Code – morse.ts, braille.ts, hexahue.ts …
    registry.ts    # Sammelstelle, Auto-Registrierung
    types.ts
  tools/           # Dinge, die keine Codecs sind
    periodic/      # Periodensystem
    resistor/      # Widerstandscode
    bases/         # Zahlensysteme
    extract/       # Extraktionshelfer
  workbench/       # Puffer, Schrittkette, Verlauf
  identify/        # Sniffer + Sprach-Score
  ui/              # Komponenten, Themes
  data/            # JSON: Elemente, n-Gramme, Wörterbuch (lazy geladen)
```

### 6.3 Die Codec-Schnittstelle

Das ist die eine Abstraktion, an der alles hängt:

```ts
export interface Codec {
  id: string;                    // "morse"
  name: string;                  // "Morse"
  tags: CodecTag[];              // ["text"] | ["visuell"] | ["historisch"]

  encode(input: string, opts?: CodecOptions): CodecResult;
  decode(input: string, opts?: CodecOptions): CodecResult;

  /** Passt die Eingabe strukturell zu diesem Codec? 0..1 – Basis für Identify */
  sniff?(input: string): number;

  /** Zeichenweise Referenz – erzeugt Tabelle und Visual Picker automatisch */
  table?: CodecEntry[];

  /** Glyph-Darstellung für visuelle Codes (Braille, Winker, Hexahue …) */
  render?(symbol: string): SvgFragment;

  /** Optionen, die die UI selbst generiert (z.B. Caesar-Verschiebung, Basis) */
  options?: OptionSpec[];
}
```

`CodecResult` enthält bewusst nicht nur den Text, sondern auch **Teilfehler**: Welche
Zeichen konnten nicht übersetzt werden? Bei einem verwitterten Schild ist genau das die
interessante Information.

Ein Schritt in der Werkbank ist dann nur
`{ codecId, richtung: "encode" | "decode", opts }` – und der geteilte Link nur eine Liste
davon.

### 6.4 Zustand und Teilen

- Laufender Zustand in `localStorage`, überlebt Neuladen und Akku-Sparmodus.
- Teilen: Werkbank-Zustand als JSON → komprimieren → **URL-Fragment** (`#w=…`). Das
  Fragment wird nie an einen Server geschickt; die App funktioniert dadurch ohne Backend
  und trotzdem kollaborativ genug fürs Team.

### 6.5 Offline / PWA

- Service Worker mit Precaching der gesamten App-Shell inklusive aller Codec-Tabellen und
  SVGs → **funktioniert im Flugmodus vollständig**, das ist Abnahmekriterium.
- Große Daten (Elementdetails, Wörterbuch, n-Gramme) als getrennte Chunks, im Hintergrund
  nachgeladen und in IndexedDB gehalten – die App startet auch ohne sie.
- Bewusst **vor** der Veranstaltung einmal „vollständig laden"-Knopf anbieten.
- Installierbar auf Homescreen und Desktop.

### 6.6 Qualitätssicherung

Ein Tippfehler in einer Morse- oder Braille-Tabelle ist im Hunt fatal und fällt nicht auf.
Deshalb:

- **Round-Trip-Tests pro Codec:** `decode(encode(x)) === x` für zufällige Eingaben. Billig,
  fängt fast alle Tabellenfehler.
- **Vollständigkeitstests:** jeder Codec deckt A–Z und 0–9 ab oder deklariert die Lücke.
- Goldene Testfälle aus bekannten Rätseln.
- Vitest, CI über GitHub Actions.

### 6.7 Deployment

GitHub Pages, gebaut per GitHub Action bei jedem Push auf `main`. Statisch, kostenlos,
kein Server – passt exakt zur Vorgabe.

---

## 7. Roadmap

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **0 – Gerüst** | Vite/Svelte/TS, PWA-Shell, Dark Theme, GH-Pages-Deployment, CI | Installierbare leere App, offline lauffähig |
| **1 – Textcodes** | Codec-Registry, Werkbank, ABC123, ASCII (dez/bin/hex), NATO, Morse, Caesar + Brute-Force-Wand, Zahlensysteme | Bereits die Hälfte von `development.md`, sofort einsetzbar |
| **2 – Visuelle Codes** | SVG-Glyphen + Visual Picker für Braille, Winker, Hexahue, Flaggen, Templer, Fingeralphabet | Der eigentliche Unterschied zu Webseiten-Tools |
| **3 – Nachschlagewerke** | Periodensystem (Zoom/Suche/Filter/Details) + Element-Speller, Widerstandscode | `development.md` vollständig abgedeckt |
| **4 – Identify** | Sniffer, n-Gramm-Sprachmodell, Rangliste | „Was ist das überhaupt?" in einem Schritt |
| **5 – Hunt-Extras** | Extraktionshelfer, weitere Chiffren, Wortmuster/Anagramm, QR-Scan, Koordinaten, Link-Sharing, Nacht-Ausrüstung | Wettbewerbsfähig auch beim Mystery Hunt |

Phasen 0–3 liefern das, was in `development.md` steht. 4 und 5 sind der Vorschlag darüber
hinaus – Phase 1 ist bereits allein benutzbar, jede weitere Phase ist ein eigenständiger
Zugewinn.

---

## 8. Risiken und offene Punkte

- **Lizenzen bei Daten und Bildern.** Elementdaten aus einer freien Quelle (Wikidata,
  PubChem) übernehmen und die Herkunft dokumentieren. Glyphen selbst zeichnen statt
  Grafiken zu übernehmen. Beim Wörterbuch auf die Lizenz achten (freie Wortlisten,
  Wiktionary-Ableitungen).
- **Fingeralphabet ist nicht eindeutig.** DGS (deutsch) und ASL (amerikanisch)
  unterscheiden sich deutlich. Für die Nachtschicht DGS, für den Mystery Hunt ASL – beide
  vorsehen und klar beschriften.
- **Hexahue-Farben.** Muss exakt stimmen und braucht Kontrastprüfung; bei Nacht und auf
  schlechten Displays sind Farbcodes heikel. Zusätzlich Farbnamen einblenden.
- **iOS-Eigenheiten.** Taschenlampen-Steuerung ist per Web-API eingeschränkt, Safari räumt
  Speicher installierter PWAs unter Umständen auf. Vor der Veranstaltung auf dem echten
  Gerät testen, nicht nur im Simulator.
- **Akku.** Kamera, Taschenlampe und Wake Lock sind die größten Verbraucher. Sparsam
  einsetzen und den Wake Lock automatisch freigeben.
- **Regeln der Veranstaltung.** Vor dem Einsatz prüfen, ob und welche Hilfsmittel bei der
  Nachtschicht zugelassen sind. Beim MIT Mystery Hunt sind Werkzeuge üblich und erwünscht.

### Zu klären

1. Sind die visuellen Codes in Phase 2 wichtiger als das Periodensystem? (Meine Annahme:
   ja – das Periodensystem ist umfangreich, aber notfalls durch ein Nachschlagen im Netz
   ersetzbar, das Ablesen eines Winker-Zeichens vor Ort nicht.)
2. Deutsch als einzige Oberflächensprache, oder DE/EN zweisprachig wegen des Mystery Hunt?
3. Build-Schritt (Vite) akzeptiert, oder soll es wirklich buildfrei bleiben?
4. Wird die App im Team eingesetzt – lohnt sich das Link-Sharing früher als Phase 5?
