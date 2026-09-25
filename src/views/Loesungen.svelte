<script lang="ts">
  import { untrack } from 'svelte';
  import Textzeile from '../ui/Textzeile.svelte';
  import { abgleich, ansicht as gruppenansicht, mitglied } from '../lib/gruppe/gruppen.svelte';
  import { wortschluessel, wortwert, zustandAus } from '../lib/kreuzwortgruppe';
  import {
    buchstaben,
    laden,
    laengeVon,
    laengenLesen,
    leererZustand,
    neuesWort,
    planen,
    schonGefunden,
    sichern,
    type Zustand
  } from '../lib/loesungsplan';

  /**
   * Lösungswörter für ein Kreuzwort- oder Bilderrätsel sammeln und den Lücken
   * im Gitter zuordnen – allein auf diesem Gerät oder gemeinsam in einer
   * Gruppe. Ein Wort, das schon gefunden ist, lässt sich nicht noch einmal
   * eintragen: Zwei gleiche Wörter belegten sonst zwei Lücken, und der Plan
   * stimmte nicht mehr.
   */

  /** Wo das Rätsel liegt: '' ist dieses Gerät, sonst die Kennung der Gruppe. */
  const ORT = 'huntkit:kreuzwort-ort';
  let ort = $state(ortLaden());

  function ortLaden(): string {
    try {
      return localStorage.getItem(ORT) ?? '';
    } catch {
      return '';
    }
  }

  function ortWaehlen(neu: string) {
    ort = neu;
    hinweis = null;
    try {
      localStorage.setItem(ORT, neu);
    } catch {
      // Dann eben beim nächsten Mal wieder dieses Gerät.
    }
  }

  const gruppen = $derived.by(() => {
    void gruppenansicht.version;
    return Object.values(abgleich.speicher.gruppen).map((g) => ({ id: g.id, name: g.name }));
  });
  /** Die gewählte Gruppe – nur solange man ihr noch angehört. */
  const gruppe = $derived(gruppen.some((g) => g.id === ort) ? ort : null);

  let lokal = $state(laden());
  const geteilt = $derived.by(() => {
    void gruppenansicht.version;
    return gruppe ? abgleich.kreuzwort(gruppe) : {};
  });
  const zustand: Zustand = $derived(gruppe ? zustandAus(geteilt) : lokal);

  let entwurf = $state('');
  /** Ein angetippter Buchstabe wird überall hervorgehoben – so findet man Kreuzungen. */
  let hervorgehoben = $state<string | null>(null);
  let leerenGefragt = $state(false);
  let hinweis = $state<string | null>(null);

  const gelesen = $derived(laengenLesen(zustand.laengenText));
  const plan = $derived(planen(gelesen.laengen, zustand.woerter));
  /** Ohne Längen gibt es keine Lücken – dann ist kein Wort „falsch“, nur ungeordnet. */
  const ohneLaengen = $derived(gelesen.laengen.length === 0);
  /** Schon beim Tippen: Gibt es das Wort schon? */
  const doppelt = $derived(schonGefunden(zustand.woerter, entwurf));

  $effect(() => {
    sichern(lokal);
  });

  // Während die Seite offen ist, gleicht sie die Gruppen ab – wie die Werkbank.
  $effect(() => {
    abgleich.start();
    const sicht = () => abgleich.setzeSichtbar(document.visibilityState === 'visible');
    const online = () => abgleich.wiederOnline();
    document.addEventListener('visibilitychange', sicht);
    addEventListener('online', online);
    return () => {
      document.removeEventListener('visibilitychange', sicht);
      removeEventListener('online', online);
      abgleich.sichereJetzt();
      abgleich.stopp();
    };
  });

  $effect(() => {
    const g = gruppe;
    untrack(() => abgleich.setzeAktiv(g));
  });

  const verbindung = $derived.by(() => {
    void gruppenansicht.version;
    return gruppe ? abgleich.status[gruppe] : undefined;
  });

  /** Wer ein Wort der Gruppe gefunden hat. */
  function finder(id: string): string | null {
    if (!gruppe) return null;
    const von = abgleich.kreuzwortEintrag(gruppe, id)?.von;
    return von === undefined ? null : mitglied(gruppe, von).name;
  }

  function schonGefundenText(wort: { id: string; text: string }): string {
    const wer = finder(wort.id);
    return `„${wort.text}“ ist schon gefunden${wer ? ` – von ${wer}` : ''}.`;
  }

  function setzeLaengen(text: string) {
    if (gruppe) abgleich.kreuzwortSetzen(gruppe, [['laengen', text]]);
    else lokal.laengenText = text;
  }

  function hinzufuegen() {
    const text = entwurf.trim();
    if (text.length === 0 || laengeVon(text) === 0) return;
    const schonDa = schonGefunden(zustand.woerter, text);
    if (schonDa) {
      hinweis = schonGefundenText(schonDa);
      return;
    }
    hinweis = null;
    if (gruppe) {
      const schluessel = wortschluessel(text);
      if (!schluessel) return;
      abgleich.kreuzwortSetzen(gruppe, [[schluessel, { text, eingetragen: false, zeit: Date.now() }]]);
    } else {
      lokal.woerter.push(neuesWort(text));
    }
    entwurf = '';
  }

  function entfernen(id: string) {
    if (gruppe) abgleich.kreuzwortSetzen(gruppe, [[id, null]]);
    else lokal.woerter = lokal.woerter.filter((w) => w.id !== id);
  }

  function abhaken(id: string) {
    if (gruppe) {
      const wert = wortwert(geteilt, id);
      if (wert) abgleich.kreuzwortSetzen(gruppe, [[id, { ...wert, eingetragen: !wert.eingetragen }]]);
      return;
    }
    const wort = lokal.woerter.find((w) => w.id === id);
    if (wort) wort.eingetragen = !wort.eingetragen;
  }

  function leeren() {
    if (gruppe) {
      abgleich.kreuzwortSetzen(gruppe, [
        ['laengen', null],
        ...zustand.woerter.map((w) => [w.id, null] as const)
      ]);
    } else {
      lokal = leererZustand();
    }
    hervorgehoben = null;
    leerenGefragt = false;
  }

  function hervorheben(buchstabe: string) {
    hervorgehoben = hervorgehoben === buchstabe ? null : buchstabe;
  }
</script>

{#snippet zellen(buchstaben: string[])}
  <div class="zellen">
    {#each buchstaben as buchstabe, i (i)}
      <button
        type="button"
        class="zelle"
        class:hell={hervorgehoben === buchstabe}
        onclick={() => hervorheben(buchstabe)}
      >
        <span class="buchstabe">{buchstabe}</span>
        <span class="stelle">{i + 1}</span>
      </button>
    {/each}
  </div>
{/snippet}

<p class="leise">Längen aus dem Gitter abzählen, gefundene Wörter eintippen.</p>

{#if gruppen.length > 0}
  <label class="ort">
    <span class="marke">Rätsel</span>
    <select value={gruppe ?? ''} onchange={(e) => ortWaehlen(e.currentTarget.value)}>
      <option value="">nur auf diesem Gerät</option>
      {#each gruppen as g (g.id)}
        <option value={g.id}>gemeinsam mit {g.name}</option>
      {/each}
    </select>
    {#if verbindung && (verbindung.verbindung === 'offline' || verbindung.verbindung === 'kein-zugang')}
      <span class="leise">
        {verbindung.verbindung === 'offline' ? 'offline' : 'kein Zugang'}{verbindung.ausstehend > 0
          ? ` – ${verbindung.ausstehend} ${verbindung.ausstehend === 1 ? 'Änderung wartet' : 'Änderungen warten'}`
          : ''}
      </span>
    {/if}
  </label>
{/if}

<div class="eingaben">
  <label>
    <span class="marke">Längen der gesuchten Wörter</span>
    <Textzeile
      inputmode="numeric"
      value={zustand.laengenText}
      oninput={(e) => setzeLaengen(e.currentTarget.value)}
      placeholder="z. B. 5, 7, 7, 3, 9"
      spellcheck="false"
    />
  </label>

  <label>
    <span class="marke">Gefundenes Lösungswort</span>
    <span class="zeile">
      <Textzeile
        bind:value={entwurf}
        placeholder="Wort eintippen"
        autocapitalize="characters"
        spellcheck="false"
        enter={hinzufuegen}
        oninput={() => (hinweis = null)}
      />
      <button type="button" onclick={hinzufuegen} disabled={entwurf.trim().length === 0 || Boolean(doppelt)}>
        merken
      </button>
    </span>
  </label>
</div>

{#if doppelt || hinweis}
  <p class="warnung">
    {doppelt ? schonGefundenText(doppelt) : hinweis}
  </p>
{/if}

{#if gelesen.unlesbar.length > 0}
  <p class="warnung">Keine Länge: {gelesen.unlesbar.join(', ')}</p>
{/if}

{#if plan.plaetze > 0 || plan.gefunden > 0}
  <p class="stand">
    <strong>{plan.plaetze}</strong> Lücken ·
    <strong>{plan.gefunden}</strong> gefunden ·
    <strong>{plan.eingetragen}</strong> eingetragen ·
    <strong class:gut={plan.eindeutige > 0}>{plan.eindeutige}</strong> eindeutig
  </p>
{/if}

{#if plan.ohnePlatz.length > 0 && !ohneLaengen}
  <div class="warnung block">
    <strong>Passt in keine Lücke</strong>
    {#each plan.ohnePlatz as wort (wort.id)}
      <div class="fehlzeile">
        <span class="wort">{wort.text}</span>
        <span class="leise">{laengeVon(wort.text)} Buchstaben</span>
        <button type="button" onclick={() => entfernen(wort.id)} aria-label="Wort löschen">✕</button>
      </div>
    {/each}
    <span class="leise">Länge nachzählen – oder fehlt sie oben in der Liste?</span>
  </div>
{/if}

{#if hervorgehoben}
  <button type="button" class="marker" onclick={() => (hervorgehoben = null)}>
    Buchstabe {hervorgehoben} hervorgehoben ✕
  </button>
{/if}

{#each plan.gruppen as gruppe (gruppe.laenge)}
  <section>
    <h3>
      {gruppe.laenge} Buchstaben
      <span class="leise">
        {gruppe.plaetze}
        {gruppe.plaetze === 1 ? 'Lücke' : 'Lücken'} · {gruppe.offenePlaetze} offen
      </span>
    </h3>

    {#if gruppe.zuviel > 0}
      <p class="warnung">
        {gruppe.zeilen.filter((z) => z.wort).length} Wörter auf {gruppe.plaetze}
        {gruppe.plaetze === 1 ? 'Lücke' : 'Lücken'} – {gruppe.zuviel}
        {gruppe.zuviel === 1 ? 'Wort gehört' : 'Wörter gehören'} woandershin.
      </p>
    {/if}

    {#each gruppe.zeilen as zeile, stelle (zeile.wort?.id ?? `leer-${stelle}`)}
      <div
        class="reihe"
        class:eindeutig={zeile.eindeutig}
        class:erledigt={zeile.wort?.eingetragen}
      >
        {#if zeile.wort}
          <button
            type="button"
            class="haken"
            aria-pressed={zeile.wort.eingetragen}
            aria-label={zeile.wort.eingetragen ? 'Eintrag zurücknehmen' : 'ins Gitter eingetragen'}
            onclick={() => abhaken(zeile.wort!.id)}
          >
            {zeile.wort.eingetragen ? '✓' : ''}
          </button>
          {@render zellen(zeile.buchstaben)}
          {#if zeile.eindeutig}
            <span class="fahne">eintragbar</span>
          {/if}
          <button
            type="button"
            class="weg"
            onclick={() => entfernen(zeile.wort!.id)}
            aria-label="Wort löschen"
          >
            ✕
          </button>
        {:else}
          <span class="haken leer" aria-hidden="true"></span>
          <div class="zellen">
            {#each { length: gruppe.laenge } as _, i (i)}
              <span class="zelle offen"><span class="stelle">{i + 1}</span></span>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </section>
{/each}

{#if ohneLaengen}
  {#if plan.gefunden > 0}
    <h3 class="allein">Gefunden</h3>
    {#each zustand.woerter as wort (wort.id)}
      <div class="reihe">
        <span class="zahl">{laengeVon(wort.text)}</span>
        {@render zellen(buchstaben(wort.text))}
        <button type="button" class="weg" onclick={() => entfernen(wort.id)} aria-label="Wort löschen">
          ✕
        </button>
      </div>
    {/each}
  {/if}
  <p class="leise hinweis">
    Noch keine Längen eingetragen. Im Gitter die Felder je gesuchtem Wort abzählen und
    die Zahlen oben eingeben – dann entsteht für jede Lücke eine Zeile, und die Wörter
    rücken an ihren Platz.
  </p>
{/if}

{#if plan.plaetze > 0 || plan.gefunden > 0}
  <div class="fuss">
    {#if leerenGefragt}
      <button type="button" class="ernst" onclick={leeren}>wirklich alles löschen</button>
      <button type="button" onclick={() => (leerenGefragt = false)}>abbrechen</button>
    {:else}
      <button type="button" onclick={() => (leerenGefragt = true)}>Rätsel leeren</button>
    {/if}
  </div>
{/if}

<style>
  .leise {
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  .ort {
    display: grid;
    gap: 2px;
    margin-top: 10px;
  }

  .ort select {
    font: inherit;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: 44px;
    padding: 0 8px;
    max-width: 100%;
  }

  .eingaben {
    display: grid;
    gap: 10px;
    margin: 14px 0 10px;
  }

  .marke {
    display: block;
    font-size: 0.8rem;
    color: var(--text-leise);
    margin-bottom: 2px;
  }

  .zeile {
    display: flex;
    gap: 6px;
  }

  .zeile :global(textarea) {
    flex: 1;
    min-width: 0;
  }

  .stand {
    margin: 0 0 12px;
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  .stand strong {
    color: var(--text);
  }

  .stand strong.gut {
    color: var(--akzent);
  }

  .warnung {
    color: var(--warn);
    font-size: 0.85rem;
    margin: 0 0 10px;
  }

  .warnung.block {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--warn);
    border-radius: var(--radius);
  }

  .fehlzeile {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
  }

  .fehlzeile .wort {
    flex: 1;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .marker {
    margin-bottom: 10px;
    min-height: 36px;
    font-size: 0.8rem;
    border-color: var(--akzent);
    color: var(--akzent);
  }

  section {
    margin-bottom: 18px;
  }

  h3 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 6px;
    font-size: 0.95rem;
  }

  .reihe {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    margin-bottom: 4px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
  }

  /* Was jetzt ins Gitter kann, muss man im Vorbeigehen erkennen. */
  .reihe.eindeutig {
    border-color: var(--akzent);
  }

  .reihe.erledigt {
    opacity: 0.55;
  }

  .haken {
    flex: 0 0 auto;
    min-width: 34px;
    min-height: 34px;
    padding: 0;
    font-size: 1rem;
    color: var(--akzent);
  }

  .haken.leer {
    border: 1px dashed var(--rand);
    border-radius: var(--radius);
    background: none;
    min-width: 34px;
    height: 34px;
    display: block;
  }

  .zellen {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }

  .zelle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 1.7rem;
    min-width: 0;
    min-height: 2.2rem;
    padding: 0;
    gap: 0;
    background: var(--flaeche-hoch);
    border: 1px solid var(--rand);
    border-radius: 4px;
  }

  .zelle.offen {
    background: none;
    border-style: dashed;
  }

  .zelle.hell {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .buchstabe {
    font-weight: 700;
    font-size: 0.95rem;
    line-height: 1;
  }

  /* Die Nummer steht unter jedem Feld – Kreuzungspunkte findet man zählend. */
  .stelle {
    font-size: 0.55rem;
    line-height: 1.4;
    color: var(--text-leise);
  }

  .fahne {
    flex: 0 0 auto;
    font-size: 0.7rem;
    color: var(--akzent);
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 2px 6px;
  }

  .weg {
    flex: 0 0 auto;
    min-height: 34px;
    min-width: 34px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-leise);
  }

  .hinweis {
    margin-top: 16px;
  }

  h3.allein {
    margin-top: 16px;
  }

  /* Die gezählte Länge – ohne Gitter ist sie das Einzige, was ein Wort einordnet. */
  .zahl {
    flex: 0 0 auto;
    min-width: 1.6rem;
    text-align: center;
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  .fuss {
    display: flex;
    gap: 6px;
    margin-top: 20px;
  }

  .fuss button {
    min-height: 40px;
    font-size: 0.85rem;
  }

  .ernst {
    border-color: var(--warn);
    color: var(--warn);
  }
</style>
