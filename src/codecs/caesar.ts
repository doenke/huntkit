import { ALPHABET, anteil, ergebnis, ohneUmlaute, zahl } from './hilfen';
import type { Codec, OptionWerte, TabellenEintrag } from './types';
import { raetselnacht, wikipedia } from './quellen';

export function verschiebe(eingabe: string, schritte: number): string {
  const versatz = ((schritte % 26) + 26) % 26;
  // Umlaute werden vorher aufgelöst; das Alphabet der Chiffre kennt sie nicht,
  // und ein stehengelassenes Ü verschiebt nichts, sondern verrät nur den Rest.
  return [...ohneUmlaute(eingabe)]
    .map((zeichen) => {
      const gross = zeichen.toUpperCase();
      const index = ALPHABET.indexOf(gross);
      // Alles, was kein A–Z ist – Ziffern, Umlaute, Satzzeichen – bleibt stehen.
      if (index < 0) return zeichen;
      const neu = ALPHABET[(index + versatz) % 26] as string;
      return zeichen === gross ? neu : neu.toLowerCase();
    })
    .join('');
}

/** Alle 26 Verschiebungen auf einmal – die Brute-Force-Wand. */
export function alleVerschiebungen(eingabe: string): ReadonlyArray<{ schritte: number; text: string }> {
  return Array.from({ length: 26 }, (_, schritte) => ({
    schritte,
    text: verschiebe(eingabe, schritte)
  }));
}

function schritteAus(optionen: OptionWerte | undefined): number {
  return zahl(optionen, 'verschiebung', 3);
}

export const caesar: Codec = {
  id: 'caesar',
  name: 'Caesar',
  quellen: [raetselnacht('K', 'Mono- und Polyalphabetische Verschlüsselungen'), wikipedia('Monoalphabetische Substitution', 'https://de.wikipedia.org/wiki/Monoalphabetische_Substitution')],
  beschreibung: 'Alphabet um feste Schritte verschoben. ROT-13 ist Verschiebung 13.',
  optionen: [
    { id: 'verschiebung', titel: 'Verschiebung', art: 'zahl', min: 0, max: 25, standard: 3 }
  ],
  // Alle 26 Verschiebungen durchprobieren – genau dafür ist die Wand da.
  erkennungsoptionen: Array.from({ length: 26 }, (_, verschiebung) => ({ verschiebung })),
  encode: (eingabe, optionen) => ergebnis(verschiebe(eingabe, schritteAus(optionen))),
  decode: (eingabe, optionen) => ergebnis(verschiebe(eingabe, -schritteAus(optionen))),
  tabelle(optionen): ReadonlyArray<TabellenEintrag> {
    const schritte = schritteAus(optionen);
    return [...ALPHABET].map((buchstabe) => ({
      zeichen: buchstabe,
      darstellung: verschiebe(buchstabe, schritte)
    }));
  },
  passt: (eingabe) => anteil(eingabe, /[A-Za-z]/) * 0.3
};
