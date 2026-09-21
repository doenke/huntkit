<script lang="ts">
  import { codec as findeCodec } from '../codecs/registry';
  import { zerlegeCode } from '../lib/codeanzeige';

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

  /**
   * Wie hoch ein Bild sein soll, hängt an seiner Form: Morse ist eine flache
   * Balkenreihe und darf niedrig bleiben, ein Hexahue-Block oder ein Winker
   * wäre in derselben Höhe nicht mehr zu erkennen.
   */
  function hoehe(viewBox: string): number {
    const masse = viewBox.trim().split(/[\s,]+/).map(Number);
    const breite = masse[2] ?? 1;
    const hoch = masse[3] ?? 1;
    if (!Number.isFinite(breite) || !Number.isFinite(hoch) || breite <= 0) return 22;
    return hoch / breite < 0.5 ? 12 : 24;
  }
</script>

<span class="anzeige" class:einzeilig>
  {#each teile as teil, stelle (stelle)}
    {#if teil.art === 'wortluecke'}
      <span class="wortluecke" aria-hidden="true"></span>
    {:else}
      <span class="gruppe" class:fremd={!teil.glyph} title={teil.zeichen ?? teil.text}>
        {#if teil.glyph}
          <svg viewBox={teil.glyph.viewBox} style="height: {hoehe(teil.glyph.viewBox)}px" aria-hidden="true">
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
