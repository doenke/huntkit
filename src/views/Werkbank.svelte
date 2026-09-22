<script lang="ts">
  import { codec as findeCodec } from '../codecs/registry';
  import type { OptionWerte } from '../codecs/types';
  import {
    anzeigetafel,
    hoechsteNummer,
    laden,
    leeresBlatt,
    neueEingabespalte,
    neuePositionsspalte,
    neueWerkzeugspalte,
    neueZeile,
    rechne,
    sichern,
    spaltenname,
    spaltenzeichen,
    kennung,
    zeigtBild,
    type Spalte,
    type SpaltenId
  } from '../lib/blatt';
  import { zeichenbar } from '../lib/codeanzeige';
  import { alsLink, ausAdresse } from '../lib/teilen';
  import Codeanzeige from '../ui/Codeanzeige.svelte';
  import Spalteneinstellung from '../ui/Spalteneinstellung.svelte';
  import Tafeleingabe from '../ui/Tafeleingabe.svelte';
  import Zellenanalyse from '../ui/Zellenanalyse.svelte';

  /**
   * Die Werkbank als Blatt: Zeilen und Spalten statt eines einzelnen Textes.
   *
   * Erste Spalte eintippen – auf Wunsch mit einer Codetafel, dann sieht man
   * auch Morse als Morse. Jede weitere Spalte ist entweder wieder Eingabe oder
   * ein Werkzeug auf einer früheren Spalte. Sortierschritte stehen als Liste
   * darunter; jede Zeile behält dabei ihre Eingabenummer.
   */

  let blatt = $state(laden());
  let anzeige = $state<number | null>(null);
  let gewaehlt = $state<{ spalte: SpaltenId; zeile: string } | null>(null);
  let einstellung = $state<SpaltenId | null>(null);
  let linkStand = $state('');
  let leerenGefragt = $state(false);

  // Ein geteilter Link bringt einen fertigen Stand mit; er hat Vorrang vor dem,
  // was zuletzt auf diesem Gerät offen war.
  $effect(() => {
    void ausAdresse().then((geteilt) => {
      if (geteilt) blatt = geteilt;
    });
  });

  $effect(() => {
    sichern(blatt);
  });

  const stufe = $derived(
    anzeige === null ? blatt.sortierungen.length : Math.min(anzeige, blatt.sortierungen.length)
  );
  const berechnung = $derived(rechne(blatt, stufe));
  const spalteEinstellung = $derived(blatt.spalten.find((s) => s.id === einstellung));
  const zelle = $derived.by(() => {
    const wahl = gewaehlt;
    if (!wahl) return null;
    const reihe = berechnung.zeilen.find((z) => z.zeile.id === wahl.zeile);
    const spalte = blatt.spalten.find((s) => s.id === wahl.spalte);
    if (!reihe || !spalte) return null;
    return { reihe, spalte, inhalt: reihe.zellen[spalte.id] ?? { text: '', luecken: [] } };
  });

  function kopfname(spalte: Spalte): string {
    if (spalte.titel?.trim()) return spalte.titel.trim();
    if (spalte.art === 'eingabe') return spalte.tafel ? (findeCodec(spalte.tafel)?.name ?? 'Eingabe') : 'Eingabe';
    if (spalte.art === 'position') return `Platz ${ordnungskurz(spalte.ordnung)}`;
    return findeCodec(spalte.codecId)?.name ?? spalte.codecId;
  }

  function ordnungskurz(stufeNr: number): string {
    return stufeNr === 0 ? 'Eingabe' : `S${stufeNr}`;
  }

  function untertitel(spalte: Spalte): string {
    if (spalte.art === 'werkzeug') {
      const richtung = spalte.richtung === 'decode' ? '→' : '←';
      return `${richtung} ${spaltenname(blatt, spalte.quelle)}`;
    }
    if (spalte.art === 'eingabe' && spalte.tafel) return 'Tafel';
    return '';
  }

  /**
   * Zeichenbar ist eine Spalte, wenn ihr Inhalt in einem Code steht, den wir
   * malen können. Werkzeuge rechnen weiterhin mit den Zeichen – die Anzeige
   * ändert nichts am Wert.
   */
  function tafelVon(spalte: Spalte): string | null {
    const id = anzeigetafel(spalte);
    return id && zeichenbar(findeCodec(id)) ? id : null;
  }

  function anzeigeUmschalten(spalte: Spalte) {
    spalte.darstellung = zeigtBild(spalte) ? 'zeichen' : 'grafik';
  }

  function zeileHinzufuegen() {
    blatt.zeilen.push(neueZeile(hoechsteNummer(blatt) + 1));
  }

  function zeileLoeschen(id: string) {
    blatt.zeilen = blatt.zeilen.filter((z) => z.id !== id);
    if (gewaehlt?.zeile === id) gewaehlt = null;
  }

  function spalteHinzufuegen(art: 'eingabe' | 'werkzeug' | 'position') {
    const letzte = blatt.spalten[blatt.spalten.length - 1];
    const neu =
      art === 'eingabe'
        ? neueEingabespalte()
        : art === 'position'
          ? neuePositionsspalte(blatt.sortierungen.length)
          : letzte
            ? neueWerkzeugspalte(letzte.id, 'morse')
            : neueEingabespalte();
    blatt.spalten.push(neu);
    einstellung = neu.id;
  }

  /**
   * Eine Spalte fällt weg – alles, was auf sie zeigte, muss mit. Quellen
   * rücken auf die Spalte davor, gebundene Optionen werden wieder fest, und
   * Sortierschritte nach dieser Spalte verschwinden.
   */
  function spalteLoeschen(id: SpaltenId) {
    const stelle = blatt.spalten.findIndex((s) => s.id === id);
    if (stelle < 0) return;
    const ersatz = blatt.spalten[stelle - 1]?.id;
    blatt.spalten = blatt.spalten.filter((s) => s.id !== id);
    for (const spalte of blatt.spalten) {
      if (spalte.art !== 'werkzeug') continue;
      if (spalte.quelle === id) spalte.quelle = ersatz ?? blatt.spalten[0]?.id ?? '';
      for (const [optionId, bindung] of Object.entries(spalte.optionen)) {
        if (bindung.art === 'spalte' && bindung.spalte === id) {
          const spec = findeCodec(spalte.codecId)?.optionen?.find((o) => o.id === optionId);
          spalte.optionen[optionId] = { art: 'fest', wert: spec?.standard ?? '' };
        }
      }
    }
    blatt.sortierungen = blatt.sortierungen.filter((s) => s.spalte !== id);
    for (const zeile of blatt.zeilen) delete zeile.werte[id];
    if (einstellung === id) einstellung = null;
    if (gewaehlt?.spalte === id) gewaehlt = null;
  }

  function sortierungHinzufuegen() {
    const spalte = blatt.spalten[blatt.spalten.length - 1];
    if (!spalte) return;
    blatt.sortierungen.push({ id: kennung(), spalte: spalte.id, richtung: 'auf', art: 'text' });
    anzeige = null;
  }

  function sortierungLoeschen(stelle: number) {
    blatt.sortierungen.splice(stelle, 1);
    // Positionsspalten, die auf einen weggefallenen Schritt zeigten, rücken mit.
    for (const spalte of blatt.spalten) {
      if (spalte.art === 'position' && spalte.ordnung > blatt.sortierungen.length) {
        spalte.ordnung = blatt.sortierungen.length;
      }
    }
    anzeige = null;
  }

  /** Einen Treffer der Untersuchung auf das ganze Blatt anwenden. */
  function alsSpalte(codecId: string, optionen: OptionWerte) {
    const quelle = gewaehlt?.spalte ?? blatt.spalten[blatt.spalten.length - 1]?.id;
    if (!quelle) return;
    const neu = neueWerkzeugspalte(quelle, codecId);
    for (const [id, wert] of Object.entries(optionen)) neu.optionen[id] = { art: 'fest', wert };
    blatt.spalten.push(neu);
  }

  function setzeWert(zeileId: string, spalteId: SpaltenId, wert: string) {
    const zeile = blatt.zeilen.find((z) => z.id === zeileId);
    if (zeile) zeile.werte[spalteId] = wert;
  }

  async function linkTeilen() {
    const link = await alsLink(blatt);
    try {
      await navigator.clipboard.writeText(link);
      linkStand = 'Link kopiert';
    } catch {
      linkStand = link;
    }
    setTimeout(() => (linkStand = ''), 4000);
  }

  function leeren() {
    blatt = leeresBlatt();
    gewaehlt = null;
    einstellung = null;
    anzeige = null;
    leerenGefragt = false;
  }

  async function kopieren(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ohne Zwischenablage bleibt Markieren von Hand.
    }
  }
</script>

<div class="kopf">
  <h2>Werkbank</h2>
  <div class="leiste">
    <button type="button" onclick={zeileHinzufuegen}>+ Zeile</button>
    <select
      aria-label="Spalte hinzufügen"
      value=""
      onchange={(e) => {
        const art = e.currentTarget.value as 'eingabe' | 'werkzeug' | 'position';
        if (art) spalteHinzufuegen(art);
        e.currentTarget.value = '';
      }}
    >
      <option value="">+ Spalte …</option>
      <option value="eingabe">Eingabe</option>
      <option value="werkzeug">Werkzeug auf eine Spalte</option>
      <option value="position">Platz in einer Reihenfolge</option>
    </select>
  </div>
</div>

{#if blatt.sortierungen.length > 0}
  <div class="ordnung">
    <span class="marke">Anzeige</span>
    <select
      value={String(stufe)}
      onchange={(e) => (anzeige = Number(e.currentTarget.value))}
    >
      {#each Array.from({ length: blatt.sortierungen.length + 1 }, (_, i) => i) as nr (nr)}
        <option value={String(nr)}>
          {nr === 0 ? 'Eingabereihenfolge' : `nach Schritt ${nr}`}
        </option>
      {/each}
    </select>
  </div>
{/if}

<div class="tabelle">
  <table>
    <thead>
      <tr>
        <th class="ecke" title="Nummer der Eingabe">#</th>
        {#each blatt.spalten as spalte, i (spalte.id)}
          <th>
            <div class="kopfzelle">
              <button type="button" class="spaltenkopf" onclick={() => (einstellung = einstellung === spalte.id ? null : spalte.id)}>
                <span class="buchstabe">{spaltenzeichen(i)}</span>
                <span class="name">{kopfname(spalte)}</span>
                {#if untertitel(spalte)}<span class="quelle">{untertitel(spalte)}</span>{/if}
              </button>
              {#if tafelVon(spalte)}
                <button
                  type="button"
                  class="umschalter"
                  aria-pressed={zeigtBild(spalte)}
                  title={zeigtBild(spalte) ? 'Anzeige: Bild – auf Zeichen umstellen' : 'Anzeige: Zeichen – auf Bild umstellen'}
                  aria-label={zeigtBild(spalte) ? 'Anzeige auf Zeichen umstellen' : 'Anzeige auf Bild umstellen'}
                  onclick={() => anzeigeUmschalten(spalte)}
                >
                  {zeigtBild(spalte) ? '▦' : 'Aa'}
                </button>
              {/if}
            </div>
          </th>
        {/each}
        <th class="rand"></th>
      </tr>
    </thead>
    <tbody>
      {#each berechnung.zeilen as reihe (reihe.zeile.id)}
        <tr>
          <th class="nr">
            <span class="nummer">{reihe.zeile.nummer}</span>
            {#if reihe.vorher !== reihe.platz}
              <span class="bewegung" title="Verschiebung gegenüber der Reihenfolge davor">
                {reihe.vorher > reihe.platz ? '↑' : '↓'}{Math.abs(reihe.vorher - reihe.platz)}
              </span>
            {/if}
          </th>
          {#each blatt.spalten as spalte (spalte.id)}
            {@const inhalt = reihe.zellen[spalte.id]}
            <td
              class:aktiv={gewaehlt?.spalte === spalte.id && gewaehlt?.zeile === reihe.zeile.id}
              class:fehler={Boolean(inhalt?.fehler)}
            >
              {#if zeigtBild(spalte) && tafelVon(spalte) && spalte.art === 'eingabe'}
                <!--
                  Bild und Eingabefeld in derselben Zelle: Das Feld liegt
                  unsichtbar über dem Bild, damit ein Tipp sofort dort landet
                  und die Tastatur aufgeht. Beim Tippen deckt es das Bild zu und
                  zeigt den Code im Klartext; danach steht wieder die Zeichnung
                  da. Umschalten muss man dafür nichts.
                -->
                <div class="bildzelle">
                  <span class="bild">
                    <Codeanzeige codecId={tafelVon(spalte) ?? ''} text={inhalt?.text ?? ''} einzeilig />
                  </span>
                  <input
                    class="mono ueber"
                    value={reihe.zeile.werte[spalte.id] ?? ''}
                    spellcheck="false"
                    autocomplete="off"
                    autocapitalize="off"
                    aria-label={`${spaltenname(blatt, spalte.id)}, Zeile ${reihe.zeile.nummer}`}
                    oninput={(e) => setzeWert(reihe.zeile.id, spalte.id, e.currentTarget.value)}
                    onfocus={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                    onclick={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                  />
                </div>
              {:else if zeigtBild(spalte) && tafelVon(spalte)}
                <!-- Gerechnete Spalten sind nicht tippbar – nur anzeigen. -->
                <button
                  type="button"
                  class="wert bild"
                  onclick={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                >
                  <Codeanzeige codecId={tafelVon(spalte) ?? ''} text={inhalt?.text ?? ''} einzeilig />
                </button>
              {:else if spalte.art === 'eingabe'}
                <input
                  class="mono"
                  value={reihe.zeile.werte[spalte.id] ?? ''}
                  spellcheck="false"
                  autocomplete="off"
                  autocapitalize="off"
                  oninput={(e) => setzeWert(reihe.zeile.id, spalte.id, e.currentTarget.value)}
                  onfocus={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                  onclick={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                />
              {:else}
                <button
                  type="button"
                  class="wert mono"
                  onclick={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                >
                  {inhalt?.fehler ? '⚠' : inhalt?.text}
                </button>
              {/if}
            </td>
          {/each}
          <td class="rand">
            <button
              type="button"
              class="weg"
              onclick={() => zeileLoeschen(reihe.zeile.id)}
              aria-label={`Zeile ${reihe.zeile.nummer} löschen`}
            >
              ✕
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if berechnung.fehler.length > 0}
  <ul class="fehlerliste">
    {#each berechnung.fehler as text (text)}
      <li>{text}</li>
    {/each}
  </ul>
{/if}

{#if spalteEinstellung}
  <Spalteneinstellung
    {blatt}
    spalte={spalteEinstellung}
    schliessen={() => (einstellung = null)}
    entfernen={() => spalteLoeschen(spalteEinstellung.id)}
  />
{/if}

<section class="sortierung">
  <div class="zeile">
    <strong>Sortieren</strong>
    <button type="button" onclick={sortierungHinzufuegen} disabled={blatt.spalten.length === 0}>
      + Schritt
    </button>
  </div>

  {#if blatt.sortierungen.length === 0}
    <p class="hinweis">
      Noch keine Sortierung. Jeder Schritt erzeugt eine Reihenfolge, die eine Positionsspalte
      wieder benutzen kann – die Eingabenummer links bleibt davon unberührt.
    </p>
  {:else}
    <ol>
      {#each blatt.sortierungen as schritt, i (schritt.id)}
        <li>
          <span class="stufe">S{i + 1}</span>
          <select value={schritt.spalte} onchange={(e) => (schritt.spalte = e.currentTarget.value)}>
            {#each blatt.spalten as spalte (spalte.id)}
              <option value={spalte.id}>{spaltenname(blatt, spalte.id)}</option>
            {/each}
          </select>
          <select
            value={schritt.art}
            onchange={(e) => (schritt.art = e.currentTarget.value as typeof schritt.art)}
          >
            <option value="text">alphabetisch</option>
            <option value="zahl">numerisch</option>
            <option value="laenge">nach Länge</option>
          </select>
          <button
            type="button"
            onclick={() => (schritt.richtung = schritt.richtung === 'auf' ? 'ab' : 'auf')}
            title="Richtung umschalten"
          >
            {schritt.richtung === 'auf' ? '↑' : '↓'}
          </button>
          <button type="button" class="weg" onclick={() => sortierungLoeschen(i)} aria-label="Schritt löschen">
            ✕
          </button>
        </li>
      {/each}
    </ol>
  {/if}
</section>

{#if zelle}
  <section class="zelle">
    <div class="zeile">
      <strong>
        {spaltenname(blatt, zelle.spalte.id)} · Zeile {zelle.reihe.zeile.nummer}
      </strong>
      <span class="knoepfe">
        <button type="button" onclick={() => kopieren(zelle.inhalt.text)} disabled={!zelle.inhalt.text}>
          kopieren
        </button>
        <button type="button" onclick={() => (gewaehlt = null)}>schließen</button>
      </span>
    </div>

    {#if zelle.spalte.art === 'eingabe'}
      <textarea
        class="mono"
        rows="2"
        value={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
        spellcheck="false"
        autocapitalize="off"
        oninput={(e) => setzeWert(zelle.reihe.zeile.id, zelle.spalte.id, e.currentTarget.value)}
      ></textarea>
      {#if tafelVon(zelle.spalte)}
        <div class="vorschau">
          <Codeanzeige
            codecId={tafelVon(zelle.spalte) ?? ''}
            text={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
            mitZeichen
          />
        </div>
      {/if}
      {#if zelle.spalte.tafel}
        <Tafeleingabe
          codecId={zelle.spalte.tafel}
          wert={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
          setzen={(neu) => setzeWert(zelle.reihe.zeile.id, zelle.spalte.id, neu)}
        />
      {/if}
    {:else}
      {#if tafelVon(zelle.spalte)}
        <div class="vorschau">
          <Codeanzeige codecId={tafelVon(zelle.spalte) ?? ''} text={zelle.inhalt.text} mitZeichen />
        </div>
      {/if}
      <output class="mono ergebnis">{zelle.inhalt.text}</output>
      {#if zelle.inhalt.fehler}
        <p class="hinweis warn">{zelle.inhalt.fehler}</p>
      {:else if zelle.inhalt.luecken.length > 0}
        <p class="hinweis">
          {zelle.inhalt.luecken.length} nicht übersetzbar:
          <span class="mono">{zelle.inhalt.luecken.map((l) => l.zeichen).join(' ')}</span>
        </p>
      {/if}
    {/if}

    <Zellenanalyse text={zelle.inhalt.text} {alsSpalte} />
  </section>
{/if}

<div class="fuss">
  <button type="button" onclick={linkTeilen}>Link teilen</button>
  {#if leerenGefragt}
    <button type="button" class="ernst" onclick={leeren}>wirklich alles löschen</button>
    <button type="button" onclick={() => (leerenGefragt = false)}>abbrechen</button>
  {:else}
    <button type="button" onclick={() => (leerenGefragt = true)}>Blatt leeren</button>
  {/if}
</div>

{#if linkStand}
  <p class="linkstand mono">{linkStand}</p>
{/if}

<style>
  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  h2 {
    margin: 0;
  }

  .leiste {
    display: flex;
    gap: 6px;
  }

  .leiste button,
  .leiste select {
    min-height: 38px;
    font-size: 0.8rem;
  }

  .ordnung {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .marke,
  .hinweis {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  select,
  input,
  textarea {
    font: inherit;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: 38px;
    padding: 0 8px;
  }

  textarea {
    width: 100%;
    padding: 6px 10px;
    height: 3.4rem;
    resize: vertical;
  }

  .mono {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }

  /* Die Tabelle rollt seitlich; die Nummernspalte bleibt stehen, damit man
     auch nach dem Sortieren weiß, welche Zeile man vor sich hat. */
  .tabelle {
    overflow-x: auto;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
  }

  table {
    border-collapse: collapse;
    width: max-content;
    min-width: 100%;
  }

  th,
  td {
    border-bottom: 1px solid var(--rand);
    border-right: 1px solid var(--rand);
    padding: 0;
    text-align: left;
    vertical-align: middle;
  }

  thead th {
    background: var(--flaeche);
    position: sticky;
    top: 0;
  }

  .ecke,
  .nr {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--flaeche);
    min-width: 3.2rem;
    padding: 4px 6px;
    font-size: 0.75rem;
    color: var(--text-leise);
    font-weight: 500;
  }

  .nummer {
    font-weight: 700;
    color: var(--text);
  }

  .bewegung {
    margin-left: 4px;
    color: var(--akzent);
  }

  .kopfzelle {
    display: flex;
    align-items: stretch;
    gap: 2px;
  }

  .umschalter {
    flex: 0 0 auto;
    align-self: center;
    min-height: 30px;
    min-width: 30px;
    margin-right: 4px;
    padding: 0 4px;
    font-size: 0.7rem;
    background: none;
  }

  .spaltenkopf {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    flex: 1 1 auto;
    min-width: 6.5rem;
    min-height: 44px;
    padding: 4px 8px;
    background: none;
    border: none;
    border-radius: 0;
    text-align: left;
  }

  .buchstabe {
    font-size: 0.65rem;
    color: var(--text-leise);
    letter-spacing: 0.08em;
  }

  .name {
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .quelle {
    font-size: 0.65rem;
    color: var(--text-leise);
  }

  td input,
  td .wert {
    width: 100%;
    min-width: 6.5rem;
    min-height: 40px;
    border: none;
    border-radius: 0;
    background: none;
    font-size: 0.85rem;
    text-align: left;
    padding: 0 8px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  td .wert {
    color: var(--text-leise);
  }

  /* Gezeichnete Zellen brauchen ihre Breite – die Tabelle rollt ohnehin. */
  td .wert.bild {
    color: var(--text);
    white-space: normal;
    width: max-content;
    padding: 4px 8px;
  }

  /*
   * Das Bild gibt der Zelle ihre Breite, das Feld legt sich darüber – und
   * beides füllt die Zelle ganz aus. Sonst bleibt rechts neben einer kurzen
   * Zeichnung ein toter Streifen, in dem ein Tipp ins Leere geht, während
   * dieselbe Stelle im Textmodus das Feld trifft.
   */
  .bildzelle {
    position: relative;
    display: flex;
    align-items: center;
    min-width: max(6.5rem, max-content);
    width: 100%;
    min-height: 40px;
  }

  .bildzelle .bild {
    padding: 4px 8px;
  }

  .bildzelle input.ueber {
    position: absolute;
    inset: 0;
    width: 100%;
    min-width: 0;
    padding: 0 8px;
    border: none;
    border-radius: 0;
    background: transparent;
    color: transparent;
    caret-color: transparent;
    font-size: 0.85rem;
  }

  /* Beim Tippen deckt das Feld das Bild zu und zeigt den Code, wie er dasteht. */
  .bildzelle input.ueber:focus {
    background: var(--flaeche);
    color: var(--text);
    caret-color: var(--akzent);
  }

  .vorschau {
    padding: 6px 8px;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    background: var(--flaeche);
    margin-bottom: 6px;
  }

  td.aktiv {
    outline: 2px solid var(--akzent);
    outline-offset: -2px;
  }

  td.fehler .wert {
    color: var(--warn);
  }

  .rand {
    border-right: none;
    min-width: 2.4rem;
  }

  .weg {
    min-height: 36px;
    min-width: 36px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-leise);
  }

  .fehlerliste {
    list-style: none;
    margin: 8px 0 0;
    padding: 8px 10px;
    border: 1px solid var(--warn);
    border-radius: var(--radius);
    color: var(--warn);
    font-size: 0.8rem;
    display: grid;
    gap: 2px;
  }

  section {
    margin-top: 16px;
  }

  section .zeile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .knoepfe {
    display: flex;
    gap: 6px;
  }

  .knoepfe button,
  section .zeile button {
    min-height: 34px;
    font-size: 0.78rem;
  }

  .sortierung ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .sortierung li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sortierung select {
    flex: 1 1 0;
    min-width: 0;
    font-size: 0.8rem;
  }

  .stufe {
    flex: 0 0 auto;
    font-size: 0.75rem;
    color: var(--akzent);
    font-weight: 700;
  }

  .sortierung li button {
    flex: 0 0 auto;
    min-height: 38px;
    min-width: 38px;
    padding: 0;
  }

  section.zelle {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
  }

  .ergebnis {
    display: block;
    padding: 8px 10px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: 2.4rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .warn {
    color: var(--warn);
  }

  .fuss {
    display: flex;
    gap: 6px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .fuss button {
    min-height: 40px;
    font-size: 0.85rem;
  }

  .ernst {
    border-color: var(--warn);
    color: var(--warn);
  }

  .linkstand {
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--text-leise);
    overflow-wrap: anywhere;
  }
</style>
