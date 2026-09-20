import { zeichenCodec } from './hilfen';
import type { Codec, Glyph } from './types';

/**
 * Hexahue: jedes Zeichen ist ein Feld aus 2×3 Farbflächen.
 *
 * Die Tabelle ist aus der Tafel der Nachtschicht ausgelesen (Anhang M). Zwei
 * Eigenschaften bestätigen sie unabhängig und werden von Tests überwacht:
 * Jeder Buchstabe benutzt alle sechs Farben genau einmal, und von einem
 * Buchstaben zum nächsten tauschen genau zwei benachbarte Felder die Plätze.
 */

const FARBWERTE = {
  M: { name: 'magenta', hex: '#ff00ff' },
  R: { name: 'rot', hex: '#ff0000' },
  G: { name: 'grün', hex: '#00d000' },
  Y: { name: 'gelb', hex: '#ffe000' },
  B: { name: 'blau', hex: '#0000ff' },
  C: { name: 'cyan', hex: '#00e5e5' }
} as const;

export type Farbkuerzel = keyof typeof FARBWERTE;

/** Felder in Lesereihenfolge: oben links, oben rechts, Mitte links, … */
const MUSTER: ReadonlyArray<readonly [string, string]> = [
  ['A', 'MRGYBC'], ['B', 'RMGYBC'], ['C', 'RGMYBC'], ['D', 'RGYMBC'], ['E', 'RGYBMC'],
  ['F', 'RGYBCM'], ['G', 'GRYBCM'], ['H', 'GYRBCM'], ['I', 'GYBRCM'], ['J', 'GYBCRM'],
  ['K', 'GYBCMR'], ['L', 'YGBCMR'], ['M', 'YBGCMR'], ['N', 'YBCGMR'], ['O', 'YBCMGR'],
  ['P', 'YBCMRG'], ['Q', 'BYCMRG'], ['R', 'BCYMRG'], ['S', 'BCMYRG'], ['T', 'BCMRYG'],
  ['U', 'BCMRGY'], ['V', 'CBMRGY'], ['W', 'CMBRGY'], ['X', 'CMRBGY'], ['Y', 'CMRGBY'],
  ['Z', 'CMRGYB']
];

const NACH_ZEICHEN = new Map(MUSTER.map(([z, m]) => [z, m]));

const zeichen = zeichenCodec({ tabelle: MUSTER, trenner: ' ', worttrenner: '/' });

export const hexahueMuster = MUSTER;

export const hexahue: Codec = {
  id: 'hexahue',
  name: 'Hexahue',
  beschreibung:
    'Sechs Farbfelder, 2 breit und 3 hoch. Als Text: M magenta, R rot, G grün, Y gelb, B blau, C cyan.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle(),

  passt(eingabe) {
    const stuecke = eingabe.trim().split(/[\s/]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    return stuecke.filter((s) => /^[MRGYBC]{6}$/i.test(s)).length / stuecke.length;
  },

  zeichne(gesucht): Glyph | null {
    const muster = NACH_ZEICHEN.get(gesucht) ?? NACH_ZEICHEN.get(gesucht.toUpperCase());
    if (!muster) return null;
    const felder = [...muster].map((kuerzel, i) => {
      const farbe = FARBWERTE[kuerzel as Farbkuerzel]?.hex ?? '#888';
      const x = (i % 2) * 30;
      const y = Math.floor(i / 2) * 30;
      return `<rect x="${x}" y="${y}" width="30" height="30" fill="${farbe}"/>`;
    });
    return { viewBox: '0 0 60 90', inhalt: felder.join('') };
  }
};
