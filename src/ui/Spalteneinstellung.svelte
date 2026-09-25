<script lang="ts">
  import Textzeile from './Textzeile.svelte';
  import { CODECS, codec as findeCodec } from '../codecs/registry';
  import { ausSpalteMoeglich, standardOptionen } from '../codecs/types';
  import Sortierwahl from './Sortierwahl.svelte';
  import Symbol from './Symbol.svelte';
  import {
    wechsleTafel,
    spaltenDavor,
    spaltenname,
    spaltenzeichen,
    type Blatt,
    type Sortierung,
    type Spalte
  } from '../lib/werkbank/blatt';

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

  // Der Papierkorb sitzt gleich neben dem Kreuz – ein Fehltipp soll nicht gleich die Spalte kosten.
  let loeschenFragen = $state(false);

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

  /** Nach einem Tafelwechsel: wie viele Zellen sich nicht umwandeln ließen. */
  let nichtUmgewandelt = $state(0);

  function setzeTafel(id: string) {
    if (spalte.art !== 'eingabe') return;
    nichtUmgewandelt = wechsleTafel(blatt, spalte, id || undefined);
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
    <span class="symbole">
      {#if loeschenFragen}
        <button type="button" class="ernst" onclick={entfernen}>löschen</button>
        <button type="button" onclick={() => (loeschenFragen = false)}>abbrechen</button>
      {:else}
        <button
          type="button"
          class="symbol"
          onclick={() => (loeschenFragen = true)}
          aria-label="Spalte löschen"
          title="Spalte löschen"
        >
          <Symbol name="papierkorb" />
        </button>
      {/if}
      <button type="button" class="symbol" onclick={schliessen} aria-label="schließen" title="schließen">
        <Symbol name="schliessen" />
      </button>
    </span>
  </div>

  {#if spalte.art === 'werkzeug'}
    <!-- Das Werkzeug zuerst: Es ist das, was man an einer Werkzeugspalte am häufigsten umstellt. -->
    <label>
      <span>Werkzeug</span>
      <select value={spalte.codecId} onchange={(e) => setzeWerkzeug(e.currentTarget.value)}>
        {#each werkzeuge as eintrag (eintrag.id)}
          <option value={eintrag.id}>{eintrag.name}</option>
        {/each}
      </select>
    </label>
  {/if}

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
      Was schon in der Spalte steht, wird beim Wechsel mit umgewandelt – aus Klartext
      wird Braille, aus Morse wird Braille. Die passende Entschlüsselung entsteht gleich
      als Spalte daneben.
    </p>
    {#if nichtUmgewandelt > 0}
      <p class="hinweis warn">
        {nichtUmgewandelt === 1 ? 'Eine Zelle ließ' : `${nichtUmgewandelt} Zellen ließen`} sich
        nicht vollständig umwandeln und {nichtUmgewandelt === 1 ? 'steht' : 'stehen'} unverändert da.
      </p>
    {/if}
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
          <!-- Nur Daten können je Zeile aus einer Spalte kommen; eine Auswahl ist Einstellung. -->
          {#if ausSpalteMoeglich(option)}
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
          {/if}

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

</div>

<style>
  .tafel {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 12px;
    display: grid;
    /* Eine Spalte, so breit wie der Platz – sonst drückt eine Auswahl mit
       langem Eintrag ("nur Buchstaben und Ziffern") die Tafel über den Rand. */
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .symbole {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .kopf button {
    min-height: 34px;
    font-size: 0.8rem;
  }

  .symbol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-leise);
    border-radius: 8px;
  }

  .symbol:hover {
    color: var(--text);
    background: var(--flaeche-hoch);
  }

  label,
  .gruppe {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
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
    grid-template-columns: minmax(0, 1fr);
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

  .hinweis.warn {
    color: var(--warn);
  }

  .ernst {
    border-color: var(--warn);
    color: var(--warn);
  }
</style>
