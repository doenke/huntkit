/**
 * Erzeugt public/woerter-en.txt, die englische Wortliste.
 *
 * Vorne stehen die Wörter aus SCOWL (Paket „wordlist-english“), geordnet
 * nach dessen Gebräuchlichkeitsstufen 10 bis 70 – daraus wird in der App die
 * Rangfolge der Treffer, wie bei der deutschen Liste die Häufigkeit. Dahinter
 * folgen die übrigen Wörter aus „an-array-of-english-words“: Beim Mystery
 * Hunt ist die Lösung oft ein seltenes Wort, und das soll gefunden werden –
 * nur eben weiter unten.
 *
 * Aufruf:
 *   node tools/import-woerter-en.mjs <wordlist-english/package> <an-array-of-english-words/package>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [scowl, weitere] = process.argv.slice(2);
if (!scowl || !weitere) {
  console.error('Aufruf: node tools/import-woerter-en.mjs <wordlist-english> <an-array-of-english-words>');
  process.exit(1);
}

const STUFEN = [10, 20, 35, 40, 50, 55, 60, 70];
// Allgemeines Englisch zuerst, dann was nur amerikanisch oder britisch ist.
const VARIANTEN = ['english', 'american', 'british'];

const gesehen = new Set();
const woerter = [];
function nimm(wort) {
  const klein = String(wort).toLowerCase().trim();
  // Nur echte Wörter: Buchstaben a–z, mindestens zwei. Genitive („aaron's“) fallen weg.
  if (!/^[a-z]{2,}$/.test(klein) || gesehen.has(klein)) return;
  gesehen.add(klein);
  woerter.push(klein);
}

for (const stufe of STUFEN) {
  for (const variante of VARIANTEN) {
    const liste = JSON.parse(readFileSync(join(scowl, `${variante}-words-${stufe}.json`), 'utf8'));
    liste.forEach(nimm);
  }
}
const ausScowl = woerter.length;

const rest = JSON.parse(readFileSync(join(weitere, 'index.json'), 'utf8'));
rest.forEach(nimm);

writeFileSync('public/woerter-en.txt', woerter.join('\n') + '\n', 'utf8');
console.log(`${woerter.length} Wörter (${ausScowl} aus SCOWL, ${woerter.length - ausScowl} seltene) -> public/woerter-en.txt`);
