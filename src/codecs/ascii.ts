import { anteil, ergebnis, ohneUmlaute, text } from './hilfen';
import type { Codec, Luecke, OptionWerte, TabellenEintrag } from './types';
import { nachtschicht, raetselnacht } from './quellen';

const BASEN = {
  '10': { titel: 'Dezimal', basis: 10, breite: 0 },
  '2': { titel: 'Binär', basis: 2, breite: 8 },
  '16': { titel: 'Hexadezimal', basis: 16, breite: 2 },
  '8': { titel: 'Oktal', basis: 8, breite: 3 }
} as const;

type BasisSchluessel = keyof typeof BASEN;

function basisAus(optionen: OptionWerte | undefined): (typeof BASEN)[BasisSchluessel] {
  const gewaehlt = text(optionen, 'basis', '10');
  return BASEN[gewaehlt as BasisSchluessel] ?? BASEN['10'];
}

function darstelle(codepunkt: number, basis: number, breite: number): string {
  return codepunkt.toString(basis).toUpperCase().padStart(breite, '0');
}

/** Druckbares ASCII – das, was auf einem Rätselzettel stehen kann. */
const ZEICHENVORRAT = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));

/**
 * Die Steuerzeichen 0–31 und 127 mit ihren Namen, wie in der Zeichen-Spalte
 * der Tafel im Infoheft der RätselNacht 5. Man sieht sie nicht – ein Rätsel
 * kann sie trotzdem benutzen, und dann soll ihr Name dastehen.
 */
const STEUERZEICHEN: ReadonlyArray<readonly [number, string]> = [
  ...'NUL SOH STX ETX EOT ENQ ACK BEL BS HT LF VT FF CR SO SI DLE DC1 DC2 DC3 DC4 NAK SYN ETB CAN EM SUB ESC FS GS RS US'
    .split(' ')
    .map((name, i) => [i, name] as const),
  [127, 'DEL']
];
const STEUERNAME = new Map(STEUERZEICHEN);

/** Tabulator, Zeilenumbruch und Wagenrücklauf bleiben echte Zeichen – die übrigen stehen mit Namen da. */
const ALS_ZEICHEN = new Set([9, 10, 13]);

/**
 * 95 Zeichen passen auf kein Handy. In vier Abschnitten findet man sie wieder –
 * in dieser Reihenfolge, nicht in der des Zeichensatzes: Sonst stünde das
 * Leerzeichen (Code 32) vorn und die Buchstaben zuhinterst.
 */
const GRUPPEN = ['A–Z', 'a–z', '0–9', 'Sonderzeichen', 'Steuerzeichen'] as const;

function gruppe(zeichen: string): (typeof GRUPPEN)[number] {
  if (/[A-Z]/.test(zeichen)) return 'A–Z';
  if (/[a-z]/.test(zeichen)) return 'a–z';
  if (/[0-9]/.test(zeichen)) return '0–9';
  return 'Sonderzeichen';
}

export const ascii: Codec = {
  id: 'ascii',
  name: 'ASCII',
  quellen: [nachtschicht('P', 'ASCII'), raetselnacht('J', 'ASCII-Code')],
  beschreibung:
    'Zeichen als Zahlenwert – dezimal, binär, hexadezimal oder oktal. Steuerzeichen wie NUL oder LF erscheinen mit Namen.',
  optionen: [
    {
      id: 'basis',
      titel: 'Zahlensystem',
      art: 'auswahl',
      standard: '10',
      werte: [
        { wert: '10', titel: 'Dezimal' },
        { wert: '2', titel: 'Binär' },
        { wert: '16', titel: 'Hexadezimal' },
        { wert: '8', titel: 'Oktal' }
      ]
    }
  ],

  erkennungsoptionen: [{ basis: '10' }, { basis: '2' }, { basis: '16' }, { basis: '8' }],

  encode(eingabe, optionen) {
    const { basis, breite } = basisAus(optionen);
    // Leerzeichen sind hier echte Zeichen (Code 32) und kein Worttrenner –
    // deshalb nicht der gemeinsame Bauplan, sondern zeichenweise über alles.
    // Umlaute werden aufgelöst: Ü hat den Codepunkt 220 und ist damit gerade
    // kein ASCII; gemeint ist in einem Rätsel immer UE.
    const teile = [...ohneUmlaute(eingabe)].map((z) => darstelle(z.codePointAt(0) ?? 0, basis, breite));
    // Binär steht jedes Zeichen in einer eigenen Zeile: Acht Stellen am Stück
    // liest man untereinander, nebeneinander verrutscht das Auge. Zurück liest
    // jeder Leerraum als Trenner, also auch der Umbruch.
    return ergebnis(teile.join(basis === 2 ? '\n' : ' '));
  },

  decode(eingabe, optionen) {
    const { basis } = basisAus(optionen);
    const luecken: Luecke[] = [];
    let position = 0;
    const zeichen = eingabe
      .trim()
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map((stueck) => {
        // Nur Ziffern des gewählten Systems – parseInt('19', 8) ergäbe stillschweigend 1.
        const ziffern = '0123456789ABCDEF'.slice(0, basis);
        const wert = parseInt(stueck, basis);
        const gueltig = [...stueck.toUpperCase()].every((z) => ziffern.includes(z))
          && Number.isFinite(wert) && wert >= 0 && wert <= 0x10ffff;
        position += stueck.length + 1;
        if (!gueltig) {
          luecken.push({ position, zeichen: stueck });
          return '';
        }
        const name = STEUERNAME.get(wert);
        if (name && !ALS_ZEICHEN.has(wert)) return `⟨${name}⟩`;
        return String.fromCodePoint(wert);
      })
      .join('');
    return ergebnis(zeichen, luecken);
  },

  tabelle(optionen): ReadonlyArray<TabellenEintrag> {
    const { basis, breite } = basisAus(optionen);
    const druckbar = GRUPPEN.flatMap((name) =>
      ZEICHENVORRAT.filter((z) => gruppe(z) === name).map((z) => ({
        zeichen: z === ' ' ? '␣' : z,
        darstellung: darstelle(z.charCodeAt(0), basis, breite),
        gruppe: name
      }))
    );
    const steuer = STEUERZEICHEN.map(([wert, name]) => ({
      zeichen: name,
      darstellung: darstelle(wert, basis, breite),
      gruppe: 'Steuerzeichen'
    }));
    return [...druckbar, ...steuer];
  },

  passt(eingabe) {
    const stuecke = eingabe.trim().split(/[\s,]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    const binaer = stuecke.every((s) => /^[01]{7,8}$/.test(s));
    if (binaer) return 1;
    const dezimal = stuecke.filter((s) => /^\d{1,3}$/.test(s) && +s >= 32 && +s <= 126);
    return (dezimal.length / stuecke.length) * anteil(eingabe, /[\d]/);
  }
};
