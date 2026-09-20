import { anteil, ergebnis, text } from './hilfen';
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
    const teile = [...eingabe].map((z) => darstelle(z.codePointAt(0) ?? 0, basis, breite));
    return ergebnis(teile.join(' '));
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
    return ZEICHENVORRAT.map((z) => ({
      zeichen: z === ' ' ? '␣' : z,
      darstellung: darstelle(z.charCodeAt(0), basis, breite)
    }));
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
