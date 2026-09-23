import { anteil, text, zeichenCodec } from './hilfen';
import type { Codec, OptionWerte } from './types';
import { nachtschicht, raetselnacht, wikipedia } from './quellen';

/**
 * Buchstabiertafeln: die der NATO und die beiden deutschen nach DIN 5009,
 * alle drei wie im Regelheft der Nachtschicht (Anhang A). Die NATO-Wörter
 * stehen so da, wie beide Hefte sie schreiben – FOXTROT, JULIETT, XRAY.
 *
 * Verschlüsselt wird mit der gewählten Tafel. Entschlüsselt wird mit allen
 * zugleich und ohne Rücksicht auf Groß- und Kleinschreibung, dazu mit den
 * üblichen Nebenformen (ALPHA, JULIET, FOXTROTT, X-RAY, WHISKY) – sonst
 * scheitert ein Rätsel an einer Schreibweise, obwohl jeder weiß, was gemeint ist.
 */

const BUCHSTABEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const TAFELN = {
  nato: 'ALFA BRAVO CHARLIE DELTA ECHO FOXTROT GOLF HOTEL INDIA JULIETT KILO LIMA MIKE NOVEMBER OSCAR PAPA QUEBEC ROMEO SIERRA TANGO UNIFORM VICTOR WHISKEY XRAY YANKEE ZULU',
  alt: 'ANTON BERTA CÄSAR DORA EMIL FRIEDRICH GUSTAV HEINRICH IDA JAKOB KAUFMANN LUDWIG MARTHA NORDPOL OTTO PAULA QUELLE RICHARD SIEGFRIED THEODOR ULRICH VIKTOR WILHELM XANTHIPPE YPSILON ZACHARIAS',
  neu: 'AACHEN BERLIN CHEMNITZ DÜSSELDORF ESSEN FRANKFURT GOSLAR HAMBURG INGELHEIM JENA KÖLN LEIPZIG MÜNCHEN NÜRNBERG OFFENBACH POTSDAM QUICKBORN ROSTOCK SALZWEDEL TÜBINGEN UNNA VÖLKLINGEN WUPPERTAL XANTEN YPSILON ZWICKAU'
} as const;

type Tafel = keyof typeof TAFELN;

/** Ziffern in deutscher Schreibweise – für alle drei Tafeln gleich. */
const ZIFFERN = [
  ['0', 'NULL'], ['1', 'EINS'], ['2', 'ZWEI'], ['3', 'DREI'], ['4', 'VIER'],
  ['5', 'FÜNF'], ['6', 'SECHS'], ['7', 'SIEBEN'], ['8', 'ACHT'], ['9', 'NEUN']
] as const;

/** Schreibweisen, die man woanders findet – nur zum Lesen. */
const NEBENFORMEN = [
  ['A', 'ALPHA'], ['F', 'FOXTROTT'], ['J', 'JULIET'], ['W', 'WHISKY'], ['X', 'X-RAY']
] as const;

function tabelle(tafel: Tafel): Array<readonly [string, string]> {
  const woerter = TAFELN[tafel].split(' ');
  return [...[...BUCHSTABEN].map((b, i) => [b, woerter[i] as string] as const), ...ZIFFERN];
}

const SCHREIBEN = {
  nato: zeichenCodec({ tabelle: tabelle('nato'), trenner: ' ', worttrenner: '/' }),
  alt: zeichenCodec({ tabelle: tabelle('alt'), trenner: ' ', worttrenner: '/' }),
  neu: zeichenCodec({ tabelle: tabelle('neu'), trenner: ' ', worttrenner: '/' })
};

// Alle Tafeln zusammen: Kein Wort steht in zwei Tafeln für verschiedene Buchstaben.
const LESEN = zeichenCodec({
  tabelle: [...tabelle('nato'), ...tabelle('alt'), ...tabelle('neu'), ...NEBENFORMEN],
  trenner: ' ',
  worttrenner: '/'
});

function tafelAus(optionen: OptionWerte | undefined): Tafel {
  const gewaehlt = text(optionen, 'tafel', 'nato');
  return gewaehlt in TAFELN ? (gewaehlt as Tafel) : 'nato';
}

const BEKANNT = new Set(
  [...tabelle('nato'), ...tabelle('alt'), ...tabelle('neu'), ...NEBENFORMEN].map(([, wort]) => wort)
);

export const nato: Codec = {
  id: 'nato',
  name: 'Buchstabiertafel',
  quellen: [
    nachtschicht('A', 'Buchstabier-Alphabete'),
    raetselnacht('B', 'NATO-Alphabet'),
    wikipedia('Buchstabiertafel', 'https://de.wikipedia.org/wiki/Buchstabiertafel')
  ],
  beschreibung:
    'NATO (ALFA, BRAVO …), alte deutsche (ANTON, BERTA …) oder neue deutsche Tafel (AACHEN, BERLIN …). Gelesen wird jede, auch in anderer Schreibweise.',
  optionen: [
    {
      id: 'tafel',
      titel: 'Tafel',
      art: 'auswahl',
      standard: 'nato',
      werte: [
        { wert: 'nato', titel: 'NATO' },
        { wert: 'alt', titel: 'deutsch, alt' },
        { wert: 'neu', titel: 'deutsch, neu (DIN 5009)' }
      ]
    }
  ],
  encode: (eingabe, optionen) => SCHREIBEN[tafelAus(optionen)].encode(eingabe),
  // Groß- und Kleinschreibung zählen nicht: Die Tafeln stehen in Großbuchstaben.
  decode: (eingabe) => LESEN.decode(eingabe.toUpperCase()),
  tabelle: (optionen) =>
    SCHREIBEN[tafelAus(optionen)]
      .tabelle()
      .map((e) => ({ ...e, gruppe: /[0-9]/.test(e.zeichen) ? 'Zahlen' : 'Buchstaben' })),
  erkennungsoptionen: [{ tafel: 'nato' }, { tafel: 'alt' }, { tafel: 'neu' }],
  passt(eingabe) {
    const woerter = eingabe.trim().split(/[\s/]+/).filter((w) => w.length > 0);
    if (woerter.length === 0) return 0;
    const treffer = woerter.filter((w) => BEKANNT.has(w.toUpperCase()));
    return (treffer.length / woerter.length) * anteil(eingabe, /[A-Za-zÄÖÜäöü/-]/);
  }
};
