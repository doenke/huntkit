import { zeichenCodec } from './hilfen';
import type { Codec, Glyph } from './types';

/**
 * Braille, 6 Punkte.
 *
 * Die Punkte sind von jeher durchnummeriert: links von oben nach unten 1, 2, 3 –
 * rechts 4, 5, 6. Genau diese Nummern stehen unten in der Tabelle, alles andere
 * (Unicode-Zeichen und Zeichnung) wird daraus berechnet. So gibt es nur eine
 * Stelle, an der ein Tippfehler entstehen kann, statt drei.
 */

const PUNKTE: ReadonlyArray<readonly [zeichen: string, punkte: string]> = [
  ['A', '1'], ['B', '12'], ['C', '14'], ['D', '145'], ['E', '15'],
  ['F', '124'], ['G', '1245'], ['H', '125'], ['I', '24'], ['J', '245'],
  ['K', '13'], ['L', '123'], ['M', '134'], ['N', '1345'], ['O', '135'],
  ['P', '1234'], ['Q', '12345'], ['R', '1235'], ['S', '234'], ['T', '2345'],
  ['U', '136'], ['V', '1236'], ['W', '2456'], ['X', '1346'], ['Y', '13456'],
  ['Z', '1356'],
  // Deutsche Umlaute und Eszett
  ['Ä', '345'], ['Ö', '246'], ['Ü', '1256'], ['ß', '2346'],
  // Das Zahlzeichen: danach stehen A–J für die Ziffern 1–9 und 0.
  ['#', '3456']
];

/** Unicode legt die Punkte als Bitmuster ab: Punkt 1 ist Bit 0, Punkt 6 ist Bit 5. */
function alsZeichen(punkte: string): string {
  let muster = 0;
  for (const ziffer of punkte) muster |= 1 << (Number(ziffer) - 1);
  return String.fromCodePoint(0x2800 + muster);
}

const NACH_PUNKTEN = new Map(PUNKTE.map(([zeichen, punkte]) => [zeichen, punkte]));

const zeichen = zeichenCodec({
  tabelle: PUNKTE.map(([z, punkte]) => [z, alsZeichen(punkte)] as const),
  trenner: '',
  worttrenner: '/'
});

export const braille: Codec = {
  id: 'braille',
  name: 'Braille',
  beschreibung:
    'Sechs Punkte, links 1–2–3, rechts 4–5–6.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle(),

  zeichne(gesucht): Glyph | null {
    // Erst genau, dann großgeschrieben – siehe Eszett-Hinweis in hilfen.ts.
    const punkte = NACH_PUNKTEN.get(gesucht) ?? NACH_PUNKTEN.get(gesucht.toUpperCase());
    if (punkte === undefined) return null;
    const gesetzt = new Set([...punkte].map(Number));
    // Punkt n: Spalte aus (n-1)/3, Zeile aus (n-1)%3
    const kreise = Array.from({ length: 6 }, (_, i) => {
      const nummer = i + 1;
      const x = i < 3 ? 14 : 34;
      const y = 14 + (i % 3) * 20;
      return gesetzt.has(nummer)
        ? `<circle cx="${x}" cy="${y}" r="7" fill="currentColor"/>`
        : `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25"/>`;
    });
    return { viewBox: '0 0 48 68', inhalt: kreise.join('') };
  },

  passt: (eingabe) => {
    const relevant = [...eingabe].filter((z) => !/\s/.test(z));
    if (relevant.length === 0) return 0;
    const braillezeichen = relevant.filter((z) => {
      const punkt = z.codePointAt(0) ?? 0;
      return punkt >= 0x2800 && punkt <= 0x283f;
    });
    return braillezeichen.length / relevant.length;
  }
};
