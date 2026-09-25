<script lang="ts">
  import { codec as findeCodec } from '../codecs/registry';
  import { zerlegeCode } from '../lib/ui/codeanzeige';

  /**
   * Ein Code-Text als Bild: je Gruppe ein Kästchen, dazwischen Abstand.
   *
   * Die Hinterlegung der Gruppe ist der eigentliche Trick – erst dadurch sieht
   * man bei Morse, welche Punkte und Striche zu einem Buchstaben gehören.
   * Zwischen zwei Wörtern wird die Lücke ausdrücklich breiter.
   */
  let {
    codecId,
    text,
    mitZeichen = false,
    einzeilig = false
  }: { codecId: string; text: string; mitZeichen?: boolean; einzeilig?: boolean } = $props();

  const codec = $derived(findeCodec(codecId));
  const teile = $derived(codec ? zerlegeCode(codec, text) : []);

  function masse(viewBox: string): { breite: number; hoch: number } | null {
    const zahlen = viewBox.trim().split(/[\s,]+/).map(Number);
    const breite = zahlen[2];
    const hoch = zahlen[3];
    if (!breite || !hoch || !Number.isFinite(breite) || !Number.isFinite(hoch)) return null;
    return { breite, hoch };
  }

  /**
   * Wie hoch die Bilder sein sollen, entscheidet die Form des Codes – nicht die
   * der einzelnen Gruppe. Morse ist eine flache Balkenreihe und darf niedrig
   * bleiben, ein Hexahue-Block wäre so nicht mehr zu erkennen.
   *
   * Gefragt wird die ganze Tabelle, nicht der gerade angezeigte Text: Sonst
   * geriete ausgerechnet ein einzelner Punkt – das E – doppelt so hoch wie
   * seine Nachbarn, weil er für sich genommen hoch statt breit ist.
   */
  const hoehe = $derived.by(() => {
    let breiteste = 0;
    for (const eintrag of codec?.tabelle?.() ?? []) {
      const glyph = codec?.zeichneCode?.(eintrag.darstellung) ?? codec?.zeichne?.(eintrag.zeichen);
      const gemessen = glyph ? masse(glyph.viewBox) : null;
      if (gemessen) breiteste = Math.max(breiteste, gemessen.breite / gemessen.hoch);
    }
    return breiteste > 2 ? 12 : 24;
  });
</script>

<span class="anzeige" class:einzeilig>
  {#each teile as teil, stelle (stelle)}
    {#if teil.art === 'wortluecke'}
      <span class="wortluecke" aria-hidden="true"></span>
    {:else}
      <span class="gruppe" class:fremd={!teil.glyph} title={teil.zeichen ?? teil.text}>
        {#if teil.glyph}
          <svg viewBox={teil.glyph.viewBox} style="height: {hoehe}px" aria-hidden="true">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html teil.glyph.inhalt}
          </svg>
        {:else}
          <span class="roh">{teil.text}</span>
        {/if}
        {#if mitZeichen}
          <span class="zeichen">{teil.zeichen ?? '?'}</span>
        {/if}
      </span>
    {/if}
  {/each}
  <span class="vorlesen">{text}</span>
</span>

<style>
  .anzeige {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
  }

  .anzeige.einzeilig {
    flex-wrap: nowrap;
  }

  /* Die Gruppe ist hinterlegt, der Abstand nicht – daran erkennt man, was
     zusammengehört, ohne Punkte zu zählen. Der Ton wird aus der Textfarbe
     gemischt, damit er in jedem Thema sichtbar bleibt, auch im Rotlicht. */
  .gruppe {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 4px 6px;
    border-radius: 5px;
    background: color-mix(in srgb, var(--text) 16%, transparent);
    flex: 0 0 auto;
  }

  .gruppe.fremd {
    background: none;
    border: 1px dashed var(--rand);
    color: var(--text-leise);
  }

  svg {
    display: block;
    width: auto;
    max-width: 100%;
  }

  .roh {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 0.8rem;
    line-height: 1.1;
  }

  .zeichen {
    font-size: 0.6rem;
    line-height: 1;
    color: var(--text-leise);
  }

  /* Wortlücke: ein stehender Strich. Ein liegender wäre bei Morse genau das
     Zeichen, das er nicht sein darf. */
  .wortluecke {
    flex: 0 0 auto;
    width: 1px;
    height: 1.1rem;
    margin: 0 4px;
    background: var(--text-leise);
    opacity: 0.6;
  }

  /* Der Text bleibt für Vorleseprogramme und zum Kopieren erhalten. */
  .vorlesen {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
