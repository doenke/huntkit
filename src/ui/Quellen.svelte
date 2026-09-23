<script lang="ts">
  import type { Quelle } from '../codecs/types';

  /** Quellenangaben unter einer Tafel – klein, aber zum Nachlesen da. */
  let { quellen }: { quellen: ReadonlyArray<Quelle> } = $props();
</script>

<div class="quellen">
  <span class="marke">Quellen</span>
  <ul>
    {#each quellen as quelle (quelle.titel)}
      <li>
        {#if quelle.url}
          <a href={quelle.url} target="_blank" rel="noreferrer">{quelle.titel}</a>
        {:else}
          {quelle.titel}
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .quellen {
    margin: 10px 0 0;
    color: var(--text-leise);
    font-size: 0.72rem;
  }

  .marke {
    font-weight: 600;
  }

  ul {
    margin: 2px 0 0;
    padding-left: 1.1rem;
  }

  li {
    overflow-wrap: anywhere;
  }

  a {
    color: inherit;
  }
</style>
