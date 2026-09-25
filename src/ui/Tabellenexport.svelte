<script lang="ts">
  import type { Blatt } from '../lib/werkbank/blatt';
  import { ZIELE, type Ziel } from '../lib/werkbank/formel';
  import { tabelleFuerZwischenablage } from '../lib/werkbank/tabellenexport';

  /**
   * Die ganze Werkbank in die Zwischenablage – zum Einfügen in Excel oder
   * Google Sheets. Das Ziel entscheidet über die Schreibweise der Formeln:
   * deutsches Excel will LÄNGE und Semikolon, englisches LEN und Komma.
   */
  let { blatt }: { blatt: Blatt } = $props();

  const SPEICHER = 'huntkit:tabellenziel';

  function gespeichertesZiel(): Ziel {
    try {
      const wert = localStorage.getItem(SPEICHER);
      if (ZIELE.some((z) => z.id === wert)) return wert as Ziel;
    } catch {
      // Dann eben der Standard.
    }
    return 'excel-de';
  }

  let ziel = $state<Ziel>(gespeichertesZiel());
  let meldung = $state<{ gut: boolean; text: string } | null>(null);

  function waehle(neu: Ziel) {
    ziel = neu;
    meldung = null;
    try {
      localStorage.setItem(SPEICHER, neu);
    } catch {
      // Nicht schlimm – beim nächsten Mal steht wieder der Standard da.
    }
  }

  /** Über die Clipboard-API – und wo es die nicht gibt, über ein verstecktes Textfeld. */
  async function inZwischenablage(inhalt: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(inhalt);
      return true;
    } catch {
      const feld = document.createElement('textarea');
      feld.value = inhalt;
      feld.setAttribute('readonly', '');
      feld.style.position = 'fixed';
      feld.style.opacity = '0';
      document.body.append(feld);
      feld.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      } finally {
        feld.remove();
      }
    }
  }

  async function kopieren() {
    const ergebnis = tabelleFuerZwischenablage(blatt, ziel);
    if (!(await inZwischenablage(ergebnis.text))) {
      meldung = { gut: false, text: 'Die Zwischenablage ist hier gesperrt.' };
      return;
    }
    const teile = [`${ergebnis.zeilen} ${ergebnis.zeilen === 1 ? 'Zeile' : 'Zeilen'}`];
    if (ergebnis.formeln > 0) teile.push(`${ergebnis.formeln} ${ergebnis.formeln === 1 ? 'Formel' : 'Formeln'}`);
    meldung = { gut: true, text: `Kopiert: ${teile.join(', ')}. In Zelle A1 einfügen.` };
  }
</script>

<section class="export" data-box>
  <strong>In Tabelle kopieren</strong>
  <label>
    <span class="marke">für</span>
    <select value={ziel} onchange={(e) => waehle(e.currentTarget.value as Ziel)}>
      {#each ZIELE as eintrag (eintrag.id)}
        <option value={eintrag.id}>{eintrag.titel}</option>
      {/each}
    </select>
  </label>
  <button type="button" class="haupt" onclick={kopieren}>kopieren</button>
  {#if meldung}
    <p class="meldung" class:warn={!meldung.gut}>{meldung.text}</p>
  {:else}
    <p class="leise">
      Werkzeuge werden zu Formeln, wo es geht – dafür braucht es Excel 2021/365 oder Google
      Sheets. Codes und alles andere kommen als Text.
    </p>
  {/if}
</section>

<style>
  .export {
    margin: 0 0 12px;
    display: grid;
    gap: 8px;
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
  }

  label {
    display: grid;
    gap: 2px;
  }

  .marke {
    color: var(--text-leise);
    font-size: 0.78rem;
  }

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

  .haupt {
    min-height: 44px;
    border-color: var(--akzent);
    color: var(--akzent);
  }

  p {
    margin: 0;
    font-size: 0.8rem;
  }

  .leise {
    color: var(--text-leise);
  }

  .meldung {
    color: var(--akzent);
  }

  .meldung.warn {
    color: var(--warn);
  }
</style>
