<script lang="ts">
  import { beobachteVersion, browserUmgebung, type Versionswache } from './lib/neuversion';
  import { aktuelleSeite, geheZu, leistenplatz, SEITEN, type Seite } from './lib/router';
  import Werkbank from './views/Werkbank.svelte';
  import Codes from './views/Codes.svelte';
  import Nachschlagen from './views/Nachschlagen.svelte';
  import Loesungen from './views/Loesungen.svelte';
  import Mehr from './views/Mehr.svelte';
  import Gruppenseite from './views/Gruppenseite.svelte';

  let seite = $state<Seite>(aktuelleSeite());

  $effect(() => {
    const beiWechsel = () => (seite = aktuelleSeite());
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

<header>
  <h1>huntkit</h1>
</header>

<main>
  {#if seite === 'werkbank'}
    <Werkbank />
  {:else if seite === 'codes'}
    <Codes />
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

<nav aria-label="Hauptbereiche">
  {#each SEITEN as eintrag (eintrag.id)}
    <button
      type="button"
      aria-current={leistenplatz(seite) === eintrag.id ? 'page' : undefined}
      onclick={() => geheZu(eintrag.id)}
    >
      {eintrag.titel}
    </button>
  {/each}
</nav>

<style>
  header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--rand);
  }

  h1 {
    margin: 0;
    font-size: 1.1rem;
    letter-spacing: 0.04em;
  }

  main {
    /* Platz fuer die feste Leiste unten lassen */
    padding: 16px 16px calc(var(--tap) + 32px + env(safe-area-inset-bottom));
    max-width: 62rem;
    margin: 0 auto;
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
  }

  nav {
    position: fixed;
    inset: auto 0 0 0;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 1px;
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
    background: var(--flaeche);
    border-top: 1px solid var(--rand);
  }

  nav button {
    background: none;
    border: none;
    border-radius: var(--radius);
    color: var(--text-leise);
    /* Fuenf Bereiche muessen auch auf ein schmales Handy passen: Die Schrift
       schrumpft mit der Breite, bleibt auf grossen Schirmen aber normal. */
    font-size: clamp(0.62rem, 2.6vw, 0.85rem);
    padding: 0 2px;
    white-space: nowrap;
  }

  nav button[aria-current='page'] {
    background: var(--flaeche-hoch);
    color: var(--text);
  }

  /* Sitzt über der Leiste und nimmt keinen Platz im Inhalt weg – die Arbeit
     soll weitergehen können, auch wenn der Hinweis stehen bleibt. */
  .neuversion {
    position: fixed;
    inset: auto 8px calc(var(--tap) + 22px + env(safe-area-inset-bottom)) 8px;
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

  @media (min-width: 40rem) {
    nav {
      position: sticky;
      top: 0;
      inset-inline: auto;
      grid-auto-columns: max-content;
      justify-content: center;
      border-top: none;
      border-bottom: 1px solid var(--rand);
      order: -1;
    }
  }
</style>
