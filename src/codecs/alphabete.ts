import { anteil, ergebnis, ohneUmlaute, text, zeichenCodec } from './hilfen';
import { raetselnacht, wikipedia } from './quellen';
import type { Codec, Luecke, OptionWerte, TabellenEintrag } from './types';

/**
 * Fremde Alphabete als Umschrift: Griechisch und Kyrillisch, beide wie im
 * Infoheft der RätselNacht 5 (Anhang Q und C).
 *
 * Klartext ist immer lateinisch. Entschlüsselt wird Buchstabe für Buchstabe
 * über die Umschrift – aus ΘΕΟΣ wird THEOS, aus ЖУК wird ŽUK. Verschlüsselt
 * wird umgekehrt, wobei die längste passende Schreibung gewinnt: TH ist Θ,
 * nicht Τ und ein übriges H.
 *
 * Satzzeichen und Ziffern bleiben stehen, wie sie sind. Ein Buchstabe, den
 * das Alphabet nicht kennt, wird als Lücke gemeldet.
 */

type Paar = readonly [fremd: string, latein: string];

function umschrift(paare: ReadonlyArray<Paar>) {
  const zumLesen = new Map<string, string>();
  for (const [fremd, latein] of paare) {
    for (const form of [fremd, fremd.toLowerCase(), fremd.toUpperCase()]) if (!zumLesen.has(form)) zumLesen.set(form, latein);
  }
  // Zum Schreiben zählt je Schreibung nur der erste Eintrag – die Nebenformen
  // (ϐ, ς …) stehen dahinter und werden nur gelesen.
  const zumSchreiben: Paar[] = [];
  for (const [fremd, latein] of paare) {
    if (latein !== '' && !zumSchreiben.some(([, l]) => l === latein)) zumSchreiben.push([fremd.toUpperCase(), latein]);
  }
  zumSchreiben.sort((a, b) => [...b[1]].length - [...a[1]].length);

  return {
    lesen(eingabe: string) {
      const luecken: Luecke[] = [];
      let heraus = '';
      [...eingabe].forEach((zeichen, position) => {
        const latein = zumLesen.get(zeichen);
        if (latein !== undefined) heraus += latein;
        else if (/\p{L}/u.test(zeichen)) luecken.push({ position, zeichen });
        else heraus += zeichen;
      });
      return ergebnis(heraus, luecken);
    },
    schreiben(eingabe: string) {
      const luecken: Luecke[] = [];
      const zeichen = [...ohneUmlaute(eingabe).toUpperCase()];
      let heraus = '';
      let i = 0;
      while (i < zeichen.length) {
        const rest = zeichen.slice(i).join('');
        const treffer = zumSchreiben.find(([, latein]) => rest.startsWith(latein));
        if (treffer) {
          heraus += treffer[0];
          i += [...treffer[1]].length;
          continue;
        }
        const z = zeichen[i] as string;
        if (/\p{L}/u.test(z)) luecken.push({ position: i, zeichen: z });
        else heraus += z;
        i++;
      }
      return ergebnis(heraus, luecken);
    }
  };
}

// ---------------------------------------------------------------------------
// Griechisch

interface GriechischerBuchstabe {
  gross: string;
  klein: string;
  /** Nebenformen wie ϐ oder das Schluss-Sigma ς – nur zum Lesen. */
  neben: string;
  name: string;
  /** Weitere Schreibweisen des Namens, die man antrifft. */
  namen: ReadonlyArray<string>;
  latein: string;
}

// Reihenfolge, Namen und Nebenformen wie auf der Tafel im Heft.
const GRIECHISCH: ReadonlyArray<GriechischerBuchstabe> = [
  { gross: 'Α', klein: 'α', neben: '', name: 'ALPHA', namen: [], latein: 'A' },
  { gross: 'Β', klein: 'β', neben: 'ϐ', name: 'BETA', namen: [], latein: 'B' },
  { gross: 'Γ', klein: 'γ', neben: '', name: 'GAMMA', namen: [], latein: 'G' },
  { gross: 'Δ', klein: 'δ', neben: '', name: 'DELTA', namen: [], latein: 'D' },
  { gross: 'Ε', klein: 'ε', neben: 'ϵ', name: 'EPSILON', namen: [], latein: 'E' },
  { gross: 'Ζ', klein: 'ζ', neben: '', name: 'ZETA', namen: [], latein: 'Z' },
  { gross: 'Η', klein: 'η', neben: '', name: 'ETA', namen: [], latein: 'E' },
  { gross: 'Θ', klein: 'θ', neben: 'ϑ', name: 'THETA', namen: [], latein: 'TH' },
  { gross: 'Ι', klein: 'ι', neben: '', name: 'IOTA', namen: ['JOTA'], latein: 'I' },
  { gross: 'Κ', klein: 'κ', neben: 'ϰ', name: 'KAPPA', namen: [], latein: 'K' },
  { gross: 'Λ', klein: 'λ', neben: '', name: 'LAMBDA', namen: ['LAMDA'], latein: 'L' },
  { gross: 'Μ', klein: 'μ', neben: '', name: 'MY', namen: ['MÜ', 'MU'], latein: 'M' },
  { gross: 'Ν', klein: 'ν', neben: '', name: 'NY', namen: ['NÜ', 'NU'], latein: 'N' },
  { gross: 'Ξ', klein: 'ξ', neben: '', name: 'XI', namen: ['KSI'], latein: 'X' },
  { gross: 'Ο', klein: 'ο', neben: '', name: 'OMIKRON', namen: ['OMICRON'], latein: 'O' },
  { gross: 'Π', klein: 'π', neben: 'ϖ', name: 'PI', namen: [], latein: 'P' },
  { gross: 'Ρ', klein: 'ρ', neben: 'ϱ', name: 'RHO', namen: [], latein: 'R' },
  { gross: 'Σ', klein: 'σ', neben: 'ς', name: 'SIGMA', namen: [], latein: 'S' },
  { gross: 'Τ', klein: 'τ', neben: '', name: 'TAU', namen: [], latein: 'T' },
  { gross: 'Υ', klein: 'υ', neben: 'ϒ', name: 'YPSILON', namen: ['UPSILON'], latein: 'Y' },
  { gross: 'Φ', klein: 'φ', neben: 'ϕ', name: 'PHI', namen: [], latein: 'PH' },
  { gross: 'Χ', klein: 'χ', neben: '', name: 'CHI', namen: ['KHI'], latein: 'CH' },
  { gross: 'Ψ', klein: 'ψ', neben: '', name: 'PSI', namen: [], latein: 'PS' },
  { gross: 'Ω', klein: 'ω', neben: '', name: 'OMEGA', namen: [], latein: 'O' }
];

const GRIECHISCH_UMSCHRIFT = umschrift(
  GRIECHISCH.flatMap((b): Paar[] => [[b.gross, b.latein], ...[...b.neben].map((n): Paar => [n, b.latein])])
);

/**
 * Namen und Nummern laufen über den griechischen Buchstaben. Geschrieben wird
 * der Name von der Tafel, gelesen auch jede andere Schreibweise.
 */
const GRIECHISCH_NAMEN = zeichenCodec({
  tabelle: GRIECHISCH.map((b) => [b.gross, b.name] as const),
  trenner: ' ',
  worttrenner: '/'
});
const GRIECHISCH_NAMEN_LESEN = zeichenCodec({
  tabelle: [
    ...GRIECHISCH.map((b) => [b.gross, b.name] as const),
    ...GRIECHISCH.flatMap((b) => b.namen.map((n) => [b.gross, n] as const))
  ],
  trenner: ' ',
  worttrenner: '/'
});
const GRIECHISCH_NUMMERN = zeichenCodec({
  tabelle: GRIECHISCH.map((b, i) => [b.gross, String(i + 1)] as const),
  trenner: ' ',
  worttrenner: '/'
});

type GriechischerCode = 'buchstaben' | 'namen' | 'nummern';

function griechischerCode(optionen: OptionWerte | undefined): GriechischerCode {
  const gewaehlt = text(optionen, 'code', 'buchstaben');
  return gewaehlt === 'namen' || gewaehlt === 'nummern' ? gewaehlt : 'buchstaben';
}

/** Nebenformen und Kleinbuchstaben auf den Großbuchstaben bringen. */
function griechischGross(eingabe: string): string {
  return [...eingabe]
    .map((z) => GRIECHISCH.find((b) => b.klein === z || b.neben.includes(z))?.gross ?? z)
    .join('');
}

export const griechisch: Codec = {
  id: 'griechisch',
  name: 'Griechisch',
  quellen: [
    raetselnacht('Q', 'Griechisches Alphabet'),
    wikipedia('Griechisches Alphabet', 'https://de.wikipedia.org/wiki/Griechisches_Alphabet')
  ],
  beschreibung:
    'Griechische Buchstaben, ihre Namen (ALPHA, BETA …) oder ihre Nummer im Alphabet (1–24). Umschrift: Θ = TH, Φ = PH, Χ = CH, Ψ = PS; Η und Ω werden E und O.',
  optionen: [
    {
      id: 'code',
      titel: 'Code',
      art: 'auswahl',
      standard: 'buchstaben',
      werte: [
        { wert: 'buchstaben', titel: 'Buchstaben (Α Β Γ)' },
        { wert: 'namen', titel: 'Namen (ALPHA BETA)' },
        { wert: 'nummern', titel: 'Nummern (1 2 3)' }
      ]
    }
  ],
  encode(eingabe, optionen) {
    const buchstaben = GRIECHISCH_UMSCHRIFT.schreiben(eingabe);
    const code = griechischerCode(optionen);
    if (code === 'buchstaben') return buchstaben;
    const weiter = (code === 'namen' ? GRIECHISCH_NAMEN : GRIECHISCH_NUMMERN).encode(buchstaben.text);
    return ergebnis(weiter.text, [...buchstaben.luecken, ...weiter.luecken]);
  },
  decode(eingabe, optionen) {
    const code = griechischerCode(optionen);
    if (code === 'buchstaben') return GRIECHISCH_UMSCHRIFT.lesen(eingabe);
    const buchstaben = (code === 'namen' ? GRIECHISCH_NAMEN_LESEN : GRIECHISCH_NUMMERN).decode(eingabe.toUpperCase());
    const latein = GRIECHISCH_UMSCHRIFT.lesen(griechischGross(buchstaben.text));
    return ergebnis(latein.text, [...buchstaben.luecken, ...latein.luecken]);
  },
  tabelle(optionen): ReadonlyArray<TabellenEintrag> {
    const code = griechischerCode(optionen);
    return GRIECHISCH.map((b, i) => ({
      zeichen: b.latein,
      darstellung: code === 'namen' ? b.name : code === 'nummern' ? String(i + 1) : b.gross,
      hinweis: [
        code === 'buchstaben' ? '' : b.gross,
        b.klein + (b.neben ? `/${[...b.neben].join('/')}` : ''),
        code === 'namen' ? '' : b.name[0] + b.name.slice(1).toLowerCase()
      ]
        .filter(Boolean)
        .join(' · ')
    }));
  },
  erkennungsoptionen: [{ code: 'buchstaben' }, { code: 'namen' }],
  passt: (eingabe) => anteil(eingabe, /[Ͱ-Ͽ]/u)
};

// ---------------------------------------------------------------------------
// Kyrillisch

/**
 * Die Umschrift des Hefts ist die wissenschaftliche Transliteration mit
 * Hatschek (Ž, Č, Š). Die deutsche Transkription nach Duden schreibt
 * dieselben Laute so, wie man sie auf Deutsch liest (SCH, TSCH, SCH).
 */
const KYRILLISCH: ReadonlyArray<readonly [buchstabe: string, heft: string, deutsch: string]> = [
  ['А', 'A', 'A'],
  ['Б', 'B', 'B'],
  ['В', 'V', 'W'],
  ['Г', 'G', 'G'],
  ['Д', 'D', 'D'],
  ['Е', 'E', 'E'],
  ['Ё', 'JO', 'JO'],
  ['Ж', 'Ž', 'SCH'],
  ['З', 'Z', 'S'],
  ['И', 'I', 'I'],
  ['Й', 'Y', 'I'],
  ['К', 'K', 'K'],
  ['Л', 'L', 'L'],
  ['М', 'M', 'M'],
  ['Н', 'N', 'N'],
  ['О', 'O', 'O'],
  ['П', 'P', 'P'],
  ['Р', 'R', 'R'],
  ['С', 'S', 'S'],
  ['Т', 'T', 'T'],
  ['У', 'U', 'U'],
  ['Ф', 'F', 'F'],
  ['Х', 'CH', 'CH'],
  ['Ц', 'C', 'Z'],
  ['Ч', 'Č', 'TSCH'],
  ['Ш', 'Š', 'SCH'],
  ['Щ', 'ŠČ', 'SCHTSCH'],
  ['Ъ', '”', ''],
  ['Ы', 'Y', 'Y'],
  ['Ь', '’', ''],
  ['Э', 'Ė', 'E'],
  ['Ю', 'JU', 'JU'],
  ['Я', 'JA', 'JA']
];

const KYRILLISCH_UMSCHRIFT = {
  heft: umschrift(KYRILLISCH.map(([b, heft]) => [b, heft] as const)),
  // Deutsch fallen Laute zusammen: З und С sind beide S, Ж und Ш beide SCH.
  // Geschrieben wird dann der häufigere Buchstabe – er steht deshalb vorn.
  deutsch: umschrift([
    ['С', 'S'],
    ['Ш', 'SCH'],
    ...KYRILLISCH.map(([b, , deutsch]) => [b, deutsch] as const)
  ])
};

function kyrillischeUmschrift(optionen: OptionWerte | undefined) {
  return KYRILLISCH_UMSCHRIFT[text(optionen, 'umschrift', 'heft') === 'deutsch' ? 'deutsch' : 'heft'];
}

export const kyrillisch: Codec = {
  id: 'kyrillisch',
  name: 'Kyrillisch',
  quellen: [
    raetselnacht('C', 'Kyrillisches Alphabet'),
    wikipedia('Kyrillisches Alphabet', 'https://de.wikipedia.org/wiki/Kyrillisches_Alphabet'),
    wikipedia('Russisches Alphabet, Transkription', 'https://de.wikipedia.org/wiki/Russisches_Alphabet#Transkription_und_Transliteration')
  ],
  beschreibung:
    'Russisches Alphabet in Umschrift – wie im Heft (Ж = Ž, Ч = Č, Ш = Š) oder deutsch nach Duden (Ж = SCH, Ч = TSCH, В = W).',
  optionen: [
    {
      id: 'umschrift',
      titel: 'Umschrift',
      art: 'auswahl',
      standard: 'heft',
      werte: [
        { wert: 'heft', titel: 'wissenschaftlich (Ž, Č, Š)' },
        { wert: 'deutsch', titel: 'deutsch (SCH, TSCH, W)' }
      ]
    }
  ],
  encode: (eingabe, optionen) => kyrillischeUmschrift(optionen).schreiben(eingabe),
  decode: (eingabe, optionen) => kyrillischeUmschrift(optionen).lesen(eingabe),
  tabelle(optionen): ReadonlyArray<TabellenEintrag> {
    const deutsch = text(optionen, 'umschrift', 'heft') === 'deutsch';
    return KYRILLISCH.map(([b, heft, duden]) => ({
      zeichen: (deutsch ? duden : heft) || '–',
      darstellung: b,
      hinweis: `${b.toLowerCase()} · ${deutsch ? `Heft: ${heft}` : `deutsch: ${duden || '–'}`}`
    }));
  },
  erkennungsoptionen: [{ umschrift: 'heft' }, { umschrift: 'deutsch' }],
  passt: (eingabe) => anteil(eingabe, /[Ѐ-ӿ]/u)
};
