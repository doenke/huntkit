import { tick } from 'svelte';

/**
 * Ob beim Eingeben von Codes die Bildschirmtastatur aufgeht.
 *
 * Wer Morse, Braille oder Flaggen über die Codetafel eingibt, braucht sie
 * nicht – auf dem Handy belegt sie trotzdem den halben Bildschirm, sobald
 * das Feld den Fokus bekommt. Code-Felder tragen deshalb `inputmode="none"`:
 * Fokus und Cursor bleiben, nur die Tastatur bleibt zu. Eine echte Tastatur
 * am Laptop schreibt weiter. Wer doch tippen will, schaltet sie zu; das
 * gilt dann für alle Code-Felder und wird gemerkt.
 */

const SPEICHER = 'huntkit:code-tastatur';

function gelesen(): boolean {
  try {
    return localStorage.getItem(SPEICHER) === 'an';
  } catch {
    return false;
  }
}

export const codetastatur = $state({ an: gelesen() });

/** Der Wert für `inputmode` eines Code-Felds. */
export function codeInputmode(): 'none' | 'text' {
  return codetastatur.an ? 'text' : 'none';
}

/**
 * Umschalten – und das Feld, in dem man gerade steht, kurz neu fokussieren:
 * Erst dann geht die Tastatur auf oder zu.
 */
export async function codetastaturUmschalten(): Promise<void> {
  codetastatur.an = !codetastatur.an;
  try {
    localStorage.setItem(SPEICHER, codetastatur.an ? 'an' : 'aus');
  } catch {
    // Dann gilt es eben nur bis zum Neuladen.
  }
  const feld = document.activeElement;
  if (!(feld instanceof HTMLInputElement || feld instanceof HTMLTextAreaElement)) return;
  await tick();
  feld.blur();
  feld.focus();
}
