# huntkit – Konzept

Vorschlag für Aufbau, Funktionsumfang und Umsetzung der in [development.md](development.md)
skizzierten App.

**Getroffene Entscheidungen**

- Oberflächensprache: **nur Deutsch**.
- Reihenfolge: **visuelle Codes vor dem Periodensystem** (Phase 2 vor Phase 3).
- Link-Sharing bleibt in **Phase 5**.
- Das Periodensystem erfüllt **alle drei Rollen** – Schlüssel, Matrix, Zeichenfläche
  (Abschnitt 5).
- **Build-Schritt: ja**, aber ausschließlich automatisch über GitHub Actions – lokal muss
  nie jemand etwas bauen (Abschnitt 7.1).
- **Deployment per SFTP (Passwort-Anmeldung)** nach
  `/home/webzwenka/kanonenwiese.de/huntkit` (`https://huntkit.kanonenwiese.de`),
  gleichzeitig an beliebigem anderem Ort lauffähig (Abschnitt 7.9).
- **Externe Abhängigkeiten werden strikt kleingehalten** – zur Laufzeit gar keine
  (Abschnitt 7.2).
- **Elementdaten sind erledigt:** 118 Elemente mit neun Feldern in `data/elements.json`
  (Abschnitt 5.5).

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
| Periodensystem | Schlüssel + Matrix + Zeichenfläche – siehe Abschnitt 5 | L |

Der Aufwand bei den visuellen Codes steckt fast vollständig im Zeichnen der Glyphen, nicht
in der Logik.

### 4.2 Vorschläge zur Erweiterung

Nach Nutzen-pro-Aufwand sortiert – die oberen zahlen sich im Hunt am schnellsten aus:

| Funktion | Warum | Aufwand |
|---|---|---|
| **Extraktionshelfer** | jeden n-ten Buchstaben, Indexliste („3,1,4"), Gitter zeilen-/spalten-/diagonal lesen, Spalten sortieren – der Schlussschritt fast jedes Rätsels | S |
| **Weitere klassische Chiffren** | Atbash, Vigenère, Polybius, Bacon, Rail Fence, Tastatur-Shift, Handy-T9 – tauchen ständig auf | M |
| **Frequenzanalyse** | Buchstabenhäufigkeit + Koinzidenzindex sagen einem, *welche* Chiffre vorliegt | S |
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

## 5. Periodensystem: Schlüssel, Matrix und Zeichenfläche

Das Periodensystem ist kein Nachschlagewerk am Rand, sondern das aufwendigste Einzelstück
der App – weil es im Rätsel drei völlig verschiedene Rollen spielt. Alle drei werden
umgesetzt.

### 5.1 Rolle 1: Schlüssel

Jedes Element trägt ein Bündel von Attributen, und **jedes Attributpaar ist eine mögliche
Übersetzung**:

Symbol ↔ Ordnungszahl ↔ Name ↔ Atomgewicht ↔ Gruppe/Periode ↔ Block (s/p/d/f) ↔ Kategorie
↔ Aggregatzustand ↔ Elektronegativität ↔ Schmelz-/Siedepunkt ↔ Dichte ↔ Entdeckungsjahr ↔
Elektronenkonfiguration

Umgesetzt wird das **nicht** als dreißig Einzelwerkzeuge, sondern als *ein* Codec mit zwei
Einstellungen: „von Attribut X" → „nach Attribut Y". Damit ist jede Kombination abgedeckt,
auch die, an die wir vorher nicht gedacht haben – und das Ganze hängt in der
Werkbank-Kette wie jeder andere Code:

```
Fe Ca Ba   → [Symbol → Ordnungszahl] →   26 20 56
26 20 56   → [ABC123]                →   Z T (56 ohne Entsprechung)
```

Zwei Sonderfunktionen gehen über reines Nachschlagen hinaus:

- **Speller:** Text in Elementsymbolen buchstabieren (`BACON` → Ba-C-O-N).
- **Zerlegung** – der häufigere und heiklere Fall: eine gegebene Zeichenkette in
  Elementsymbole zerlegen. Das ist mehrdeutig (`CON` = C-O-N *oder* Co-N), deshalb zeigt
  die App **alle** gültigen Zerlegungen mit den zugehörigen Ordnungszahlen, statt sich für
  eine zu entscheiden. Genau hier übersieht man von Hand die richtige Variante.

### 5.2 Rolle 2: Matrix

Das Periodensystem ist ein Gitter mit Koordinaten, und viele Rätsel meinen die Position,
nicht das Element:

- **Position ↔ Element** in beide Richtungen: Gruppe/Periode als Koordinatenpaar,
  fortlaufender Zellindex, Position innerhalb des Blocks.
- **Leserichtungen** wie bei jedem Gitter: zeilenweise, spaltenweise, Diagonalen, Spirale,
  im Bustrophedon.
- **Umschaltbare Layouts** – und das ist kein Schönheitsdetail: Ob die Lanthanoide und
  Actinoide ausgelagert sind (18-Spalten-Standard) oder eingegliedert (32 Spalten),
  verschiebt sämtliche Koordinaten. Ein Rätsel meint immer eine bestimmte Darstellung.
  Beide Varianten plus eine lückenlose Kompaktform sind wählbar; Koordinatenanzeige und
  Leserichtungen folgen der Wahl.

Die Leserichtungen sind dieselbe Funktion wie die Extraktionshelfer aus Abschnitt 4.2 – das
Gitter wird einfach als deren Eingabe durchgereicht, statt die Logik zweimal zu bauen.

### 5.3 Rolle 3: Zeichenfläche

Man markiert Elemente und liest das entstehende Muster – als Form, als Buchstabenfolge oder
als beides.

**Markieren** auf mehreren Wegen, weil eine Aufgabe mal Elemente und mal Eigenschaften
nennt:

- direkt antippen
- Liste einwerfen: `Fe, Ca, 26, Gold, Au` – gemischt aus Symbol, Name und Ordnungszahl
- **regelbasiert:** alle Edelgase, alle mit Schmelzpunkt über 1000 °C, alle mit Primzahl
  als Ordnungszahl, alle deren Name ein „X" enthält. Jeder Suchfilter lässt sich in eine
  Markierung überführen.
- Mengenoperationen: hinzufügen, abziehen, schneiden, umkehren

**Mehrere Markierungsebenen** mit eigenen Farben, einzeln ein- und ausblendbar – für
Rätsel, die zwei Gruppen gegeneinanderstellen.

**Interpretieren** in zwei Richtungen:

- *Grafisch:* Ansicht „nur Markierungen" – der Rest ausgegraut oder leer. Erst so erkennt
  man die Buchstaben, Pfeile oder Ziffern, die die markierten Zellen bilden. Als Bild
  exportierbar, damit man es ins Team schicken kann.
- *Textuell:* die markierten Zellen in wählbarer Reihenfolge ausgelesen – zeilenweise,
  spaltenweise, nach Ordnungszahl oder in der Reihenfolge des Antippens – und wahlweise
  als Symbol, Name, Ordnungszahl oder Anfangsbuchstabe ausgegeben. Das Ergebnis geht
  direkt zurück in die Werkbank.

Markierungssätze lassen sich benennen, speichern und über den Link teilen.

### 5.4 Ansicht und Bedienung

- Zoom und Pan (Pinch, Doppeltipp, `+`/`−`), „einpassen"-Knopf, dazu ein Großzellen-Modus
  fürs Handy bei Nacht.
- Suche über Name, Symbol und Ordnungszahl, dazu Eigenschaftssuche (`Schmelzpunkt > 1000`).
  Treffer werden **im Gitter** hervorgehoben statt in eine Liste herausgerissen – man sieht
  die Position mit, und genau die ist oft die Antwort.
- Detailkarte je Element mit allen Attributen, jeder Wert einzeln kopierbar.
- Vollständig offline; die Elementdaten werden mit ausgeliefert.

### 5.5 Datenbasis – erledigt

Die Elementdaten sind **ausgelesen und liegen im Repo**: `data/elements.json`, 32 KB, 118
Elemente. Quelle ist die Tabelle
[`Periodic_table_(German)_EN.svg`](https://de.wikipedia.org/wiki/Datei:Periodic_table_(German)_EN.svg)
aus der deutschen Wikipedia.

Neun Felder je Element:

`ordnungszahl` · `symbol` · `name` · `atomgewicht` · `elektronenkonfiguration` ·
`elektronegativitaet` · `serie` · `aggregatzustand` · `radioaktiv`

Drei davon stehen in der Grafik nicht als Text, sondern stecken in der Darstellung und
wurden über die Legende aufgelöst: die **Serie** in der Füllfarbe der Zelle, der
**Aggregatzustand** in der Farbe des Symbols, die **Radioaktivität** in der Farbe der
Ordnungszahl.

Ausgelesen hat das [`tools/import-elements.py`](tools/import-elements.py). Das Skript
bleibt im Repo, damit der Schritt nachvollziehbar und bei einer neuen Fassung der Grafik
wiederholbar ist. Die SVG selbst wurde nach dem Import wieder entfernt.

Geprüft wird beim Import auf lückenlose Ordnungszahlen 1–118, eindeutige Symbole und Namen
und vollständige Pflichtfelder; bei Verstoß bricht das Skript ab. Unabhängig davon von Hand
gegengeprüft: Die Summe der Schalenbesetzung ergibt bei allen 118 Elementen exakt die
Ordnungszahl – damit sind Zuordnung und das Zusammensetzen der umbrochenen Konfigurationen
bestätigt.

Herkunft, Feldbedeutungen und die Eigenheiten dieser Quelle stehen in
[`data/QUELLE.md`](data/QUELLE.md). Übernommen wurden die *Daten*, nicht die Grafik.

Für die Gitteransicht (5.2) fehlen Gruppe und Periode. Die sind bewusst nicht Teil des
Datensatzes: Die Stellung im Periodensystem ist Allgemeinwissen und hängt nicht an dieser
Quelle – sie ergibt sich aus dem Layout, das die App ohnehin selbst zeichnet.

### 5.6 Konsequenz für die Reihenfolge

Die drei Rollen sind unterschiedlich teuer. Rolle 1 ist **reine Datenarbeit** – sie braucht
nur die JSON-Tabelle und den generischen Attribut-Codec, keine eigene Ansicht. Sie kann
deshalb schon in Phase 1 mitlaufen und ist dort sofort nützlich. Das aufwendige Gitter mit
Zoom, Layouts und Markierungsebenen (Rollen 2 und 3) bleibt wie besprochen Phase 3.

---

## 6. UX-Konzept

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

## 7. Technisches Konzept

### 7.1 Build-Schritt

> **Entschieden:** Variante C (Vite + TypeScript + Svelte), der Build läuft ausschließlich
> in GitHub Actions. Ausgeliefert wird ein fertiger Ordner. Die Begründung und die
> verworfenen Alternativen stehen hier, weil die Entscheidung den Rest des Abschnitts
> erklärt.

**Vorweg, weil es leicht zu verwechseln ist:** Ein Build-Schritt verstößt *nicht* gegen die
Vorgabe „statische App ohne aktive Serverseite". Die Vorgabe betrifft die *Laufzeit* – was
passiert, wenn jemand die Seite aufruft. Ein Build läuft vorher, einmalig, auf dem eigenen
Rechner oder in der CI. Heraus kommen HTML-, JS- und CSS-Dateien, die auf dem Webspace
liegen. Für den Browser ist das Ergebnis nicht unterscheidbar von handgeschriebenen
Dateien. Kein Server, keine Datenbank, keine Laufzeitabhängigkeit.

*Ohne* Build sind die Dateien, die man schreibt, exakt die Dateien, die der Browser lädt.
Man bearbeitet `app.js`, lädt neu, fertig. Kein Node.js, kein `npm`, kein `node_modules`.
Veröffentlichen heißt: Ordner kopieren.

*Mit* Build schreibt man TypeScript und Svelte-Komponenten, und ein Werkzeug (Vite)
übersetzt das nach `dist/`. Man braucht Node.js, `npm install`, und im Fehlerfall debuggt
man Code, der nicht wörtlich der ist, den man geschrieben hat (dafür gibt es Sourcemaps).

**Was der Build hier konkret einbringt:**

| | Nutzen für dieses Projekt |
|---|---|
| **Service-Worker-Manifest** | Für „funktioniert offline" braucht der Service Worker eine Liste *aller* Dateien plus Versionsstempel. Die pflegt man entweder von Hand – und vergisst genau die eine SVG-Datei, die dann im Funkloch fehlt – oder man lässt sie erzeugen. Das ist das stärkste Argument. |
| **TypeScript** | Die Codec-Tabellen sind stumpfe Fleißarbeit und genau da passieren Fehler. Typen fangen einen Teil davon beim Schreiben ab statt nachts vor Ort. |
| **Komponenten (Svelte)** | Die Werkbank mit Schrittkette, das Periodensystem mit Markierungsebenen – das ist echte Zustandsverwaltung. In reinem JS baut man die von Hand nach. |
| **Bündeln, Minifizieren, Nachladen** | Kleinere Downloads, und große Daten (Elementdetails, Wörterbuch) landen automatisch in getrennten Paketen, die erst bei Bedarf geladen werden. |

**Was er kostet:** Node.js als Voraussetzung, ein paar hundert MB `node_modules`,
gelegentliche Werkzeug-Updates – und der ehrlichste Einwand: Ein Projekt ohne Build läuft
in fünf Jahren noch, wenn man es anfasst. Eines mit Build baut vielleicht nicht mehr, weil
Abhängigkeiten verrottet sind. Das ist ein reales Argument, kein theoretisches.

**Drei Möglichkeiten, von schlank nach komfortabel:**

- **A – gar kein Build.** Plain JavaScript, ES-Module, Web Components. Dateiliste im
  Service Worker von Hand gepflegt. Maximale Haltbarkeit, keinerlei Werkzeugkette.
  Preis: keine Typprüfung, Zustandsverwaltung zu Fuß, und die Offline-Dateiliste ist eine
  dauerhafte Fehlerquelle.
- **B – Minimalbuild.** Wie A, aber ein etwa dreißigzeiliges Node-Skript ohne
  Abhängigkeiten erzeugt die Service-Worker-Dateiliste. Typprüfung optional über JSDoc-
  Kommentare und `tsc --noEmit` – geprüft wird, ausgeliefert wird trotzdem reines JS.
  Ein sehr vernünftiger Mittelweg.
- **C – Vite + TypeScript + Svelte** (ursprünglicher Vorschlag). Voller Komfort,
  `vite-plugin-pwa` erledigt das Offline-Thema zuverlässig.

**Entscheidung: C**, mit zwei Einschränkungen aus Abschnitt 7.2. Ausschlaggebend ist, dass
„funktioniert garantiert vollständig offline" ein Abnahmekriterium ist und die
Service-Worker-Dateiliste genau der Punkt ist, an dem Handarbeit zuverlässig schiefgeht.

Der Haupteinwand gegen C – der Werkzeugkasten – wiegt hier leichter als sonst, weil der
Build nur in GitHub Actions läuft. Und wenn der Baum in einigen Jahren verrottet, bricht
der **Build**, nicht die **Seite**: Was auf dem Webspace liegt, läuft unverändert weiter,
und von jedem Build wird zusätzlich ein ZIP archiviert. Der Schaden im schlimmsten Fall
ist also „vorerst keine neuen Versionen", nicht „App weg".

### 7.2 Stack und Abhängigkeiten

- **Vite + TypeScript + Svelte**, Ausgabe als rein statische Dateien: kleine Bundles,
  wenig Laufzeit-Overhead, Komponenten ohne Zeremonie.
- **Kein UI-Framework-Ballast**, eigenes CSS mit Custom Properties für die Themes.
- **TypeScript strikt** – die Codec-Tabellen sind fehleranfällig, Typen fangen das früh.

**Abhängigkeiten werden bewusst kleingehalten:**

- **Zur Laufzeit: null.** Kein CDN, keine Schriftart von fremden Servern, keine API, kein
  Analytics. Alles liegt im ausgelieferten Ordner. Das ist ohnehin Voraussetzung dafür,
  dass die App im Funkloch funktioniert – jede Laufzeit-Abhängigkeit wäre gleichzeitig ein
  Offline-Fehler.
- **Zur Bauzeit: vier direkte Pakete** – Vite, Svelte, TypeScript, Vitest. Keine
  Utility-Bibliotheken, keine Komponentensammlungen.
- **Kein Workbox / `vite-plugin-pwa`.** Ursprünglich vorgesehen, aber gestrichen: Der
  Service Worker dieser App ist simpel – beim Installieren alles in den Cache, danach
  cache-first. Das sind rund vierzig Zeilen selbst geschrieben, und die Dateiliste erzeugt
  ein kleines eigenes Vite-Plugin. Damit fällt der größte einzelne Abhängigkeitsbaum weg,
  und ausgerechnet der offline-kritische Teil bleibt Code, den wir vollständig verstehen.
- `package-lock.json` liegt im Repo, der Build läuft mit `npm ci`, Actions sind auf
  Versionen gepinnt → reproduzierbar, keine stillen Updates.

Ehrlich dazugesagt: Vite bringt transitiv einige Dutzend Pakete mit (esbuild, Rollup,
PostCSS). Vollständig ohne fremden Code ginge nur Variante B aus 7.1. Die obigen Regeln
begrenzen den Kreis auf etablierte Werkzeuge und halten alles fern, was zur Laufzeit im
Browser landet.

### 7.3 Projektstruktur

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

### 7.4 Die Codec-Schnittstelle

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

### 7.5 Zustand und Teilen

- Laufender Zustand in `localStorage`, überlebt Neuladen und Akku-Sparmodus.
- Teilen: Werkbank-Zustand als JSON → komprimieren → **URL-Fragment** (`#w=…`). Das
  Fragment wird nie an einen Server geschickt; die App funktioniert dadurch ohne Backend
  und trotzdem kollaborativ genug fürs Team.

### 7.6 Offline / PWA

- Selbst geschriebener Service Worker (~40 Zeilen, siehe 7.2): beim Installieren wird die
  gesamte App-Shell inklusive aller Codec-Tabellen und SVGs in den Cache gelegt, danach
  wird cache-first ausgeliefert → **funktioniert im Flugmodus vollständig**, das ist
  Abnahmekriterium. Die Dateiliste erzeugt der Build, damit nichts vergessen wird.
- Scope und Pfade relativ, damit der Service Worker auch in einem Unterordner greift.
- Große Daten (Elementdetails, Wörterbuch, n-Gramme) als getrennte Chunks, im Hintergrund
  nachgeladen und in IndexedDB gehalten – die App startet auch ohne sie.
- Bewusst **vor** der Veranstaltung einmal „vollständig laden"-Knopf anbieten.
- Installierbar auf Homescreen und Desktop.

### 7.7 Qualitätssicherung

Ein Tippfehler in einer Morse- oder Braille-Tabelle ist im Hunt fatal und fällt nicht auf.
Deshalb:

- **Round-Trip-Tests pro Codec:** `decode(encode(x)) === x` für zufällige Eingaben. Billig,
  fängt fast alle Tabellenfehler.
- **Vollständigkeitstests:** jeder Codec deckt A–Z und 0–9 ab oder deklariert die Lücke.
- Goldene Testfälle aus bekannten Rätseln.
- Vitest, CI über GitHub Actions.

### 7.8 Ortsunabhängigkeit

Die App soll unter `https://huntkit.kanonenwiese.de` laufen, aber genauso in einem
Unterordner einer beliebigen anderen Domain – **ohne neuen Build**. Drei Regeln stellen
das sicher:

- **Nur relative Pfade** (`base: './'`). Nirgendwo ein Hostname, nirgendwo ein führender
  Schrägstrich. Das gebaute Verzeichnis ist damit ein Ordner, den man irgendwohin kopiert.
- **Hash-Routing** (`…/#/werkbank`) statt History-API. Auf einfachem Webspace gibt es keine
  Rewrite-Regel, die Deep-Links auf `index.html` umbiegt; mit Hash-Routing braucht es
  keine – kein `.htaccess`, keine Serverkonfiguration, funktioniert auch in einem
  Unterordner.
- **Service Worker mit relativem Scope**, liegt neben `index.html`.

Optional für später: ein zusätzlicher Build, der alles in *eine* HTML-Datei einbettet – als
Notfallkopie auf dem Stick, die auch ohne Webserver aufgeht. Die installierte PWA deckt den
Fall eigentlich ab, aber Redundanz kostet hier wenig.

### 7.9 Deployment

Push auf `main` → GitHub Actions baut → das Ergebnis landet auf dem Webspace. Kein
Handgriff deinerseits.

```
Push auf main
  └─ GitHub Actions
       ├─ npm ci && npm test && npm run build     → dist/
       ├─ Upload dist/ per SFTP nach                                        
       │     /home/webzwenka/kanonenwiese.de/huntkit
       └─ dist/ zusätzlich als ZIP ans Build anhängen
```

- **Ziel:** `/home/webzwenka/kanonenwiese.de/huntkit` per **SFTP**, erreichbar unter
  `https://huntkit.kanonenwiese.de`. Das Verzeichnis ist leer, es wird also nichts
  überschrieben; der Upload bleibt strikt auf dieses Verzeichnis beschränkt.
- **Anmeldung per Passwort.** Zugangsdaten liegen ausschließlich als GitHub Secrets, nie
  im Repo:

  | Secret | Inhalt |
  |---|---|
  | `DEPLOY_HOST` | SFTP-Servername des Webspace |
  | `DEPLOY_USER` | Benutzername (vermutlich `webzwenka`) |
  | `DEPLOY_PASSWORD` | das Passwort |
  | `DEPLOY_PATH` | `/home/webzwenka/kanonenwiese.de/huntkit` |
  | `DEPLOY_PORT` | nur nötig, falls der Webspace nicht Port 22 verwendet |
  | `DEPLOY_KNOWN_HOSTS` | optional, empfohlen: die `known_hosts`-Zeile des Servers |

  Hochgeladen wird mit `lftp` über `sftp://`. Das Passwort wird als Umgebungsvariable
  `LFTP_PASSWORD` übergeben (`lftp --env-password`), damit es nicht in der Kommandozeile
  und damit in der Prozessliste steht. GitHub maskiert Secrets zusätzlich in den Logs.
- **Host-Schlüssel prüfen.** Ohne `DEPLOY_KNOWN_HOSTS` müsste der Upload jeden beliebigen
  Serverschlüssel akzeptieren. Mit hinterlegter `known_hosts`-Zeile fällt diese Lücke weg –
  bei Passwort-Anmeldung wiegt das schwerer als bei Schlüsseln, weil sonst das Passwort
  selbst an einen falschen Server gehen könnte.
- **Keine fremden Marketplace-Actions für den Upload.** Verwendet werden nur die offiziellen
  `actions/checkout` und `actions/setup-node`, beide auf Version gepinnt, dazu ein normaler
  `rsync`- oder `lftp`-Aufruf. Begründung: Eine Deploy-Action aus dem Marketplace ist genau
  die Art externer Abhängigkeit, die vermieden werden soll – und sie bekommt die
  Zugangsdaten zum Webspace zu sehen.
- **Upload nur nach grünen Tests** und nur bei Push auf `main`, sonst bleibt die alte
  Version stehen.
- Der Upload spiegelt `dist/` in das Zielverzeichnis und räumt dort auf, was nicht mehr
  dazugehört (`mirror -R --delete`). Das betrifft ausschließlich
  `/home/webzwenka/kanonenwiese.de/huntkit`.
- **Jeder Build hängt `dist/` zusätzlich als ZIP an.** Herunterladen, irgendwo entpacken,
  läuft. Damit ist die Veröffentlichung nie an GitHub gebunden, und alte Stände bleiben
  greifbar – wichtig, wenn kurz vor der Veranstaltung etwas schiefgeht.
- Auf Wunsch zusätzlich GitHub Pages als Zweitadresse. Kostet eine Zeile und ist ein
  brauchbarer Ausweichweg, wenn der Webspace klemmt.

---

## 8. Roadmap

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **0 – Gerüst** | Vite/Svelte/TS, eigener Service Worker, Dark Theme, Actions-Build + Upload auf den Webspace | Installierbare leere App unter huntkit.kanonenwiese.de, offline lauffähig |
| **1 – Textcodes** | Codec-Registry, Werkbank, ABC123, ASCII (dez/bin/hex), NATO, Morse, Caesar + Brute-Force-Wand, Zahlensysteme, Element-Attribut-Codec (§5.1) | Bereits die Hälfte von `development.md`, sofort einsetzbar |
| **2 – Visuelle Codes** | SVG-Glyphen + Visual Picker für Braille, Winker, Hexahue, Flaggen, Templer, Fingeralphabet | Der eigentliche Unterschied zu Webseiten-Tools |
| **3 – Periodensystem & Widerstände** | Gitter mit Layouts, Zoom, Suche, Markierungsebenen, Musteransicht (§5.2/5.3), Widerstandscode | `development.md` vollständig abgedeckt |
| **4 – Identify** | Sniffer, n-Gramm-Sprachmodell, Rangliste | „Was ist das überhaupt?" in einem Schritt |
| **5 – Hunt-Extras** | Extraktionshelfer, weitere Chiffren, Wortmuster/Anagramm, QR-Scan, Koordinaten, Link-Sharing, Nacht-Ausrüstung | Wettbewerbsfähig auch beim Mystery Hunt |

Phasen 0–3 liefern das, was in `development.md` steht. 4 und 5 sind der Vorschlag darüber
hinaus – Phase 1 ist bereits allein benutzbar, jede weitere Phase ist ein eigenständiger
Zugewinn.

Das Periodensystem ist bewusst auf zwei Phasen verteilt: Die Schlüsselfunktion (§5.1) ist
reine Datenarbeit ohne eigene Ansicht und läuft schon in Phase 1 mit; das Gitter mit
Markierungen (§5.2/5.3) folgt in Phase 3. So ist die Nachschlagefunktion früh verfügbar,
ohne die visuellen Codes zu verzögern.

---

## 9. Risiken und offene Punkte

- **Lizenzen bei Daten und Bildern.** Elementdaten siehe 5.5 – Herkunft dokumentieren.
  Glyphen selbst zeichnen statt Grafiken zu übernehmen. Beim Wörterbuch auf die Lizenz
  achten (freie Wortlisten, Wiktionary-Ableitungen).
- **Zugangsdaten zum Webspace.** Liegen als GitHub Secrets und sind damit nur so gut
  geschützt wie das GitHub-Konto. Wenn möglich einen eigenen SSH-Schlüssel nur für das
  Deployment anlegen, dessen Zugriff auf das Zielverzeichnis beschränkt ist – dann ist im
  schlimmsten Fall die Webseite betroffen und nicht der ganze Webspace.
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

- **Periodensystem-Layouts.** Rätsel setzen stillschweigend eine bestimmte Darstellung
  voraus. Die Layoutwahl muss in der Oberfläche sichtbar sein, sonst liest man Koordinaten
  im falschen Raster ab und merkt es nicht.

### Zu klären

1. **Zugang für das Deployment:** SSH-Schlüssel oder Passwort? Ein eigener Schlüssel nur
   für das Deployment wäre sauberer – den öffentlichen Teil legst du auf dem Webspace ab,
   den privaten als GitHub Secret.
2. Gibt es Rätselbeispiele aus früheren Jahren, an denen wir die Extraktions- und
   Markierungsfunktionen ausrichten können? Das wäre die beste Prüfung, ob wir richtig
   liegen.
