import { ELEMENTE } from './periodensystem';

/**
 * Text in Elementsymbolen schreiben.
 *
 * Der interessante Fall ist die Zerlegung: „CON“ lässt sich als C-O-N oder als
 * Co-N lesen. Deshalb werden **alle** gültigen Zerlegungen gezeigt statt einer
 * ausgewählten – genau hier übersieht man von Hand die richtige Variante.
 */

const NACH_SYMBOL = new Map(ELEMENTE.map((e) => [e.symbol.toUpperCase(), e]));
const LAENGEN = [...new Set(ELEMENTE.map((e) => e.symbol.length))].sort();

export interface Zerlegung {
  symbole: string[];
  ordnungszahlen: number[];
}

/**
 * Alle Zerlegungen eines Wortes in Elementsymbole. Die Obergrenze verhindert,
 * dass lange Wörter die Oberfläche fluten – bei „Anilin“ gibt es Dutzende.
 */
export function zerlegungen(wort: string, hoechstens = 40): Zerlegung[] {
  const sauber = wort.toUpperCase().replace(/[^A-Z]/g, '');
  if (sauber.length === 0) return [];

  const gefunden: Zerlegung[] = [];

  const suche = (stelle: number, bisher: string[]) => {
    if (gefunden.length >= hoechstens) return;
    if (stelle === sauber.length) {
      gefunden.push({
        symbole: [...bisher],
        ordnungszahlen: bisher.map((s) => NACH_SYMBOL.get(s.toUpperCase())!.ordnungszahl)
      });
      return;
    }
    for (const laenge of LAENGEN) {
      const stueck = sauber.slice(stelle, stelle + laenge);
      if (stueck.length < laenge) continue;
      const element = NACH_SYMBOL.get(stueck);
      if (element) suche(stelle + laenge, [...bisher, element.symbol]);
    }
  };

  suche(0, []);
  return gefunden;
}

/** Nur die Wörter eines Satzes einzeln zerlegen – Leerzeichen trennen. */
export function satzZerlegen(satz: string, hoechstens = 12): Array<{ wort: string; zerlegungen: Zerlegung[] }> {
  return satz
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((wort) => ({ wort, zerlegungen: zerlegungen(wort, hoechstens) }));
}
