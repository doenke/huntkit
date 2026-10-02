<script lang="ts">
  import { codetastatur, codetastaturUmschalten } from '../lib/ui/codetastatur.svelte';

  /** Bildschirmtastatur für Code-Felder zu- oder abschalten. Nimmt den Fokus nicht an sich. */
  let { kurz = false }: { kurz?: boolean } = $props();
  const behalteFokus = (e: MouseEvent) => e.preventDefault();
</script>

<button
  type="button"
  class="tastaturschalter"
  aria-pressed={codetastatur.an}
  title={codetastatur.an ? 'Bildschirmtastatur bei Codes ausblenden' : 'Bildschirmtastatur bei Codes zuschalten'}
  aria-label={codetastatur.an ? 'Bildschirmtastatur bei Codes ausblenden' : 'Bildschirmtastatur bei Codes zuschalten'}
  onmousedown={behalteFokus}
  onclick={codetastaturUmschalten}
>
  ⌨{#if !kurz}&nbsp;{codetastatur.an ? 'Tastatur aus' : 'Tastatur'}{/if}
</button>

<style>
  .tastaturschalter[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }
</style>
