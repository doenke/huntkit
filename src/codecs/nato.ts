import { anteil, zeichenCodec } from './hilfen';
import type { Codec } from './types';
import { nachtschicht, raetselnacht } from './quellen';

const TABELLE = [
  ['A', 'Alfa'], ['B', 'Bravo'], ['C', 'Charlie'], ['D', 'Delta'], ['E', 'Echo'],
  ['F', 'Foxtrott'], ['G', 'Golf'], ['H', 'Hotel'], ['I', 'India'], ['J', 'Juliett'],
  ['K', 'Kilo'], ['L', 'Lima'], ['M', 'Mike'], ['N', 'November'], ['O', 'Oscar'],
  ['P', 'Papa'], ['Q', 'Quebec'], ['R', 'Romeo'], ['S', 'Sierra'], ['T', 'Tango'],
  ['U', 'Uniform'], ['V', 'Victor'], ['W', 'Whiskey'], ['X', 'X-Ray'], ['Y', 'Yankee'],
  ['Z', 'Zulu'],
  ['0', 'Null'], ['1', 'Eins'], ['2', 'Zwei'], ['3', 'Drei'], ['4', 'Vier'],
  ['5', 'Fünf'], ['6', 'Sechs'], ['7', 'Sieben'], ['8', 'Acht'], ['9', 'Neun']
] as const;

const zeichen = zeichenCodec({ tabelle: TABELLE, trenner: ' ', worttrenner: '/' });

export const nato: Codec = {
  id: 'nato',
  name: 'NATO-Alphabet',
  quellen: [nachtschicht('A', 'Buchstabier-Alphabete'), raetselnacht('B', 'NATO-Alphabet')],
  beschreibung: 'Buchstabiertafel der NATO, Ziffern in deutscher Schreibweise.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle().map((e) => ({ ...e, gruppe: /[0-9]/.test(e.zeichen) ? 'Zahlen' : 'Buchstaben' })),
  passt(eingabe) {
    const woerter = eingabe.trim().split(/[\s/]+/).filter((w) => w.length > 0);
    if (woerter.length === 0) return 0;
    const bekannt = new Set(TABELLE.map(([, wort]) => wort.toUpperCase()));
    const treffer = woerter.filter((w) => bekannt.has(w.toUpperCase()));
    return (treffer.length / woerter.length) * anteil(eingabe, /[A-Za-zÄÖÜäöü/-]/);
  }
};
