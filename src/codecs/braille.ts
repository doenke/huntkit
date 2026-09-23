import { ergebnis, text } from './hilfen';
import type { Codec, Glyph, Luecke, TabellenEintrag } from './types';
import { nachtschicht, raetselnacht, wikipedia } from './quellen';

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
  ['Ä', '345'], ['Ö', '246'], ['Ü', '1256'], ['ß', '2346']
];

/** Das Zahlzeichen: danach stehen A–J für die Ziffern 1–9 und 0. */
const ZAHL = '3456';
/** Großbuchstabe folgt. Unsere Ausgabe ist ohnehin groß – beim Lesen fällt es weg. */
const GROSS = '46';
/** Nach Ziffern: Was jetzt kommt, ist wieder ein Buchstabe. Sonst ist Punkt 6 ein Apostroph. */
const BUCHSTABENZEICHEN = '6';

/** Satzzeichen nach dem Infoheft der RätselNacht 5 (Anhang F). */
const SATZZEICHEN: ReadonlyArray<readonly [string, string]> = [
  ['.', '3'], [',', '2'], ["'", '6'], [';', '23'], [':', '25'], ['-', '36'], ['/', '256'],
  ['?', '26'], ['!', '235'], ['(', '2356'], [')', '2356'], ['~', '5'], ['*', '35'], ['"', '356']
];

/**
 * Lautgruppen der deutschen Vollschrift: ein Zeichen für mehrere Buchstaben.
 * Gelesen werden sie immer; beim Schreiben nur auf Wunsch – ein Rätsel kann
 * genauso gut Buchstabe für Buchstabe geschrieben sein.
 */
const LAUTGRUPPEN: ReadonlyArray<readonly [string, string]> = [
  ['SCH', '156'], ['CH', '1456'], ['EI', '146'], ['IE', '346'], ['EU', '126'],
  ['ÄU', '34'], ['AU', '16'], ['ST', '23456']
];

/** Ziffern stehen auf A–J: 1 ist A, 0 ist J. */
const ZIFFERN = '1234567890';

/** Unicode legt die Punkte als Bitmuster ab: Punkt 1 ist Bit 0, Punkt 6 ist Bit 5. */
function alsZeichen(punkte: string): string {
  let muster = 0;
  for (const ziffer of punkte) muster |= 1 << (Number(ziffer) - 1);
  return String.fromCodePoint(0x2800 + muster);
}

function alsPunkte(zeichen: string): string {
  const muster = (zeichen.codePointAt(0) ?? 0) - 0x2800;
  let punkte = '';
  for (let i = 0; i < 6; i++) if (muster & (1 << i)) punkte += String(i + 1);
  return punkte;
}

const NACH_PUNKTEN = new Map<string, string>([
  ...PUNKTE,
  ['#', ZAHL],
  ['⇧', GROSS],
  ['( )', '2356'],
  ...SATZZEICHEN,
  ...LAUTGRUPPEN,
  // Eine Ziffer sieht aus wie ihr Buchstabe – das Zahlzeichen davor macht den Unterschied.
  ...[...ZIFFERN].map((z, i) => [z, (PUNKTE[i] as readonly [string, string])[1]] as const)
]);

const BUCHSTABE = new Map<string, string>(PUNKTE.map(([z, p]) => [p, z]));
const ZIFFER = new Map<string, string>([...ZIFFERN].map((z, i) => [(PUNKTE[i] as readonly [string, string])[1], z]));
const SATZ = new Map<string, string>();
for (const [z, p] of SATZZEICHEN) if (!SATZ.has(p)) SATZ.set(p, z);
const GRUPPE = new Map<string, string>(LAUTGRUPPEN.map(([z, p]) => [p, z]));
const SATZ_NACH_ZEICHEN = new Map(SATZZEICHEN);

function kodieren(eingabe: string, lautgruppen: boolean) {
  const luecken: Luecke[] = [];
  const woerter: string[][] = [[]];
  const zeichen = [...eingabe];
  let zahlen = false;
  const wort = () => woerter[woerter.length - 1] as string[];
  let i = 0;
  while (i < zeichen.length) {
    const roh = zeichen[i] as string;
    if (/\s/.test(roh)) {
      if (wort().length > 0) woerter.push([]);
      zahlen = false;
      i++;
      continue;
    }
    const ziffer = ZIFFERN.indexOf(roh);
    if (ziffer >= 0) {
      if (!zahlen) wort().push(alsZeichen(ZAHL));
      zahlen = true;
      wort().push(alsZeichen((PUNKTE[ziffer] as readonly [string, string])[1]));
      i++;
      continue;
    }
    // ß vor dem Großschreiben retten – 'ß'.toUpperCase() ist 'SS'.
    const gross = roh === 'ß' ? roh : roh.toUpperCase();
    if (lautgruppen) {
      const rest = zeichen.slice(i).map((z) => (z === 'ß' ? z : z.toUpperCase())).join('');
      const gruppe = LAUTGRUPPEN.find(([folge]) => rest.startsWith(folge));
      if (gruppe) {
        wort().push(alsZeichen(gruppe[1]));
        zahlen = false;
        i += gruppe[0].length;
        continue;
      }
    }
    const buchstabe = PUNKTE.find(([z]) => z === gross);
    if (buchstabe) {
      // Ein Buchstabe A–J direkt nach Ziffern sähe aus wie eine Ziffer.
      if (zahlen && ZIFFER.has(buchstabe[1])) wort().push(alsZeichen(BUCHSTABENZEICHEN));
      zahlen = false;
      wort().push(alsZeichen(buchstabe[1]));
      i++;
      continue;
    }
    if (roh === '#') {
      wort().push(alsZeichen(ZAHL));
      i++;
      continue;
    }
    const satz = SATZ_NACH_ZEICHEN.get(roh);
    if (satz) {
      wort().push(alsZeichen(satz));
      zahlen = false;
      i++;
      continue;
    }
    luecken.push({ position: i, zeichen: roh });
    i++;
  }
  return ergebnis(
    woerter
      .filter((w) => w.length > 0)
      .map((w) => w.join(''))
      .join(' / '),
    luecken
  );
}

function dekodieren(eingabe: string) {
  const luecken: Luecke[] = [];
  // Wortgrenzen: Schrägstrich, das leere Braillezeichen oder mehrere Leerzeichen.
  // Ein einzelnes Leerzeichen zwischen zwei Zellen zählt nicht.
  const woerter = eingabe.trim().split(/\s*[/⠀]+\s*|\s{2,}/);
  let position = 0;
  const heraus = woerter.map((wort) => {
    const zellen = [...wort].filter((z) => !/\s/.test(z));
    let zahlen = false;
    let text = '';
    zellen.forEach((zelle, i) => {
      const punkte = alsPunkte(zelle);
      position++;
      const code = zelle.codePointAt(0) ?? 0;
      if (code < 0x2800 || code > 0x283f) {
        luecken.push({ position, zeichen: zelle });
        return;
      }
      if (punkte === ZAHL) {
        zahlen = true;
        return;
      }
      if (punkte === GROSS) return;
      if (zahlen) {
        const ziffer = ZIFFER.get(punkte);
        if (ziffer) {
          text += ziffer;
          return;
        }
        zahlen = false;
        // Punkt 6 vor einem Buchstaben schaltet nur zurück und steht für nichts.
        if (punkte === BUCHSTABENZEICHEN && i + 1 < zellen.length) return;
      }
      const zeichen = BUCHSTABE.get(punkte) ?? GRUPPE.get(punkte) ?? SATZ.get(punkte);
      if (zeichen === undefined) {
        luecken.push({ position, zeichen: zelle });
        return;
      }
      text += zeichen;
    });
    return text;
  });
  return ergebnis(heraus.filter((w) => w.length > 0).join(' '), luecken);
}

function tabelle(): ReadonlyArray<TabellenEintrag> {
  return [
    ...PUNKTE.map(([z, p]) => ({ zeichen: z, darstellung: alsZeichen(p), gruppe: 'Buchstaben' })),
    { zeichen: '#', darstellung: alsZeichen(ZAHL), gruppe: 'Ziffern' },
    // Eine angetippte Ziffer bringt ihr Zahlzeichen mit.
    ...[...ZIFFERN].map((z, i) => ({
      zeichen: z,
      darstellung: alsZeichen(ZAHL) + alsZeichen((PUNKTE[i] as readonly [string, string])[1]),
      gruppe: 'Ziffern'
    })),
    ...SATZZEICHEN.filter(([z]) => z !== ')').map(([z, p]) => ({
      zeichen: z === '(' ? '( )' : z,
      darstellung: alsZeichen(p),
      gruppe: 'Satzzeichen'
    })),
    { zeichen: '⇧', darstellung: alsZeichen(GROSS), gruppe: 'Satzzeichen' },
    ...LAUTGRUPPEN.map(([z, p]) => ({ zeichen: z, darstellung: alsZeichen(p), gruppe: 'Lautgruppen' }))
  ];
}

export const braille: Codec = {
  id: 'braille',
  name: 'Braille',
  quellen: [nachtschicht('D', 'Brailleschrift'), raetselnacht('F', 'Blindenschrift (Braille), deutsch'), wikipedia('Brailleschrift', 'https://de.wikipedia.org/wiki/Brailleschrift')],
  beschreibung:
    'Sechs Punkte, links 1–2–3, rechts 4–5–6. Ziffern nach dem Zahlzeichen als A–J; Lautgruppen wie SCH oder EI werden immer gelesen.',
  optionen: [
    {
      id: 'lautgruppen',
      titel: 'Schreiben',
      art: 'auswahl',
      standard: 'nein',
      werte: [
        { wert: 'nein', titel: 'Buchstabe für Buchstabe' },
        { wert: 'ja', titel: 'mit Lautgruppen (SCH, EI …)' }
      ]
    }
  ],
  encode: (eingabe, optionen) => kodieren(eingabe, text(optionen, 'lautgruppen', 'nein') === 'ja'),
  decode: (eingabe) => dekodieren(eingabe),
  tabelle,
  zeichenweise: true,

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
