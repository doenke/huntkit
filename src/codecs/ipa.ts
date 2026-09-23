import { ergebnis } from './hilfen';
import type { Codec, Luecke, TabellenEintrag } from './types';

/**
 * IPA-Lautschrift, wie die Tafel der Nachtschicht sie zeigt (Anhang J).
 *
 * Die sinnvolle Richtung ist das Lesen: Aus einer Umschrift wie [ˈʃuːlə] wird
 * SCHULE. Jeder Laut wird dafür durch seine übliche Schreibung ersetzt – [ʃ]
 * durch SCH, [ŋ] durch NG, [t͡s] durch Z. Betonung, Länge und Klammern
 * werden übergangen, der Knacklaut [ʔ] ergibt nichts.
 *
 * Umgekehrt entsteht nur eine grobe Umschrift: Ob ein e offen oder
 * geschlossen ist, steht nicht in der Schreibung.
 */

interface Laut {
  ipa: string;
  schreibung: string;
  lautwert: string;
  beispiel: string;
  vokal: boolean;
}

// Reihenfolge und Wortlaut wie auf der Tafel.
const LAUTE: ReadonlyArray<Laut> = [
  { ipa: 'ɐ', schreibung: 'ER', lautwert: 'abgeschwächtes a', beispiel: 'oder', vokal: true },
  { ipa: 'a', schreibung: 'A', lautwert: 'helles a', beispiel: 'Allah', vokal: true },
  { ipa: 'b', schreibung: 'B', lautwert: 'b-Laut', beispiel: 'Ball', vokal: false },
  { ipa: 'ç', schreibung: 'CH', lautwert: 'ch-Laut (nicht nach a, o, u oder chen)', beispiel: 'ich', vokal: false },
  { ipa: 'd', schreibung: 'D', lautwert: 'd-Laut', beispiel: 'Widder', vokal: false },
  { ipa: 'e', schreibung: 'E', lautwert: 'geschlossenes e', beispiel: 'Beet', vokal: true },
  { ipa: 'ə', schreibung: 'E', lautwert: 'unbetontes e', beispiel: 'Falle', vokal: true },
  { ipa: 'ɛ', schreibung: 'E', lautwert: 'offenes e', beispiel: 'Rest', vokal: true },
  { ipa: 'f', schreibung: 'F', lautwert: 'f-Laut', beispiel: 'voll', vokal: false },
  { ipa: 'g', schreibung: 'G', lautwert: 'g-Laut', beispiel: 'Bagger', vokal: false },
  { ipa: 'h', schreibung: 'H', lautwert: 'h-Laut', beispiel: 'Hut', vokal: false },
  { ipa: 'i', schreibung: 'I', lautwert: 'geschlossenes i', beispiel: 'Pirat', vokal: true },
  { ipa: 'ɪ', schreibung: 'I', lautwert: 'offenes i', beispiel: 'Beginn', vokal: true },
  { ipa: 'k', schreibung: 'K', lautwert: 'k-Laut', beispiel: 'Kamer', vokal: false },
  { ipa: 'l', schreibung: 'L', lautwert: 'l-Laut', beispiel: 'hell', vokal: false },
  { ipa: 'm', schreibung: 'M', lautwert: 'm-Laut', beispiel: 'immer', vokal: false },
  { ipa: 'ŋ', schreibung: 'NG', lautwert: 'ng-Laut', beispiel: 'Hang', vokal: false },
  { ipa: 'n', schreibung: 'N', lautwert: 'n-Laut', beispiel: 'Zahn', vokal: false },
  { ipa: 'o', schreibung: 'O', lautwert: 'geschlossenes o', beispiel: 'ohne', vokal: true },
  { ipa: 'ø', schreibung: 'Ö', lautwert: 'geschlossenes ö', beispiel: 'schön', vokal: true },
  { ipa: 'ɔ', schreibung: 'O', lautwert: 'offenes o', beispiel: 'kommen', vokal: true },
  { ipa: 'œ', schreibung: 'Ö', lautwert: 'offenes ö', beispiel: 'zwölf', vokal: true },
  { ipa: 'p', schreibung: 'P', lautwert: 'p-Laut', beispiel: 'Pappe', vokal: false },
  { ipa: 'ʁ', schreibung: 'R', lautwert: 'r-Laut', beispiel: 'Rest', vokal: false },
  { ipa: 'z', schreibung: 'S', lautwert: 'stimmhafter s-Laut', beispiel: 'Bazar', vokal: false },
  { ipa: 'ʃ', schreibung: 'SCH', lautwert: 'stimmloser sch-Laut', beispiel: 'schnell', vokal: false },
  { ipa: 's', schreibung: 'S', lautwert: 'stimmloser ß-Laut', beispiel: 'Wasser', vokal: false },
  { ipa: 't', schreibung: 'T', lautwert: 't-Laut', beispiel: 'Blatt', vokal: false },
  { ipa: 't͡s', schreibung: 'Z', lautwert: 'z-Laut', beispiel: 'Ziel', vokal: false },
  { ipa: 't͡ʃ', schreibung: 'TSCH', lautwert: 'tsch-Laut', beispiel: 'Tschüss', vokal: false },
  { ipa: 'u', schreibung: 'U', lautwert: 'geschlossenes u', beispiel: 'Schuh', vokal: true },
  { ipa: 'ʊ', schreibung: 'U', lautwert: 'offenes u', beispiel: 'Mutter', vokal: true },
  { ipa: 'y', schreibung: 'Ü', lautwert: 'ü-Laut', beispiel: 'Güte', vokal: true },
  { ipa: 'ʏ', schreibung: 'Ü', lautwert: 'ü-Laut (kurz)', beispiel: 'Müll', vokal: true },
  { ipa: 'v', schreibung: 'W', lautwert: 'w-Laut', beispiel: 'Wald', vokal: false },
  { ipa: 'χ', schreibung: 'CH', lautwert: 'ch-Laut', beispiel: 'Bach', vokal: false },
  { ipa: 'x', schreibung: 'CH', lautwert: 'Ach-Laut', beispiel: 'Loch', vokal: false },
  { ipa: 'ʔ', schreibung: '', lautwert: 'Knacklaut', beispiel: 'beachten', vokal: false }
];

/**
 * Was beim Lesen übergangen wird: Klammern, Schrägstriche, Betonung,
 * Länge, Silbengrenze und das Bindebogen-Zeichen, falls es allein steht.
 */
const UEBERGEHEN = new Set(['[', ']', '/', 'ˈ', 'ˌ', "'", 'ː', 'ˑ', ':', '.', '‿', '͡', '͜']);

/**
 * Lesbare Laute, längste zuerst. Affrikaten stehen oft auch ohne Bindebogen
 * da – „ts“ und „tʃ“ gelten deshalb genauso.
 */
const ZUM_LESEN: ReadonlyArray<readonly [string, string]> = (
  [
    ...LAUTE.map((l): [string, string] => [l.ipa, l.schreibung]),
    ['ts', 'Z'],
    ['tʃ', 'TSCH'],
    // Häufige Nebenformen, die auf der Tafel fehlen, in Umschriften aber stehen.
    ['r', 'R'],
    ['ɾ', 'R'],
    ['j', 'J'],
    ['ɡ', 'G']
  ] as Array<[string, string]>
).sort((a, b) => [...b[0]].length - [...a[0]].length);

function lesen(eingabe: string) {
  const luecken: Luecke[] = [];
  const zeichen = [...eingabe];
  let heraus = '';
  let i = 0;
  while (i < zeichen.length) {
    const z = zeichen[i] as string;
    if (/\s/.test(z)) {
      heraus += ' ';
      i++;
      continue;
    }
    if (UEBERGEHEN.has(z)) {
      i++;
      continue;
    }
    const rest = zeichen.slice(i).join('');
    const treffer = ZUM_LESEN.find(([ipa]) => rest.startsWith(ipa));
    if (treffer) {
      heraus += treffer[1];
      i += [...treffer[0]].length;
      continue;
    }
    luecken.push({ position: i, zeichen: z });
    i++;
  }
  return ergebnis(heraus.replace(/ +/g, ' ').trim(), luecken);
}

/** Schreibung → Laut für die grobe Umschrift, längste zuerst. */
const ZUM_SCHREIBEN: ReadonlyArray<readonly [string, string]> = [
  ['TSCH', 't͡ʃ'],
  ['SCH', 'ʃ'],
  ['CH', 'ç'],
  ['NG', 'ŋ'],
  ['CK', 'k'],
  ['PH', 'f'],
  ['Z', 't͡s'],
  ['W', 'v'],
  ['V', 'f'],
  ['Ä', 'ɛ'],
  ['Ö', 'ø'],
  ['Ü', 'y'],
  ['ß', 's'],
  ['R', 'ʁ'],
  ['J', 'j'],
  ['C', 'k'],
  ['Q', 'k'],
  ['X', 'ks'],
  ['Y', 'y'],
  ...['A', 'B', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'S', 'T', 'U'].map(
    (b) => [b, b.toLowerCase()] as const
  )
];

function schreiben(eingabe: string) {
  const luecken: Luecke[] = [];
  // ß vor dem Großschreiben retten – 'ß'.toUpperCase() ist 'SS'.
  const zeichen = [...eingabe].map((z) => (z === 'ß' ? z : z.toUpperCase()));
  let heraus = '';
  let i = 0;
  while (i < zeichen.length) {
    const z = zeichen[i] as string;
    if (/\s/.test(z)) {
      heraus += ' ';
      i++;
      continue;
    }
    const rest = zeichen.slice(i).join('');
    const treffer = ZUM_SCHREIBEN.find(([schreibung]) => rest.startsWith(schreibung));
    if (treffer) {
      heraus += treffer[1];
      i += [...treffer[0]].length;
      continue;
    }
    luecken.push({ position: i, zeichen: z });
    i++;
  }
  return ergebnis(heraus.replace(/ +/g, ' ').trim(), luecken);
}

/** Zeichen, die es nur in Lautschrift gibt – daran erkennt man sie. */
const NUR_IPA = /[ɐəɛɪŋɔœʁʃʊʏχʔçøːˈˌ͡]/u;

export const ipa: Codec = {
  id: 'ipa',
  name: 'IPA-Lautschrift',
  beschreibung:
    'Lautschrift lesen: [ˈʃuːlə] wird SCHULE. Umgekehrt nur grob – die Schreibung verrät nicht, wie ein Laut klingt.',
  encode: (eingabe) => schreiben(eingabe),
  decode: (eingabe) => lesen(eingabe),
  tabelle: (): ReadonlyArray<TabellenEintrag> =>
    LAUTE.map((laut) => ({
      zeichen: laut.schreibung || '–',
      darstellung: laut.ipa,
      gruppe: laut.vokal ? 'Vokale' : 'Konsonanten',
      hinweis: `${laut.lautwert} · ${laut.beispiel}`
    })),
  passt: (eingabe) => {
    const relevant = [...eingabe].filter((z) => !/\s/.test(z));
    if (relevant.length === 0 || !NUR_IPA.test(eingabe)) return 0;
    const lesbar = lesen(eingabe);
    return lesbar.luecken.length === 0 ? 0.9 : 0.4;
  }
};

export const ipaLaute = LAUTE;
