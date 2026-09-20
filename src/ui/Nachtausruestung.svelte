<script lang="ts">
  import {
    Bildschirmwaechter, kameraStarten, kameraStoppen, kannWachhalten, leuchten, zoomen
  } from '../lib/nacht';

  const waechter = new Bildschirmwaechter();
  let wachhalten = $state(false);
  let wachhaltenGeht = kannWachhalten();

  let strom = $state<MediaStream | null>(null);
  let kannLeuchten = $state(false);
  let zoombereich = $state<{ min: number; max: number; step: number } | null>(null);
  let zoomwert = $state(1);
  let licht = $state(false);
  let fehler = $state('');
  let bild = $state<HTMLVideoElement | null>(null);

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

  async function lupeAn() {
    fehler = '';
    try {
      const stand = await kameraStarten();
      strom = stand.strom;
      kannLeuchten = stand.kannLeuchten;
      zoombereich = stand.zoom;
      zoomwert = stand.zoom?.min ?? 1;
      if (bild) {
        bild.srcObject = stand.strom;
        await bild.play().catch(() => undefined);
      }
    } catch {
      fehler = 'Kein Zugriff auf die Kamera – erlaubt der Browser sie für diese Seite?';
    }
  }

  async function lupeAus() {
    if (licht) await leuchten(strom, false);
    kameraStoppen(strom);
    strom = null;
    licht = false;
    kannLeuchten = false;
    zoombereich = null;
  }

  async function lichtschalter() {
    const geschafft = await leuchten(strom, !licht);
    if (geschafft) licht = !licht;
    else fehler = 'Dieses Gerät gibt das Licht über den Browser nicht frei.';
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

<h3>Lupe und Licht</h3>
{#if !strom}
  <button type="button" onclick={lupeAn}>Kamera einschalten</button>
  <p class="leise">
    Zum Lesen von Kleingedrucktem und als Taschenlampe. Beides zusammen ist der größte
    Akkufresser der App – deshalb läuft die Kamera nur, solange du sie einschaltest.
  </p>
{:else}
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={bild} playsinline muted autoplay></video>
  <div class="gruppe">
    <button type="button" onclick={lupeAus}>Kamera aus</button>
    {#if kannLeuchten}
      <button type="button" aria-pressed={licht} onclick={lichtschalter}>
        {licht ? 'Licht aus' : 'Licht an'}
      </button>
    {/if}
  </div>
  {#if zoombereich}
    <label class="zoom">
      <span class="leise">Vergrößerung</span>
      <input
        type="range"
        min={zoombereich.min}
        max={zoombereich.max}
        step={zoombereich.step}
        value={zoomwert}
        oninput={(e) => {
          zoomwert = Number(e.currentTarget.value);
          void zoomen(strom, zoomwert);
        }}
      />
    </label>
  {:else}
    <p class="leise">Dieses Gerät kennt keinen Kamerazoom – halte das Handy näher heran.</p>
  {/if}
  {#if !kannLeuchten}
    <p class="leise">Diese Kamera gibt ihr Licht über den Browser nicht frei.</p>
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

  .zoom {
    display: grid;
    gap: 4px;
    margin-bottom: 8px;
  }

  .zoom input {
    width: 100%;
    min-height: var(--tap);
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
