<script lang="ts">
  import { rufe, type GruppenDetails } from '../lib/gruppe/api';
  import { abgleich, aktiveGruppe, setzeAktiveGruppe } from '../lib/gruppe/gruppen.svelte';
  import { geheZu, nimmParameter } from '../lib/router';
  import { gruppeAufsGeraet } from '../lib/werkbank/werkbaenke.svelte';
  import Gruppen from '../ui/Gruppen.svelte';
  import Serverstatus from '../ui/Serverstatus.svelte';
  import Textzeile from '../ui/Textzeile.svelte';
  import Verbindungstest from '../ui/Verbindungstest.svelte';

  /**
   * Alles rund um Gruppen: anmelden, beitreten, anlegen, einladen, Mitglieder,
   * verlassen – und für die Einrichtung der Zustand des Servers. Gearbeitet
   * wird in der Werkbank und im Kreuzworträtsel, in der Gruppe, die im Menü
   * aktiv ist.
   *
   * Über die Adresse kommen hier an: die Rückkehr von der Anmeldung
   * (?anmeldung=… oder ?anmeldefehler=…) und Einladungen (?einladung=…).
   */
  let meldung = $state('');
  /** Bleibt stehen, bis man es wegklickt – den Grund will man in Ruhe lesen. */
  let anmeldefehler = $state('');

  let einladung = $state<{ code: string; gruppe: { id: string; name: string }; schonMitglied: boolean } | null>(null);
  let gastname = $state('');
  let beitrittsfehler = $state('');

  async function ausAdresse() {
    const { anmeldung, anmeldefehler: fehler, einladung: code } = nimmParameter('anmeldung', 'anmeldefehler', 'einladung');
    if (fehler) anmeldefehler = fehler;
    if (anmeldung) {
      try {
        await abgleich.anmeldungEinloesen(anmeldung);
        meldung = `Angemeldet als ${abgleich.speicher.konto?.ich.name ?? ''}`;
      } catch (e) {
        anmeldefehler = e instanceof Error ? e.message : String(e);
      }
    }
    if (code) {
      try {
        const info = await rufe<{ gruppe: { id: string; name: string }; schonMitglied: boolean }>(
          `einladung.php?e=${encodeURIComponent(code)}`,
          { token: abgleich.speicher.konto?.token ?? null }
        );
        einladung = { code, ...info };
        beitrittsfehler = '';
      } catch (e) {
        meldung = e instanceof Error ? e.message : 'Die Einladung ließ sich nicht öffnen';
      }
    }
  }

  $effect(() => {
    const lesen = () => void ausAdresse();
    lesen();
    addEventListener('hashchange', lesen);
    return () => removeEventListener('hashchange', lesen);
  });

  /** Nach dem Beitreten arbeitet man in der Gruppe – dafür ist man ja beigetreten. */
  let beigetreten = $state<string | null>(null);

  async function beitreten() {
    const offen = einladung;
    if (!offen) return;
    beitrittsfehler = '';
    try {
      const antwort = await rufe<{ token: string | null; gruppe: GruppenDetails }>('einladung.php', {
        token: abgleich.speicher.konto?.token ?? null,
        koerper: { e: offen.code, name: gastname.trim() }
      });
      abgleich.aufnehmen(antwort.gruppe.id, antwort.gruppe.name, antwort.token ?? undefined, antwort.gruppe);
      setzeAktiveGruppe(antwort.gruppe.id);
      beigetreten = antwort.gruppe.name;
      einladung = null;
    } catch (e) {
      beitrittsfehler = e instanceof Error ? e.message : String(e);
    }
  }

  $effect(() => {
    // Konto, Gruppen des Kontos und deren Mitglieder frisch vom Server.
    void abgleich.kontoLaden().then(() => {
      for (const id of Object.keys(abgleich.speicher.gruppen)) void abgleich.detailsLaden(id);
    });
  });

  /** Eine Gruppe hier vergessen. Ihre Werkbänke bleiben als eigene; war sie aktiv, geht es auf dem Gerät weiter. */
  function gruppeVergessen(gruppe: string) {
    if (aktiveGruppe() === gruppe) setzeAktiveGruppe(null);
    gruppeAufsGeraet(gruppe);
    abgleich.vergessen(gruppe);
    abgleich.sichereJetzt();
  }
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

{#if einladung}
  <section class="einladung">
    <strong>Gruppe „{einladung.gruppe.name}“ beitreten</strong>
    {#if einladung.schonMitglied}
      <p class="leise">Du bist schon Mitglied.</p>
    {:else if abgleich.speicher.konto}
      <p class="leise">Du trittst als {abgleich.speicher.konto.ich.name} bei.</p>
    {:else}
      <Textzeile bind:value={gastname} aria-label="Dein Name" placeholder="Dein Name" enter={() => void beitreten()} />
      <p class="leise">Unter diesem Namen sehen dich die anderen im Protokoll.</p>
    {/if}
    {#if beitrittsfehler}<p class="warn">{beitrittsfehler}</p>{/if}
    <div class="knoepfe">
      <button
        type="button"
        class="ernst"
        disabled={!einladung.schonMitglied && !abgleich.speicher.konto && !gastname.trim()}
        onclick={() => void beitreten()}
      >
        beitreten
      </button>
      <button type="button" onclick={() => (einladung = null)}>abbrechen</button>
    </div>
  </section>
{/if}

{#if beigetreten}
  <section class="einladung">
    <strong>Du bist jetzt in „{beigetreten}“</strong>
    <p class="leise">Werkbänke und Kreuzworträtsel teilst du ab jetzt mit der Gruppe. Im Menü unter „Arbeiten in“ wechselst du zurück aufs Gerät.</p>
    <div class="knoepfe">
      <button type="button" class="ernst" onclick={() => geheZu('werkbank')}>zur Werkbank</button>
      <button type="button" onclick={() => (beigetreten = null)}>schließen</button>
    </div>
  </section>
{/if}

<Gruppen {gruppeVergessen} melde={(text) => (meldung = text)} />

<p class="leise">
  Im Menü unter „Arbeiten in“ wählst du, wo du arbeitest: in einer Gruppe oder nur auf diesem
  Gerät. Werkbänke und Kreuzworträtsel gehören dann diesem Ort. „Kopieren nach …“ in der
  Verwaltung der Werkbänke legt die offene Werkbank an einen anderen Ort.
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

  .einladung {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 12px;
    display: grid;
    gap: 8px;
  }

  .einladung p {
    margin: 0;
  }

  .knoepfe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ernst {
    border-color: var(--akzent);
    color: var(--akzent);
  }
</style>
