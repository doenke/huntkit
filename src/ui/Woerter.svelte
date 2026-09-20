<script lang="ts">
  import { anagramme, istGeladen, suchen, woerterbuch, type Anagrammfund } from '../lib/woerter';

  let art = $state<'muster' | 'anagramm'>('muster');
  let anfrage = $state('');
  let treffer = $state<string[]>([]);
  let anagrammtreffer = $state<Anagrammfund[]>([]);
  let gesamt = $state(0);
  let laeuft = $state(false);
  let geladen = $state(istGeladen());
  let fehler = $state('');

  async function suche() {
    if (!anfrage.trim()) return;
    laeuft = true;
    fehler = '';
    try {
      await woerterbuch();
      geladen = true;
      if (art === 'muster') {
        const ergebnis = await suchen(anfrage);
        treffer = ergebnis.treffer;
        gesamt = ergebnis.gesamt;
      } else {
        const ergebnis = await anagramme(anfrage);
        anagrammtreffer = ergebnis.treffer;
        gesamt = ergebnis.gesamt;
      }
    } catch {
      fehler = 'Das Wörterbuch konnte nicht geladen werden.';
    } finally {
      laeuft = false;
    }
  }
</script>

<div class="reiter">
  <button type="button" aria-pressed={art === 'muster'} onclick={() => (art = 'muster')}>
    Wortmuster
  </button>
  <button type="button" aria-pressed={art === 'anagramm'} onclick={() => (art = 'anagramm')}>
    Anagramm
  </button>
</div>

<div class="eingabe">
  <input
    type="text"
    bind:value={anfrage}
    placeholder={art === 'muster' ? '?A??LE oder GOLD*' : 'Buchstabenvorrat'}
    spellcheck="false"
    autocapitalize="off"
    onkeydown={(e) => e.key === 'Enter' && suche()}
  />
  <button type="button" onclick={suche} disabled={laeuft || !anfrage.trim()}>
    {laeuft ? '…' : 'suchen'}
  </button>
</div>

{#if art === 'muster'}
  <p class="hinweis">
    <span class="mono">?</span> steht für einen Buchstaben,
    <span class="mono">*</span> für beliebig viele. Umlaute werden aufgelöst, „GROESSE“ findet
    also „Größe“.
  </p>
{:else}
  <p class="hinweis">
    Zeigt Wörter, die sich aus diesen Buchstaben legen lassen – vollständige zuerst,
    danach Teilwörter.
  </p>
{/if}

{#if !geladen}
  <p class="hinweis">
    Das Wörterbuch (117 000 Wörter, gut ein halbes Megabyte) wird beim ersten Suchen
    geladen und liegt danach im Gerät.
  </p>
{/if}

{#if fehler}
  <p class="fehler">{fehler}</p>
{/if}

{#if art === 'muster' && treffer.length > 0}
  <p class="hinweis">{gesamt} Treffer{gesamt > treffer.length ? `, die ersten ${treffer.length}` : ''}</p>
  <ul class="liste">
    {#each treffer as wort (wort)}<li>{wort}</li>{/each}
  </ul>
{:else if art === 'anagramm' && anagrammtreffer.length > 0}
  <p class="hinweis">{gesamt} Treffer{gesamt > anagrammtreffer.length ? `, die ersten ${anagrammtreffer.length}` : ''}</p>
  <ul class="liste">
    {#each anagrammtreffer as fund (fund.wort)}
      <li class:voll={fund.vollstaendig}>{fund.wort}</li>
    {/each}
  </ul>
{/if}

<p class="quelle">
  Wortliste: <a href="https://github.com/hexapode/an-array-of-german-words" target="_blank" rel="noreferrer">an-array-of-german-words</a>,
  MIT-Lizenz. Sie enthält auch Bruchstücke – die stehen weiter hinten.
</p>

<style>
  .reiter {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }

  .reiter button {
    flex: 1;
    min-height: 44px;
  }

  button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .eingabe {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  input {
    flex: 1;
    font: inherit;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: var(--tap);
    padding: 0 12px;
  }

  .eingabe button {
    min-height: var(--tap);
  }

  .hinweis {
    color: var(--text-leise);
    font-size: 0.85rem;
    margin: 0 0 10px;
  }

  .fehler {
    color: var(--warn);
    font-size: 0.85rem;
  }

  .liste {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 4px;
    max-height: 50vh;
    overflow-y: auto;
  }

  .liste li {
    padding: 6px 8px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: 6px;
    overflow-wrap: anywhere;
  }

  .liste li.voll {
    border-color: var(--akzent);
  }

  .quelle {
    color: var(--text-leise);
    font-size: 0.75rem;
  }
</style>
