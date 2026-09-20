<script lang="ts">
  import { anWerkbank } from '../lib/werkbank';
  import type { Codec } from '../codecs/types';

  /**
   * Nachschlagen in der Gegenrichtung: Man hat das Zeichen vor sich und sucht den
   * Buchstaben. Am Handy die einzige praktikable Bedienung für Braille, Winker
   * oder Flaggen – tippen kann man diese Zeichen nicht.
   */
  let { codec }: { codec: Codec } = $props();

  let gesammelt = $state('');

  const eintraege = $derived(
    (codec.tabelle?.() ?? [])
      .map((eintrag) => ({ ...eintrag, glyph: codec.zeichne?.(eintrag.zeichen) ?? null }))
      .filter((eintrag) => eintrag.glyph !== null)
  );
</script>

<div class="picker">
  <div class="raster">
    {#each eintraege as eintrag (eintrag.zeichen)}
      <button
        type="button"
        class="glyph"
        onclick={() => (gesammelt += eintrag.zeichen)}
        aria-label={`Zeichen ${eintrag.zeichen} anfügen`}
      >
        <svg viewBox={eintrag.glyph?.viewBox} aria-hidden="true">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html eintrag.glyph?.inhalt ?? ''}
        </svg>
        <span>{eintrag.zeichen}</span>
      </button>
    {/each}
  </div>

  <div class="puffer">
    <output class="mono">{gesammelt || ' '}</output>
    <div class="knoepfe">
      <button type="button" onclick={() => (gesammelt = gesammelt.slice(0, -1))} disabled={!gesammelt}>
        ← löschen
      </button>
      <button type="button" onclick={() => (gesammelt = '')} disabled={!gesammelt}>leeren</button>
      <button type="button" onclick={() => anWerkbank(gesammelt)} disabled={!gesammelt}>
        an die Werkbank
      </button>
    </div>
  </div>
</div>

<style>
  .picker {
    border-top: 1px solid var(--rand);
    padding: 12px;
  }

  .raster {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
    gap: 6px;
  }

  .glyph {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    min-height: calc(var(--tap) + 44px);
    color: var(--akzent);
  }

  .glyph svg {
    /* Höhe vorgeben, Breite folgt dem Seitenverhältnis – sonst stehen hohe
       Zeichen wie die Handformen verloren in einer breiten Kachel. */
    height: 64px;
    width: auto;
    max-width: 100%;
  }

  .glyph span {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .puffer {
    margin-top: 12px;
  }

  .puffer output {
    display: block;
    padding: 10px;
    background: var(--grund);
    border: 1px solid var(--rand);
    border-radius: 8px;
    font-size: 1.2rem;
    letter-spacing: 0.08em;
    overflow-wrap: anywhere;
  }

  .knoepfe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .knoepfe button {
    min-height: 44px;
    font-size: 0.9rem;
  }
</style>
