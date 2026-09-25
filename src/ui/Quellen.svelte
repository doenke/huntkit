<script lang="ts">
  import type { Quelle } from '../codecs/types';

  /** Quellenangaben unter einer Tafel – eingeklappt, aber zum Nachlesen da. */
  let { quellen }: { quellen: ReadonlyArray<Quelle> } = $props();
</script>

<details class="quellen">
  <summary class="marke">Quellen</summary>
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
</details>

<style>
  .quellen {
    margin: 10px 0 0;
    color: var(--text-leise);
    font-size: 0.72rem;
  }

  .marke {
    font-weight: 600;
    cursor: pointer;
    list-style: none;
    display: inline-flex;
    align-items: center;
    min-height: 32px;
  }

  .marke::-webkit-details-marker {
    display: none;
  }

  .marke::after {
    content: ' ▸';
    white-space: pre;
  }

  .quellen[open] > .marke::after {
    content: ' ▾';
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
