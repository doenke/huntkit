<script lang="ts">
  import { CODECS, codec as findeCodec } from '../codecs/registry';
  import Codekarte from '../ui/Codekarte.svelte';
  import Koordinaten from '../ui/Koordinaten.svelte';
  import Periodensystem from '../ui/Periodensystem.svelte';
  import Tastaturen from '../ui/Tastaturen.svelte';
  import Widerstand from '../ui/Widerstand.svelte';
  import Woerter from '../ui/Woerter.svelte';

  /**
   * Codes und Tabellen auf einer Seite: oben eine Übersicht, ein Tipp öffnet
   * den Eintrag, der Pfeil führt zurück. Auf dem Handy passt beides nicht
   * nebeneinander – die Liste füllt einen Bildschirm, der Eintrag einen zweiten.
   */
  type Tabelle = 'woerter' | 'pse' | 'koordinaten' | 'tastaturen' | 'widerstand';

  const TABELLEN: ReadonlyArray<{ id: Tabelle; titel: string }> = [
    { id: 'woerter', titel: 'Wörter' },
    { id: 'pse', titel: 'Periodensystem' },
    { id: 'koordinaten', titel: 'Koordinaten' },
    { id: 'tastaturen', titel: 'Tastaturen' },
    { id: 'widerstand', titel: 'Widerstände' }
  ];
  const codes = CODECS.filter((c) => !c.nurWerkbank);

  let offen = $state<{ art: 'code'; id: string } | { art: 'tabelle'; id: Tabelle } | null>(null);
  const code = $derived(offen?.art === 'code' ? findeCodec(offen.id) : undefined);
  const tabelle = $derived(offen?.art === 'tabelle' ? TABELLEN.find((t) => t.id === offen?.id) : undefined);

  function zurueck() {
    offen = null;
  }
</script>

{#if code}
  <!-- Eigene Karte je Code: Die Einstellungen eines Codes dürfen nicht im
       nächsten weiterleben, wenn man direkt umschaltet. -->
  {#key code.id}
    <Codekarte codec={code} {zurueck} />
  {/key}
{:else if tabelle}
  <div class="kopf">
    <button type="button" class="zurueck" onclick={zurueck} aria-label="Zurück zur Übersicht">←</button>
    <strong>{tabelle.titel}</strong>
  </div>
  {#if tabelle.id === 'pse'}
    <Periodensystem />
  {:else if tabelle.id === 'woerter'}
    <Woerter />
  {:else if tabelle.id === 'widerstand'}
    <Widerstand />
  {:else if tabelle.id === 'koordinaten'}
    <Koordinaten />
  {:else}
    <Tastaturen />
  {/if}
{:else}
  <ul class="liste">
    {#each TABELLEN as eintrag (eintrag.id)}
      <li>
        <button type="button" onclick={() => (offen = { art: 'tabelle', id: eintrag.id })}>
          <span class="name">{eintrag.titel}</span>
          <span class="pfeil" aria-hidden="true">›</span>
        </button>
      </li>
    {/each}
  </ul>

  <h3>Codes</h3>
  <ul class="liste">
    {#each codes as eintrag (eintrag.id)}
      <li>
        <button type="button" onclick={() => (offen = { art: 'code', id: eintrag.id })}>
          <span class="name">{eintrag.name}</span>
          <span class="pfeil" aria-hidden="true">›</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    /* Zweispaltig, damit die Übersicht auf einen Handybildschirm passt. */
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: 4px;
  }

  .liste button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    min-height: 44px;
    padding: 0 10px;
  }

  .name {
    font-size: 0.9rem;
  }

  .pfeil {
    color: var(--text-leise);
  }

  h3 {
    margin: 18px 0 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-leise);
  }

  .kopf {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .zurueck {
    min-width: 44px;
    min-height: 44px;
    font-size: 1.2rem;
    flex: 0 0 auto;
  }
</style>
