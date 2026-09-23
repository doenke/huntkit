<script lang="ts">
  import Textzeile from './Textzeile.svelte';
  import type { Sammlung, Werkbank } from '../lib/sammlung';

  /**
   * Verwaltung der gespeicherten Werkbänke: wechseln, neu anlegen, kopieren,
   * umbenennen, löschen, verschicken – und ob automatisch gespeichert wird.
   * Nur Anzeige und Bedienung; was dabei mit der offenen Arbeit passiert,
   * entscheidet die Werkbank selbst.
   */
  let {
    sammlung,
    wechseln,
    neu,
    kopieren,
    entfernen,
    umbenennen,
    verschicken,
    automatikUmschalten,
    leeren
  }: {
    sammlung: Sammlung;
    wechseln: (id: string) => void;
    neu: () => void;
    kopieren: (id: string) => void;
    entfernen: (id: string) => void;
    umbenennen: (id: string, name: string) => void;
    verschicken: (id: string) => void;
    automatikUmschalten: () => void;
    /** Die offene Werkbank leeren. */
    leeren: () => void;
  } = $props();

  let leerenGefragt = $state(false);
  const offene = $derived(sammlung.werkbaenke.find((w) => w.id === sammlung.aktiv));

  let umbenennend = $state<string | null>(null);
  let neuerName = $state('');
  let loeschenGefragt = $state<string | null>(null);

  // Zuletzt bearbeitete oben – die sucht man meistens.
  const liste = $derived([...sammlung.werkbaenke].sort((a, b) => b.geaendert - a.geaendert));

  function zeit(ms: number): string {
    const datum = new Date(ms);
    const heute = new Date();
    const gleicherTag = datum.toDateString() === heute.toDateString();
    return gleicherTag
      ? `heute ${datum.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
      : datum.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function zeilen(werkbank: Werkbank): string {
    const anzahl = (werkbank.entwurf ?? werkbank.blatt).zeilen.length;
    return anzahl === 1 ? '1 Zeile' : `${anzahl} Zeilen`;
  }

  function umbenennenBeginnen(werkbank: Werkbank) {
    umbenennend = werkbank.id;
    neuerName = werkbank.name;
    loeschenGefragt = null;
  }

  function umbenennenFertig() {
    if (umbenennend && neuerName.trim()) umbenennen(umbenennend, neuerName.trim());
    umbenennend = null;
  }
</script>

<section class="verwaltung">
  <div class="kopf">
    <strong>Werkbänke</strong>
    <button type="button" onclick={neu}>+ Neue Werkbank</button>
  </div>

  {#if offene}
    <div class="offene">
      <span class="marke">Offen: {offene.name}</span>
      <div class="knoepfe">
        {#if leerenGefragt}
          <button type="button" class="ernst" onclick={() => { leeren(); leerenGefragt = false; }}>
            wirklich alles löschen
          </button>
          <button type="button" onclick={() => (leerenGefragt = false)}>abbrechen</button>
        {:else}
          <button type="button" onclick={() => verschicken(offene.id)}>Link verschicken</button>
          <button type="button" onclick={() => (leerenGefragt = true)}>Blatt leeren</button>
        {/if}
      </div>
    </div>
  {/if}

  <button
    type="button"
    class="automatik"
    aria-pressed={sammlung.automatisch}
    onclick={automatikUmschalten}
    title="Jede Änderung sofort speichern – oder erst, wenn du auf Speichern tippst"
  >
    <span class="schalter" aria-hidden="true"></span>
    automatisch speichern
  </button>

  <ul>
    {#each liste as werkbank (werkbank.id)}
      {@const aktiv = werkbank.id === sammlung.aktiv}
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
              {#if werkbank.entwurf}<span class="entwurf">· ungespeichert</span>{/if}
              {#if aktiv}<span class="offen">· offen</span>{/if}
            </span>
          </button>
        {/if}

        <div class="knoepfe">
          {#if loeschenGefragt === werkbank.id}
            <button type="button" class="ernst" onclick={() => { entfernen(werkbank.id); loeschenGefragt = null; }}>
              wirklich löschen
            </button>
            <button type="button" onclick={() => (loeschenGefragt = null)}>abbrechen</button>
          {:else}
            <button type="button" onclick={() => verschicken(werkbank.id)}>Link</button>
            <button type="button" onclick={() => umbenennenBeginnen(werkbank)}>umbenennen</button>
            <button type="button" onclick={() => kopieren(werkbank.id)}>Kopie</button>
            <button
              type="button"
              class="weg"
              onclick={() => { loeschenGefragt = werkbank.id; umbenennend = null; }}
              aria-label={`${werkbank.name} löschen`}
            >
              ✕
            </button>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</section>

<style>
  .verwaltung {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 12px;
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }

  .kopf button {
    min-height: 36px;
    font-size: 0.8rem;
  }

  .offene {
    display: grid;
    gap: 4px;
    padding: 6px 0 8px;
    border-bottom: 1px solid var(--rand);
    margin-bottom: 4px;
  }

  .offene .marke {
    color: var(--text-leise);
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  ul {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  li {
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    padding: 6px;
  }

  li.aktiv {
    border-color: var(--akzent);
  }

  .wahl {
    display: grid;
    gap: 2px;
    width: 100%;
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
    font-size: 0.75rem;
  }

  .entwurf {
    color: var(--warn);
  }

  .offen {
    color: var(--akzent);
  }

  .knoepfe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }

  .knoepfe button {
    min-height: 36px;
    font-size: 0.78rem;
    flex: 1 1 auto;
  }

  .knoepfe .weg {
    flex: 0 0 auto;
    min-width: 40px;
  }

  .ernst {
    border-color: var(--warn);
    color: var(--warn);
  }

  .umbenennen {
    display: flex;
    gap: 6px;
    align-items: flex-start;
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

  /* Derselbe kleine Schiebeschalter wie bei den Umlauten. */
  .automatik {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 8px 0 4px;
    border: none;
    background: none;
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  .automatik[aria-pressed='true'] {
    color: var(--text);
  }

  .schalter {
    position: relative;
    width: 30px;
    height: 18px;
    border-radius: 9px;
    border: 1px solid var(--rand);
    background: var(--flaeche);
    transition: background 0.15s;
  }

  .schalter::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-leise);
    transition: transform 0.15s;
  }

  .automatik[aria-pressed='true'] .schalter {
    background: var(--akzent);
    border-color: var(--akzent);
  }

  .automatik[aria-pressed='true'] .schalter::after {
    transform: translateX(12px);
    background: var(--grund);
  }
</style>
