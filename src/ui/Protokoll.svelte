<script lang="ts">
  import { spaltenname, type Blatt } from '../lib/blatt';
  import { rufe, type Protokolleintrag } from '../lib/gruppe/api';
  import { abgleich, mitglied } from '../lib/gruppe/gruppen.svelte';
  import { ausZellschluessel } from '../lib/gruppe/schluessel';
  import Avatar from './Avatar.svelte';

  /**
   * Wer hat was geändert – für die ganze Werkbank oder eine einzelne Zelle.
   * Kommt vom Server und braucht deshalb Verbindung.
   */
  let {
    gruppe,
    werkbank,
    blatt,
    schluessel
  }: { gruppe: string; werkbank: string; blatt: Blatt; schluessel?: string } = $props();

  let eintraege = $state<Protokolleintrag[]>([]);
  let laedt = $state(false);
  let fehler = $state('');
  let ende = $state(false);

  async function laden(weiter = false) {
    laedt = true;
    fehler = '';
    try {
      const vor = weiter ? (eintraege[eintraege.length - 1]?.seq ?? 0) : 0;
      const parameter = new URLSearchParams({ gruppe, werkbank, anzahl: '50' });
      if (schluessel) parameter.set('schluessel', schluessel);
      if (vor) parameter.set('vor', String(vor));
      const antwort = await rufe<{ eintraege: Protokolleintrag[] }>(`protokoll.php?${parameter}`, {
        token: abgleich.tokenFuer(gruppe)
      });
      eintraege = weiter ? [...eintraege, ...antwort.eintraege] : antwort.eintraege;
      ende = antwort.eintraege.length < 50;
    } catch (e) {
      fehler = e instanceof Error ? e.message : String(e);
    } finally {
      laedt = false;
    }
  }

  $effect(() => {
    void gruppe;
    void werkbank;
    void schluessel;
    void laden();
  });

  function zeit(ms: number): string {
    const d = new Date(ms);
    const heute = d.toDateString() === new Date().toDateString();
    return heute
      ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function zeilennummer(id: string): string {
    const z = blatt.zeilen.find((r) => r.id === id);
    return z ? String(z.nummer) : '(gelöscht)';
  }

  /** In Worten, was ein Schlüssel ist. */
  function was(e: Protokolleintrag): string {
    const zelle = ausZellschluessel(e.schluessel);
    if (zelle) {
      const spalte = blatt.spalten.some((s) => s.id === zelle.spalte) ? spaltenname(blatt, zelle.spalte) : '(Spalte gelöscht)';
      return `${spalte} · Zeile ${zeilennummer(zelle.zeile)}`;
    }
    if (e.schluessel === 'name') return 'Name der Werkbank';
    if (e.schluessel === 'spalten') return 'Reihenfolge der Spalten';
    if (e.schluessel === 'geloescht') return 'Werkbank gelöscht';
    if (e.schluessel.startsWith('spalte/')) {
      const id = e.schluessel.slice(7);
      const name = blatt.spalten.some((s) => s.id === id) ? `Spalte ${spaltenname(blatt, id)}` : 'eine Spalte';
      return e.alt === null ? `${name} angelegt` : e.neu === null ? `${name} gelöscht` : `${name} eingestellt`;
    }
    if (e.schluessel.startsWith('zeile/')) {
      const nummer = ((e.neu ?? e.alt) as { nummer?: number } | null)?.nummer;
      return e.alt === null ? `Zeile ${nummer ?? ''} angelegt` : e.neu === null ? `Zeile ${nummer ?? ''} gelöscht` : `Zeile ${nummer ?? ''} verschoben`;
    }
    return e.schluessel;
  }

  /** Nur Texte zeigen wir als „vorher → nachher“; Spalten und Zeilen sagt `was` schon. */
  function text(wert: unknown): string | null {
    return typeof wert === 'string' ? wert : null;
  }
</script>

<div class="protokoll">
  {#if fehler}
    <p class="fehler">{fehler}</p>
  {/if}
  {#if eintraege.length === 0 && !laedt && !fehler}
    <p class="leise">Noch keine Änderungen.</p>
  {/if}
  <ol>
    {#each eintraege as e (e.seq)}
      {@const m = mitglied(gruppe, e.von)}
      <li>
        <Avatar name={m.name} bild={m.avatar ?? null} groesse={24} />
        <div class="inhalt">
          <div class="kopf">
            <strong>{m.name}</strong>
            <span class="leise">{zeit(e.zeit)}</span>
          </div>
          {#if !schluessel}<div class="was">{was(e)}</div>{/if}
          {#if text(e.neu) !== null || text(e.alt) !== null}
            <div class="werte mono">
              {#if text(e.alt)}<del>{text(e.alt)}</del>{/if}
              {#if text(e.alt) && text(e.neu)}<span aria-hidden="true">→</span>{/if}
              {#if text(e.neu)}<ins>{text(e.neu)}</ins>{:else if e.neu === null}<span class="leise">geleert</span>{/if}
            </div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
  {#if laedt}
    <p class="leise">lädt …</p>
  {:else if !ende && eintraege.length > 0}
    <button type="button" onclick={() => void laden(true)}>ältere zeigen</button>
  {/if}
</div>

<style>
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  li {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .inhalt {
    min-width: 0;
    flex: 1 1 auto;
    font-size: 0.85rem;
  }

  .kopf {
    display: flex;
    gap: 8px;
    align-items: baseline;
    flex-wrap: wrap;
  }

  .was {
    color: var(--text-leise);
  }

  .werte {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: baseline;
    overflow-wrap: anywhere;
  }

  del {
    color: var(--text-leise);
  }

  ins {
    text-decoration: none;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.78rem;
  }

  .fehler {
    color: var(--warn);
    font-size: 0.85rem;
  }

  button {
    margin-top: 8px;
    min-height: 36px;
    font-size: 0.8rem;
  }
</style>
