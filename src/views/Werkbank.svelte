<script lang="ts">
  import { alleVerschiebungen } from '../codecs/caesar';
  import { CODECS, codec } from '../codecs/registry';
  import { erkenne, optionenText, type Fund } from '../lib/erkennen';
  import { sprachwert } from '../lib/sprachwert';
  import { analysiere } from '../lib/frequenz';
  import { alsLink, ausAdresse } from '../lib/teilen';
  import {
    anwenden,
    laden,
    leererZustand,
    neuerSchritt,
    sichern,
    type Werkbankzustand
  } from '../lib/werkbank';
  import Optionen from '../ui/Optionen.svelte';
  import Textfeld from '../ui/Textfeld.svelte';

  let zustand = $state<Werkbankzustand>(laden());
  let wandOffen = $state(false);
  let erkennungOffen = $state(false);
  let haeufigkeitenOffen = $state(false);
  let linkStand = $state('');

  // Ein geteilter Link bringt einen fertigen Stand mit; er hat Vorrang vor dem,
  // was zuletzt auf diesem Gerät offen war.
  $effect(() => {
    void ausAdresse().then((geteilt) => {
      if (geteilt) zustand = geteilt;
    });
  });

  const staende = $derived(anwenden(zustand));
  const ergebnis = $derived(staende[staende.length - 1]);
  const funde = $derived(erkennungOffen ? erkenne(ergebnis?.text ?? '') : []);

  /** Die 26 Verschiebungen samt Sprachwert – der beste wird hervorgehoben. */
  const wand = $derived.by(() => {
    if (!wandOffen) return [];
    const reihen = alleVerschiebungen(ergebnis?.text ?? '').map((r) => ({
      ...r,
      wert: sprachwert(r.text)
    }));
    const bester = Math.max(...reihen.map((r) => r.wert));
    return reihen.map((r) => ({ ...r, beste: bester > 0.15 && r.wert === bester }));
  });

  $effect(() => {
    sichern(zustand);
  });

  function hinzufuegen(event: Event) {
    const ziel = event.currentTarget as HTMLSelectElement;
    if (!ziel.value) return;
    zustand.schritte.push(neuerSchritt(ziel.value));
    ziel.value = '';
  }

  function schiebe(index: number, um: number) {
    const neu = index + um;
    if (neu < 0 || neu >= zustand.schritte.length) return;
    const [schritt] = zustand.schritte.splice(index, 1);
    if (schritt) zustand.schritte.splice(neu, 0, schritt);
  }

  function uebernehmen(text: string) {
    zustand.eingabe = text;
    zustand.schritte = [];
  }

  function leeren() {
    zustand = leererZustand();
  }

  async function linkTeilen() {
    const link = await alsLink(zustand);
    try {
      await navigator.clipboard.writeText(link);
      linkStand = 'Link kopiert';
    } catch {
      linkStand = link;
    }
    setTimeout(() => (linkStand = ''), 4000);
  }

  /** Einen Vorschlag der Erkennung als Schritt übernehmen. */
  function uebernimmFund(fund: Fund) {
    const schritt = neuerSchritt(fund.codec.id);
    schritt.optionen = { ...fund.optionen };
    zustand.schritte.push(schritt);
    erkennungOffen = false;
  }
</script>

<h2>Werkbank</h2>

<label class="eingabe">
  <span>Eingabe</span>
  <textarea
    bind:value={zustand.eingabe}
    rows="3"
    placeholder="Text, Morse, Zahlen – was auch immer vor dir liegt"
    spellcheck="false"
    autocapitalize="off"
    autocomplete="off"
  ></textarea>
</label>

<ol class="kette">
  {#each zustand.schritte as schritt, index (schritt.id)}
    {@const gewaehlt = codec(schritt.codecId)}
    {@const stand = staende[index + 1]}
    <li class:aus={!schritt.aktiv}>
      <div class="zeile">
        <strong>{gewaehlt?.name ?? schritt.codecId}</strong>
        <div class="steuerung">
          {#if !gewaehlt?.einseitig}
            <button
              type="button"
              onclick={() => (schritt.richtung = schritt.richtung === 'decode' ? 'encode' : 'decode')}
              title="Richtung umschalten"
            >
              {schritt.richtung === 'decode' ? 'entschlüsseln' : 'verschlüsseln'}
            </button>
          {/if}
          <button
            type="button"
            aria-pressed={!schritt.aktiv}
            onclick={() => (schritt.aktiv = !schritt.aktiv)}
            title="Schritt aus- oder einschalten"
          >
            {schritt.aktiv ? 'an' : 'aus'}
          </button>
          <button type="button" onclick={() => schiebe(index, -1)} title="nach oben">↑</button>
          <button type="button" onclick={() => schiebe(index, 1)} title="nach unten">↓</button>
          <button type="button" onclick={() => zustand.schritte.splice(index, 1)} title="entfernen">
            ✕
          </button>
        </div>
      </div>

      {#if gewaehlt?.optionen}
        <div class="optionen">
          <Optionen codec={gewaehlt} werte={schritt.optionen} />
        </div>
      {/if}

      {#if stand?.fehlt}
        <p class="hinweis">Diesen Code gibt es nicht (mehr).</p>
      {:else if stand}
        <output class="mono zwischen">{stand.text}</output>
        {#if stand.luecken.length > 0}
          <p class="hinweis">
            {stand.luecken.length}
            {stand.luecken.length === 1 ? 'Zeichen' : 'Zeichen'} nicht übersetzbar:
            <span class="mono">{stand.luecken.map((l) => l.zeichen).join(' ')}</span>
          </p>
        {/if}
      {/if}
    </li>
  {/each}
</ol>

<div class="anbau">
  <select onchange={hinzufuegen} aria-label="Schritt hinzufügen">
    <option value="">Schritt hinzufügen …</option>
    {#each CODECS.filter((c) => !c.nurNachschlagen) as eintrag (eintrag.id)}
      <option value={eintrag.id}>{eintrag.name}</option>
    {/each}
  </select>
  {#if zustand.schritte.length > 0 || zustand.eingabe.length > 0}
    <button type="button" onclick={leeren}>alles leeren</button>
    <button type="button" onclick={linkTeilen}>Link teilen</button>
  {/if}
</div>

<Textfeld text={ergebnis?.text ?? ''} uebernehmen={() => uebernehmen(ergebnis?.text ?? '')} />

{#if linkStand}
  <p class="linkstand mono">{linkStand}</p>
{/if}

<section class="erkennung">
  <button type="button" class="aufklapp" onclick={() => (erkennungOffen = !erkennungOffen)}>
    {erkennungOffen ? '▾' : '▸'} Was ist das? · Code erkennen
  </button>
  {#if erkennungOffen}
    {#if funde.length === 0}
      <p class="hinweis">Dazu fällt mir nichts ein – zu kurz oder kein bekannter Code.</p>
    {:else}
      <ol class="funde">
        {#each funde as fund (fund.codec.id)}
          <li>
            <button type="button" onclick={() => uebernimmFund(fund)}>
              <span class="kopfzeile">
                <strong>{fund.codec.name}</strong>
                {#if optionenText(fund)}<span class="leise">{optionenText(fund)}</span>{/if}
                <span class="balken" aria-hidden="true">
                  <span style="width: {Math.round(fund.bewertung * 100)}%"></span>
                </span>
              </span>
              <span class="mono vorschau">{fund.text.slice(0, 90)}</span>
            </button>
          </li>
        {/each}
      </ol>
      <p class="hinweis">
        Tippen fügt den Schritt hinzu. Der Balken zeigt, wie sehr das Ergebnis nach Sprache
        aussieht – eine Hilfe, kein Urteil.
      </p>
    {/if}
  {/if}
</section>

<section class="erkennung">
  <button type="button" class="aufklapp" onclick={() => (haeufigkeitenOffen = !haeufigkeitenOffen)}>
    {haeufigkeitenOffen ? '▾' : '▸'} Häufigkeiten · welche Art Chiffre?
  </button>
  {#if haeufigkeitenOffen}
    {@const analyse = analysiere(ergebnis?.text ?? '')}
    <p class="hinweis">
      {analyse.laenge} Buchstaben · Koinzidenzindex {analyse.koinzidenz.toFixed(3)}
    </p>
    <p class="deutung">{analyse.deutung}</p>
    <ol class="saeulen">
      {#each analyse.haeufigkeiten.slice(0, 26) as eintrag (eintrag.zeichen)}
        <li>
          <span class="saeule" style="height: {Math.round(eintrag.anteil * 400)}px"></span>
          <span class="buchstabe">{eintrag.zeichen}</span>
          <span class="anzahl">{eintrag.anzahl}</span>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<section class="wand">
  <button type="button" class="aufklapp" onclick={() => (wandOffen = !wandOffen)}>
    {wandOffen ? '▾' : '▸'} Brute-Force-Wand · alle 26 Verschiebungen
  </button>
  {#if wandOffen}
    {#if (ergebnis?.text ?? '').length === 0}
      <p class="hinweis">Noch kein Text da.</p>
    {:else}
      <ol class="verschiebungen">
        {#each wand as reihe (reihe.schritte)}
          <li>
            <button
              type="button"
              class:beste={reihe.beste}
              onclick={() => uebernehmen(reihe.text)}
              title={`Sprachwert ${reihe.wert.toFixed(2)} – als Eingabe übernehmen`}
            >
              <span class="nummer">{reihe.schritte}</span>
              <span class="mono">{reihe.text}</span>
            </button>
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</section>

<style>
  .eingabe {
    display: block;
    margin-bottom: 16px;
  }

  .eingabe span {
    display: block;
    margin-bottom: 4px;
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  textarea {
    width: 100%;
    font: inherit;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    padding: 10px;
    resize: vertical;
  }

  .kette {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .kette li {
    border: 1px solid var(--rand);
    border-left: 3px solid var(--akzent);
    border-radius: var(--radius);
    background: var(--flaeche);
    padding: 10px;
  }

  .kette li.aus {
    border-left-color: var(--rand);
    opacity: 0.55;
  }

  .zeile {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .steuerung {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .steuerung button {
    min-height: 40px;
    min-width: 40px;
    padding: 0 8px;
    font-size: 0.85rem;
  }

  .optionen {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
  }

  .zwischen {
    display: block;
    margin-top: 8px;
    padding: 8px;
    background: var(--grund);
    border-radius: 8px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .hinweis {
    margin: 8px 0 0;
    color: var(--warn);
    font-size: 0.85rem;
  }

  .anbau {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  select {
    font: inherit;
    color: var(--text);
    background: var(--flaeche-hoch);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: var(--tap);
    padding: 0 10px;
  }

  .wand {
    margin-top: 20px;
  }

  .aufklapp {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--text-leise);
    padding: 0 0 8px;
  }

  .verschiebungen {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }

  .verschiebungen button {
    display: flex;
    gap: 10px;
    width: 100%;
    text-align: left;
    background: var(--flaeche);
    border-radius: 6px;
    min-height: 40px;
    align-items: center;
    overflow-wrap: anywhere;
  }

  .nummer {
    flex: 0 0 2rem;
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .verschiebungen button.beste {
    background: var(--flaeche-hoch);
    border-left: 3px solid var(--akzent);
  }

  .erkennung {
    margin-top: 20px;
  }

  .funde {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .funde button {
    display: grid;
    gap: 4px;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    min-height: 0;
  }

  .kopfzeile {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .balken {
    flex: 1 0 60px;
    height: 6px;
    border-radius: 3px;
    background: var(--grund);
    overflow: hidden;
  }

  .balken span {
    display: block;
    height: 100%;
    background: var(--akzent);
  }

  .linkstand {
    color: var(--text-leise);
    font-size: 0.8rem;
    overflow-wrap: anywhere;
    margin: 0 0 12px;
  }

  .deutung {
    margin: 0 0 10px;
    font-size: 0.9rem;
  }

  .saeulen {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: flex-end;
    gap: 3px;
    overflow-x: auto;
  }

  .saeulen li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 1.3rem;
  }

  .saeule {
    display: block;
    width: 100%;
    min-height: 2px;
    max-height: 90px;
    background: var(--akzent);
    border-radius: 2px 2px 0 0;
  }

  .buchstabe {
    font-size: 0.75rem;
  }

  .anzahl {
    font-size: 0.65rem;
    color: var(--text-leise);
  }

  .vorschau {
    color: var(--text-leise);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
</style>
