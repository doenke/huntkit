import { anteil, ergebnis, ohneUmlaute, text } from './hilfen';
import { raetselnacht, wikipedia } from './quellen';
import type { Codec, Luecke, OptionWerte, TabellenEintrag } from './types';

/**
 * Der genetische Code: Aus je drei Basen (einem Codon) wird eine Aminosäure,
 * und jede Aminosäure hat einen Buchstaben. Tafel wie im Infoheft der
 * RätselNacht 5 (Anhang A).
 *
 * Code sind die Codons, die Kürzel (Ala, Arg …) oder die Namen; Klartext ist
 * der Einbuchstabencode. Ein Stoppcodon beendet ein Wort und wird deshalb zum
 * Leerzeichen – und umgekehrt. B, J, O, U, X und Z haben keine Aminosäure.
 *
 * DNA statt RNA wird genauso gelesen: T steht dann für U.
 */

interface Aminosaeure {
  name: string;
  kuerzel: string;
  symbol: string;
  codons: ReadonlyArray<string>;
}

const AMINOSAEUREN: ReadonlyArray<Aminosaeure> = [
  { name: 'Alanin', kuerzel: 'Ala', symbol: 'A', codons: ['GCU', 'GCC', 'GCA', 'GCG'] },
  { name: 'Arginin', kuerzel: 'Arg', symbol: 'R', codons: ['CGU', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'] },
  { name: 'Asparagin', kuerzel: 'Asn', symbol: 'N', codons: ['AAU', 'AAC'] },
  { name: 'Asparaginsäure', kuerzel: 'Asp', symbol: 'D', codons: ['GAU', 'GAC'] },
  { name: 'Cystein', kuerzel: 'Cys', symbol: 'C', codons: ['UGU', 'UGC'] },
  { name: 'Glutamin', kuerzel: 'Gln', symbol: 'Q', codons: ['CAA', 'CAG'] },
  { name: 'Glutaminsäure', kuerzel: 'Glu', symbol: 'E', codons: ['GAA', 'GAG'] },
  { name: 'Glycin', kuerzel: 'Gly', symbol: 'G', codons: ['GGU', 'GGC', 'GGA', 'GGG'] },
  { name: 'Histidin', kuerzel: 'His', symbol: 'H', codons: ['CAU', 'CAC'] },
  { name: 'Isoleucin', kuerzel: 'Ile', symbol: 'I', codons: ['AUU', 'AUC', 'AUA'] },
  { name: 'Leucin', kuerzel: 'Leu', symbol: 'L', codons: ['UUA', 'UUG', 'CUU', 'CUC', 'CUA', 'CUG'] },
  { name: 'Lysin', kuerzel: 'Lys', symbol: 'K', codons: ['AAA', 'AAG'] },
  { name: 'Methionin', kuerzel: 'Met', symbol: 'M', codons: ['AUG'] },
  { name: 'Phenylalanin', kuerzel: 'Phe', symbol: 'F', codons: ['UUU', 'UUC'] },
  { name: 'Prolin', kuerzel: 'Pro', symbol: 'P', codons: ['CCU', 'CCC', 'CCA', 'CCG'] },
  { name: 'Serin', kuerzel: 'Ser', symbol: 'S', codons: ['UCU', 'UCC', 'UCA', 'UCG', 'AGU', 'AGC'] },
  { name: 'Threonin', kuerzel: 'Thr', symbol: 'T', codons: ['ACU', 'ACC', 'ACA', 'ACG'] },
  { name: 'Tryptophan', kuerzel: 'Trp', symbol: 'W', codons: ['UGG'] },
  { name: 'Tyrosin', kuerzel: 'Tyr', symbol: 'Y', codons: ['UAU', 'UAC'] },
  { name: 'Valin', kuerzel: 'Val', symbol: 'V', codons: ['GUU', 'GUC', 'GUA', 'GUG'] },
  { name: 'Stop', kuerzel: 'Stop', symbol: ' ', codons: ['UAA', 'UAG', 'UGA'] }
];

type Darstellung = 'codons' | 'kuerzel' | 'namen';

function darstellungAus(optionen: OptionWerte | undefined): Darstellung {
  const gewaehlt = text(optionen, 'code', 'codons');
  return gewaehlt === 'kuerzel' || gewaehlt === 'namen' ? gewaehlt : 'codons';
}

/** Großgeschrieben und ohne Umlaute – so tippt man Namen auch mal. */
const schluessel = (wort: string) => ohneUmlaute(wort).toUpperCase();

const NACH_CODE = new Map<string, string>();
for (const a of AMINOSAEUREN) {
  for (const codon of a.codons) NACH_CODE.set(codon, a.symbol);
  NACH_CODE.set(schluessel(a.kuerzel), a.symbol);
  NACH_CODE.set(schluessel(a.name), a.symbol);
}
// Übliche Nebenformen: Ter für das Stoppcodon, die -at-Namen der Säuren.
NACH_CODE.set('TER', ' ');
NACH_CODE.set('ASPARTAT', 'D');
NACH_CODE.set('GLUTAMAT', 'E');

const NACH_SYMBOL = new Map(AMINOSAEUREN.map((a) => [a.symbol, a]));

/**
 * Codons dürfen getrennt oder am Stück dastehen: Eine lange Gruppe aus
 * Basen wird in Dreiergruppen zerlegt.
 */
function stuecke(eingabe: string): string[] {
  return eingabe
    .split(/[\s,;/·–-]+/)
    .filter((s) => s.length > 0)
    .flatMap((s) => {
      const basen = s.toUpperCase().replace(/T/g, 'U');
      if (/^[ACGU]+$/.test(basen) && basen.length > 3 && basen.length % 3 === 0) return basen.match(/.{3}/g) ?? [];
      return [/^[ACGTU]+$/i.test(s) ? basen : schluessel(s)];
    });
}

export const aminosaeuren: Codec = {
  id: 'aminosaeuren',
  name: 'Aminosäuren',
  quellen: [
    raetselnacht('A', 'Aminosäuren'),
    wikipedia('Aminosäuren', 'https://de.wikipedia.org/wiki/Aminos%C3%A4uren'),
    wikipedia('Genetischer Code, Codon', 'https://de.wikipedia.org/wiki/Genetischer_Code#Codon')
  ],
  beschreibung:
    'Codons (GCU), Kürzel (Ala) oder Namen (Alanin) zum Einbuchstabencode (A). Stoppcodons trennen Wörter; DNA mit T geht auch.',
  optionen: [
    {
      id: 'code',
      titel: 'Code',
      art: 'auswahl',
      standard: 'codons',
      werte: [
        { wert: 'codons', titel: 'Codons (GCU)' },
        { wert: 'kuerzel', titel: 'Kürzel (Ala)' },
        { wert: 'namen', titel: 'Namen (Alanin)' }
      ]
    }
  ],
  encode(eingabe, optionen) {
    const darstellung = darstellungAus(optionen);
    const luecken: Luecke[] = [];
    const teile: string[] = [];
    const woerter = eingabe.trim().split(/\s+/).filter((w) => w.length > 0);
    let position = 0;
    woerter.forEach((wort, i) => {
      if (i > 0) teile.push(darstellung === 'codons' ? 'UAA' : 'Stop');
      for (const zeichen of wort) {
        const a = NACH_SYMBOL.get(zeichen.toUpperCase());
        if (a && a.symbol !== ' ') teile.push(darstellung === 'codons' ? (a.codons[0] as string) : a[darstellung === 'kuerzel' ? 'kuerzel' : 'name']);
        else luecken.push({ position, zeichen });
        position += zeichen.length;
      }
      position += 1;
    });
    return ergebnis(teile.join(' '), luecken);
  },
  decode(eingabe) {
    const luecken: Luecke[] = [];
    let heraus = '';
    stuecke(eingabe).forEach((stueck, position) => {
      const symbol = NACH_CODE.get(stueck);
      if (symbol === undefined) luecken.push({ position, zeichen: stueck });
      else heraus += symbol;
    });
    return ergebnis(heraus.replace(/ +/g, ' ').trim(), luecken);
  },
  tabelle(optionen): ReadonlyArray<TabellenEintrag> {
    const darstellung = darstellungAus(optionen);
    return AMINOSAEUREN.map((a) => ({
      zeichen: a.symbol === ' ' ? '␣' : a.symbol,
      darstellung: darstellung === 'codons' ? (a.codons[0] as string) : darstellung === 'kuerzel' ? a.kuerzel : a.name,
      hinweis: [darstellung === 'namen' ? a.kuerzel : a.name, a.codons.join(' ')].join(' · ')
    }));
  },
  erkennungsoptionen: [{ code: 'codons' }, { code: 'kuerzel' }],
  passt(eingabe) {
    const teile = stuecke(eingabe);
    if (teile.length === 0) return 0;
    const bekannt = teile.filter((t) => NACH_CODE.has(t)).length / teile.length;
    return bekannt * anteil(eingabe, /[A-Za-zÄÖÜäöü\s-]/) * 0.9;
  }
};
