<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { wachsen } from '../lib/ui/wachsen';

  /**
   * Ein Eingabefeld für eine Zeile Text, das bei langem Inhalt nach unten
   * wächst, statt ihn seitlich zu verschieben. Einen Zeilenumbruch nimmt es
   * nicht an: Enter löst `enter` aus (etwa „suchen“ oder „merken“), und ein
   * eingefügter Umbruch wird zum Leerzeichen.
   */
  let {
    value = $bindable(''),
    enter,
    oninput,
    ...rest
  }: Omit<HTMLTextareaAttributes, 'value'> & {
    value?: string;
    enter?: () => void;
  } = $props();

  function taste(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    enter?.();
  }

  function eingabe(e: Event & { currentTarget: EventTarget & HTMLTextAreaElement }) {
    const feld = e.currentTarget;
    const art = e instanceof InputEvent ? e.inputType : '';
    if (art === 'insertLineBreak' || art === 'insertParagraph') {
      // Manche Handytastaturen melden Enter nur als Eingabe.
      feld.value = feld.value.replace(/\r?\n/g, '');
      value = feld.value;
      enter?.();
      return;
    }
    if (/[\r\n]/.test(feld.value)) feld.value = feld.value.replace(/\r?\n/g, ' ');
    value = feld.value;
    oninput?.(e);
  }
</script>

<textarea
  rows="1"
  enterkeyhint={enter ? 'go' : 'done'}
  {...rest}
  {value}
  use:wachsen={value}
  onkeydown={taste}
  oninput={eingabe}
></textarea>

<style>
  /* Aussieht wie die bisherigen einzeiligen Felder, solange der Text in eine Zeile passt. */
  textarea {
    display: block;
    width: 100%;
    font: inherit;
    line-height: 1.35;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: var(--tap);
    padding: 12px;
    resize: none;
    overflow: hidden;
  }
</style>
