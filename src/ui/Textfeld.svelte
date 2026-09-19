<script lang="ts">
  /** Einzeiliger Ergebnisblock mit Kopieren – überall dasselbe Verhalten. */
  let {
    text,
    titel = 'Ergebnis',
    uebernehmen
  }: { text: string; titel?: string; uebernehmen?: () => void } = $props();

  let kopiert = $state(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text);
      kopiert = true;
      setTimeout(() => (kopiert = false), 1200);
    } catch {
      // Ohne Zwischenablage-Recht bleibt Markieren von Hand – kein Grund für eine Fehlermeldung.
    }
  }
</script>

<div class="block">
  <div class="kopf">
    <span>{titel}</span>
    <span class="knoepfe">
      {#if uebernehmen}
        <button type="button" onclick={uebernehmen} disabled={text.length === 0}>
          als Eingabe
        </button>
      {/if}
      <button type="button" onclick={kopieren} disabled={text.length === 0}>
        {kopiert ? 'kopiert' : 'kopieren'}
      </button>
    </span>
  </div>
  <output class="mono">{text}</output>
</div>

<style>
  .block {
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    background: var(--flaeche);
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 6px 6px 12px;
    border-bottom: 1px solid var(--rand);
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  .knoepfe {
    display: flex;
    gap: 6px;
  }

  .kopf button {
    min-height: 36px;
    font-size: 0.85rem;
    padding: 0 10px;
  }

  output {
    display: block;
    padding: 12px;
    min-height: 3rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 1.05rem;
  }
</style>
