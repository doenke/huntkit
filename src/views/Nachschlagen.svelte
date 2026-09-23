<script lang="ts">
  import Koordinaten from '../ui/Koordinaten.svelte';
  import Periodensystem from '../ui/Periodensystem.svelte';
  import Tastaturen from '../ui/Tastaturen.svelte';
  import Widerstand from '../ui/Widerstand.svelte';
  import Woerter from '../ui/Woerter.svelte';

  type Bereich = 'pse' | 'widerstand' | 'woerter' | 'koordinaten' | 'tastaturen';

  const BEREICHE: ReadonlyArray<{ id: Bereich; titel: string }> = [
    { id: 'pse', titel: 'Periodensystem' },
    { id: 'woerter', titel: 'Wörter' },
    { id: 'widerstand', titel: 'Widerstände' },
    { id: 'koordinaten', titel: 'Koordinaten' },
    { id: 'tastaturen', titel: 'Tastaturen' }
  ];

  let bereich = $state<Bereich>('pse');
</script>

<h2>Nachschlagen</h2>

<div class="reiter">
  {#each BEREICHE as eintrag (eintrag.id)}
    <button
      type="button"
      aria-pressed={bereich === eintrag.id}
      onclick={() => (bereich = eintrag.id)}
    >
      {eintrag.titel}
    </button>
  {/each}
</div>

{#if bereich === 'pse'}
  <Periodensystem />
{:else if bereich === 'woerter'}
  <Woerter />
{:else if bereich === 'widerstand'}
  <Widerstand />
{:else if bereich === 'koordinaten'}
  <Koordinaten />
{:else}
  <Tastaturen />
{/if}

<style>
  .reiter {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }

  .reiter button {
    flex: 1 1 8rem;
    min-height: 44px;
    font-size: 0.9rem;
  }

  .reiter button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }
</style>
