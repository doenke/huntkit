<script lang="ts">
  import { alleVerschiebungen } from '../codecs/caesar';
  import type { OptionWerte } from '../codecs/types';
  import { erkenne, optionenText, type Fund } from '../lib/erkennen';
  import { analysiere } from '../lib/frequenz';
  import { sprachwert } from '../lib/sprachwert';

  /**
   * Die Untersuchung einer einzelnen Zelle: Was ist das überhaupt, wie sind die
   * Buchstaben verteilt, und was ergeben alle 26 Verschiebungen?
   *
   * Jeder Treffer landet als neue Spalte im Blatt – dort gilt er dann für jede
   * Zeile, nicht nur für die eine, an der man ihn gefunden hat.
   */
  let {
    text,
    alsSpalte
  }: { text: string; alsSpalte: (codecId: string, optionen: OptionWerte) => void } = $props();

  /** Alles zusammen hinter einem Knopf – die Zellenbox bleibt sonst kurz. */
  let analyseOffen = $state(false);
  let erkennungOffen = $state(false);
  let haeufigkeitenOffen = $state(false);
  let wandOffen = $state(false);

  const funde = $derived(erkennungOffen ? erkenne(text) : []);

  /** Die 26 Verschiebungen samt Sprachwert – die beste wird hervorgehoben. */
  const wand = $derived.by(() => {
    if (!wandOffen) return [];
    const reihen = alleVerschiebungen(text).map((r) => ({ ...r, wert: sprachwert(r.text) }));
    const bester = Math.max(...reihen.map((r) => r.wert));
    return reihen.map((r) => ({ ...r, beste: bester > 0.15 && r.wert === bester }));
  });

  function uebernimmFund(fund: Fund) {
    alsSpalte(fund.codec.id, fund.optionen);
    erkennungOffen = false;
  }
</script>

<button type="button" class="aufklapp haupt" onclick={() => (analyseOffen = !analyseOffen)}>
  {analyseOffen ? '▾' : '▸'} Analyse
</button>
{#if analyseOffen}
  <div class="analysen">
    <section>
      <button type="button" class="aufklapp" onclick={() => (erkennungOffen = !erkennungOffen)}>
        {erkennungOffen ? '▾' : '▸'} Was ist das? · Code erkennen
      </button>
      {#if erkennungOffen}
        {#if funde.length === 0}
          <p class="hinweis">Dazu fällt mir nichts ein – zu kurz oder kein bekannter Code.</p>
        {:else}
          <ol class="funde">
            {#each funde as fund (fund.codec.id + optionenText(fund))}
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
            Tippen legt daraus eine Spalte für das ganze Blatt an. Der Balken zeigt, wie sehr das
            Ergebnis nach Sprache aussieht – eine Hilfe, kein Urteil.
          </p>
        {/if}
      {/if}
    </section>

    <section>
      <button type="button" class="aufklapp" onclick={() => (haeufigkeitenOffen = !haeufigkeitenOffen)}>
        {haeufigkeitenOffen ? '▾' : '▸'} Häufigkeiten · welche Art Chiffre?
      </button>
      {#if haeufigkeitenOffen}
        {@const analyse = analysiere(text)}
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

    <section>
      <button type="button" class="aufklapp" onclick={() => (wandOffen = !wandOffen)}>
        {wandOffen ? '▾' : '▸'} Brute-Force-Wand · alle 26 Verschiebungen
      </button>
      {#if wandOffen}
        {#if text.length === 0}
          <p class="hinweis">Noch kein Text da.</p>
        {:else}
          <ol class="verschiebungen">
            {#each wand as reihe (reihe.schritte)}
              <li>
                <button
                  type="button"
                  class:beste={reihe.beste}
                  onclick={() => alsSpalte('caesar', { verschiebung: reihe.schritte })}
                  title={`Sprachwert ${reihe.wert.toFixed(2)} – als Spalte anlegen`}
                >
                  <span class="nummer">{reihe.schritte}</span>
                  <span class="mono">{reihe.text}</span>
                </button>
              </li>
            {/each}
          </ol>
          <p class="hinweis">Tippen legt eine Caesar-Spalte mit dieser Verschiebung an.</p>
        {/if}
      {/if}
    </section>
  </div>
{/if}

<style>
  .haupt {
    margin-top: 10px;
  }

  /* Die einzelnen Untersuchungen eingerückt unter „Analyse“. */
  .analysen {
    padding-left: 12px;
  }

  section {
    margin-top: 0;
  }

  .aufklapp {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    border-top: 1px solid var(--rand);
    border-radius: 0;
    padding: 10px 2px;
    color: var(--text-leise);
    font-size: 0.85rem;
  }

  .hinweis {
    margin: 4px 0;
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .mono {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }

  .funde,
  .verschiebungen {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }

  .verschiebungen {
    max-height: 40vh;
    overflow-y: auto;
  }

  .funde button,
  .verschiebungen button {
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    min-height: 40px;
  }

  .verschiebungen button {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 4px 10px;
  }

  .verschiebungen .beste {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .nummer {
    flex: 0 0 1.6rem;
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .kopfzeile {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .balken {
    flex: 1 1 60px;
    height: 4px;
    background: var(--flaeche);
    border-radius: 2px;
    overflow: hidden;
  }

  .balken span {
    display: block;
    height: 100%;
    background: var(--akzent);
  }

  .vorschau {
    color: var(--text-leise);
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }

  .deutung {
    margin: 4px 0;
    font-size: 0.85rem;
  }

  .saeulen {
    list-style: none;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    margin: 8px 0 0;
    padding: 0;
    height: 120px;
    overflow-x: auto;
  }

  .saeulen li {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    flex: 1 0 1rem;
    height: 100%;
  }

  .saeule {
    display: block;
    width: 70%;
    background: var(--akzent);
    border-radius: 2px 2px 0 0;
  }

  .buchstabe {
    font-size: 0.7rem;
  }

  .anzahl {
    font-size: 0.6rem;
    color: var(--text-leise);
  }
</style>
