import { anteil, ergebnis, ohneUmlaute, text } from './hilfen';
import type { Codec, Luecke, OptionWerte, TabellenEintrag } from './types';

const BASEN = {
  '10': { titel: 'Dezimal', basis: 10, breite: 0 },
  '2': { titel: 'Binär', basis: 2, breite: 8 },
  '16': { titel: 'Hexadezimal', basis: 16, breite: 2 }
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
 * 95 Zeichen passen auf kein Handy. In vier Abschnitten findet man sie wieder –
 * in dieser Reihenfolge, nicht in der des Zeichensatzes: Sonst stünde das
 * Leerzeichen (Code 32) vorn und die Buchstaben zuhinterst.
 */
const GRUPPEN = ['A–Z', 'a–z', '0–9', 'Sonderzeichen'] as const;

function gruppe(zeichen: string): (typeof GRUPPEN)[number] {
  if (/[A-Z]/.test(zeichen)) return 'A–Z';
  if (/[a-z]/.test(zeichen)) return 'a–z';
  if (/[0-9]/.test(zeichen)) return '0–9';
  return 'Sonderzeichen';
}

export const ascii: Codec = {
  id: 'ascii',
  name: 'ASCII',
  beschreibung: 'Zeichen als Zahlenwert – dezimal, binär oder hexadezimal.',
  optionen: [
    {
      id: 'basis',
      titel: 'Zahlensystem',
      art: 'auswahl',
      standard: '10',
      werte: [
        { wert: '10', titel: 'Dezimal' },
        { wert: '2', titel: 'Binär' },
        { wert: '16', titel: 'Hexadezimal' }
      ]
    }
  ],

  erkennungsoptionen: [{ basis: '10' }, { basis: '2' }, { basis: '16' }],

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
        const wert = parseInt(stueck, basis);
        const gueltig = Number.isFinite(wert) && wert >= 0 && wert <= 0x10ffff
          && new RegExp(`^[0-9a-fA-F]+$`).test(stueck);
        position += stueck.length + 1;
        if (!gueltig) {
          luecken.push({ position, zeichen: stueck });
          return '';
        }
        return String.fromCodePoint(wert);
      })
      .join('');
    return ergebnis(zeichen, luecken);
  },

  tabelle(optionen): ReadonlyArray<TabellenEintrag> {
    const { basis, breite } = basisAus(optionen);
    return GRUPPEN.flatMap((name) =>
      ZEICHENVORRAT.filter((z) => gruppe(z) === name).map((z) => ({
        zeichen: z === ' ' ? '␣' : z,
        darstellung: darstelle(z.charCodeAt(0), basis, breite),
        gruppe: name
      }))
    );
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
