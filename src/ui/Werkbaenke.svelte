<script lang="ts">
  import Symbol from './Symbol.svelte';
  import Textzeile from './Textzeile.svelte';
  import type { Werkbank } from '../lib/werkbank/sammlung';

  /**
   * Verwaltung der Werkbänke am aktuellen Ort (dieses Gerät oder die aktive
   * Gruppe): wechseln, neu anlegen, kopieren, umbenennen, löschen und an
   * einen anderen Ort kopieren.
   * Nur Anzeige und Bedienung; was dabei mit der offenen Arbeit passiert,
   * entscheidet die Werkbank selbst.
   */
  let {
    werkbaenke,
    aktiv: aktivId,
    wechseln,
    neu,
    kopieren,
    entfernen,
    umbenennen,
    leeren,
    darfLoeschen = () => true,
    ziele = [],
    kopierenNach = () => {}
  }: {
    werkbaenke: Werkbank[];
    /** Die offene Werkbank. */
    aktiv: string;
    wechseln: (id: string) => void;
    neu: () => void;
    kopieren: (id: string) => void;
    entfernen: (id: string) => void;
    umbenennen: (id: string, name: string) => void;
    /** Die offene Werkbank leeren. */
    leeren: () => void;
    /** Werkbänke einer Gruppe löschen nur deren Admins. */
    darfLoeschen?: (werkbank: Werkbank) => boolean;
    /** Die anderen Orte – `null` ist dieses Gerät. */
    ziele?: Array<{ id: string | null; name: string }>;
    /** Die offene Werkbank als Kopie an einen anderen Ort legen. */
    kopierenNach?: (gruppe: string | null) => void;
  } = $props();

  /** Rückfrage vor Leeren oder Löschen – je Werkbank höchstens eine. */
  let gefragt = $state<{ id: string; was: 'leeren' | 'loeschen' } | null>(null);

  let umbenennend = $state<string | null>(null);
  let neuerName = $state('');

  // Zuletzt bearbeitete oben – die sucht man meistens.
  const liste = $derived([...werkbaenke].sort((a, b) => b.geaendert - a.geaendert));

  function zeit(ms: number): string {
    const datum = new Date(ms);
    const heute = new Date();
    const gleicherTag = datum.toDateString() === heute.toDateString();
    return gleicherTag
      ? `heute ${datum.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
      : datum.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function zeilen(werkbank: Werkbank): string {
    const anzahl = werkbank.blatt.zeilen.length;
    return anzahl === 1 ? '1 Zeile' : `${anzahl} Zeilen`;
  }

  function umbenennenBeginnen(werkbank: Werkbank) {
    umbenennend = werkbank.id;
    neuerName = werkbank.name;
    gefragt = null;
  }

  function umbenennenFertig() {
    if (umbenennend && neuerName.trim()) umbenennen(umbenennend, neuerName.trim());
    umbenennend = null;
  }
</script>

<section class="verwaltung">
  <div class="kopf">
    <strong>Werkbänke</strong>
    <button type="button" class="neu" onclick={neu}>+ Neu</button>
  </div>

  <!--
    Eine Zeile je Werkbank: links der Name zum Wechseln, rechts kleine
    Symbol-Knöpfe. Leeren und an einen anderen Ort kopieren gibt es nur an der
    offenen Werkbank, denn beides betrifft die Arbeit, die man vor sich hat.
  -->
  <ul>
    {#each liste as werkbank (werkbank.id)}
      {@const aktiv = werkbank.id === aktivId}
      {@const frage = gefragt?.id === werkbank.id ? gefragt.was : null}
      <li class:aktiv>
        {#if umbenennend === werkbank.id}
          <div class="umbenennen">
            <Textzeile bind:value={neuerName} aria-label="Neuer Name" enter={umbenennenFertig} />
            <button type="button" onclick={umbenennenFertig}>fertig</button>
          </div>
        {:else}
          <button type="button" class="wahl" onclick={() => wechseln(werkbank.id)} aria-current={aktiv}>
            <span class="name">{werkbank.name}</span>
            <span class="info">
              {zeilen(werkbank)} · {zeit(werkbank.geaendert)}
              {#if aktiv}<span class="offen">· offen</span>{/if}
            </span>
          </button>

          <div class="symbole">
            {#if frage}
              <button
                type="button"
                class="ernst klein"
                onclick={() => {
                  if (frage === 'leeren') leeren();
                  else entfernen(werkbank.id);
                  gefragt = null;
                }}
              >
                {frage === 'leeren' ? 'leeren' : werkbank.gruppe ? 'für alle löschen' : 'löschen'}
              </button>
              <button type="button" class="klein" onclick={() => (gefragt = null)}>abbrechen</button>
            {:else}
              {#if aktiv}
                <button
                  type="button"
                  class="symbol"
                  onclick={() => (gefragt = { id: werkbank.id, was: 'leeren' })}
                  aria-label="Blatt leeren"
                  title="Blatt leeren"
                >
                  <Symbol name="radierer" />
                </button>
                {#if ziele.length > 0}
                  <!-- Die Auswahl liegt unsichtbar über dem Symbol: ein Tipp öffnet die Liste der Orte. -->
                  <label class="symbol auswahl" title="Kopieren nach …">
                    <Symbol name="gruppe" />
                    <select
                      aria-label="Offene Werkbank an einen anderen Ort kopieren"
                      value=""
                      onchange={(e) => {
                        const stelle = e.currentTarget.value;
                        e.currentTarget.value = '';
                        const ziel = stelle === '' ? undefined : ziele[Number(stelle)];
                        if (ziel) kopierenNach(ziel.id);
                      }}
                    >
                      <option value="">Kopieren nach …</option>
                      {#each ziele as z, i (z.id ?? '')}
                        <option value={String(i)}>{z.name}</option>
                      {/each}
                    </select>
                  </label>
                {/if}
              {/if}
              <button
                type="button"
                class="symbol"
                onclick={() => umbenennenBeginnen(werkbank)}
                aria-label={`${werkbank.name} umbenennen`}
                title="umbenennen"
              >
                <Symbol name="stift" />
              </button>
              <button
                type="button"
                class="symbol"
                onclick={() => kopieren(werkbank.id)}
                aria-label={`${werkbank.name} kopieren`}
                title="Kopie anlegen"
              >
                <Symbol name="kopie" />
              </button>
              {#if darfLoeschen(werkbank)}
                <button
                  type="button"
                  class="symbol weg"
                  onclick={() => { gefragt = { id: werkbank.id, was: 'loeschen' }; umbenennend = null; }}
                  aria-label={werkbank.gruppe ? `${werkbank.name} für die ganze Gruppe löschen` : `${werkbank.name} löschen`}
                  title={werkbank.gruppe ? 'für die ganze Gruppe löschen' : 'löschen'}
                >
                  <Symbol name="papierkorb" />
                </button>
              {/if}
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .verwaltung {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 8px 10px 10px;
    margin-bottom: 12px;
  }

  .kopf {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .kopf strong {
    margin-right: auto;
  }

  .neu {
    min-height: 34px;
    padding: 0 10px;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    padding: 2px 4px 2px 2px;
  }

  li.aktiv {
    border-color: var(--akzent);
  }

  .wahl {
    flex: 1 1 8rem;
    min-width: 0;
    display: grid;
    gap: 0;
    text-align: left;
    border: none;
    background: none;
    padding: 4px 6px;
    min-height: 44px;
  }

  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .info {
    color: var(--text-leise);
    font-size: 0.72rem;
  }

  .offen {
    color: var(--akzent);
  }

  /* Rechtsbündig in der Zeile des Namens; bricht nur um, wenn es gar nicht passt. */
  .symbole {
    display: flex;
    gap: 2px;
    margin-left: auto;
    align-items: center;
  }

  .symbol {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    min-height: 34px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-leise);
    border-radius: 8px;
    cursor: pointer;
  }

  .symbol:hover,
  .symbol:focus-within {
    color: var(--text);
    background: var(--flaeche-hoch);
  }

  .symbol.weg:hover {
    color: var(--warn);
  }

  .auswahl select {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .klein {
    min-height: 32px;
    padding: 0 10px;
    font-size: 0.78rem;
  }

  .ernst {
    border-color: var(--warn);
    color: var(--warn);
  }

  .umbenennen {
    flex: 1 1 100%;
    display: flex;
    gap: 6px;
    align-items: flex-start;
    padding: 2px;
  }

  .umbenennen :global(textarea) {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    padding: 9px 8px;
  }

  .umbenennen button {
    min-height: 40px;
  }
</style>
