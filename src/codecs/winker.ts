import { ergebnis, ohneUmlaute } from './hilfen';
import type { Codec, Glyph, Luecke, TabellenEintrag } from './types';
import { nachtschicht, raetselnacht, wikipedia } from './quellen';

/**
 * Winkeralphabet (Semaphor).
 *
 * Zwei Arme, je acht mögliche Richtungen. Die Tabelle nennt für jeden Buchstaben
 * die beiden Richtungen, wie sie auf der Tafel gezeichnet sind – also aus Sicht
 * der Betrachterin, nicht der winkenden Person.
 *
 * Ziffern haben keine eigenen Stellungen: Nach dem Zahlzeichen bedeuten A–I
 * die Ziffern 1–9 und K die 0, bis das J („Buchstaben“) zurückschaltet. Das
 * J ist deshalb nicht die 0 – es wird als Umschalter gebraucht.
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

/** Zahlzeichen: Was folgt, sind Ziffern. Keine Buchstabenstellung benutzt es. */
const ZAHL = 'N+NO';
/** J schaltet von Ziffern zurück auf Buchstaben. */
const BUCHSTABEN = 'N+O';
/** Beide Arme unten: das Leerzeichen der Tafel. */
const LEER = 'S+S';

/** Ziffer → Buchstabe mit derselben Stellung: 1–9 sind A–I, die 0 ist K. */
const ZIFFER_ALS: Readonly<Record<string, string>> = {
  '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E',
  '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'K'
};
const ALS_ZIFFER = new Map(Object.entries(ZIFFER_ALS).map(([ziffer, b]) => [b, ziffer]));

const NACH_ZEICHEN = new Map<string, readonly [Richtung, Richtung]>([
  ...STELLUNGEN.map(([z, a, b]) => [z, [a, b] as const] as const),
  ['#', ['N', 'NO']],
  ['␣', ['S', 'S']]
]);
for (const [ziffer, buchstabe] of Object.entries(ZIFFER_ALS)) {
  const stellung = NACH_ZEICHEN.get(buchstabe);
  if (stellung) NACH_ZEICHEN.set(ziffer, stellung);
}

const STELLUNG = new Map(STELLUNGEN.map(([z, a, b]) => [z, `${a}+${b}`]));
const BUCHSTABE = new Map(STELLUNGEN.map(([z, a, b]) => [`${a}+${b}`, z]));

function kodieren(eingabe: string) {
  const luecken: Luecke[] = [];
  const woerter: string[][] = [[]];
  let zahlen = false;
  const wort = () => woerter[woerter.length - 1] as string[];

  [...eingabe].forEach((rohzeichen, position) => {
    if (/\s/.test(rohzeichen)) {
      if (wort().length > 0) woerter.push([]);
      return;
    }
    const ziffer = ZIFFER_ALS[rohzeichen];
    if (ziffer !== undefined) {
      if (!zahlen) wort().push(ZAHL);
      zahlen = true;
      wort().push(STELLUNG.get(ziffer) as string);
      return;
    }
    // Kennt die Tafel das Zeichen nicht, wird ein Umlaut aufgelöst: Ä zu AE.
    const buchstaben = [...(STELLUNG.has(rohzeichen.toUpperCase()) ? rohzeichen : ohneUmlaute(rohzeichen))]
      .map((b) => b.toUpperCase());
    if (!buchstaben.every((b) => STELLUNG.has(b))) {
      luecken.push({ position, zeichen: rohzeichen });
      return;
    }
    if (zahlen) {
      wort().push(BUCHSTABEN);
      zahlen = false;
    }
    for (const b of buchstaben) wort().push(STELLUNG.get(b) as string);
  });

  const text = woerter
    .filter((w) => w.length > 0)
    .map((w) => w.join(' '))
    .join(' / ');
  return ergebnis(text, luecken);
}

function dekodieren(eingabe: string) {
  const luecken: Luecke[] = [];
  let zahlen = false;
  let position = 0;
  const woerter = eingabe
    .trim()
    .split(/\s*\/+\s*|\s{2,}/)
    .map((wort) => {
      let heraus = '';
      for (const stueck of wort.split(/\s+/).filter((s) => s.length > 0)) {
        const stellung = stueck.toUpperCase();
        position += stueck.length;
        if (stellung === ZAHL) {
          zahlen = true;
          continue;
        }
        if (stellung === LEER) {
          heraus += ' ';
          continue;
        }
        const buchstabe = BUCHSTABE.get(stellung);
        if (buchstabe === undefined) {
          luecken.push({ position: position - stueck.length, zeichen: stueck });
          continue;
        }
        if (zahlen) {
          if (stellung === BUCHSTABEN) {
            zahlen = false;
            continue;
          }
          const ziffer = ALS_ZIFFER.get(buchstabe);
          if (ziffer !== undefined) {
            heraus += ziffer;
            continue;
          }
          // L bis Z haben keine Ziffernbedeutung: Ein vergessenes J soll das
          // Wort nicht verschlucken.
          zahlen = false;
        }
        heraus += buchstabe;
      }
      return heraus;
    });
  return ergebnis(woerter.filter((w) => w.length > 0).join(' '), luecken);
}

function tabelle(): ReadonlyArray<TabellenEintrag> {
  const weitere = 'Zahlen und Zeichen';
  return [
    ...STELLUNGEN.map(([z, a, b]) => ({ zeichen: z, darstellung: `${a}+${b}`, gruppe: 'Buchstaben' })),
    { zeichen: '#', darstellung: ZAHL, gruppe: weitere },
    // Eine Ziffer bringt ihr Zahlzeichen mit: So kommt beim Antippen immer
    // die Ziffer heraus und nicht der Buchstabe mit derselben Stellung.
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((ziffer) => ({
      zeichen: ziffer,
      darstellung: `${ZAHL} ${STELLUNG.get(ZIFFER_ALS[ziffer] as string) as string}`,
      gruppe: weitere
    })),
    { zeichen: '␣', darstellung: LEER, gruppe: weitere }
  ];
}

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
  quellen: [nachtschicht('G', 'Winkeralphabet'), { titel: 'Wikimedia Commons: Winkeralphabet-Tafel (Denelson83, CC BY-SA 3.0)', url: 'https://commons.wikimedia.org/w/index.php?curid=501826' }, raetselnacht('O', 'Winkeralphabet (Semaphore)'), wikipedia('Winkeralphabet', 'https://de.wikipedia.org/wiki/Winkeralphabet')],
  beschreibung:
    'Zwei Flaggen in je acht Richtungen. Ziffern stehen nach dem Zahlzeichen (#) als A–I und K, J schaltet zurück.',
  encode: kodieren,
  decode: dekodieren,
  tabelle,

  passt(eingabe) {
    const stuecke = eingabe.trim().split(/[\s/]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    return stuecke.filter((s) => /^(N|NO|O|SO|S|SW|W|NW)\+(N|NO|O|SO|S|SW|W|NW)$/.test(s)).length / stuecke.length;
  },

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
