import { nurBuchstaben } from './sprachwert';

/**
 * Häufigkeitsanalyse. Sie beantwortet nicht, was der Text bedeutet, sondern
 * *welche Art* Chiffre vorliegt – und das spart im Rätsel die meiste Zeit.
 */

export interface Haeufigkeit {
  zeichen: string;
  anzahl: number;
  anteil: number;
}

export interface Analyse {
  laenge: number;
  haeufigkeiten: Haeufigkeit[];
  /** Koinzidenzindex nach Friedman. */
  koinzidenz: number;
  deutung: string;
}

export function analysiere(text: string): Analyse {
  const sauber = nurBuchstaben(text);
  const zaehlung = new Map<string, number>();
  for (const zeichen of sauber) zaehlung.set(zeichen, (zaehlung.get(zeichen) ?? 0) + 1);

  const haeufigkeiten = [...zaehlung.entries()]
    .map(([zeichen, anzahl]) => ({ zeichen, anzahl, anteil: anzahl / Math.max(1, sauber.length) }))
    .sort((a, b) => b.anzahl - a.anzahl || a.zeichen.localeCompare(b.zeichen));

  // Koinzidenzindex: Wahrscheinlichkeit, dass zwei zufällig gezogene Buchstaben
  // gleich sind. Deutsch liegt bei etwa 0,076, gleichverteilter Salat bei 0,038.
  let summe = 0;
  for (const anzahl of zaehlung.values()) summe += anzahl * (anzahl - 1);
  const koinzidenz = sauber.length > 1 ? summe / (sauber.length * (sauber.length - 1)) : 0;

  return { laenge: sauber.length, haeufigkeiten, koinzidenz, deutung: deute(sauber.length, koinzidenz) };
}

function deute(laenge: number, koinzidenz: number): string {
  if (laenge < 40) return 'Zu kurz für eine belastbare Aussage.';
  if (koinzidenz > 0.062) {
    return 'Hoch wie natürliche Sprache: Die Buchstaben sind vermutlich nur ersetzt oder vertauscht – Caesar, Atbash oder eine Umstellung.';
  }
  if (koinzidenz < 0.048) {
    return 'Niedrig, fast gleichverteilt: Das spricht für eine Chiffre mit wechselnder Verschiebung, etwa Vigenère.';
  }
  return 'Dazwischen – weder eindeutig einfache Ersetzung noch klar wechselnde Verschiebung.';
}
