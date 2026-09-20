<script lang="ts">
  import Periodensystem from '../ui/Periodensystem.svelte';
  import Widerstand from '../ui/Widerstand.svelte';

  let bereich = $state<'pse' | 'widerstand'>('pse');
</script>

<h2>Nachschlagen</h2>

<div class="reiter">
  <button type="button" aria-pressed={bereich === 'pse'} onclick={() => (bereich = 'pse')}>
    Periodensystem
  </button>
  <button
    type="button"
    aria-pressed={bereich === 'widerstand'}
    onclick={() => (bereich = 'widerstand')}
  >
    Widerstände
  </button>
</div>

{#if bereich === 'pse'}
  <Periodensystem />
{:else}
  <Widerstand />
{/if}

<style>
  .reiter {
    display: flex;
    gap: 6px;
    margin-bottom: 14px;
  }

  .reiter button {
    flex: 1;
    min-height: 44px;
  }

  .reiter button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }
</style>
