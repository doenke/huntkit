/**
 * Text wird nie in einem Feld gerollt: Felder wachsen mit ihrem Inhalt.
 *
 * Mehrzeilige Felder werden nach unten größer, Zellen der Werkbank-Tabelle
 * nach rechts – die sind bewusst einzeilig, und die Tabelle rollt ohnehin
 * seitlich. Beides als Svelte-Aktion mit dem Wert als Argument, damit auch
 * ein von außen gesetzter Text (etwa das Ergebnis einer Codekarte) das Feld
 * sofort passend macht, nicht erst beim nächsten Tastendruck.
 */

/** Höhe eines mehrzeiligen Felds an seinen Inhalt anpassen. `rows` bleibt die Mindesthöhe. */
export function passeHoeheAn(feld: HTMLTextAreaElement): void {
  feld.style.height = 'auto';
  // scrollHeight zählt den Innenabstand mit, aber nicht den Rand.
  const rand = feld.offsetHeight - feld.clientHeight;
  feld.style.height = `${feld.scrollHeight + rand}px`;
}

export function wachsen(feld: HTMLTextAreaElement, _wert?: string) {
  const anpassen = () => passeHoeheAn(feld);
  anpassen();
  feld.addEventListener('input', anpassen);

  // Wird das Feld schmaler (Handy gedreht, Spalte umgebrochen), bricht der
  // Text anders um. Nur auf die Breite hören: Die eigene Höhenänderung löst
  // sonst den Beobachter aus und der wieder die Höhe.
  let breite = feld.clientWidth;
  const beobachter =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          if (feld.clientWidth === breite) return;
          breite = feld.clientWidth;
          anpassen();
        });
  beobachter?.observe(feld);

  return {
    // Das Argument ändert sich, bevor Svelte den neuen Text ins Feld schreibt –
    // gemessen wird deshalb erst, wenn der Durchlauf fertig ist.
    update: () => queueMicrotask(anpassen),
    destroy() {
      feld.removeEventListener('input', anpassen);
      beobachter?.disconnect();
    }
  };
}

let messflaeche: CanvasRenderingContext2D | null | undefined;

/** Wie breit ein Text in der Schrift eines Felds wird, in Pixeln. */
function textbreite(feld: HTMLElement, text: string): number {
  if (messflaeche === undefined) {
    messflaeche = document.createElement('canvas').getContext('2d');
  }
  if (!messflaeche) return 0;
  const stil = getComputedStyle(feld);
  messflaeche.font = `${stil.fontStyle} ${stil.fontWeight} ${stil.fontSize} ${stil.fontFamily}`;
  return messflaeche.measureText(text).width;
}

/**
 * Ein einzeiliges Feld so breit machen, wie sein Text es braucht. Die Breite
 * landet als `--textbreite` am Feld – oder am Elternelement, wenn das Feld
 * darüber schwebt (die Bildzelle, deren Größe ihr Rahmen bestimmt). Das CSS
 * entscheidet, was es damit macht.
 */
export function breitNachText(feld: HTMLInputElement, _wert?: string) {
  const anpassen = () => {
    const stil = getComputedStyle(feld);
    const ziel = stil.position === 'absolute' ? feld.parentElement : feld;
    if (!ziel) return;
    const innen = parseFloat(stil.paddingLeft) + parseFloat(stil.paddingRight);
    // Zwei Pixel Luft für die Schreibmarke am Ende.
    const breite = Math.ceil(textbreite(feld, feld.value) + innen + 2);
    ziel.style.setProperty('--textbreite', `${breite}px`);
  };
  anpassen();
  feld.addEventListener('input', anpassen);
  return {
    update: () => queueMicrotask(anpassen),
    destroy() {
      feld.removeEventListener('input', anpassen);
    }
  };
}
