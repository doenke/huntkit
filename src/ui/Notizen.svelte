<script lang="ts">
  /**
   * Kurzes Protokoll für unterwegs: Station, Lösung, Gedanke. Bleibt auf dem
   * Gerät und übersteht das Neuladen – nachts zählt, dass nichts verlorengeht.
   */
  interface Notiz {
    zeit: string;
    text: string;
  }

  const SPEICHER = 'huntkit:notizen';

  function laden(): Notiz[] {
    try {
      const roh = localStorage.getItem(SPEICHER);
      return roh ? (JSON.parse(roh) as Notiz[]) : [];
    } catch {
      return [];
    }
  }

  let notizen = $state<Notiz[]>(laden());
  let entwurf = $state('');

  $effect(() => {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(notizen));
    } catch {
      // Ohne Speicher bleibt die Liste eben nur für diese Sitzung.
    }
  });

  function hinzufuegen() {
    const text = entwurf.trim();
    if (!text) return;
    const jetzt = new Date();
    notizen.unshift({
      zeit: `${String(jetzt.getHours()).padStart(2, '0')}:${String(jetzt.getMinutes()).padStart(2, '0')}`,
      text
    });
    entwurf = '';
  }
</script>

<h3>Notizen</h3>
<div class="eingabe">
  <input
    type="text"
    bind:value={entwurf}
    placeholder="Station, Lösung, Gedanke …"
    onkeydown={(e) => e.key === 'Enter' && hinzufuegen()}
  />
  <button type="button" onclick={hinzufuegen} disabled={!entwurf.trim()}>merken</button>
</div>

{#if notizen.length === 0}
  <p class="leise">Noch nichts notiert.</p>
{:else}
  <ul>
    {#each notizen as notiz, i (notiz.zeit + notiz.text + i)}
      <li>
        <span class="zeit">{notiz.zeit}</span>
        <span class="text">{notiz.text}</span>
        <button type="button" onclick={() => notizen.splice(i, 1)} aria-label="Notiz löschen">✕</button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  h3 {
    margin: 20px 0 8px;
    font-size: 0.95rem;
  }

  .eingabe {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  input {
    flex: 1;
    font: inherit;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: var(--tap);
    padding: 0 12px;
  }

  button {
    min-height: var(--tap);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
  }

  .zeit {
    color: var(--text-leise);
    font-size: 0.8rem;
    flex: 0 0 auto;
  }

  .text {
    flex: 1;
    overflow-wrap: anywhere;
  }

  li button {
    min-height: 36px;
    min-width: 36px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-leise);
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.85rem;
  }
</style>
