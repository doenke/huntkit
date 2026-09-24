<script lang="ts">
  import { alsLink } from '../lib/teilen';
  import { geloeste, merkeGeloest, punkteDerZelle, stimmt, type Uebung } from '../lib/uebungen';
  import Textzeile from './Textzeile.svelte';

  /**
   * Ein Übungsrätsel: die Aufgabe, ein Feld für die Antwort, Tipps zum
   * schrittweisen Aufdecken und am Ende der Lösungsweg als Werkbank.
   */
  let { uebung }: { uebung: Uebung } = $props();

  let antwort = $state('');
  let geprueft = $state<'richtig' | 'falsch' | null>(null);
  let geloest = $state(geloeste().has(uebung.id));
  let offeneTipps = $state(0);

  function pruefen() {
    if (!antwort.trim()) return;
    if (stimmt(uebung, antwort)) {
      geprueft = 'richtig';
      geloest = true;
      merkeGeloest(uebung.id);
    } else {
      geprueft = 'falsch';
    }
  }

  async function loesungswegOeffnen() {
    const { blatt, name } = uebung.loesungsweg();
    // Derselbe Weg wie ein geteilter Link: Die Werkbank legt daraus eine neue
    // Werkbank an und überschreibt nichts.
    location.href = await alsLink(blatt, name);
  }

  // Das Raster: Alle Punkte stehen im selben Abstand, Zellgrenzen sieht man
  // nicht – die muss man selbst finden.
  const ABSTAND = 10;
  const zeilen = $derived(uebung.aufgabe.zeilen.map((z) => [...z]));
  const spalten = $derived(Math.max(...zeilen.map((z) => z.length)) * 2);
  const reihen = $derived(zeilen.length * 3);
  const punkte = $derived(
    zeilen.flatMap((zellen, zeile) =>
      zellen.flatMap((zelle, stelle) => {
        const bits = punkteDerZelle(zelle);
        // Punkte 1–3 links von oben nach unten, 4–6 rechts.
        return [0, 1, 2, 3, 4, 5].map((punkt) => ({
          x: stelle * 2 + (punkt < 3 ? 0 : 1),
          y: zeile * 3 + (punkt % 3),
          erhaben: (bits & (1 << punkt)) !== 0
        }));
      })
    )
  );
</script>

<!-- Eingeklappt: Das Raster allein füllt sonst den halben Bildschirm. -->
<details class="uebung">
  <summary>
    <h3>
      {uebung.titel}
      {#if geloest}<span class="haken" title="auf diesem Gerät gelöst">✓ gelöst</span>{/if}
    </h3>
  </summary>
  <div class="inhalt">
    <svg
      class="raster"
      viewBox={`0 0 ${spalten * ABSTAND} ${reihen * ABSTAND}`}
      role="img"
      aria-label="Punkteraster"
    >
      {#each punkte as p, i (i)}
        <circle
          class:erhaben={p.erhaben}
          cx={p.x * ABSTAND + ABSTAND / 2}
          cy={p.y * ABSTAND + ABSTAND / 2}
          r={p.erhaben ? ABSTAND * 0.32 : ABSTAND * 0.14}
        />
      {/each}
    </svg>

    <div class="antwort">
      <Textzeile
        bind:value={antwort}
        enter={pruefen}
        placeholder="Lösungswort"
        spellcheck="false"
        autocapitalize="characters"
        aria-label="Lösungswort"
        oninput={() => (geprueft = null)}
      />
      <button type="button" onclick={pruefen} disabled={!antwort.trim()}>prüfen</button>
    </div>
    {#if geprueft === 'richtig'}
      <p class="meldung richtig">Richtig – {uebung.loesung}!</p>
    {:else if geprueft === 'falsch'}
      <p class="meldung falsch">Noch nicht.</p>
    {/if}

    {#if offeneTipps > 0}
      <ol class="tipps">
        {#each uebung.tipps.slice(0, offeneTipps) as tipp, i (i)}
          <li>{tipp}</li>
        {/each}
      </ol>
    {/if}

    <div class="knoepfe">
      {#if offeneTipps < uebung.tipps.length}
        <button type="button" onclick={() => (offeneTipps += 1)}>
          {offeneTipps === 0 ? 'Tipp' : 'noch ein Tipp'} ({offeneTipps + 1}/{uebung.tipps.length})
        </button>
      {/if}
      <button type="button" onclick={loesungswegOeffnen}>Lösungsweg als Werkbank</button>
    </div>
  </div>
</details>

<style>
  .uebung {
    margin-bottom: 12px;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    padding: 0 12px;
  }

  summary {
    cursor: pointer;
    padding: 10px 0;
    min-height: 24px;
    display: flex;
    align-items: baseline;
    gap: 8px;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::before {
    content: '▸';
    color: var(--text-leise);
  }

  .uebung[open] > summary::before {
    content: '▾';
  }

  .inhalt {
    display: grid;
    gap: 10px;
    padding-bottom: 12px;
  }

  h3 {
    margin: 0;
    font-size: 1.05rem;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
  }

  .haken {
    color: var(--akzent);
    font-size: 0.85rem;
    font-weight: 500;
  }

  .raster {
    width: 100%;
    height: auto;
    padding: 10px;
    box-sizing: border-box;
    border: 1px solid var(--rand);
    border-radius: 10px;
    background: var(--flaeche);
  }

  .raster circle {
    fill: var(--text-leise);
    opacity: 0.35;
  }

  .raster circle.erhaben {
    fill: currentColor;
    opacity: 1;
  }

  .antwort {
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }

  .antwort :global(textarea) {
    flex: 1 1 auto;
  }

  .antwort button,
  .knoepfe button {
    min-height: 44px;
    padding: 0 14px;
  }

  .meldung {
    margin: 0;
    font-weight: 600;
  }

  .richtig {
    color: var(--akzent);
  }

  .falsch {
    color: var(--text-leise);
  }

  .tipps {
    margin: 0;
    padding-left: 1.4em;
    display: grid;
    gap: 6px;
    font-size: 0.92rem;
  }

  .knoepfe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>
