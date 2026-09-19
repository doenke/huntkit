import { zeichenCodec } from './hilfen';
import type { Codec, Glyph } from './types';

/**
 * Templercode: Formen des Malteserkreuzes.
 *
 * Drei Formfamilien in je vier Ausrichtungen, dazu die Mitte. Die zweite Hälfte
 * des Alphabets trägt zusätzlich einen Punkt in der Form.
 *
 * Quelle: Regelheft der Dortmunder Nachtschicht 2026, Anhang F. Die Zuordnung
 * der Buchstabenpaare folgt dort keiner Rechenregel – sie ist so übernommen,
 * wie sie auf der Tafel steht, und darf nicht „glattgezogen“ werden.
 * Besonderheit der Quelle: I und J teilen sich dieselbe Form.
 */

type Form = 'spitze' | 'dreieck' | 'raute' | 'mitte';
type Ausrichtung = 'oben' | 'rechts' | 'unten' | 'links';

const ZEICHEN: ReadonlyArray<readonly [string, Form, Ausrichtung, boolean]> = [
  ['A', 'spitze', 'oben', false],    ['B', 'spitze', 'rechts', false],
  ['C', 'spitze', 'unten', false],   ['D', 'spitze', 'links', false],
  ['E', 'dreieck', 'links', false],  ['F', 'dreieck', 'rechts', false],
  ['G', 'dreieck', 'unten', false],  ['H', 'dreieck', 'oben', false],
  ['I', 'raute', 'oben', false],     ['J', 'raute', 'oben', false],
  ['K', 'raute', 'rechts', false],   ['L', 'raute', 'unten', false],
  ['M', 'raute', 'links', false],    ['N', 'mitte', 'oben', false],
  ['O', 'spitze', 'oben', true],     ['P', 'spitze', 'rechts', true],
  ['Q', 'spitze', 'unten', true],    ['R', 'spitze', 'links', true],
  ['S', 'dreieck', 'oben', true],    ['T', 'dreieck', 'rechts', true],
  ['U', 'dreieck', 'unten', true],   ['V', 'dreieck', 'links', true],
  ['W', 'raute', 'unten', true],     ['X', 'raute', 'oben', true],
  ['Y', 'raute', 'rechts', true],    ['Z', 'raute', 'links', true]
];

const KUERZEL: Record<Form, string> = {
  spitze: 'Sp', dreieck: 'Dr', raute: 'Ra', mitte: 'Mi'
};
const DREHUNG: Record<Ausrichtung, number> = { oben: 0, rechts: 90, unten: 180, links: 270 };

function darstellung(form: Form, richtung: Ausrichtung, punkt: boolean): string {
  if (form === 'mitte') return 'Mi';
  return `${KUERZEL[form]}-${richtung}${punkt ? '+' : ''}`;
}

const NACH_ZEICHEN = new Map(
  ZEICHEN.map(([z, form, richtung, punkt]) => [z, { form, richtung, punkt }])
);

const zeichen = zeichenCodec({
  tabelle: ZEICHEN.map(([z, form, richtung, punkt]) => [z, darstellung(form, richtung, punkt)] as const),
  trenner: ' ',
  worttrenner: '/'
});

/** Ein Arm des Malteserkreuzes, nach oben zeigend. */
const ARM = 'M50,50 L22,6 L50,30 L78,6 Z';

const FORMEN: Record<Form, string> = {
  spitze: '<polyline points="22,6 50,30 78,6" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>',
  dreieck: '<polygon points="36,28 64,28 50,50" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>',
  raute: '<polygon points="50,50 36,28 50,10 64,28" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>',
  mitte: '<polygon points="36,28 64,28 50,50" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><polygon points="36,72 64,72 50,50" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>'
};

const PUNKTORT: Record<Form, [number, number]> = {
  spitze: [50, 16], dreieck: [50, 36], raute: [50, 29], mitte: [50, 50]
};

export const templer: Codec = {
  id: 'templer',
  name: 'Templercode',
  beschreibung:
    'Formen des Malteserkreuzes. Die zweite Hälfte des Alphabets trägt einen Punkt. I und J teilen sich eine Form.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle(),

  zeichne(gesucht): Glyph | null {
    const eintrag = NACH_ZEICHEN.get(gesucht) ?? NACH_ZEICHEN.get(gesucht.toUpperCase());
    if (!eintrag) return null;
    // Das ganze Kreuz blass als Orientierung, die gemeinte Form kräftig darüber.
    const kreuz = [0, 90, 180, 270]
      .map((grad) => `<path d="${ARM}" transform="rotate(${grad} 50 50)" fill="none" stroke="currentColor" stroke-width="1" opacity="0.25"/>`)
      .join('');
    const [px, py] = PUNKTORT[eintrag.form];
    const punkt = eintrag.punkt ? `<circle cx="${px}" cy="${py}" r="4.5" fill="currentColor"/>` : '';
    const drehung = eintrag.form === 'mitte' ? 0 : DREHUNG[eintrag.richtung];
    return {
      viewBox: '0 0 100 100',
      inhalt: `${kreuz}<g transform="rotate(${drehung} 50 50)">${FORMEN[eintrag.form]}${punkt}</g>`
    };
  }
};
