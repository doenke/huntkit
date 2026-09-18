<script lang="ts">
  import { CODECS } from '../codecs/registry';
  import { standardOptionen } from '../codecs/types';
  import Optionen from '../ui/Optionen.svelte';

  let offen = $state<string | null>(null);
  // Optionen je Codec merken, damit die Tabelle z.B. in Hexadezimal bleibt.
  let werte = $state<Record<string, Record<string, string | number>>>(
    Object.fromEntries(CODECS.map((c) => [c.id, { ...standardOptionen(c) }]))
  );
</script>

<h2>Codes</h2>
<p class="leise">Zum Nachschlagen, wenn du das Zeichen vor dir hast.</p>

<ul class="liste">
  {#each CODECS as codec (codec.id)}
    <li>
      <button
        type="button"
        class="kopf"
        aria-expanded={offen === codec.id}
        onclick={() => (offen = offen === codec.id ? null : codec.id)}
      >
        <span>
          <strong>{codec.name}</strong>
          <span class="leise">{codec.beschreibung}</span>
        </span>
        <span aria-hidden="true">{offen === codec.id ? '▾' : '▸'}</span>
      </button>

      {#if offen === codec.id}
        {#if codec.optionen}
          <div class="optionen">
            <Optionen {codec} werte={werte[codec.id] ?? {}} />
          </div>
        {/if}
        {#if codec.tabelle}
          <div class="tabelle">
            {#each codec.tabelle(werte[codec.id]) as eintrag (eintrag.zeichen)}
              <div class="zelle">
                <span class="zeichen">{eintrag.zeichen}</span>
                <span class="mono darstellung">{eintrag.darstellung}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="leise ohne">Für diesen Code gibt es keine feste Tabelle – er rechnet.</p>
        {/if}
      {/if}
    </li>
  {/each}
</ul>

<style>
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .liste li {
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    background: var(--flaeche);
    overflow: hidden;
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    border-radius: 0;
    padding: 10px 12px;
  }

  .kopf strong {
    display: block;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  .optionen {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 0 12px 10px;
  }

  .tabelle {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: 1px;
    background: var(--rand);
    border-top: 1px solid var(--rand);
    max-height: 60vh;
    overflow-y: auto;
  }

  .zelle {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 10px;
    background: var(--flaeche);
  }

  .zeichen {
    flex: 0 0 1.6rem;
    font-weight: 600;
  }

  .darstellung {
    color: var(--text-leise);
    overflow-wrap: anywhere;
  }

  .ohne {
    padding: 0 12px 12px;
  }
</style>
