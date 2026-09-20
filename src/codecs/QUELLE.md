# Herkunft der Zeichentabellen

Maßgeblich für die visuellen Codes ist das **Regelheft der Dortmunder Nachtschicht
2026** („Infos, Regeln, Hinweise“, 22 Seiten). Damit gelten genau die Varianten,
die bei der Veranstaltung auch benutzt werden — bei mehrdeutigen Codes wie dem
Templercode ist das der entscheidende Punkt.

| Code | Anhang | Wie übernommen |
|---|---|---|
| Fingeralphabet | B | Tafel übernommen, in 30 Zeichen zerschnitten — Lizenz siehe unten |
| Braille | D | bestätigt — Aufbau A–J nur Punkte 1/2/4/5, K–T plus Punkt 3, Ziffern als A–J |
| Morse | E | bestätigt gegen die vorhandene Tabelle |
| Templercode | F | Formen und Buchstabenpaare abgelesen, Beschriftungen bei 700 dpi geprüft |
| Winkeralphabet | G | Armstellungen abgelesen, teilweise zusätzlich aus den Pixeln bestimmt |
| Hexahue | M | Farbfelder maschinell ausgelesen |
| Widerstandsfarbcode | O | bestätigt, samt beider Beispiele der Tafel |
| Umlautregel | Regelteil | „Ä → AE, ß → SS, sofern nicht anders auf dem Rätsel vermerkt“ |

Übernommen wurden die **Zuordnungen**, nicht die Grafiken. Alle Zeichen der App
sind eigene SVG-Zeichnungen.

## Woran die Tabellen geprüft sind

Jede Tabelle hat mindestens eine Probe, die unabhängig von der Abschrift ist:

- **Braille** — die Punktmuster ergeben die bekannten Unicode-Codepunkte ab U+2800.
- **Hexahue** — jeder Buchstabe benutzt alle sechs Farben genau einmal, und von
  einem Buchstaben zum nächsten tauschen genau zwei *benachbarte* Felder die
  Plätze. Beim Auslesen verrutschte Felder würden beides verletzen.
- **Winkeralphabet** — 26 Buchstaben ergeben 26 verschiedene Paare aus acht
  Richtungen; keine Stellung kommt doppelt vor.
- **Widerstandsfarbcode** — die beiden Widerstände, die die Tafel abbildet,
  werden nachgerechnet: gelb-violett-schwarz-orange ergibt 470 kΩ,
  blau-grau-rot ergibt 6,8 kΩ.
- **Templercode** — die zweite Hälfte des Alphabets trägt einen Punkt, die erste
  nicht.

## Eigenheiten dieser Quelle

- **Templercode:** Die Zuordnung der Buchstabenpaare folgt keiner Rechenregel.
  Kreuz 1 hat A/O, B/P, C/Q, D/R der Reihe nach, Kreuz 2 aber H/S, F/T, G/U, E/V.
  Das ist so abgelesen und darf nicht „glattgezogen“ werden. **I und J teilen
  sich eine Form** — beim Entschlüsseln bleibt die Stelle mehrdeutig, die App
  liefert I.
- **Winkeralphabet:** Die Richtungen sind aus Sicht der Betrachterin notiert, so
  wie die Tafel zeichnet.
- **Fingeralphabet:** Einziger Code, dessen Zeichen keine eigene Zeichnung sind.
  Die Tafel stammt vom Landesverband Bayern der Gehörlosen e. V. und steht unter
  CC BY-SA 4.0; sie ist in die 30 Einzelzeichen zerschnitten und auf Schwarzweiß
  reduziert. Die Bilder stehen deshalb weiterhin unter CC BY-SA 4.0 — Einzelheiten
  in [`public/finger/LIZENZ.md`](../../public/finger/LIZENZ.md). Die
  Namensnennung erscheint in der App unter dem Zeichenraster. Der übrige
  Quellcode ist davon nicht berührt.
