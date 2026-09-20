<script lang="ts">
  import type { Codec } from '../codecs/types';

  let { codec, werte }: { codec: Codec; werte: Record<string, string | number> } = $props();
</script>

{#each codec.optionen ?? [] as option (option.id)}
  <label class="option">
    <span>{option.titel}</span>
    {#if option.art === 'zahl'}
      <input
        type="number"
        min={option.min}
        max={option.max}
        value={werte[option.id] ?? option.standard}
        oninput={(e) => (werte[option.id] = Number(e.currentTarget.value))}
      />
    {:else if option.art === 'text'}
      <input
        type="text"
        class="breit"
        value={werte[option.id] ?? option.standard}
        placeholder={option.platzhalter ?? ''}
        spellcheck="false"
        oninput={(e) => (werte[option.id] = e.currentTarget.value)}
      />
    {:else}
      <select
        value={werte[option.id] ?? option.standard}
        onchange={(e) => (werte[option.id] = e.currentTarget.value)}
      >
        {#each option.werte as eintrag (eintrag.wert)}
          <option value={eintrag.wert}>{eintrag.titel}</option>
        {/each}
      </select>
    {/if}
  </label>
{/each}

<style>
  .option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-leise);
  }

  input,
  select {
    font: inherit;
    font-size: 0.95rem;
    color: var(--text);
    background: var(--grund);
    border: 1px solid var(--rand);
    border-radius: 8px;
    min-height: 40px;
    padding: 0 8px;
  }

  input { width: 5.5rem; }

  input.breit { width: 9rem; }
</style>
