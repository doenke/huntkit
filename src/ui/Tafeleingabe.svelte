<script lang="ts">
  import { codec as findeCodec } from '../codecs/registry';
  import { einzelzeichen } from '../lib/codeanzeige';

  /**
   * Eingabe über eine Codetafel: Tasten und antippbares Raster schreiben in
   * eine Zelle. Damit lässt sich eine Spalte in Morse, Braille oder Winker
   * füllen, ohne den Code vorher im Kopf zu übersetzen.
   */
  let {
    codecId,
    wert,
    setzen
  }: { codecId: string; wert: string; setzen: (neu: string) => void } = $props();

  const tafel = $derived(findeCodec(codecId));
  const eintraege = $derived(tafel?.tabelle?.() ?? []);
  const gruppen = $derived([...new Set(eintraege.map((e) => e.gruppe ?? 'Zeichen'))]);
  let gruppe = $state<string | null>(null);
  const aktiv = $derived(gruppe && gruppen.includes(gruppe) ? gruppe : gruppen[0]);
  const sichtbar = $derived(eintraege.filter((e) => (e.gruppe ?? 'Zeichen') === aktiv));

  /** Wo der Code nicht Zeichen für Zeichen dasteht, braucht es einen Trenner. */
  const trenner = $derived(tafel && einzelzeichen(tafel) ? '' : ' ');

  function anhaengen(stueck: string) {
    const vorher = wert.length > 0 && trenner && !wert.endsWith(trenner) ? trenner : '';
    setzen(wert + vorher + stueck);
  }

  /**
   * Die Tasten nehmen den Fokus nicht an sich: Er bleibt im Feld, in das
   * geschrieben wird. Sonst löst Enter danach nicht „nächste Zeile“ aus,
   * sondern drückt die zuletzt geklickte Taste ein zweites Mal.
   */
  const behalteFokus = (e: MouseEvent) => e.preventDefault();

  function loeschen() {
    setzen(trenner ? wert.replace(/\s*\S+\s*$/, '') : [...wert].slice(0, -1).join(''));
  }
</script>

{#if tafel}
  {#if tafel.eingabetasten}
    <div class="tasten">
      {#each tafel.eingabetasten as taste (taste.titel)}
        <button type="button" onmousedown={behalteFokus} title={taste.hinweis} onclick={() => setzen(wert + taste.einfuegen)}>
          {taste.titel}
        </button>
      {/each}
    </div>
  {/if}

  {#if gruppen.length > 1}
    <div class="abschnitte">
      {#each gruppen as name (name)}
        <button type="button" onmousedown={behalteFokus} aria-pressed={aktiv === name} onclick={() => (gruppe = name)}>
          {name}
        </button>
      {/each}
    </div>
  {/if}

  <div class="raster" class:mitBild={Boolean(tafel.zeichne)}>
    {#each sichtbar as eintrag, stelle (stelle)}
      {@const glyph = tafel.zeichne?.(eintrag.zeichen) ?? null}
      {@const codebild = glyph ? null : (tafel.zeichneCode?.(eintrag.darstellung) ?? null)}
      <button type="button" onmousedown={behalteFokus} onclick={() => anhaengen(eintrag.darstellung)}>
        {#if glyph}
          <svg viewBox={glyph.viewBox} aria-hidden="true">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html glyph.inhalt}
          </svg>
          <span class="zeichen">{eintrag.zeichen}</span>
        {:else}
          <span class="zeichen">{eintrag.zeichen}</span>
          {#if codebild}
            <svg class="codebild" viewBox={codebild.viewBox} aria-hidden="true">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html codebild.inhalt}
            </svg>
          {:else}
            <span class="mono code">{eintrag.darstellung}</span>
          {/if}
        {/if}
      </button>
    {/each}
  </div>

  <div class="fuss">
    <button type="button" onmousedown={behalteFokus} onclick={loeschen} disabled={wert.length === 0}>⌫ letztes</button>
    <button type="button" onmousedown={behalteFokus} onclick={() => setzen('')} disabled={wert.length === 0}>leeren</button>
  </div>
{/if}

<style>
  .tasten,
  .abschnitte,
  .fuss {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .tasten button {
    flex: 1 1 0;
    min-width: 2.6rem;
    min-height: 44px;
    padding: 0 6px;
    font-size: 1.05rem;
  }

  .abschnitte button,
  .fuss button {
    flex: 1 1 0;
    min-height: 34px;
    padding: 0 6px;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .raster {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.2rem, 1fr));
    align-content: start;
    gap: 4px;
    max-height: 32vh;
    overflow-y: auto;
    margin-bottom: 8px;
  }

  .raster.mitBild {
    grid-template-columns: repeat(auto-fill, minmax(4.6rem, 1fr));
  }

  .raster button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 2px;
  }

  .raster.mitBild button {
    min-height: 70px;
    color: var(--akzent);
  }

  .raster svg {
    height: 42px;
    width: auto;
    max-width: 100%;
  }

  .zeichen {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .raster.mitBild .zeichen {
    color: var(--text-leise);
    font-size: 0.72rem;
    font-weight: 500;
  }

  .code {
    color: var(--text-leise);
    font-size: 0.7rem;
    letter-spacing: 0.06em;
  }

  /*
   * Feste Einheit statt Einpassen: Sonst skaliert der Browser jede Zeichnung
   * auf die Feldhöhe, und ein kurzes E bekäme dickere Balken als ein langes
   * Sonderzeichen. Die Höhe der Spur ist bei jedem Code dieselbe, also ist
   * auch der Punkt überall gleich groß; die Breite darf wachsen.
   */
  .raster .codebild {
    height: 10px;
    width: auto;
    max-width: none;
    margin-top: 3px;
  }

  .mono {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }
</style>
