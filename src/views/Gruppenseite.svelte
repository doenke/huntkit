<script lang="ts">
  import { abgleich } from '../lib/gruppe/gruppen.svelte';
  import Gruppenverwaltung from '../ui/Gruppenverwaltung.svelte';
  import Serverstatus from '../ui/Serverstatus.svelte';
  import Verbindungstest from '../ui/Verbindungstest.svelte';

  /**
   * Alles rund um Gruppen: anmelden, anlegen, einladen, Mitglieder, verlassen –
   * und für die Einrichtung der Zustand des Servers. Gearbeitet wird in der
   * Werkbank; dort gibt es nur noch „in Gruppe kopieren“.
   *
   * Hierher kommt man auch nach der Anmeldung zurück:
   * #/gruppen?anmeldung=… oder ?anmeldefehler=…
   */
  let meldung = $state('');
  /** Bleibt stehen, bis man es wegklickt – den Grund will man in Ruhe lesen. */
  let anmeldefehler = $state('');

  async function ausAdresse() {
    const wert = (name: string) => {
      const treffer = location.hash.match(new RegExp(`[?&]${name}=([^&]+)`));
      return treffer ? decodeURIComponent(treffer[1] as string) : null;
    };
    const anmeldung = wert('anmeldung');
    const fehler = wert('anmeldefehler');
    if (!anmeldung && !fehler) return;
    history.replaceState(null, '', location.href.replace(/[?&](anmeldung|anmeldefehler)=[^&]+/g, ''));
    if (fehler) anmeldefehler = fehler;
    if (anmeldung) {
      try {
        await abgleich.anmeldungEinloesen(anmeldung);
        meldung = `Angemeldet als ${abgleich.speicher.konto?.ich.name ?? ''}`;
      } catch (e) {
        anmeldefehler = e instanceof Error ? e.message : String(e);
      }
    }
  }

  $effect(() => {
    const lesen = () => void ausAdresse();
    lesen();
    addEventListener('hashchange', lesen);
    return () => removeEventListener('hashchange', lesen);
  });
</script>

{#if meldung}<p class="meldung">{meldung}</p>{/if}

{#if anmeldefehler}
  <section class="fehlerbox" role="alert">
    <strong>Anmeldung fehlgeschlagen</strong>
    <p class="warn">{anmeldefehler}</p>
    <p class="leise">Mehr steht im Server-Log (huntkit.log im Daten-Ordner neben der App) und unten im Serverstatus.</p>
    <button type="button" onclick={() => (anmeldefehler = '')}>schließen</button>
  </section>
{/if}

<div class="seite-gruppen">
  <Gruppenverwaltung />
</div>

<p class="leise">
  Gearbeitet wird in der Werkbank: Dort legt „In Gruppe kopieren …“ in der Verwaltung der
  Werkbänke die offene Werkbank in eine Gruppe. Werkbänke einer Gruppe tragen deren Namen.
</p>

<h2>Server</h2>
<Serverstatus />
<Verbindungstest />

<style>
  h2 {
    margin-top: 28px;
  }

  h2:first-of-type {
    margin-top: 0;
  }

  .meldung {
    margin: 0 0 8px;
    font-size: 0.85rem;
    color: var(--akzent);
  }

  .fehlerbox {
    border: 1px solid var(--warn);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 12px;
    display: grid;
    gap: 6px;
    justify-items: start;
  }

  .fehlerbox p {
    margin: 0;
  }

  .warn {
    color: var(--warn);
    overflow-wrap: anywhere;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.9rem;
  }

  button {
    min-height: 36px;
    font-size: 0.8rem;
  }
</style>
