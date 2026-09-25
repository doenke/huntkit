<script lang="ts">
  import { Bildschirmwaechter, kannWachhalten } from '../lib/ui/nacht';

  /**
   * Was die App für die Nacht mitbringt: Der Bildschirm bleibt an, solange man
   * abtippt. Mehr nicht – Taschenlampe, Lupe und Codeleser kann das Handy von
   * Haus aus besser, und jede davon kostete hier Akku und Sonderfälle.
   */

  const waechter = new Bildschirmwaechter();
  let wachhalten = $state(false);
  let wachhaltenGeht = kannWachhalten();
  let fehler = $state('');

  $effect(() => {
    const beiWechsel = () => void waechter.beiSichtbarkeit();
    document.addEventListener('visibilitychange', beiWechsel);
    return () => {
      document.removeEventListener('visibilitychange', beiWechsel);
      void waechter.aus();
    };
  });

  async function wachschalter() {
    if (wachhalten) {
      await waechter.aus();
      wachhalten = false;
    } else {
      wachhalten = await waechter.an();
      if (!wachhalten) fehler = 'Der Bildschirmwächter lässt sich hier nicht einschalten.';
    }
  }
</script>

<h3>Bildschirm</h3>
{#if wachhaltenGeht}
  <button type="button" aria-pressed={wachhalten} onclick={wachschalter}>
    {wachhalten ? 'bleibt an' : 'wach halten'}
  </button>
  <p class="leise">
    Verhindert, dass das Display beim Abtippen ausgeht. Kostet Akku – und schaltet sich
    von selbst frei, sobald die App in den Hintergrund geht.
  </p>
{:else}
  <p class="leise">Dieses Gerät bietet dem Browser keine Bildschirmsperre an.</p>
{/if}

{#if fehler}
  <p class="fehler">{fehler}</p>
{/if}

<style>
  h3 {
    margin: 20px 0 8px;
    font-size: 0.95rem;
  }

  button {
    min-height: var(--tap);
  }

  button[aria-pressed='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.85rem;
    margin: 6px 0 0;
  }

  .fehler {
    color: var(--warn);
    font-size: 0.85rem;
  }
</style>
