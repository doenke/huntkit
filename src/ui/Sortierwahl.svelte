<script lang="ts">
  import {
    spaltenname,
    type Blatt,
    type Sortierstufe,
    type Sortierung,
    type Spalte
  } from '../lib/blatt';

  /**
   * Wonach sortiert wird: Spalte, Art, Richtung – und bei Gleichstand eine
   * zweite Spalte. Dieselbe Auswahl für die Anzeige der Tabelle und für eine
   * Positionsspalte. Geändert wird nie am Objekt, sondern über `setzen` mit
   * einer neuen Sortierung; `undefined` heißt: gar nicht sortieren.
   */
  let {
    blatt,
    spalten,
    wert,
    setzen,
    ohne = 'Eingabereihenfolge'
  }: {
    blatt: Blatt;
    /** Die Spalten, nach denen sortiert werden darf. */
    spalten: Spalte[];
    wert: Sortierung | undefined;
    setzen: (neu: Sortierung | undefined) => void;
    /** Beschriftung für „nicht sortieren“. */
    ohne?: string;
  } = $props();

  // Art und Richtung bleiben stehen, wenn nur die Spalte wechselt.
  const stufe = (spalte: string, bisher?: Sortierstufe): Sortierstufe => ({
    art: bisher?.art ?? 'text',
    richtung: bisher?.richtung ?? 'auf',
    spalte
  });

  function ersteSpalte(spalte: string) {
    if (!spalte) return setzen(undefined);
    // Die zweite Stufe nach derselben Spalte wäre sinnlos – dann fällt sie weg.
    const dann = wert?.dann && wert.dann.spalte !== spalte ? wert.dann : undefined;
    setzen(dann ? { ...stufe(spalte, wert), dann } : stufe(spalte, wert));
  }

  function ersteAendern(aenderung: Partial<Sortierstufe>) {
    if (wert) setzen({ ...wert, ...aenderung });
  }

  function zweiteSpalte(spalte: string) {
    if (!wert) return;
    const { dann, ...erste } = wert;
    setzen(spalte ? { ...erste, dann: stufe(spalte, dann) } : erste);
  }

  function zweiteAendern(aenderung: Partial<Sortierstufe>) {
    if (wert?.dann) setzen({ ...wert, dann: { ...wert.dann, ...aenderung } });
  }
</script>

{#snippet artUndRichtung(
  aktuell: Sortierstufe,
  aendern: (a: Partial<Sortierstufe>) => void,
  wofuer: string
)}
  <select
    value={aktuell.art}
    onchange={(e) => aendern({ art: e.currentTarget.value as Sortierstufe['art'] })}
    aria-label={`Sortierart ${wofuer}`}
  >
    <option value="text">alphabetisch</option>
    <option value="zahl">numerisch</option>
    <option value="laenge">nach Länge</option>
  </select>
  <button
    type="button"
    class="richtung"
    onclick={() => aendern({ richtung: aktuell.richtung === 'auf' ? 'ab' : 'auf' })}
    title="Richtung umschalten"
    aria-label={`${wofuer}: ${aktuell.richtung === 'auf' ? 'aufsteigend' : 'absteigend'} – umschalten`}
  >
    {aktuell.richtung === 'auf' ? '↑' : '↓'}
  </button>
{/snippet}

<div class="stufe">
  <select
    value={wert?.spalte ?? ''}
    onchange={(e) => ersteSpalte(e.currentTarget.value)}
    aria-label="Sortieren nach"
  >
    <option value="">{ohne}</option>
    {#each spalten as spalte (spalte.id)}
      <option value={spalte.id}>nach {spaltenname(blatt, spalte.id)}</option>
    {/each}
  </select>
  {#if wert}
    {@render artUndRichtung(wert, ersteAendern, 'erste Stufe')}
  {/if}
</div>

{#if wert}
  <div class="stufe">
    <span class="dann">bei Gleichstand</span>
    <select
      value={wert.dann?.spalte ?? ''}
      onchange={(e) => zweiteSpalte(e.currentTarget.value)}
      aria-label="Bei Gleichstand sortieren nach"
    >
      <option value="">Eingabereihenfolge</option>
      {#each spalten.filter((s) => s.id !== wert.spalte) as spalte (spalte.id)}
        <option value={spalte.id}>nach {spaltenname(blatt, spalte.id)}</option>
      {/each}
    </select>
    {#if wert.dann}
      {@render artUndRichtung(wert.dann, zweiteAendern, 'bei Gleichstand')}
    {/if}
  </div>
{/if}

<style>
  .stufe {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  select {
    flex: 1 1 0;
    min-width: 7rem;
    font: inherit;
    font-size: 0.8rem;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: 38px;
    padding: 0 8px;
  }

  .richtung {
    flex: 0 0 auto;
    min-height: 38px;
    min-width: 44px;
    padding: 0;
  }

  .dann {
    flex: 0 0 100%;
    color: var(--text-leise);
    font-size: 0.75rem;
  }
</style>
