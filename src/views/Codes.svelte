<script lang="ts">
  import { CODECS, codec as findeCodec } from '../codecs/registry';
  import Codekarte from '../ui/Codekarte.svelte';

  /**
   * Übersicht und Karte. Auf dem Handy ist beides nebeneinander nicht zu
   * machen – die Liste füllt einen Bildschirm, die Karte einen zweiten.
   */
  let offen = $state<string | null>(null);
  const gewaehlt = $derived(offen ? findeCodec(offen) : undefined);
</script>

{#if gewaehlt}
  <Codekarte codec={gewaehlt} zurueck={() => (offen = null)} />
{:else}
  <h2>Codes</h2>
  <ul class="liste">
    {#each CODECS as eintrag (eintrag.id)}
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
  h2 {
    margin: 0 0 10px;
  }

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
