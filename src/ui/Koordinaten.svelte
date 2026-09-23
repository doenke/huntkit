<script lang="ts">
  import Textzeile from './Textzeile.svelte';
  import {
    alsDezimalgrad, alsGradMinuten, alsGradMinutenSekunden, lese, osmLink
  } from '../lib/koordinaten';

  let eingabe = $state('');
  const lesung = $derived(lese(eingabe));

  const formen = $derived.by(() => {
    if (!lesung) return [];
    const { breite, laenge } = lesung.punkt;
    return [
      {
        titel: 'Grad und Dezimalminuten',
        hinweis: 'so gibt die Nachtschicht Standorte an',
        wert: `${alsGradMinuten(breite, true)}  ${alsGradMinuten(laenge, false)}`
      },
      {
        titel: 'Grad, Minuten, Sekunden',
        hinweis: '',
        wert: `${alsGradMinutenSekunden(breite, true)}  ${alsGradMinutenSekunden(laenge, false)}`
      },
      {
        titel: 'Dezimalgrad',
        hinweis: 'für Kartendienste',
        wert: `${alsDezimalgrad(breite)}, ${alsDezimalgrad(laenge)}`
      }
    ];
  });

  async function kopieren(wert: string) {
    try {
      await navigator.clipboard.writeText(wert);
    } catch {
      // Ohne Zwischenablage bleibt Markieren von Hand.
    }
  }
</script>

<div class="feld">
  <Textzeile
    bind:value={eingabe}
    placeholder="51°30.789 N, 7°27.456 E"
    spellcheck="false"
    aria-label="Koordinate"
  />
</div>

<p class="hinweis">
  Erkannt werden alle drei Schreibweisen: Dezimalgrad, Grad mit Dezimalminuten und Grad,
  Minuten, Sekunden. Süd und West gehen als Buchstabe oder mit Minus.
</p>

{#if eingabe.trim() && !lesung}
  <p class="fehler">Daraus werde ich nicht schlau – Breite und Länge zusammen angeben.</p>
{:else if lesung}
  <p class="hinweis">Gelesen als: {lesung.form === 'gradminuten' ? 'Grad und Dezimalminuten' : lesung.form === 'gradminutensekunden' ? 'Grad, Minuten, Sekunden' : 'Dezimalgrad'}</p>
  <ul>
    {#each formen as form (form.titel)}
      <li>
        <span class="titel">
          {form.titel}
          {#if form.hinweis}<span class="leise">· {form.hinweis}</span>{/if}
        </span>
        <span class="zeile">
          <output class="mono">{form.wert}</output>
          <button type="button" onclick={() => kopieren(form.wert)}>kopieren</button>
        </span>
      </li>
    {/each}
  </ul>
  <a class="karte" href={osmLink(lesung.punkt)} target="_blank" rel="noreferrer">
    Auf OpenStreetMap zeigen ↗
  </a>
{/if}

<style>
  .feld {
    margin-bottom: 10px;
  }

  /* Ein großes Tippziel: Wer eine Koordinate eingibt, will meistens gleich los. */
  .karte {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--tap);
    margin-top: 10px;
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    color: var(--akzent);
    text-decoration: none;
    font-weight: 600;
  }

  .feld :global(textarea) {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }

  .hinweis {
    color: var(--text-leise);
    font-size: 0.85rem;
    margin: 0 0 10px;
  }

  .fehler {
    color: var(--warn);
    font-size: 0.9rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  li {
    display: grid;
    gap: 4px;
    padding: 10px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
  }

  .titel {
    font-size: 0.8rem;
    color: var(--text-leise);
  }

  .zeile {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  output {
    flex: 1;
    font-size: 1.05rem;
    overflow-wrap: anywhere;
  }

  button {
    min-height: 40px;
    font-size: 0.85rem;
  }
</style>
