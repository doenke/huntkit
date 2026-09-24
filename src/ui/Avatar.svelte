<script lang="ts">
  import { avatarAdresse } from '../lib/gruppe/api';

  /**
   * Ein Mensch in einer Gruppe: das Bild vom Anmeldedienst, sonst ein Kreis
   * mit Initialen in einer Farbe, die fest aus dem Namen folgt – dieselbe
   * Person sieht überall gleich aus.
   *
   * Bilder kommen vom eigenen Server und werden im Cache des Geräts
   * aufgehoben, damit sie auch offline da sind.
   */
  let { name, bild = null, groesse = 24 }: { name: string; bild?: string | null; groesse?: number } = $props();

  const CACHE = 'huntkit-avatare';
  let quelle = $state<string | null>(null);

  $effect(() => {
    const adresse = avatarAdresse(bild);
    quelle = null;
    if (!adresse) return;
    let url: string | null = null;
    let vorbei = false;
    void (async () => {
      try {
        const cache = await caches.open(CACHE);
        let antwort = await cache.match(adresse);
        if (!antwort) {
          const frisch = await fetch(adresse);
          if (!frisch.ok) return;
          await cache.put(adresse, frisch.clone());
          antwort = frisch;
        }
        const daten = await antwort.blob();
        if (vorbei) return;
        url = URL.createObjectURL(daten);
        quelle = url;
      } catch {
        // Ohne Cache-API oder ohne Netz: die Initialen tun es auch.
        if (!vorbei && typeof caches === 'undefined') quelle = adresse;
      }
    })();
    return () => {
      vorbei = true;
      if (url) URL.revokeObjectURL(url);
    };
  });

  const initialen = $derived(
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((t) => t[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );

  const farbe = $derived.by(() => {
    let h = 0;
    for (const z of name) h = (h * 31 + (z.codePointAt(0) ?? 0)) % 360;
    return `hsl(${h} 55% 42%)`;
  });
</script>

<span
  class="avatar"
  style:width={`${groesse}px`}
  style:height={`${groesse}px`}
  style:font-size={`${Math.round(groesse * 0.42)}px`}
  style:background={quelle ? 'transparent' : farbe}
  title={name}
  aria-hidden="true"
>
  {#if quelle}
    <img src={quelle} alt="" />
  {:else}
    {initialen}
  {/if}
</span>

<style>
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    border-radius: 50%;
    overflow: hidden;
    color: #fff;
    font-weight: 600;
    line-height: 1;
    user-select: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
