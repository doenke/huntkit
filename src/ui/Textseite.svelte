<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Rahmen der Textseiten (Kontakt, Datenschutz): lesbare Zeilenlänge, ruhige Abstände. */
  let { unter, children }: { unter: string; children: Snippet } = $props();
</script>

<article class="textseite">
  <p class="unter">{unter}</p>
  {@render children()}
</article>

<style>
  .textseite {
    max-width: 40rem;
    line-height: 1.55;
  }

  .unter {
    margin: 0 0 16px;
    color: var(--text-leise);
  }

  .textseite :global(h2) {
    margin: 26px 0 6px;
    font-size: 1.05rem;
  }

  .textseite :global(p),
  .textseite :global(ul) {
    margin: 0 0 10px;
  }

  .textseite :global(ul) {
    padding-left: 1.3em;
  }

  .textseite :global(li) {
    margin-bottom: 3px;
  }

  .textseite :global(.merk) {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 14px;
    margin-bottom: 8px;
  }

  .textseite :global(.merk p:last-child) {
    margin-bottom: 0;
  }

  .textseite :global(.fuss) {
    margin-top: 28px;
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  .textseite :global(a) {
    color: var(--akzent);
    overflow-wrap: anywhere;
  }
</style>
