<script lang="ts">
  import { nachtschicht, raetselnacht } from '../codecs/quellen';
  import Quellen from './Quellen.svelte';
  import Textzeile from './Textzeile.svelte';
  import { alsText, FARBEN, farbe, ringeFuer, wert } from '../lib/nachschlagen/widerstand';

  let anzahl = $state<4 | 5 | 6>(4);
  let ringe = $state<string[]>(['blau', 'grau', 'rot', 'gold', 'braun', 'rot']);
  let gesucht = $state('');

  const aktiv = $derived(ringe.slice(0, anzahl));
  const ergebnis = $derived(wert(aktiv));

  /** Welche Farben darf dieser Ring tragen? */
  function erlaubt(stelle: number) {
    const ziffern = anzahl >= 5 ? 3 : 2;
    if (stelle < ziffern) return FARBEN.filter((f) => f.ziffer !== null);
    if (stelle === ziffern) return FARBEN.filter((f) => f.multiplikator !== null);
    if (stelle === ziffern + 1) return FARBEN.filter((f) => f.toleranz !== null);
    return FARBEN.filter((f) => f.temperatur !== null);
  }

  function beschriftung(stelle: number): string {
    const ziffern = anzahl >= 5 ? 3 : 2;
    if (stelle < ziffern) return `${stelle + 1}. Ziffer`;
    if (stelle === ziffern) return 'Multiplikator';
    if (stelle === ziffern + 1) return 'Toleranz';
    return 'Temperaturbeiwert';
  }

  function ausWert() {
    const zahl = Number(gesucht.replace(',', '.').replace(/[^\d.]/g, ''));
    const einheit = /k/i.test(gesucht) ? 1e3 : /m/i.test(gesucht) ? 1e6 : /g/i.test(gesucht) ? 1e9 : 1;
    const vorschlag = ringeFuer(zahl * einheit, anzahl === 5 ? 5 : 4);
    if (!vorschlag) return;
    anzahl = vorschlag.length === 5 ? 5 : 4;
    ringe = [...vorschlag, ringe[4] ?? 'braun', ringe[5] ?? 'rot'];
  }
</script>

<div class="gruppe">
  {#each [4, 5, 6] as n (n)}
    <button type="button" aria-pressed={anzahl === n} onclick={() => (anzahl = n as 4 | 5 | 6)}>
      {n} Ringe
    </button>
  {/each}
</div>

<svg viewBox="0 0 240 70" class="bauteil" role="img" aria-label="Widerstand mit den gewählten Ringen">
  <line x1="0" y1="35" x2="240" y2="35" stroke="var(--text-leise)" stroke-width="3" />
  <rect x="48" y="14" width="144" height="42" rx="14" fill="#d8c9a3" />
  {#each aktiv as ring, i (i)}
    <rect
      x={64 + i * (anzahl === 6 ? 21 : anzahl === 5 ? 25 : 32)}
      y="14"
      width="12"
      height="42"
      fill={farbe(ring)?.hex ?? '#888'}
    />
  {/each}
</svg>

<output class="ergebnis">
  {#if ergebnis}
    <strong>{alsText(ergebnis.ohm)}</strong>
    {#if ergebnis.toleranz !== null}<span> ± {String(ergebnis.toleranz).replace('.', ',')} %</span>{/if}
    {#if ergebnis.temperatur !== null}<span> · {ergebnis.temperatur} ppm/K</span>{/if}
  {:else}
    <span class="leise">Diese Ringfolge ergibt keinen gültigen Wert.</span>
  {/if}
</output>

<div class="ringe">
  {#each aktiv as ring, stelle (stelle)}
    <label>
      <span class="leise">{beschriftung(stelle)}</span>
      <span class="wahl">
        <span class="punkt" style="background: {farbe(ring)?.hex}"></span>
        <select
          value={ring}
          onchange={(e) => (ringe[stelle] = e.currentTarget.value)}
          aria-label={beschriftung(stelle)}
        >
          {#each erlaubt(stelle) as f (f.name)}
            <option value={f.name}>{f.name}</option>
          {/each}
        </select>
      </span>
    </label>
  {/each}
</div>

<h3>Umgekehrt</h3>
<div class="gruppe">
  <Textzeile
    bind:value={gesucht}
    placeholder="z.B. 6,8k oder 470000"
    aria-label="Widerstandswert"
    spellcheck="false"
    enter={ausWert}
  />
  <button type="button" onclick={ausWert}>Ringe zeigen</button>
</div>

<Quellen quellen={[nachtschicht('O', 'Farbcode von Widerständen'), { titel: 'Wikimedia Commons: Farbcode von Widerständen (Knarfili, CC0)', url: 'https://commons.wikimedia.org/wiki/File:Farbcode_von_Widerst%C3%A4nden.svg' }, raetselnacht('E', 'Widerstands-Farbkodierung')]} />

<style>
  .gruppe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 12px;
  }

  .gruppe :global(textarea) {
    flex: 1 1 10rem;
    width: auto;
    padding-left: 10px;
    padding-right: 10px;
  }

  .gruppe button {
    min-height: 44px;
    font-size: 0.9rem;
  }

  button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .bauteil {
    display: block;
    width: 100%;
    max-width: 22rem;
    margin: 0 auto 12px;
  }

  .ergebnis {
    display: block;
    text-align: center;
    font-size: 1.3rem;
    padding: 10px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    margin-bottom: 14px;
  }

  .ringe {
    display: grid;
    gap: 8px;
    margin-bottom: 8px;
  }

  .ringe label {
    display: grid;
    gap: 3px;
  }

  .wahl {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .punkt {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid var(--rand);
    flex: 0 0 auto;
  }

  select {
    font: inherit;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: var(--tap);
    padding: 0 10px;
    flex: 1;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  h3 {
    margin: 20px 0 8px;
    font-size: 0.95rem;
  }
</style>
