<script lang="ts">
  import { TASTATUREN, reihenbreite, type Tastatur } from '../lib/tastaturen';

  /**
   * Tastaturen zum Nachschlagen. Gezeichnet mit Kästchen statt als Bild, damit
   * sie in jeder Größe scharf sind und im Rotlicht die Farben der App tragen.
   * Die PC-Tastatur ist breiter als ein Handy – sie rollt als Ganzes seitlich,
   * damit jede Taste lesbar bleibt und die Nachbarschaft stimmt.
   */
  let gewaehlt = $state<Tastatur['id']>(TASTATUREN[0]?.id ?? 'pc');
  const tastatur = $derived(TASTATUREN.find((t) => t.id === gewaehlt) ?? TASTATUREN[0]);
  const einheiten = $derived(tastatur ? Math.max(...tastatur.reihen.map(reihenbreite)) : 15);
</script>

<div class="wahl">
  {#each TASTATUREN as eintrag (eintrag.id)}
    <button type="button" aria-pressed={gewaehlt === eintrag.id} onclick={() => (gewaehlt = eintrag.id)}>
      {eintrag.titel}
    </button>
  {/each}
</div>

{#if tastatur}
  <div class="rahmen" class:breit={tastatur.id === 'pc'}>
    <div class="tastatur" style:--einheiten={einheiten} role="img" aria-label={tastatur.titel}>
      {#each tastatur.reihen as reihe, r (r)}
        <div class="reihe">
          {#each reihe as taste, i (i)}
            <div
              class="taste"
              class:steuer={taste.steuer}
              class:leer={taste.steuer && !taste.basis}
              style:flex-grow={taste.breite ?? 1}
            >
              {#if taste.steuer}
                <span class="steuerzeichen">{taste.basis}</span>
              {:else if tastatur.id === 'handy'}
                {#if taste.lang}<span class="lang">{taste.lang}</span>{/if}
                <span class="mitte">{taste.basis}</span>
              {:else if taste.umschalt}
                <span class="oben">{taste.umschalt}</span>
                <span class="unten">{taste.basis}</span>
                {#if taste.altgr}<span class="altgr">{taste.altgr}</span>{/if}
              {:else}
                <span class="buchstabe">{taste.basis}</span>
                {#if taste.altgr}<span class="altgr">{taste.altgr}</span>{/if}
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
  <p class="hinweis">{tastatur.hinweis}</p>
  {#if tastatur.id === 'pc'}
    <p class="hinweis">
      Die Tafel im Regelheft zeigt die erweiterte Belegung E1 mit vielen weiteren Zeichen auf
      AltGr und Umschalt+AltGr. Hier stehen nur die, die auf jeder deutschen Tastatur gleich
      liegen.
    </p>
  {/if}
{/if}

<style>
  .wahl {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .wahl button {
    flex: 1 1 10rem;
    min-height: 40px;
    font-size: 0.85rem;
  }

  .wahl button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  /* Die PC-Tastatur rollt als Bild seitlich – kleiner gezeichnet wäre sie unlesbar. */
  .rahmen.breit {
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .tastatur {
    display: grid;
    gap: 4px;
  }

  .breit .tastatur {
    width: calc(var(--einheiten) * 2.6rem);
  }

  .reihe {
    display: flex;
    gap: 4px;
  }

  .taste {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    height: 2.6rem;
    border: 1px solid var(--rand);
    border-radius: 6px;
    background: var(--flaeche);
    font-size: 0.85rem;
  }

  /* Handy: höhere Tasten, wie auf dem Bildschirm. */
  .rahmen:not(.breit) .taste {
    height: 3.2rem;
  }

  .taste.steuer {
    background: var(--flaeche-hoch);
    color: var(--text-leise);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .taste.leer {
    border-color: transparent;
    background: none;
  }

  /* Die Leertaste ist keine Lücke, sondern eine Taste. */
  .reihe:last-child .taste.leer {
    border-color: var(--rand);
    background: var(--flaeche-hoch);
  }

  .steuerzeichen {
    font-size: 0.75rem;
  }

  .oben,
  .unten,
  .altgr,
  .buchstabe,
  .lang,
  .mitte {
    position: absolute;
    line-height: 1;
  }

  .oben {
    top: 4px;
    left: 5px;
  }

  .unten {
    bottom: 4px;
    left: 5px;
  }

  .buchstabe {
    top: 5px;
    left: 5px;
    font-size: 1.05rem;
    font-weight: 600;
  }

  .altgr {
    bottom: 4px;
    right: 5px;
    color: var(--akzent);
    font-size: 0.75rem;
  }

  .mitte {
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .lang {
    top: 3px;
    right: 4px;
    color: var(--akzent);
    font-size: 0.7rem;
  }

  .hinweis {
    color: var(--text-leise);
    font-size: 0.8rem;
    margin: 8px 0 0;
  }
</style>
