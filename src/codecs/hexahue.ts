import { zeichenCodec } from './hilfen';
import type { Codec, Glyph } from './types';
import { nachtschicht, raetselnacht } from './quellen';

/**
 * Hexahue: jedes Zeichen ist ein Feld aus 2×3 Farbflächen.
 *
 * Die Tabelle ist aus der Tafel der Nachtschicht ausgelesen (Anhang M). Zwei
 * Eigenschaften bestätigen sie unabhängig und werden von Tests überwacht:
 * Jeder Buchstabe benutzt alle sechs Farben genau einmal, und von einem
 * Buchstaben zum nächsten tauschen genau zwei benachbarte Felder die Plätze.
 *
 * Ziffern und Satzzeichen stehen in Schwarz, Weiß und Grau. Für die Ziffern
 * gelten entsprechende Proben: je zwei Felder jeder Farbe, und von einer
 * Ziffer zur nächsten tauschen wieder genau zwei benachbarte Felder.
 */

const FARBWERTE = {
  M: { name: 'magenta', hex: '#ff00ff' },
  R: { name: 'rot', hex: '#ff0000' },
  G: { name: 'grün', hex: '#00d000' },
  Y: { name: 'gelb', hex: '#ffe000' },
  B: { name: 'blau', hex: '#0000ff' },
  C: { name: 'cyan', hex: '#00e5e5' },
  // Schwarz als K wie im Druck (CMYK) – S und G sind schon vergeben bzw. missverständlich.
  K: { name: 'schwarz', hex: '#000000' },
  W: { name: 'weiß', hex: '#ffffff' },
  A: { name: 'grau', hex: '#9a9a9a' }
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

/** Ziffern, Punkt, Komma und Leerzeichen der Tafel – maschinell ausgelesen wie die Buchstaben. */
const ZIFFERN: ReadonlyArray<readonly [string, string]> = [
  ['0', 'KAWKAW'], ['1', 'AKWKAW'], ['2', 'AWKKAW'], ['3', 'AWKAKW'], ['4', 'AWKAWK'],
  ['5', 'WAKAWK'], ['6', 'WKAAWK'], ['7', 'WKAWAK'], ['8', 'WKAWKA'], ['9', 'KWAWKA'],
  ['.', 'KWWKKW'], [',', 'WKKWWK'],
  // Das Leerzeichen der Tafel: ganz schwarz. Beim Entschlüsseln wird es zum echten Leerzeichen.
  ['␣', 'KKKKKK']
];

const NACH_ZEICHEN = new Map([...MUSTER, ...ZIFFERN].map(([z, m]) => [z, m]));

const zeichen = zeichenCodec({ tabelle: [...MUSTER, ...ZIFFERN], trenner: ' ', worttrenner: '/' });

export const hexahueMuster = MUSTER;
export const hexahueZiffern = ZIFFERN;

export const hexahue: Codec = {
  id: 'hexahue',
  name: 'Hexahue',
  quellen: [nachtschicht('M', 'Hexahue'), raetselnacht('U', 'Hexahue')],
  beschreibung:
    'Sechs Farbfelder, 2 breit und 3 hoch. Ziffern und Satzzeichen in Schwarz (K), Weiß (W) und Grau (A).',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => {
    const gelesen = zeichen.decode(eingabe);
    return { ...gelesen, text: gelesen.text.replaceAll('␣', ' ') };
  },
  tabelle: () =>
    zeichen.tabelle().map((e) => ({
      ...e,
      gruppe: /[A-Z]/.test(e.zeichen) ? 'Buchstaben' : 'Zahlen und Zeichen'
    })),

  passt(eingabe) {
    const stuecke = eingabe.trim().split(/[\s/]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    return stuecke.filter((s) => /^([MRGYBC]{6}|[KWA]{6})$/i.test(s)).length / stuecke.length;
  },

  zeichne(gesucht): Glyph | null {
    const muster = NACH_ZEICHEN.get(gesucht) ?? NACH_ZEICHEN.get(gesucht.toUpperCase());
    if (!muster) return null;
    // Schwarz und Weiß verschwinden sonst im dunklen bzw. hellen Hintergrund –
    // auf Papier sieht man ein weißes Feld ja auch nur an seinen Nachbarn.
    const grau = /^[KWA]+$/.test(muster);
    const felder = [...muster].map((kuerzel, i) => {
      const farbe = FARBWERTE[kuerzel as Farbkuerzel]?.hex ?? '#888';
      const x = (i % 2) * 30;
      const y = Math.floor(i / 2) * 30;
      return grau
        ? `<rect x="${x + 0.75}" y="${y + 0.75}" width="28.5" height="28.5" fill="${farbe}" stroke="#777" stroke-width="1.5"/>`
        : `<rect x="${x}" y="${y}" width="30" height="30" fill="${farbe}"/>`;
    });
    return { viewBox: '0 0 60 90', inhalt: felder.join('') };
  }
};
