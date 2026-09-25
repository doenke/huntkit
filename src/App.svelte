<script lang="ts">
  import { beobachteVersion, browserUmgebung, type Versionswache } from './lib/neuversion';
  import { aktuelleSeite, geheZu, SEITEN, umleitung, type Seite } from './lib/router';
  import Werkbank from './views/Werkbank.svelte';
  import Nachschlagen from './views/Nachschlagen.svelte';
  import Loesungen from './views/Loesungen.svelte';
  import Mehr from './views/Mehr.svelte';
  import Gruppenseite from './views/Gruppenseite.svelte';
  import {
    abgleich,
    aktiveGruppe,
    ansicht as gruppenansicht,
    gruppenliste,
    setzeAktiveGruppe
  } from './lib/gruppe/gruppen.svelte';
  import Avatar from './ui/Avatar.svelte';
  import { ANMELDEADRESSE } from './lib/gruppe/api';

  let seite = $state<Seite>(aktuelleSeite());

  /** Wer angemeldet ist – steht gespeichert auf dem Gerät, also auch offline. */
  const angemeldet = $derived.by(() => {
    void gruppenansicht.version;
    return abgleich.speicher.konto?.ich ?? null;
  });

  /*
   * Die Bereiche stecken in einem Menü oben rechts – eine feste Leiste
   * unten kostete auf dem Handy dauerhaft Platz. Zu geht es mit einem Tipp
   * daneben, mit Escape oder mit der Wahl eines Bereichs.
   */
  let menueOffen = $state(false);
  const seitentitel = $derived(
    SEITEN.find((s) => s.id === seite)?.titel ?? (seite === 'gruppen' ? 'Gruppen' : '')
  );

  function waehle(ziel: Seite) {
    menueOffen = false;
    geheZu(ziel);
  }

  /*
   * Die aktive Gruppe. Der Abgleich läuft, solange die App offen ist – egal
   * welche Seite –, und die aktive Gruppe bekommt den schnellen Takt.
   */
  const gruppen = $derived(gruppenliste());
  const aktiv = $derived.by(() => {
    const id = aktiveGruppe();
    if (!id) return null;
    return {
      id,
      name: abgleich.speicher.gruppen[id]?.name ?? 'Gruppe',
      status: abgleich.status[id]
    };
  });

  function arbeitenIn(gruppe: string | null) {
    menueOffen = false;
    setzeAktiveGruppe(gruppe);
  }

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
    abgleich.setzeAktiv(aktiv?.id ?? null);
  });

  /** Gibt es überhaupt eine Anmeldung? Erst beim Öffnen des Menüs nachfragen. */
  const oidc = $derived.by(() => {
    void gruppenansicht.version;
    return abgleich.info?.oidc;
  });

  function menueUmschalten() {
    menueOffen = !menueOffen;
    if (menueOffen && !abgleich.info) void abgleich.kontoLaden();
  }

  function anmelden() {
    menueOffen = false;
    location.href = ANMELDEADRESSE;
  }

  function abmelden() {
    menueOffen = false;
    void abgleich.abmelden();
  }

  $effect(() => {
    if (!menueOffen) return;
    const klick = (e: MouseEvent) => {
      if (!e.composedPath().some((el) => el instanceof Element && el.hasAttribute('data-menue'))) menueOffen = false;
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') menueOffen = false;
    };
    document.addEventListener('click', klick);
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('click', klick);
      document.removeEventListener('keydown', taste);
    };
  });

  $effect(() => {
    // Alte Adressen, etwa Einladungslinks auf die Werkbank, gleich dorthin, wo sie heute hingehören.
    const beiWechsel = () => {
      const neu = umleitung(location.hash);
      if (neu) history.replaceState(null, '', `${location.href.split('#')[0]}${neu}`);
      seite = aktuelleSeite();
    };
    beiWechsel();
    addEventListener('hashchange', beiWechsel);
    return () => removeEventListener('hashchange', beiWechsel);
  });

  /**
   * Neue Fassung: Der Service Worker liefert aus dem Cache, also arbeitet eine
   * offene App nach einem Deployment mit dem alten Stand weiter. Statt ihn
   * unterzuschieben, fragen wir – erst recht nicht mitten im Rätsel.
   */
  let neueVersion = $state(false);
  let weggeklickt = $state(false);
  let wache = $state<Versionswache | null>(null);

  $effect(() => {
    const umgebung = browserUmgebung();
    if (!umgebung || !import.meta.env.PROD) return;
    wache = beobachteVersion((bereit) => (neueVersion = bereit), umgebung);

    // Beim Zurückkommen nachsehen: Wer die App den ganzen Abend offen hat,
    // erfährt sonst nie von einer Fassung, die zwischendurch hochgeladen wurde.
    let zuletzt = 0;
    const beiSicht = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - zuletzt < 60_000) return;
      zuletzt = Date.now();
      wache?.pruefe();
    };
    addEventListener('visibilitychange', beiSicht);
    return () => removeEventListener('visibilitychange', beiSicht);
  });
</script>

<header class:mit-gruppe={Boolean(aktiv)}>
  <h1>
    <!-- Der Titel führt zur Werkbank, der Startseite. -->
    <a class="heim" href="#/werkbank" title="Zur Werkbank" onclick={() => (menueOffen = false)}>
      huntkit
      {#if seitentitel}<span class="seite">· {seitentitel}</span>{/if}
    </a>
  </h1>
  <div class="rechts">
    {#if aktiv}
      <!-- Immer sichtbar, solange eine Gruppe aktiv ist: Was man jetzt tut, sehen alle darin. -->
      <button
        type="button"
        class="gruppenmarke"
        data-menue
        title={`Du arbeitest in der Gruppe „${aktiv.name}“ – antippen zum Wechseln`}
        onclick={menueUmschalten}
      >
        <span class="punkt {aktiv.status?.verbindung ?? 'start'}" aria-hidden="true"></span>
        <span class="gruppenname">{aktiv.name}</span>
        {#if aktiv.status?.verbindung === 'offline'}<span class="zusatz">offline</span>{:else if aktiv.status?.verbindung === 'kein-zugang'}<span class="zusatz">kein Zugang</span>{/if}
      </button>
    {/if}
    {#if angemeldet}
      <a class="konto" href="#/gruppen" title={`Angemeldet als ${angemeldet.name} – Gruppen`}>
        <Avatar name={angemeldet.name} bild={angemeldet.avatar} groesse={28} />
      </a>
    {/if}
    <div class="menue" data-menue>
      <button
        type="button"
        class="hamburger"
        aria-label="Menü"
        aria-expanded={menueOffen}
        aria-controls="hauptmenue"
        onclick={menueUmschalten}
      >
        <span aria-hidden="true">{menueOffen ? '✕' : '☰'}</span>
      </button>
      {#if menueOffen}
        <nav id="hauptmenue" aria-label="Hauptbereiche">
          {#each SEITEN as eintrag (eintrag.id)}
            <button
              type="button"
              aria-current={seite === eintrag.id ? 'page' : undefined}
              onclick={() => waehle(eintrag.id)}
            >
              {eintrag.titel}
            </button>
          {/each}
          <hr />
          {#if gruppen.length > 0}
            <!-- Wo man arbeitet: auf dem Gerät oder in einer Gruppe. Gilt für Werkbänke und Kreuzworträtsel. -->
            <p class="menuekopf">Arbeiten in</p>
            <button type="button" class="ort" aria-pressed={!aktiv} onclick={() => arbeitenIn(null)}>
              <span class="haken" aria-hidden="true">{aktiv ? '' : '✓'}</span>
              <span>Nur auf diesem Gerät</span>
            </button>
            {#each gruppen as g (g.id)}
              <button type="button" class="ort" aria-pressed={aktiv?.id === g.id} onclick={() => arbeitenIn(g.id)}>
                <span class="haken" aria-hidden="true">{aktiv?.id === g.id ? '✓' : ''}</span>
                <span>{g.name}</span>
              </button>
            {/each}
            <hr />
          {/if}
          <button
            type="button"
            aria-current={seite === 'gruppen' ? 'page' : undefined}
            onclick={() => waehle('gruppen')}
          >
            Gruppen
          </button>
          <!-- Die Werkbank startet die Tour, sobald die Adresse „?tour“ trägt – auch wenn sie schon offen ist. -->
          <button type="button" onclick={() => { menueOffen = false; location.hash = '#/werkbank?tour'; }}>
            Tour durch die Werkbank
          </button>
          {#if angemeldet}
            <button type="button" class="konto-eintrag" onclick={abmelden}>
              <Avatar name={angemeldet.name} bild={angemeldet.avatar} groesse={22} />
              <span>Abmelden <small>{angemeldet.name}</small></span>
            </button>
          {:else if oidc !== false}
            <!-- Ohne eingerichteten Anmeldedienst gibt es nichts anzumelden. -->
            <button type="button" onclick={anmelden}>Anmelden</button>
          {/if}
        </nav>
      {/if}
    </div>
  </div>
</header>

<main>
  {#if seite === 'werkbank'}
    <Werkbank />
  {:else if seite === 'nachschlagen'}
    <Nachschlagen />
  {:else if seite === 'loesungen'}
    <Loesungen />
  {:else if seite === 'gruppen'}
    <Gruppenseite />
  {:else}
    <Mehr />
  {/if}
</main>

{#if neueVersion && !weggeklickt}
  <div class="neuversion" role="status">
    <span>Neue Fassung geladen.</span>
    <span class="knoepfe">
      <button type="button" class="jetzt" onclick={() => wache?.uebernehmen()}>neu starten</button>
      <button type="button" onclick={() => (weggeklickt = true)}>später</button>
    </span>
  </div>
{/if}


<style>
  header {
    position: sticky;
    top: 0;
    z-index: 3;
    padding: 6px 8px 6px 16px;
    border-bottom: 1px solid var(--rand);
    background: var(--grund);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .rechts {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .seite {
    color: var(--text-leise);
    font-weight: normal;
    letter-spacing: normal;
  }

  .menue {
    position: relative;
  }

  .hamburger {
    width: var(--tap);
    height: var(--tap);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: 1.4rem;
    color: var(--text);
  }

  nav {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 12rem;
    display: grid;
    gap: 2px;
    padding: 6px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.4);
  }

  nav button {
    min-height: var(--tap);
    text-align: left;
    padding: 0 14px;
    background: none;
    border: none;
    border-radius: var(--radius);
    color: var(--text);
    font-size: 1rem;
  }

  nav hr {
    width: 100%;
    margin: 4px 0;
    border: none;
    border-top: 1px solid var(--rand);
  }

  .menuekopf {
    margin: 4px 14px 2px;
    font-size: 0.75rem;
    color: var(--text-leise);
  }

  nav .ort {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 8px;
  }

  .haken {
    flex: none;
    width: 1.2em;
    color: var(--akzent);
    text-align: center;
  }

  nav .ort[aria-pressed='true'] {
    color: var(--akzent);
  }

  .gruppenmarke {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    min-width: 0;
    max-width: 40vw;
    padding: 0 10px;
    border: 1px solid var(--akzent);
    border-radius: 999px;
    background: none;
    color: var(--text);
    font-size: 0.78rem;
  }

  /* Auf dem Handy ist neben der Gruppe kein Platz für den Seitentitel – die Gruppe ist wichtiger. */
  @media (max-width: 30rem) {
    .mit-gruppe .seite {
      display: none;
    }
  }

  .gruppenname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .zusatz {
    color: var(--warn);
    white-space: nowrap;
  }

  .punkt {
    flex: none;
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-leise);
  }

  .punkt.live,
  .punkt.abfrage {
    background: #3a9d5d;
  }

  .punkt.offline,
  .punkt.kein-zugang {
    background: var(--warn);
  }

  .konto-eintrag {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .konto-eintrag small {
    display: block;
    color: var(--text-leise);
    font-size: 0.75rem;
  }

  nav button[aria-current='page'] {
    background: var(--flaeche-hoch);
    color: var(--akzent);
  }

  .konto {
    display: inline-flex;
    border-radius: 50%;
    /* Ein Tippziel in Fingergröße, auch wenn das Bild kleiner ist. */
    padding: 8px;
    margin: -8px;
  }

  h1 {
    margin: 0;
    min-width: 0;
    font-size: 1.1rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .heim {
    color: inherit;
    text-decoration: none;
  }

  main {
    padding: 16px 16px calc(32px + env(safe-area-inset-bottom));
    max-width: 62rem;
    margin: 0 auto;
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
  }

  /* Sitzt über dem Inhalt und nimmt ihm keinen Platz weg – die Arbeit
     soll weitergehen können, auch wenn der Hinweis stehen bleibt. */
  .neuversion {
    position: fixed;
    inset: auto 8px calc(12px + env(safe-area-inset-bottom)) 8px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px 8px 14px;
    background: var(--flaeche-hoch);
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
    font-size: 0.85rem;
  }

  .neuversion .knoepfe {
    display: flex;
    gap: 6px;
  }

  .neuversion button {
    min-height: 36px;
    padding: 0 10px;
    font-size: 0.8rem;
  }

  .neuversion .jetzt {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  @media (min-width: 40rem) {
    .neuversion {
      inset: auto 16px 16px auto;
      max-width: 26rem;
    }
  }
</style>
