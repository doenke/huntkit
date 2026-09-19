# Herkunft der Zeichentabellen

Maßgeblich für die visuellen Codes ist das **Regelheft der Dortmunder Nachtschicht
2026** („Infos, Regeln, Hinweise“, 22 Seiten). Damit gelten genau die Varianten,
die bei der Veranstaltung auch benutzt werden — bei mehrdeutigen Codes wie dem
Templercode ist das der entscheidende Punkt.

| Code | Anhang | Wie übernommen |
|---|---|---|
| Fingeralphabet | B | **noch offen**, siehe unten |
| Braille | D | bestätigt — Aufbau A–J nur Punkte 1/2/4/5, K–T plus Punkt 3, Ziffern als A–J |
| Morse | E | bestätigt gegen die vorhandene Tabelle |
| Templercode | F | Formen und Buchstabenpaare abgelesen, Beschriftungen bei 700 dpi geprüft |
| Winkeralphabet | G | Armstellungen abgelesen, teilweise zusätzlich aus den Pixeln bestimmt |
| Hexahue | M | Farbfelder maschinell ausgelesen |
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
- **Fingeralphabet:** Noch nicht umgesetzt. Die Tafel im Regelheft stammt vom
  Landesverband Bayern der Gehörlosen e. V. und steht unter CC BY-SA 4.0. Sie
  weiterzuverwenden wäre erlaubt, verlangt aber Namensnennung und dieselbe
  Lizenz für die Ableitung — und widerspräche dem Grundsatz, alle Zeichen selbst
  zu zeichnen. 30 Handformen so nachzuzeichnen, dass sie erkennbar bleiben, ist
  dagegen eine eigene Aufgabe. Das ist eine Entscheidung, keine offene Frage der
  Technik.
