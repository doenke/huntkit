import { ergebnis } from './hilfen';
import { raetselnacht, wikipedia } from './quellen';
import type { Codec, Glyph, TabellenEintrag } from './types';

/**
 * Flaggenalphabet des Internationalen Signalbuchs, wie im Infoheft der
 * RätselNacht 5 (Anhang P): Buchstabenflaggen, Zahlenwimpel, Antwortwimpel
 * und die vier Ersatzwimpel. Selbst gezeichnet, Muster und Farben nach der
 * Tafel des Hefts.
 *
 * Ein Ersatzwimpel wiederholt die erste, zweite, dritte oder vierte Flagge
 * seiner Gruppe – so kommt NOON mit einem einzigen Satz Flaggen aus: N O W2 N.
 * Im Text stehen die Ersatzwimpel als ① bis ④ und werden beim Lesen durch die
 * Flagge ersetzt, die sie wiederholen.
 */

const W = '#ffffff';
const R = '#e30613';
const B = '#0046ad';
const Y = '#ffd400';
const K = '#1a1a1a';

/** Umrisse im Feld 60×60. */
const RECHTECK = 'M2 2H58V58H2Z';
const SCHWALBENSCHWANZ = 'M2 2H58L40 30L58 58H2Z';
const WIMPEL = 'M2 12L58 22V38L2 48Z';
const DREIECK = 'M2 12L58 30L2 48Z';

const rechteck = (x: number, y: number, b: number, h: number, farbe: string) =>
  `<rect x="${x}" y="${y}" width="${b}" height="${h}" fill="${farbe}"/>`;
const vieleck = (punkte: string, farbe: string) => `<polygon points="${punkte}" fill="${farbe}"/>`;
const linie = (x1: number, y1: number, x2: number, y2: number, breite: number, farbe: string) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="${breite}"/>`;
const kreis = (x: number, y: number, r: number, farbe: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${farbe}"/>`;

/** Senkrechte Streifen über die ganze Breite. */
function senkrecht(...farben: string[]): string {
  const breite = 56 / farben.length;
  return farben.map((f, i) => rechteck(2 + i * breite, 0, breite + 0.2, 60, f)).join('');
}

/** Waagerechte Streifen, oben beginnend; Anteile in Summe 1. */
function waagerecht(von: number, bis: number, ...streifen: Array<readonly [string, number]>): string {
  let y = von;
  return streifen
    .map(([farbe, anteil]) => {
      const h = (bis - von) * anteil;
      const teil = rechteck(0, y, 60, h + 0.2, farbe);
      y += h;
      return teil;
    })
    .join('');
}

let naechsteKennung = 0;

/**
 * Eine Flagge: Inhalt auf den Umriss zugeschnitten, dazu ein feiner Rand –
 * weiße Felder verschwänden sonst auf hellem Grund. Jede Zeichnung bekommt
 * ihre eigene Kennung für den Zuschnitt, weil viele davon auf einer Seite stehen.
 */
function flagge(umriss: string, inhalt: string): Glyph {
  const kennung = `flagge-${++naechsteKennung}`;
  return {
    viewBox: '0 0 60 60',
    inhalt:
      `<defs><clipPath id="${kennung}"><path d="${umriss}"/></clipPath></defs>` +
      `<g clip-path="url(#${kennung})">${inhalt}</g>` +
      `<path d="${umriss}" fill="none" stroke="#888" stroke-width="0.8"/>`
  };
}

const BUCHSTABEN: Record<string, () => Glyph> = {
  A: () => flagge(SCHWALBENSCHWANZ, rechteck(0, 0, 30, 60, W) + rechteck(30, 0, 30, 60, B)),
  B: () => flagge(SCHWALBENSCHWANZ, rechteck(0, 0, 60, 60, R)),
  C: () => flagge(RECHTECK, waagerecht(2, 58, [B, 0.2], [W, 0.2], [R, 0.2], [W, 0.2], [B, 0.2])),
  D: () => flagge(RECHTECK, waagerecht(2, 58, [Y, 0.25], [B, 0.5], [Y, 0.25])),
  E: () => flagge(RECHTECK, waagerecht(2, 58, [B, 0.5], [R, 0.5])),
  F: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, W) + vieleck('30,2 58,30 30,58 2,30', R)),
  G: () => flagge(RECHTECK, senkrecht(Y, B, Y, B, Y, B)),
  H: () => flagge(RECHTECK, senkrecht(W, R)),
  I: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, Y) + kreis(30, 30, 12, K)),
  J: () => flagge(RECHTECK, waagerecht(2, 58, [B, 1 / 3], [W, 1 / 3], [B, 1 / 3])),
  K: () => flagge(RECHTECK, senkrecht(Y, B)),
  L: () => flagge(RECHTECK, rechteck(0, 0, 30, 30, Y) + rechteck(30, 0, 30, 30, K) + rechteck(0, 30, 30, 30, K) + rechteck(30, 30, 30, 30, Y)),
  M: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, B) + linie(0, 0, 60, 60, 11, W) + linie(60, 0, 0, 60, 11, W)),
  N: () => {
    let felder = '';
    for (let z = 0; z < 4; z++) for (let s = 0; s < 4; s++) felder += rechteck(2 + s * 14, 2 + z * 14, 14.2, 14.2, (z + s) % 2 === 0 ? B : W);
    return flagge(RECHTECK, felder);
  },
  O: () => flagge(RECHTECK, vieleck('2,2 2,58 58,58', Y) + vieleck('2,2 58,2 58,58', R)),
  P: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, B) + rechteck(20, 20, 20, 20, W)),
  Q: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, Y)),
  R: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, R) + rechteck(25, 0, 10, 60, Y) + rechteck(0, 25, 60, 10, Y)),
  S: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, W) + rechteck(20, 20, 20, 20, B)),
  T: () => flagge(RECHTECK, senkrecht(R, W, B)),
  U: () => flagge(RECHTECK, rechteck(0, 0, 30, 30, R) + rechteck(30, 0, 30, 30, W) + rechteck(0, 30, 30, 30, W) + rechteck(30, 30, 30, 30, R)),
  V: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, W) + linie(0, 0, 60, 60, 11, R) + linie(60, 0, 0, 60, 11, R)),
  W: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, B) + rechteck(12, 12, 36, 36, W) + rechteck(22, 22, 16, 16, R)),
  X: () => flagge(RECHTECK, rechteck(0, 0, 60, 60, W) + rechteck(25, 0, 10, 60, B) + rechteck(0, 25, 60, 10, B)),
  Y: () => {
    // Rote Schrägstreifen von links unten nach rechts oben.
    let streifen = rechteck(0, 0, 60, 60, Y);
    for (let x = -60; x <= 60; x += 13) streifen += linie(x, 62, x + 62, 0, 6.5, R);
    return flagge(RECHTECK, streifen);
  },
  Z: () =>
    flagge(
      RECHTECK,
      vieleck('2,2 58,2 30,30', Y) + vieleck('58,2 58,58 30,30', B) + vieleck('2,58 58,58 30,30', R) + vieleck('2,2 2,58 30,30', K)
    )
};

/** Zahlenwimpel – spitz zulaufend, Muster nach der Tafel. */
const ZIFFERN: Record<string, () => Glyph> = {
  '0': () => flagge(WIMPEL, senkrecht(Y, R, Y)),
  '1': () => flagge(WIMPEL, rechteck(0, 0, 60, 60, W) + kreis(18, 30, 7, R)),
  '2': () => flagge(WIMPEL, rechteck(0, 0, 60, 60, B) + kreis(18, 30, 7, W)),
  '3': () => flagge(WIMPEL, senkrecht(R, W, B)),
  '4': () => flagge(WIMPEL, rechteck(0, 0, 60, 60, R) + rechteck(14, 0, 6, 60, W) + rechteck(0, 27, 60, 6, W)),
  '5': () => flagge(WIMPEL, senkrecht(Y, B)),
  '6': () => flagge(WIMPEL, waagerecht(12, 48, [K, 0.5], [W, 0.5])),
  '7': () => flagge(WIMPEL, waagerecht(12, 48, [Y, 0.5], [R, 0.5])),
  '8': () => flagge(WIMPEL, rechteck(0, 0, 60, 60, W) + rechteck(14, 0, 6, 60, R) + rechteck(0, 27, 60, 6, R)),
  '9': () => flagge(WIMPEL, rechteck(0, 0, 30, 30, W) + rechteck(30, 0, 30, 30, K) + rechteck(0, 30, 30, 30, R) + rechteck(30, 30, 30, 30, Y))
};

/** Antwortwimpel und Ersatzwimpel; im Text stehen sie als eigene Zeichen. */
const SONDER: ReadonlyArray<readonly [name: string, zeichen: string, bild: () => Glyph]> = [
  ['Antwort', '⚑', () => flagge(WIMPEL, senkrecht(R, W, R, W, R))],
  ['W1', '①', () => flagge(DREIECK, rechteck(0, 0, 60, 60, B) + vieleck('7,19 45,30 7,41', Y))],
  ['W2', '②', () => flagge(DREIECK, senkrecht(B, W))],
  ['W3', '③', () => flagge(DREIECK, rechteck(0, 0, 60, 60, W) + rechteck(0, 25, 60, 10, K))],
  ['W4', '④', () => flagge(DREIECK, rechteck(0, 0, 60, 60, R) + rechteck(5, 26, 8, 8, Y))]
];

const BILD = new Map<string, () => Glyph>([
  ...Object.entries(BUCHSTABEN),
  ...Object.entries(ZIFFERN),
  ...SONDER.map(([name, , bild]) => [name, bild] as const),
  ...SONDER.map(([, zeichen, bild]) => [zeichen, bild] as const)
]);

const ERSATZ = new Map(SONDER.slice(1).map(([, zeichen], i) => [zeichen, i]));

/**
 * Ersatzwimpel auflösen: Jeder wiederholt die Flagge an seiner Stelle in der
 * Gruppe (einem Wort). Gezählt wird, wie die Flaggen am Mast hängen – ein
 * Ersatzwimpel selbst belegt dabei ebenfalls einen Platz.
 */
function aufloesen(eingabe: string) {
  const woerter = eingabe.split(/(\s+)/).map((wort) => {
    const aufgeloest: string[] = [];
    for (const zeichen of wort) {
      const stelle = ERSATZ.get(zeichen);
      aufgeloest.push(stelle === undefined ? zeichen : (aufgeloest[stelle] ?? zeichen));
    }
    return aufgeloest.join('');
  });
  return ergebnis(woerter.join(''));
}

export const flaggen: Codec = {
  id: 'flaggen',
  name: 'Flaggenalphabet',
  quellen: [
    raetselnacht('P', 'Flaggenalphabet'),
    wikipedia('Flaggenalphabet', 'https://de.wikipedia.org/wiki/Flaggenalphabet'),
    { titel: 'Wikipedia (englisch): International maritime signal flags', url: 'https://en.wikipedia.org/wiki/International_maritime_signal_flags' }
  ],
  beschreibung:
    'Signalflaggen: Buchstaben, Zahlenwimpel, Antwortwimpel. Ersatzwimpel ①–④ wiederholen die 1. bis 4. Flagge ihrer Gruppe: NO②N ist NOON.',
  nurNachschlagen: true,
  zeichenweise: true,
  encode: (eingabe) => ergebnis(eingabe),
  decode: aufloesen,
  tabelle: (): ReadonlyArray<TabellenEintrag> => [
    ...Object.keys(BUCHSTABEN).map((b) => ({ zeichen: b, darstellung: b, gruppe: 'Buchstaben' })),
    ...Object.keys(ZIFFERN).map((z) => ({ zeichen: z, darstellung: z, gruppe: 'Zahlenwimpel' })),
    ...SONDER.map(([name, zeichen]) => ({ zeichen: name, darstellung: zeichen, gruppe: 'Sonderwimpel' }))
  ],
  zeichne(gesucht) {
    const bild = BILD.get(gesucht) ?? BILD.get(gesucht.toUpperCase());
    return bild ? bild() : null;
  }
};
