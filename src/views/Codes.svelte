<script lang="ts">
  import { CODECS, codec as findeCodec } from '../codecs/registry';
  import Codekarte from '../ui/Codekarte.svelte';

  /**
   * Übersicht und Karte. Auf dem Handy ist beides nebeneinander nicht zu
   * machen – die Liste füllt einen Bildschirm, die Karte einen zweiten.
   */
  let offen = $state<string | null>(null);
  const gewaehlt = $derived(offen ? findeCodec(offen) : undefined);
  const liste = CODECS.filter((c) => !c.nurWerkbank);
</script>

{#if gewaehlt}
  <!-- Eigene Karte je Code: Die Einstellungen eines Codes dürfen nicht im
       nächsten weiterleben, wenn man direkt umschaltet. -->
  {#key gewaehlt.id}
    <Codekarte codec={gewaehlt} zurueck={() => (offen = null)} />
  {/key}
{:else}
  <ul class="liste">
    {#each liste as eintrag (eintrag.id)}
      <li>
        <button type="button" onclick={() => (offen = eintrag.id)}>
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
</style>
