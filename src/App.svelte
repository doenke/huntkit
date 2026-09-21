<script lang="ts">
  import { aktuelleSeite, geheZu, SEITEN, type Seite } from './lib/router';
  import Werkbank from './views/Werkbank.svelte';
  import Codes from './views/Codes.svelte';
  import Nachschlagen from './views/Nachschlagen.svelte';
  import Loesungen from './views/Loesungen.svelte';
  import Mehr from './views/Mehr.svelte';

  let seite = $state<Seite>(aktuelleSeite());

  $effect(() => {
    const beiWechsel = () => (seite = aktuelleSeite());
    addEventListener('hashchange', beiWechsel);
    return () => removeEventListener('hashchange', beiWechsel);
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
  {:else}
    <Mehr />
  {/if}
</main>

<nav aria-label="Hauptbereiche">
  {#each SEITEN as eintrag (eintrag.id)}
    <button
      type="button"
      aria-current={seite === eintrag.id ? 'page' : undefined}
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
