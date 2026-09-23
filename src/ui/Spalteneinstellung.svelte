<script lang="ts">
  import Textzeile from './Textzeile.svelte';
  import { CODECS, codec as findeCodec } from '../codecs/registry';
  import { standardOptionen } from '../codecs/types';
  import Sortierwahl from './Sortierwahl.svelte';
  import {
    begleiteTafel,
    spaltenDavor,
    spaltenname,
    spaltenzeichen,
    type Blatt,
    type Sortierung,
    type Spalte
  } from '../lib/blatt';

  /**
   * Was eine Spalte ist und woher sie ihre Werte nimmt. Der interessante Teil
   * sind die Optionen: Jede kann fest eingestellt sein oder je Zeile aus einer
   * anderen Spalte kommen – „n-ter Buchstabe“ mit einem n, das pro Zeile
   * woanders steht, ist der halbe Rätselalltag.
   */
  let {
    blatt,
    spalte,
    schliessen,
    entfernen
  }: { blatt: Blatt; spalte: Spalte; schliessen: () => void; entfernen: () => void } = $props();

  const stelle = $derived(blatt.spalten.findIndex((s) => s.id === spalte.id));
  const quellen = $derived(spaltenDavor(blatt, spalte.id));
  const werkzeuge = CODECS.filter((c) => !c.nurNachschlagen);
  const tafeln = CODECS.filter((c) => c.tabelle);
  const werkzeug = $derived(spalte.art === 'werkzeug' ? findeCodec(spalte.codecId) : undefined);

  function setzeWerkzeug(id: string) {
    if (spalte.art !== 'werkzeug') return;
    const gewaehlt = findeCodec(id);
    spalte.codecId = id;
    // Von Hand umgestellt: Die Spalte gehört jetzt der Person und wird beim
    // nächsten Tafelwechsel nicht mehr mitgezogen.
    delete spalte.ausTafel;
    spalte.optionen = {};
    for (const [optionId, wert] of Object.entries(gewaehlt ? standardOptionen(gewaehlt) : {})) {
      spalte.optionen[optionId] = { art: 'fest', wert };
    }
    if (gewaehlt?.einseitig) spalte.richtung = 'encode';
  }

  /** Tafel gewählt: Die passende Entschlüsselung entsteht gleich daneben. */
  function setzeTafel(id: string) {
    if (spalte.art !== 'eingabe') return;
    spalte.tafel = id || undefined;
    begleiteTafel(blatt, spalte);
  }

  function bindung(optionId: string) {
    if (spalte.art !== 'werkzeug') return { art: 'fest' as const, wert: '' };
    return spalte.optionen[optionId] ?? { art: 'fest' as const, wert: '' };
  }

  function setzeFest(optionId: string, wert: string | number) {
    if (spalte.art === 'werkzeug') spalte.optionen[optionId] = { art: 'fest', wert };
  }

  function setzeSpalte(optionId: string, quelle: string) {
    if (spalte.art !== 'werkzeug') return;
    if (quelle === '') {
      const spec = werkzeug?.optionen?.find((o) => o.id === optionId);
      spalte.optionen[optionId] = { art: 'fest', wert: spec?.standard ?? '' };
    } else {
      spalte.optionen[optionId] = { art: 'spalte', spalte: quelle };
    }
  }

  /** Andere Spalten, nach denen eine Positionsspalte direkt zählen kann. */
  const vergleichsspalten = $derived(blatt.spalten.filter((s) => s.id !== spalte.id));

  /** Ohne Sortierung zählt die Position in der Eingabereihenfolge. */
  function setzeReihenfolge(neu: Sortierung | undefined) {
    if (spalte.art !== 'position') return;
    if (neu) spalte.nach = neu;
    else delete spalte.nach;
  }
</script>

<div class="tafel">
  <div class="kopf">
    <strong>Spalte {spaltenzeichen(Math.max(0, stelle))}</strong>
    <button type="button" onclick={schliessen} aria-label="Einstellungen schließen">fertig</button>
  </div>

  <label>
    <span>Name</span>
    <Textzeile
      value={spalte.titel ?? ''}
      placeholder={spaltenzeichen(Math.max(0, stelle))}
      oninput={(e) => (spalte.titel = e.currentTarget.value)}
    />
  </label>

  {#if spalte.art === 'eingabe'}
    <label>
      <span>Codetafel für die Eingabe</span>
      <select value={spalte.tafel ?? ''} onchange={(e) => setzeTafel(e.currentTarget.value)}>
        <option value="">Klartext</option>
        {#each tafeln as eintrag (eintrag.id)}
          <option value={eintrag.id}>{eintrag.name}</option>
        {/each}
      </select>
    </label>
    <p class="hinweis">
      Die Zelle behält, was eingetippt wurde – Morse bleibt Morse. Die passende
      Entschlüsselung entsteht gleich als Spalte daneben.
    </p>
  {/if}

  {#if spalte.art === 'position'}
    <div class="gruppe">
      <span class="marke">Platz in welcher Reihenfolge?</span>
      <Sortierwahl {blatt} spalten={vergleichsspalten} wert={spalte.nach} setzen={setzeReihenfolge} />
    </div>
    <p class="hinweis">
      Liefert je Zeile eine Zahl. Als Option einer Werkzeugspalte wird daraus „nimm den
      Buchstaben an der Stelle, auf der diese Zeile steht“. Wie die Tabelle gerade sortiert
      ist, spielt dafür keine Rolle.
    </p>
  {/if}

  {#if spalte.art === 'werkzeug'}
    <label>
      <span>rechnet aus</span>
      <select value={spalte.quelle} onchange={(e) => (spalte.quelle = e.currentTarget.value)}>
        {#each quellen as quelle (quelle.id)}
          <option value={quelle.id}>{spaltenname(blatt, quelle.id)}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>Werkzeug</span>
      <select value={spalte.codecId} onchange={(e) => setzeWerkzeug(e.currentTarget.value)}>
        {#each werkzeuge as eintrag (eintrag.id)}
          <option value={eintrag.id}>{eintrag.name}</option>
        {/each}
      </select>
    </label>

    {#if werkzeug && !werkzeug.einseitig}
      <div class="richtung">
        <button
          type="button"
          aria-pressed={spalte.richtung === 'decode'}
          onclick={() => spalte.art === 'werkzeug' && (spalte.richtung = 'decode')}
        >
          entschlüsseln
        </button>
        <button
          type="button"
          aria-pressed={spalte.richtung === 'encode'}
          onclick={() => spalte.art === 'werkzeug' && (spalte.richtung = 'encode')}
        >
          verschlüsseln
        </button>
      </div>
    {/if}

    {#each werkzeug?.optionen ?? [] as option (option.id)}
      {@const gebunden = bindung(option.id)}
      <div class="option">
        <span class="marke">{option.titel}</span>
        <div class="wahl">
          <select
            value={gebunden.art === 'spalte' ? gebunden.spalte : ''}
            onchange={(e) => setzeSpalte(option.id, e.currentTarget.value)}
            aria-label={`${option.titel}: fest oder aus einer Spalte`}
          >
            <option value="">fester Wert</option>
            {#each quellen as quelle (quelle.id)}
              <option value={quelle.id}>aus {spaltenname(blatt, quelle.id)}</option>
            {/each}
          </select>

          {#if gebunden.art === 'fest'}
            {#if option.art === 'zahl'}
              <input
                type="number"
                min={option.min}
                max={option.max}
                value={String(gebunden.wert)}
                oninput={(e) => setzeFest(option.id, Number(e.currentTarget.value))}
              />
            {:else if option.art === 'auswahl'}
              <select
                value={String(gebunden.wert)}
                onchange={(e) => setzeFest(option.id, e.currentTarget.value)}
              >
                {#each option.werte as wahl (wahl.wert)}
                  <option value={wahl.wert}>{wahl.titel}</option>
                {/each}
              </select>
            {:else}
              <Textzeile
                value={String(gebunden.wert)}
                placeholder={option.platzhalter ?? ''}
                oninput={(e) => setzeFest(option.id, e.currentTarget.value)}
              />
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  {/if}

  <div class="fuss">
    <button type="button" class="ernst" onclick={entfernen}>Spalte löschen</button>
  </div>
</div>

<style>
  .tafel {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 12px;
    display: grid;
    gap: 8px;
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .kopf button {
    min-height: 34px;
    font-size: 0.8rem;
  }

  label,
  .gruppe {
    display: grid;
    gap: 2px;
  }

  label span,
  .marke {
    color: var(--text-leise);
    font-size: 0.78rem;
  }

  input,
  select {
    font: inherit;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: 40px;
    padding: 0 8px;
    max-width: 100%;
  }

  .tafel :global(textarea) {
    min-height: 40px;
    padding: 9px 8px;
  }

  .richtung {
    display: flex;
    gap: 6px;
  }

  .richtung button {
    flex: 1 1 0;
    min-height: 38px;
    font-size: 0.8rem;
  }

  button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .option {
    display: grid;
    gap: 2px;
  }

  .wahl {
    display: flex;
    gap: 6px;
  }

  .wahl > * {
    flex: 1 1 0;
    min-width: 0;
  }

  .hinweis {
    margin: 0;
    color: var(--text-leise);
    font-size: 0.75rem;
  }

  .fuss {
    display: flex;
    justify-content: flex-end;
  }

  .ernst {
    min-height: 36px;
    font-size: 0.8rem;
    border-color: var(--warn);
    color: var(--warn);
  }
</style>
