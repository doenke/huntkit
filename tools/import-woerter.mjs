/**
 * Erzeugt public/woerter.txt aus der Wortliste „an-array-of-german-words“.
 *
 * Die Reihenfolge der Quelle bleibt erhalten: Sie ist grob nach Häufigkeit
 * sortiert, und daraus wird in der App die Rangfolge der Treffer. Das ist
 * wichtiger, als es klingt – die Liste enthält auch Bruchstücke, und die
 * stehen hinten.
 *
 * Aufruf:  node tools/import-woerter.mjs <pfad-zur-words.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const quelle = process.argv[2];
if (!quelle) {
  console.error('Aufruf: node tools/import-woerter.mjs <words.json>');
  process.exit(1);
}

const roh = JSON.parse(readFileSync(quelle, 'utf8'));
const gesehen = new Set();
const woerter = [];

for (const eintrag of roh) {
  const wort = String(eintrag).toLowerCase().trim();
  // Nur echte Wörter: Buchstaben samt Umlauten, mindestens zwei Zeichen.
  if (!/^[a-zäöüß]{2,}$/.test(wort)) continue;
  if (gesehen.has(wort)) continue;
  gesehen.add(wort);
  woerter.push(wort);
}

writeFileSync('public/woerter.txt', woerter.join('\n') + '\n', 'utf8');
console.log(`${woerter.length} Wörter -> public/woerter.txt`);
