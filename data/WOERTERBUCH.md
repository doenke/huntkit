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

# Englisches Wörterbuch

`woerter-en.txt` enthält 277 036 englische Wörter für Wortmuster und Anagramme
beim Mystery Hunt.

- **Quellen:** [SCOWL](http://wordlist.aspell.net/) über das npm-Paket
  [wordlist-english](https://github.com/jacksonrayhamilton/wordlist-english) 1.2.1
  (Stufen 10–70, Varianten english, american, british) und
  [an-array-of-english-words](https://github.com/words/an-array-of-english-words) 2.0.0
- **Lizenzen:** SCOWL-Lizenz (frei, Copyright-Hinweis muss jeder Kopie beiliegen)
  und MIT – beide Texte liegen als `woerter-en-LIZENZ.txt` neben der Liste und
  werden mit ausgeliefert.
- **Erzeugt mit:** [`tools/import-woerter-en.mjs`](../tools/import-woerter-en.mjs)

## Bearbeitung

Kleingeschrieben, nur a–z und mindestens zwei Buchstaben – Genitive wie
„aaron's“ fallen weg. **Vorne stehen die 115 240 Wörter aus SCOWL**, geordnet
nach dessen Gebräuchlichkeitsstufen (10 = sehr häufig, 70 = selten), innerhalb
einer Stufe alphabetisch. **Dahinter folgen 161 796 seltene Wörter** aus
an-array-of-english-words, die SCOWL bis Stufe 70 nicht kennt. Beim Mystery
Hunt ist die Lösung oft ein seltenes Wort; es soll gefunden werden, nur eben
weiter unten.

## Größe und Offline-Betrieb

Die Liste ist 2,8 MB groß und wird wie die deutsche erst beim ersten Suchen
gebraucht, liegt aber für den Offline-Betrieb im Cache des Service Workers.
Damit nicht jedes Update der App sie erneut herunterlädt, trägt jede Datei im
Cache ihren Inhalts-Hash; ein neuer Service Worker übernimmt Unverändertes aus
dem alten Cache.
