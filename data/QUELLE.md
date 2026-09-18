# Herkunft der Elementdaten

`elements.json` ist maschinell aus der Periodensystem-Grafik der deutschen Wikipedia
erzeugt worden:

- **Datei:** [`Periodic_table_(German)_EN.svg`](https://de.wikipedia.org/wiki/Datei:Periodic_table_(German)_EN.svg)
- **Ausgelesen am:** 18.09.2026
- **Werkzeug:** [`tools/import-elements.py`](../tools/import-elements.py)

Die SVG selbst liegt nicht im Repo. Übernommen wurden die *Daten*, nicht die Grafik:
Ordnungszahlen, Massen und Stoffeigenschaften sind Fakten und nicht schutzfähig, die
Zeichnung wird nicht weiterverwendet.

## Felder

| Feld | Herkunft in der Grafik |
|---|---|
| `ordnungszahl` | Text, links oben in der Zelle |
| `symbol` | Text, rechts oben |
| `name` | Text |
| `atomgewicht` | Text; Werte in Klammern (instabile Elemente) sind als Zahl übernommen |
| `elektronenkonfiguration` | Text, Schalenbesetzung; bei langen Werten über zwei Zeilen umbrochen |
| `elektronegativitaet` | Text, rechts unten; fehlt bei Edelgasen und den schwersten Elementen (`null`) |
| `serie` | **Füllfarbe der Zelle** |
| `aggregatzustand` | **Farbe des Symbols** (schwarz fest, rot gasförmig, blau flüssig) |
| `radioaktiv` | **Farbe der Ordnungszahl** (gelb radioaktiv, schwarz nicht) |

## Geprüft

Das Importskript bricht ab, wenn eine dieser Bedingungen verletzt ist:

- Ordnungszahlen lückenlos 1–118
- Symbole und Namen jeweils eindeutig
- keine leeren Pflichtfelder

Zusätzlich von Hand gegengeprüft: Die Summe der Schalenbesetzung ergibt bei **allen 118**
Elementen exakt die Ordnungszahl. Das bestätigt unabhängig, dass Zuordnung und
Zeilen-Zusammensetzung stimmen. Elektronegativitäten liegen im erwarteten Bereich
0,7–4,0.

## Eigenheiten dieser Quelle

- **Wasserstoff** hat einen eigenen Grünton, den die Legende nicht aufführt; er ist der
  farblich nächsten Serie (`Nichtmetalle`) zugeordnet. Einzige Stelle, an der die Datei
  nicht für sich selbst spricht.
- **Helium** trägt in dieser Grafik keine Elektronegativität – das ist so gewollt, kein
  Auslesefehler.
- Die Serieneinteilung ist die dieser Grafik: `Ge` und `Sb` zählen hier zu den `Metalle`,
  `Halbmetalle` sind nur `B`, `Si`, `As`, `Te`.
- `Og` erscheint als gasförmig, `Cn` als flüssig – beides sind Vorhersagen der Quelle.
- `Bi` (83) gilt hier als radioaktiv.
