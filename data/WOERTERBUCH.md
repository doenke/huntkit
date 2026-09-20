# Herkunft des Wörterbuchs

`woerter.txt` enthält 117 369 deutsche Wörter und ist die Grundlage für
Wortmuster- und Anagrammsuche.

- **Quelle:** [an-array-of-german-words](https://github.com/hexapode/an-array-of-german-words)
- **Urheber:** hexapode
- **Lizenz:** MIT
- **Erzeugt mit:** [`tools/import-woerter.mjs`](../tools/import-woerter.mjs)

## Bearbeitung

Kleingeschrieben, auf Einträge aus mindestens zwei Buchstaben beschränkt
(Umlaute und Eszett erlaubt), Doppelte entfernt. **Die Reihenfolge der Quelle
bleibt erhalten** – sie ist grob nach Häufigkeit sortiert, und daraus wird in
der App die Rangfolge der Treffer.

## Was die Liste nicht ist

Sie stammt aus Fließtext und enthält auch Bruchstücke wie „ritik“ oder „ser“.
Die stehen dank der erhaltenen Reihenfolge weit hinten, tauchen bei
Anagrammen aber trotzdem auf. Für ein Rätselwerkzeug ist das vertretbar: Ein
Treffer zu viel kostet einen Blick, ein fehlender Treffer kostet die Nacht.
