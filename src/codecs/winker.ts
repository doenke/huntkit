import { zeichenCodec } from './hilfen';
import type { Codec, Glyph } from './types';

/**
 * Winkeralphabet (Semaphor).
 *
 * Zwei Arme, je acht mögliche Richtungen. Die Tabelle nennt für jeden Buchstaben
 * die beiden Richtungen, wie sie auf der Tafel gezeichnet sind – also aus Sicht
 * der Betrachterin, nicht der winkenden Person.
 *
 * Quelle: Regelheft der Dortmunder Nachtschicht 2026, Anhang G.
 */

const RICHTUNGEN = {
  N: [0, -1],
  NO: [0.7071, -0.7071],
  O: [1, 0],
  SO: [0.7071, 0.7071],
  S: [0, 1],
  SW: [-0.7071, 0.7071],
  W: [-1, 0],
  NW: [-0.7071, -0.7071]
} as const;

type Richtung = keyof typeof RICHTUNGEN;

const STELLUNGEN: ReadonlyArray<readonly [string, Richtung, Richtung]> = [
  ['A', 'S', 'SW'],  ['B', 'S', 'W'],   ['C', 'S', 'NW'],  ['D', 'S', 'N'],
  ['E', 'S', 'NO'],  ['F', 'S', 'O'],   ['G', 'S', 'SO'],  ['H', 'SW', 'W'],
  ['I', 'SW', 'NW'], ['J', 'N', 'O'],   ['K', 'SW', 'N'],  ['L', 'SW', 'NO'],
  ['M', 'SW', 'O'],  ['N', 'SW', 'SO'], ['O', 'W', 'NW'],  ['P', 'W', 'N'],
  ['Q', 'W', 'NO'],  ['R', 'W', 'O'],   ['S', 'W', 'SO'],  ['T', 'NW', 'N'],
  ['U', 'NW', 'NO'], ['V', 'N', 'SO'],  ['W', 'NO', 'O'],  ['X', 'NO', 'SO'],
  ['Y', 'NW', 'O'],  ['Z', 'O', 'SO']
];

const NACH_ZEICHEN = new Map(STELLUNGEN.map(([z, a, b]) => [z, [a, b] as const]));

const zeichen = zeichenCodec({
  tabelle: STELLUNGEN.map(([z, a, b]) => [z, `${a}+${b}`] as const),
  trenner: ' ',
  worttrenner: '/'
});

function flagge(x: number, y: number): string {
  // Rot-gelbe Winkerflagge, diagonal geteilt – wie auf der Tafel.
  return (
    `<polygon points="${x - 8},${y - 8} ${x + 8},${y - 8} ${x - 8},${y + 8}" fill="#e03030"/>` +
    `<polygon points="${x + 8},${y - 8} ${x + 8},${y + 8} ${x - 8},${y + 8}" fill="#e8c020"/>`
  );
}

export const winker: Codec = {
  id: 'winker',
  name: 'Winkeralphabet',
  beschreibung:
    'Zwei Flaggen in je acht Richtungen. Ziffern 1–9 und 0 stehen nach dem Zahlzeichen für A–I und K.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle(),

  zeichne(gesucht): Glyph | null {
    const stellung = NACH_ZEICHEN.get(gesucht) ?? NACH_ZEICHEN.get(gesucht.toUpperCase());
    if (!stellung) return null;
    const schulter = { x: 50, y: 46 };
    const arme = stellung
      .map((richtung) => {
        const [dx, dy] = RICHTUNGEN[richtung];
        const x = schulter.x + dx * 32;
        const y = schulter.y + dy * 32;
        return `<line x1="${schulter.x}" y1="${schulter.y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-width="4"/>${flagge(+x.toFixed(1), +y.toFixed(1))}`;
      })
      .join('');
    const koerper =
      '<circle cx="50" cy="28" r="7" fill="currentColor"/>' +
      '<rect x="43" y="38" width="14" height="30" rx="7" fill="currentColor"/>';
    return { viewBox: '0 0 100 100', inhalt: arme + koerper };
  }
};
