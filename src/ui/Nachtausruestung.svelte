<script lang="ts">
  import {
    Bildschirmwaechter, codeleser, kameraStarten, kameraStoppen, kannCodesLesen,
    kannWachhalten
  } from '../lib/nacht';
  import { anWerkbank } from '../lib/blatt';

  const waechter = new Bildschirmwaechter();
  let wachhalten = $state(false);
  let wachhaltenGeht = kannWachhalten();

  let strom = $state<MediaStream | null>(null);
  let fehler = $state('');
  let bild = $state<HTMLVideoElement | null>(null);
  let sucheCode = $state(false);
  let gefundenerCode = $state('');
  let codesGehen = kannCodesLesen();
  let sucher: number | null = null;

  $effect(() => {
    const beiWechsel = () => void waechter.beiSichtbarkeit();
    document.addEventListener('visibilitychange', beiWechsel);
    return () => {
      document.removeEventListener('visibilitychange', beiWechsel);
      void waechter.aus();
      kameraStoppen(strom);
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

  async function kameraAn() {
    fehler = '';
    try {
      strom = await kameraStarten();
      if (bild) {
        bild.srcObject = strom;
        await bild.play().catch(() => undefined);
      }
    } catch {
      fehler = 'Kein Zugriff auf die Kamera – erlaubt der Browser sie für diese Seite?';
    }
  }

  function codesuche() {
    if (sucheCode) {
      sucheCode = false;
      if (sucher !== null) clearInterval(sucher);
      sucher = null;
      return;
    }
    const leser = codeleser();
    if (!leser || !bild) return;
    sucheCode = true;
    gefundenerCode = '';
    sucher = setInterval(async () => {
      if (!bild) return;
      try {
        const treffer = await leser.detect(bild);
        if (treffer.length > 0 && treffer[0]) {
          gefundenerCode = treffer[0].rawValue;
          codesuche();
        }
      } catch {
        // Einzelne Bilder scheitern immer wieder – einfach das nächste nehmen.
      }
    }, 400) as unknown as number;
  }

  function kameraAus() {
    if (sucheCode) codesuche();
    kameraStoppen(strom);
    strom = null;
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

<h3>Code lesen</h3>
{#if !strom}
  <button type="button" onclick={kameraAn}>Kamera einschalten</button>
  <p class="leise">
    Für QR-Codes auf Schildern und Zetteln. Die Kamera ist der größte Akkufresser der
    App – deshalb läuft sie nur, solange du sie einschaltest.
  </p>
{:else}
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={bild} playsinline muted autoplay></video>
  <div class="gruppe">
    <button type="button" onclick={kameraAus}>Kamera aus</button>
  </div>
  {#if codesGehen}
    <div class="gruppe">
      <button type="button" aria-pressed={sucheCode} onclick={codesuche}>
        {sucheCode ? 'Suche läuft …' : 'QR-Code suchen'}
      </button>
    </div>
    {#if gefundenerCode}
      <output class="fund mono">{gefundenerCode}</output>
      <div class="gruppe">
        <button type="button" onclick={() => anWerkbank(gefundenerCode)}>an die Werkbank</button>
        <button type="button" onclick={() => (gefundenerCode = '')}>verwerfen</button>
      </div>
    {/if}
  {:else}
    <p class="leise">Dieser Browser bringt keinen Codeleser mit.</p>
  {/if}
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

  .gruppe {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }

  video {
    display: block;
    width: 100%;
    max-height: 50vh;
    object-fit: cover;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    background: #000;
    margin-bottom: 8px;
  }

  .fund {
    display: block;
    padding: 10px;
    background: var(--flaeche);
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    margin-bottom: 8px;
    overflow-wrap: anywhere;
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
