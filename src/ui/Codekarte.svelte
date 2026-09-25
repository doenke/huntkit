<script lang="ts">
  import { wachsen } from '../lib/wachsen';
  import type { Codec } from '../codecs/types';
  import { standardOptionen } from '../codecs/types';
  import { einzelzeichen, zeichenbar } from '../lib/codeanzeige';
  import Codeanzeige from './Codeanzeige.svelte';
  import Quellen from './Quellen.svelte';
  import Optionen from './Optionen.svelte';

  /**
   * Eine Codekarte: Nachschlagen und Umrechnen in einem.
   *
   * Beide Textfelder hängen zusammen – tippt man links Klartext, steht rechts
   * der Code, und umgekehrt. Ein Zeichen aus dem Raster anzutippen ist dasselbe
   * wie es zu tippen. Genau diese Vermischung war der Punkt: Wer das Zeichen
   * vor sich hat, will es nicht erst nachschlagen und dann abtippen.
   */
  let { codec, zurueck }: { codec: Codec; zurueck: () => void } = $props();

  let klartext = $state('');
  let kodiert = $state('');
  let werte = $state<Record<string, string | number>>({ ...standardOptionen(codec) });

  const eintraege = $derived(codec.tabelle?.(werte) ?? []);
  const gruppen = $derived([...new Set(eintraege.map((e) => e.gruppe ?? 'Zeichen'))]);
  let gruppe = $state<string | null>(null);
  // Nach einem Wechsel der Einstellungen kann der gewählte Abschnitt weg sein –
  // dann zeigt die Karte wieder den ersten statt eines leeren Rasters.
  const aktiv = $derived(gruppe && gruppen.includes(gruppe) ? gruppe : gruppen[0]);
  const sichtbar = $derived(eintraege.filter((e) => (e.gruppe ?? 'Zeichen') === aktiv));

  /**
   * Trennzeichen zwischen zwei Zeichen: Wo eine Darstellung mehr als ein
   * Zeichen lang ist, braucht es eins – sonst liefe alles ineinander.
   */
  const trenner = $derived(einzelzeichen(codec, werte) ? '' : ' ');
  /** Codes mit Bild bekommen unter dem Feld eine gezeichnete Fassung. */
  const malbar = $derived(zeichenbar(codec));

  function ausKlartext(wert: string) {
    klartext = wert;
    kodiert = codec.encode(wert, werte).text;
  }

  function ausKodiert(wert: string) {
    kodiert = wert;
    klartext = codec.decode(wert, werte).text;
  }

  /** Lange Namen wie „DarkTurquoise“ dürfen zwischen den Wortteilen umbrechen, nicht mitten darin. */
  const umbrechbar = (name: string) => name.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, '$1\u200B$2');

  /** Tasten und Raster lassen den Fokus im Codefeld, wie in der Werkbank. */
  const behalteFokus = (e: MouseEvent) => e.preventDefault();

  function anhaengen(stueck: string) {
    const vorher = kodiert.length > 0 && trenner && !kodiert.endsWith(trenner) ? trenner : '';
    ausKodiert(kodiert + vorher + stueck);
  }

  function loeschen() {
    const gekuerzt = trenner
      ? kodiert.replace(new RegExp(`\\s*\\S+\\s*$`), '')
      : [...kodiert].slice(0, -1).join('');
    ausKodiert(gekuerzt);
  }

  async function kopieren(wert: string) {
    try {
      await navigator.clipboard.writeText(wert);
    } catch {
      // Ohne Zwischenablage bleibt Markieren von Hand.
    }
  }
</script>

<div class="karte">
<div class="kopf">
  <button type="button" class="zurueck" onclick={zurueck} aria-label="Zurück zur Übersicht">←</button>
  <div>
    <strong>{codec.name}</strong>
    <span class="leise">{codec.beschreibung}</span>
  </div>
</div>

{#if codec.optionen}
  <div class="optionen">
    <Optionen {codec} {werte} />
  </div>
{/if}

<div class="felder">
  <label>
    <span class="marke">
      Klartext
      <span class="knoepfe">
        <button type="button" onclick={() => kopieren(klartext)} disabled={!klartext}>kopieren</button>
      </span>
    </span>
    <textarea
      rows="2"
      value={klartext}
      use:wachsen={klartext}
      placeholder="Text eintippen"
      spellcheck="false"
      autocapitalize="characters"
      oninput={(e) => ausKlartext(e.currentTarget.value)}
    ></textarea>
  </label>

  <label>
    <span class="marke">
      {codec.name}
      <span class="knoepfe">
        {#if !codec.eingabetasten}
          <button type="button" onclick={loeschen} disabled={!kodiert} aria-label="letztes Zeichen löschen">⌫</button>
        {/if}
        <button type="button" onclick={() => ausKodiert('')} disabled={!kodiert}>leeren</button>
        <button type="button" onclick={() => kopieren(kodiert)} disabled={!kodiert}>kopieren</button>
      </span>
    </span>
    <textarea
      class="mono"
      rows="2"
      value={kodiert}
      use:wachsen={kodiert}
      placeholder={eintraege[0] ? `z.B. ${eintraege[0].darstellung}` : ''}
      spellcheck="false"
      autocapitalize="off"
      oninput={(e) => ausKodiert(e.currentTarget.value)}
    ></textarea>
    {#if malbar && kodiert.length > 0}
      <div class="gemalt">
        <Codeanzeige codecId={codec.id} text={kodiert} />
      </div>
    {/if}
  </label>
</div>

{#if codec.eingabetasten}
  <div class="tasten">
    {#each codec.eingabetasten as taste (taste.titel)}
      <button type="button" onmousedown={behalteFokus} title={taste.hinweis} onclick={() => ausKodiert(kodiert + taste.einfuegen)}>
        {taste.titel}
      </button>
    {/each}
    <button type="button" onmousedown={behalteFokus} onclick={loeschen} disabled={!kodiert} aria-label="letztes Zeichen löschen">
      ⌫
    </button>
  </div>
{/if}

{#if gruppen.length > 1}
  <div class="abschnitte">
    {#each gruppen as name (name)}
      <button
        type="button"
        aria-pressed={aktiv === name}
        onclick={() => (gruppe = name)}
      >
        {name}
      </button>
    {/each}
  </div>
{/if}

<div
  class="raster"
  class:mitBild={Boolean(codec.zeichne)}
  class:mitHinweis={!codec.zeichne && eintraege.some((e) => e.hinweis || [...e.zeichen].length > 4)}
  class:hoch={Boolean(codec.zeichne) && eintraege.some((e) => e.hinweis)}
>
  {#if codec.uebersicht}
    <!-- Das Gesamtbild rollt mit der Tabelle, statt den festen Teil der Karte
         zu verlängern – sonst bliebe am Handy kaum Platz für das Raster. -->
    <figure class="uebersicht">
      <svg viewBox={codec.uebersicht.bild.viewBox} role="img" aria-label={codec.uebersicht.titel}>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html codec.uebersicht.bild.inhalt}
      </svg>
      <figcaption>{codec.uebersicht.titel}</figcaption>
    </figure>
  {/if}
  {#each sichtbar as eintrag, stelle (stelle)}
    {@const glyph = codec.zeichne?.(eintrag.zeichen, werte) ?? null}
    {@const codebild = glyph ? null : (codec.zeichneCode?.(eintrag.darstellung) ?? null)}
    <button type="button" onmousedown={behalteFokus} onclick={() => anhaengen(eintrag.darstellung)}>
      {#if glyph}
        <svg viewBox={glyph.viewBox} aria-hidden="true">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html glyph.inhalt}
        </svg>
        <span class="zeichen">{umbrechbar(eintrag.zeichen)}</span>
        {#if eintrag.hinweis}<span class="hinweis">{eintrag.hinweis}</span>{/if}
      {:else if eintrag.hinweis}
        <!-- Nachschlagetafel mit Erklärung: das Codezeichen groß, daneben was es bedeutet. -->
        <span class="gross">{eintrag.darstellung}</span>
        <span class="erklaerung">
          <span class="zeichen">{umbrechbar(eintrag.zeichen)}</span>
          <span class="hinweis">{eintrag.hinweis}</span>
        </span>
      {:else}
        <span class="zeichen">{umbrechbar(eintrag.zeichen)}</span>
        {#if codebild}
          <!-- Der Code steht auch in der Tabelle als Bild: bei Morse liest sich
               die Balkenreihe schneller als eine Folge von Satzzeichen. -->
          <svg class="codebild" viewBox={codebild.viewBox} aria-hidden="true">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html codebild.inhalt}
          </svg>
        {:else}
          <span class="mono code">{eintrag.darstellung}</span>
        {/if}
      {/if}
    </button>
  {/each}
</div>

{#if codec.quelle}
  <p class="quelle">
    Bild: {codec.quelle.text}.
    <a href={codec.quelle.url} target="_blank" rel="noreferrer">Quelle</a>
  </p>
{/if}
{#if codec.quellen?.length}
  <Quellen quellen={codec.quellen} />
{/if}
</div>

<style>
  /*
   * Die Karte legt sich auf die Schirmhöhe: Kopf, Textfelder und Tasten stehen
   * fest, das Raster nimmt den Rest. Lange Tabellen rollen damit im Raster und
   * nicht auf der Seite – die Textfelder bleiben beim Tippen sichtbar.
   */
  .karte {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .kopf {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .kopf div {
    min-width: 0;
  }

  .kopf .leise {
    display: block;
    /* Der Kopf bleibt zweizeilig – sonst schiebt er das Raster vom Schirm. */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kopf strong {
    display: block;
  }

  .zurueck {
    min-width: 44px;
    min-height: 44px;
    font-size: 1.2rem;
    flex: 0 0 auto;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .optionen {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
  }

  .felder {
    display: grid;
    gap: 6px;
    margin-bottom: 8px;
  }

  .marke {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--text-leise);
    margin-bottom: 2px;
  }

  .knoepfe {
    display: flex;
    gap: 4px;
  }

  .knoepfe button {
    min-height: 32px;
    padding: 0 8px;
    font-size: 0.75rem;
  }

  textarea {
    width: 100%;
    font: inherit;
    line-height: 1.35;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    padding: 6px 10px;
    /* Zwei Zeilen als Mindestmaß, darüber wächst das Feld mit dem Text –
       gerollt wird in einem Textfeld nie. */
    resize: none;
    overflow: hidden;
    min-height: 3.4rem;
  }

  textarea.mono {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }

  /* Der Code noch einmal als Bild: Morse ist als Satzzeichenfolge kaum zu
     lesen, als Balkenreihe sofort. */
  .gemalt {
    margin-top: 6px;
    padding: 6px 8px;
    max-height: 5.2rem;
    overflow-y: auto;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    background: var(--flaeche);
  }

  .tasten {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .tasten button {
    flex: 1 1 0;
    min-width: 2.6rem;
    min-height: 46px;
    padding: 0 6px;
    font-size: 1.05rem;
  }

  .abschnitte {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .abschnitte button {
    flex: 1 1 0;
    min-height: 36px;
    padding: 0 6px;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .raster {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.2rem, 1fr));
    gap: 4px;
    align-content: start;
    flex: 1 1 auto;
    /* Vier Zeilen sind das Wenigste, worauf sich das Raster stauchen lässt –
       darunter rollt lieber die ganze Seite. */
    min-height: 12rem;
    overflow-y: auto;
  }

  .raster.mitBild {
    grid-template-columns: repeat(auto-fill, minmax(4.6rem, 1fr));
  }

  /* Bild, Name und Wert untereinander: Die Zeile wächst mit, statt das Bild
     zu stauchen. */
  .raster.hoch {
    grid-auto-rows: min-content;
  }

  .raster.hoch svg {
    flex-shrink: 0;
  }

  /* Einträge mit Erklärung oder langem Namen (Ländern) brauchen Breite statt
     Höhe: Zeichen links, Text rechts. */
  .raster.mitHinweis {
    grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
    /* Sonst staucht das rollende Raster die Zeilen auf Tastenhöhe und schneidet
       lange Erklärungen oben und unten ab. */
    grid-auto-rows: min-content;
  }

  .raster.mitHinweis button {
    flex-direction: row;
    justify-content: flex-start;
    gap: 10px;
    padding: 6px 8px;
    text-align: left;
  }

  .gross {
    flex: 0 0 2.4rem;
    text-align: center;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--akzent);
  }

  .erklaerung {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .erklaerung .hinweis {
    color: var(--text-leise);
    font-size: 0.7rem;
    line-height: 1.25;
  }

  /* Unter einem Bild: klein und einzeilig, etwa der Farbwert. */
  .raster.mitBild .hinweis {
    color: var(--text-leise);
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 0.65rem;
  }

  .uebersicht {
    grid-column: 1 / -1;
    margin: 0 0 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--text);
  }

  /* Gegen das allgemeine .raster svg, das jedes Bild auf Tastenhöhe setzt. */
  .raster .uebersicht svg {
    height: auto;
    width: 100%;
    max-width: 15rem;
  }

  .uebersicht figcaption {
    color: var(--text-leise);
    font-size: 0.72rem;
  }

  .raster button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    min-height: 46px;
    padding: 2px;
  }

  .raster.mitBild button {
    min-height: 74px;
    color: var(--akzent);
  }

  .raster svg {
    height: 46px;
    width: auto;
    max-width: 100%;
  }

  .zeichen {
    font-weight: 600;
    font-size: 1rem;
  }

  .raster.mitBild .zeichen {
    color: var(--text-leise);
    font-size: 0.75rem;
    font-weight: 500;
    /* Lange Namen wie BlanchedAlmond brechen um, statt abgeschnitten zu werden. */
    max-width: 100%;
    overflow-wrap: anywhere;
    text-align: center;
    line-height: 1.2;
  }

  .code {
    color: var(--text-leise);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
  }

  /*
   * Feste Einheit statt Einpassen: Sonst skaliert der Browser jede Zeichnung
   * auf die Feldhöhe, und ein kurzes E bekäme dickere Balken als ein langes
   * Sonderzeichen. Die Höhe der Spur ist bei jedem Code dieselbe, also ist
   * auch der Punkt überall gleich groß; die Breite darf wachsen.
   */
  .raster .codebild {
    height: 10px;
    width: auto;
    max-width: none;
    margin-top: 3px;
  }

  .quelle {
    margin: 10px 0 0;
    color: var(--text-leise);
    font-size: 0.72rem;
  }
</style>
