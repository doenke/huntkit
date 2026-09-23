<script lang="ts">
  import Textzeile from './Textzeile.svelte';
  import {
    auslesen, AUSGABEN, ELEMENTE, finde, LAYOUTS, raster, reihenZahl,
    REIHENFOLGEN, spaltenZahl,
    type Ausgabe, type Element, type Layout, type Reihenfolge
  } from '../lib/periodensystem';
  import { EBENENFARBEN, serienfarbe } from '../lib/serienfarben';
  import { anWerkbank } from '../lib/sammlung';
  import { satzZerlegen } from '../lib/elementspeller';

  interface Ebene {
    name: string;
    farbe: string;
    sichtbar: boolean;
    /** Reihenfolge des Antippens bleibt erhalten – sie ist oft der Rätselschritt. */
    elemente: number[];
  }

  const KANTE = 46;
  const ABSTAND = 4;
  const SCHRITT = KANTE + ABSTAND;

  let layout = $state<Layout>('standard');
  let zoom = $state(1);
  let anfrage = $state('');
  let nurMarkierungen = $state(false);
  let gewaehlt = $state<Element | null>(null);
  let reihenfolge = $state<Reihenfolge>('gitter');
  let ausgabe = $state<Ausgabe>('symbol');
  let ebenen = $state<Ebene[]>([
    { name: 'Ebene 1', farbe: EBENENFARBEN[0], sichtbar: true, elemente: [] }
  ]);
  let aktiv = $state(0);

  const zellen = $derived(raster(layout));
  const breite = $derived(spaltenZahl(layout) * SCHRITT);
  const hoehe = $derived(reihenZahl(layout) * SCHRITT);
  const treffer = $derived(new Set(finde(anfrage).map((e) => e.ordnungszahl)));
  const aktiveEbene = $derived(ebenen[aktiv]);
  const ausgelesen = $derived(
    auslesen(aktiveEbene?.elemente ?? [], layout, reihenfolge, ausgabe)
  );

  let spellerText = $state('');
  const zerlegt = $derived(spellerText.trim() ? satzZerlegen(spellerText, 12) : []);

  function markierungen(ordnungszahl: number): Ebene[] {
    return ebenen.filter((e) => e.sichtbar && e.elemente.includes(ordnungszahl));
  }

  function umschalten(element: Element) {
    gewaehlt = element;
    const ebene = ebenen[aktiv];
    if (!ebene) return;
    const stelle = ebene.elemente.indexOf(element.ordnungszahl);
    if (stelle >= 0) ebene.elemente.splice(stelle, 1);
    else ebene.elemente.push(element.ordnungszahl);
  }

  function aufTreffer(art: 'setzen' | 'dazu' | 'abziehen' | 'schneiden') {
    const ebene = ebenen[aktiv];
    if (!ebene) return;
    const gefunden = finde(anfrage).map((e) => e.ordnungszahl);
    if (art === 'setzen') ebene.elemente = gefunden;
    else if (art === 'dazu') {
      for (const z of gefunden) if (!ebene.elemente.includes(z)) ebene.elemente.push(z);
    } else if (art === 'abziehen') {
      ebene.elemente = ebene.elemente.filter((z) => !gefunden.includes(z));
    } else {
      ebene.elemente = ebene.elemente.filter((z) => gefunden.includes(z));
    }
  }

  function ebeneDazu() {
    if (ebenen.length >= EBENENFARBEN.length) return;
    ebenen.push({
      name: `Ebene ${ebenen.length + 1}`,
      farbe: EBENENFARBEN[ebenen.length] ?? EBENENFARBEN[0],
      sichtbar: true,
      elemente: []
    });
    aktiv = ebenen.length - 1;
  }

  function alsBildSpeichern() {
    // Die Tafel liegt ohnehin als SVG vor – Sichern heißt hier nur, sie
    // herauszuschreiben. Damit lässt sich ein Muster ins Team schicken.
    const knoten = document.getElementById('pse-tafel');
    if (!knoten) return;
    const kopie = knoten.cloneNode(true) as SVGElement;
    kopie.setAttribute('style', `background:${getComputedStyle(document.body).backgroundColor}`);
    const text = new XMLSerializer().serializeToString(kopie);
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'periodensystem.svg';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="steuerung">
  <div class="gruppe">
    {#each LAYOUTS as eintrag (eintrag.id)}
      <button
        type="button"
        aria-pressed={layout === eintrag.id}
        title={eintrag.hinweis}
        onclick={() => (layout = eintrag.id)}
      >
        {eintrag.titel}
      </button>
    {/each}
  </div>
  <div class="gruppe">
    <button type="button" onclick={() => (zoom = Math.max(0.5, zoom - 0.25))}>−</button>
    <button type="button" onclick={() => (zoom = 1)}>einpassen</button>
    <button type="button" onclick={() => (zoom = Math.min(4, zoom + 0.25))}>+</button>
  </div>
</div>

<p class="hinweis">
  Angezeigt: {LAYOUTS.find((l) => l.id === layout)?.hinweis}. Koordinaten gelten nur für
  diese Darstellung.
</p>

<div class="tafel" class:gezoomt={zoom !== 1}>
  <svg
    id="pse-tafel"
    viewBox="0 0 {breite} {hoehe}"
    style="width: {100 * zoom}%"
    role="group"
    aria-label="Periodensystem"
  >
    {#each zellen as zelle (zelle.element.ordnungszahl)}
      {@const marken = markierungen(zelle.element.ordnungszahl)}
      {@const x = (zelle.spalte - 1) * SCHRITT}
      {@const y = (zelle.reihe - 1) * SCHRITT}
      {@const blass = nurMarkierungen && marken.length === 0}
      <g
        class="zelle"
        class:blass
        onclick={() => umschalten(zelle.element)}
        onkeydown={(e) => e.key === 'Enter' && umschalten(zelle.element)}
        role="button"
        tabindex="0"
        aria-label={`${zelle.element.name}, Ordnungszahl ${zelle.element.ordnungszahl}`}
      >
        <rect
          x={x} y={y} width={KANTE} height={KANTE} rx="4"
          fill={blass ? 'transparent' : (marken[0]?.farbe ?? serienfarbe(zelle.element.serie))}
          stroke={treffer.has(zelle.element.ordnungszahl) ? 'var(--text)' : 'var(--rand)'}
          stroke-width={treffer.has(zelle.element.ordnungszahl) ? 2.5 : 0.6}
        />
        {#if marken.length > 1}
          <!-- Zweite Ebene als Ecke, damit Überschneidungen sichtbar bleiben. -->
          <polygon
            points="{x + KANTE},{y} {x + KANTE},{y + 16} {x + KANTE - 16},{y}"
            fill={marken[1]?.farbe}
          />
        {/if}
        {#if !blass}
          <text x={x + 3} y={y + 11} class="zahl">{zelle.element.ordnungszahl}</text>
          <text x={x + KANTE / 2} y={y + 31} class="symbol">{zelle.element.symbol}</text>
        {/if}
      </g>
    {/each}
  </svg>
</div>

<div class="werkzeuge">
  <Textzeile
    bind:value={anfrage}
    placeholder="Suche: gold, serie:edelgase, z&gt;50, primzahl, radioaktiv"
    aria-label="Elemente suchen"
    spellcheck="false"
  />
  {#if anfrage.trim()}
    <p class="hinweis">{treffer.size} Treffer</p>
    <div class="gruppe">
      <button type="button" onclick={() => aufTreffer('setzen')}>markieren</button>
      <button type="button" onclick={() => aufTreffer('dazu')}>dazu</button>
      <button type="button" onclick={() => aufTreffer('abziehen')}>abziehen</button>
      <button type="button" onclick={() => aufTreffer('schneiden')}>schneiden</button>
    </div>
  {/if}
</div>

<h3>Markierungen</h3>
<ul class="ebenen">
  {#each ebenen as ebene, i (ebene.name)}
    <li class:aktiv={aktiv === i}>
      <button type="button" class="waehlen" onclick={() => (aktiv = i)}>
        <span class="punkt" style="background: {ebene.farbe}"></span>
        {ebene.name}
        <span class="leise">{ebene.elemente.length}</span>
      </button>
      <button type="button" onclick={() => (ebene.sichtbar = !ebene.sichtbar)}>
        {ebene.sichtbar ? 'sichtbar' : 'aus'}
      </button>
      <button type="button" onclick={() => (ebene.elemente = [])}>leeren</button>
    </li>
  {/each}
</ul>

<div class="gruppe">
  {#if ebenen.length < EBENENFARBEN.length}
    <button type="button" onclick={ebeneDazu}>Ebene hinzufügen</button>
  {/if}
  <button type="button" aria-pressed={nurMarkierungen} onclick={() => (nurMarkierungen = !nurMarkierungen)}>
    nur Markierungen
  </button>
  <button type="button" onclick={alsBildSpeichern}>als Bild sichern</button>
</div>

<h3>Auslesen</h3>
<div class="gruppe">
  <label>
    Reihenfolge
    <select bind:value={reihenfolge}>
      {#each REIHENFOLGEN as r (r.id)}<option value={r.id}>{r.titel}</option>{/each}
    </select>
  </label>
  <label>
    als
    <select bind:value={ausgabe}>
      {#each AUSGABEN as a (a.id)}<option value={a.id}>{a.titel}</option>{/each}
    </select>
  </label>
</div>
<output class="mono ergebnis">{ausgelesen || ' '}</output>
<div class="gruppe">
  <button type="button" disabled={!ausgelesen} onclick={() => anWerkbank(ausgelesen)}>
    an die Werkbank
  </button>
</div>

<h3>In Elementsymbolen schreiben</h3>
<div class="speller">
  <Textzeile
    bind:value={spellerText}
    placeholder="z.B. BACON"
    spellcheck="false"
    aria-label="Wort in Elementsymbolen schreiben"
  />
</div>
{#if spellerText.trim()}
  <ul class="zerlegungen">
    {#each zerlegt as eintrag (eintrag.wort)}
      <li>
        <strong>{eintrag.wort}</strong>
        {#if eintrag.zerlegungen.length === 0}
          <span class="leise">lässt sich nicht aus Elementsymbolen legen</span>
        {:else}
          <ol>
            {#each eintrag.zerlegungen as zerlegung, i (i)}
              <li>
                <button type="button" onclick={() => anWerkbank(zerlegung.ordnungszahlen.join(' '))}>
                  <span class="mono">{zerlegung.symbole.join('-')}</span>
                  <span class="leise">{zerlegung.ordnungszahlen.join(' ')}</span>
                </button>
              </li>
            {/each}
          </ol>
        {/if}
      </li>
    {/each}
  </ul>
  <p class="hinweis">
    Alle Lesarten, nicht nur eine – „CON“ ist C-O-N oder Co-N. Tippen schickt die
    Ordnungszahlen an die Werkbank.
  </p>
{/if}

{#if gewaehlt}
  <h3>{gewaehlt.name}</h3>
  <dl class="karte">
    <dt>Symbol</dt><dd>{gewaehlt.symbol}</dd>
    <dt>Ordnungszahl</dt><dd>{gewaehlt.ordnungszahl}</dd>
    <dt>Stellung</dt>
    <dd>
      {#if gewaehlt.serie === 'Lanthanoide' || gewaehlt.serie === 'Actinoide'}
        {gewaehlt.serie}, Periode {zellen.find((z) => z.element === gewaehlt)?.periode}
      {:else}
        Gruppe {zellen.find((z) => z.element === gewaehlt)?.gruppe}, Periode
        {zellen.find((z) => z.element === gewaehlt)?.periode}
      {/if}
      · Spalte {zellen.find((z) => z.element === gewaehlt)?.spalte},
      Reihe {zellen.find((z) => z.element === gewaehlt)?.reihe}
    </dd>
    <dt>Atomgewicht</dt><dd>{gewaehlt.atomgewicht}</dd>
    <dt>Elektronenkonfiguration</dt><dd>{gewaehlt.elektronenkonfiguration}</dd>
    <dt>Elektronegativität</dt><dd>{gewaehlt.elektronegativitaet ?? '–'}</dd>
    <dt>Serie</dt><dd>{gewaehlt.serie}</dd>
    <dt>Aggregatzustand</dt><dd>{gewaehlt.aggregatzustand}</dd>
    <dt>radioaktiv</dt><dd>{gewaehlt.radioaktiv ? 'ja' : 'nein'}</dd>
  </dl>
{:else}
  <p class="hinweis">
    Zelle antippen: markiert sie in der gewählten Ebene und zeigt ihre Angaben.
    {ELEMENTE.length} Elemente.
  </p>
{/if}

<style>
  .steuerung {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .gruppe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }

  .gruppe button,
  .steuerung button {
    min-height: 40px;
    padding: 0 10px;
    font-size: 0.85rem;
  }

  button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .hinweis {
    margin: 0 0 8px;
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .tafel {
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    background: var(--flaeche);
    padding: 6px;
    margin-bottom: 12px;
  }

  .tafel.gezoomt {
    overflow: auto;
  }

  svg {
    display: block;
    min-width: 100%;
  }

  .zelle {
    cursor: pointer;
  }

  .zelle.blass rect {
    stroke: var(--rand);
    stroke-dasharray: 2 2;
  }

  .zahl {
    font-size: 9px;
    fill: var(--text-leise);
  }

  .symbol {
    font-size: 19px;
    font-weight: 600;
    text-anchor: middle;
    fill: var(--text);
  }

  .werkzeuge :global(textarea) {
    margin-bottom: 8px;
  }

  h3 {
    margin: 20px 0 8px;
    font-size: 0.95rem;
  }

  .ebenen {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .ebenen li {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .ebenen li.aktiv .waehlen {
    border-color: var(--akzent);
  }

  .ebenen button {
    min-height: 40px;
    font-size: 0.85rem;
    padding: 0 10px;
  }

  .waehlen {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
  }

  .punkt {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex: 0 0 auto;
  }

  .leise {
    margin-left: auto;
    color: var(--text-leise);
  }

  .ergebnis {
    display: block;
    padding: 10px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    margin-bottom: 8px;
    overflow-wrap: anywhere;
  }

  .speller {
    margin-bottom: 8px;
  }

  .zerlegungen {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .zerlegungen ol {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }

  .zerlegungen button {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    text-align: left;
    min-height: 40px;
    font-size: 0.9rem;
  }

  .karte {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 0;
    font-size: 0.9rem;
  }

  .karte dt {
    color: var(--text-leise);
  }

  .karte dd {
    margin: 0;
  }
</style>
