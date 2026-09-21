import { anteil, zeichenCodec } from './hilfen';
import type { Codec, Glyph } from './types';

const TABELLE = [
  ['A', '.-'], ['B', '-...'], ['C', '-.-.'], ['D', '-..'], ['E', '.'],
  ['F', '..-.'], ['G', '--.'], ['H', '....'], ['I', '..'], ['J', '.---'],
  ['K', '-.-'], ['L', '.-..'], ['M', '--'], ['N', '-.'], ['O', '---'],
  ['P', '.--.'], ['Q', '--.-'], ['R', '.-.'], ['S', '...'], ['T', '-'],
  ['U', '..-'], ['V', '...-'], ['W', '.--'], ['X', '-..-'], ['Y', '-.--'],
  ['Z', '--..'],
  ['0', '-----'], ['1', '.----'], ['2', '..---'], ['3', '...--'], ['4', '....-'],
  ['5', '.....'], ['6', '-....'], ['7', '--...'], ['8', '---..'], ['9', '----.'],
  // Deutsche Umlaute – auf Schildern und Gedenktafeln keine Seltenheit.
  ['Ä', '.-.-'], ['Ö', '---.'], ['Ü', '..--'], ['ß', '...--..'],
  ['.', '.-.-.-'], [',', '--..--'], ['?', '..--..'], ["'", '.----.'],
  ['!', '-.-.--'], ['/', '-..-.'], ['(', '-.--.'], [')', '-.--.-'],
  ['&', '.-...'], [':', '---...'], [';', '-.-.-.'], ['=', '-...-'],
  ['+', '.-.-.'], ['-', '-....-'], ['_', '..--.-'], ['"', '.-..-.'],
  ['@', '.--.-.']
] as const;

const zeichen = zeichenCodec({ tabelle: TABELLE, trenner: ' ', worttrenner: '/' });

function gruppe(z: string): string {
  if (/[A-Z]/.test(z)) return 'Buchstaben';
  if (/[0-9]/.test(z)) return 'Zahlen';
  if (/[ÄÖÜß]/.test(z)) return 'Umlaute';
  return 'Sonderzeichen';
}

export const morse: Codec = {
  id: 'morse',
  name: 'Morse',
  beschreibung: 'Punkt und Strich.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle().map((e) => ({ ...e, gruppe: gruppe(e.zeichen) })),
  eingabetasten: [
    { titel: '·', einfuegen: '.', hinweis: 'Punkt' },
    { titel: '–', einfuegen: '-', hinweis: 'Strich' },
    { titel: '␣', einfuegen: ' ', hinweis: 'nächstes Zeichen' },
    { titel: '/', einfuegen: ' / ', hinweis: 'nächstes Wort' }
  ],
  /**
   * Punkt und Strich als Balken statt als Satzzeichen.
   *
   * Im Fließtext sitzt der Punkt unten auf der Grundlinie und der Strich in der
   * Mitte – genau das macht eine Morsezeile so mühsam. Hier liegen beide in
   * derselben Spur, gleich dick, der Strich dreimal so lang wie der Punkt. Das
   * sind auch die echten Verhältnisse: eine Zeiteinheit gegen drei.
   */
  zeichneCode(gruppe): Glyph | null {
    const symbole = [...gruppe];
    if (symbole.length === 0 || symbole.some((s) => s !== '.' && s !== '-')) return null;
    const DICKE = 10;
    const LUECKE = 10;
    let x = 0;
    const teile = symbole.map((symbol) => {
      const breite = symbol === '.' ? DICKE : DICKE * 3;
      const rechteck = `<rect x="${x}" y="0" width="${breite}" height="${DICKE}" rx="${DICKE / 2}" fill="currentColor"/>`;
      x += breite + LUECKE;
      return rechteck;
    });
    return { viewBox: `0 0 ${x - LUECKE} ${DICKE}`, inhalt: teile.join('') };
  },

  // Sehr aussagekräftig: Eine Eingabe aus nur Punkten und Strichen ist praktisch
  // immer Morse.
  passt: (eingabe) => anteil(eingabe, /[.\-/]/) ** 2
};
