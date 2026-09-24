<script lang="ts">
  import { tick } from 'svelte';
  import type { Tourschritt } from '../lib/tour';

  /**
   * Die geführte Tour: Das Ziel eines Schritts wird ausgespart, der Rest der
   * Seite abgedunkelt, daneben steht die Erklärung. Weiter, zurück, beenden –
   * auch mit Pfeiltasten und Escape.
   *
   * Die Tour trägt `data-box`, damit ein Tipp auf ihre Knöpfe nicht die Box
   * schließt, die sie für den Schritt gerade geöffnet hat.
   */
  let {
    schritte,
    beiSchritt,
    beenden,
    zumSchluss
  }: {
    schritte: ReadonlyArray<Tourschritt>;
    /** Vor dem Zeigen eines Schritts: die passende Box öffnen oder schließen. */
    beiSchritt: (schritt: Tourschritt) => void;
    beenden: () => void;
    /** Zusätzlicher Knopf im letzten Schritt. */
    zumSchluss?: { titel: string; aktion: () => void };
  } = $props();

  let stelle = $state(0);
  let rahmen = $state<{ x: number; y: number; b: number; h: number } | null>(null);
  let blase = $state<HTMLElement | null>(null);
  let blasenTop = $state(0);

  const schritt = $derived(schritte[stelle]);
  const letzter = $derived(stelle === schritte.length - 1);
  const ABSTAND = 8;

  async function zeige() {
    if (!schritt) return;
    beiSchritt(schritt);
    // Erst nachdem die Box offen ist, gibt es ihr Element.
    await tick();
    const ziel = schritt.ziel ? document.querySelector<HTMLElement>(`[data-tour="${schritt.ziel}"]`) : null;
    if (!ziel) {
      rahmen = null;
      await tick();
      blasenTop = Math.max(16, (innerHeight - (blase?.offsetHeight ?? 0)) / 2);
      return;
    }
    // Große Ziele (eine ganze Box) nach oben, damit die Erklärung darunter
    // Platz hat; kleine in die Mitte.
    const gross = ziel.getBoundingClientRect().height > 120;
    ziel.scrollIntoView({ block: gross ? 'start' : 'center', behavior: 'instant' });
    // Der Kopf der App bleibt oben stehen – das Ziel gehört darunter.
    const kopf = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    if (gross) scrollBy({ top: -(kopf + 16), behavior: 'instant' });
    messen(ziel);
  }

  function messen(ziel: HTMLElement) {
    const r = ziel.getBoundingClientRect();
    rahmen = { x: r.left - ABSTAND, y: r.top - ABSTAND, b: r.width + 2 * ABSTAND, h: r.height + 2 * ABSTAND };
    const hoehe = blase?.offsetHeight ?? 160;
    // Unter das Ziel, wenn dort Platz ist, sonst darüber, sonst so gut es geht.
    const unten = r.bottom + ABSTAND + 12;
    const oben = r.top - ABSTAND - 12 - hoehe;
    blasenTop =
      unten + hoehe <= innerHeight - 12 ? unten : oben >= 12 ? oben : Math.max(12, innerHeight - hoehe - 12);
  }

  function nachmessen() {
    const ziel = schritt?.ziel ? document.querySelector<HTMLElement>(`[data-tour="${schritt.ziel}"]`) : null;
    if (ziel) messen(ziel);
  }

  $effect(() => {
    void stelle;
    void zeige();
  });

  // Während der Tour darf die Seite weiter rollen als ihr Inhalt reicht –
  // sonst kommt eine große Box am Seitenende nie nach oben, und die
  // Erklärung müsste sie verdecken.
  $effect(() => {
    document.body.classList.add('tour-laeuft');
    return () => document.body.classList.remove('tour-laeuft');
  });

  $effect(() => {
    addEventListener('resize', nachmessen);
    addEventListener('scroll', nachmessen, true);
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') beenden();
      else if (e.key === 'ArrowRight') weiter();
      else if (e.key === 'ArrowLeft') zurueck();
    };
    addEventListener('keydown', taste);
    return () => {
      removeEventListener('resize', nachmessen);
      removeEventListener('scroll', nachmessen, true);
      removeEventListener('keydown', taste);
    };
  });

  function weiter() {
    if (letzter) beenden();
    else stelle += 1;
  }

  function zurueck() {
    if (stelle > 0) stelle -= 1;
  }
</script>

<div class="tour" data-box role="dialog" aria-modal="true" aria-label="Tour durch die Werkbank">
  {#if rahmen}
    <div
      class="loch"
      style:left="{rahmen.x}px"
      style:top="{rahmen.y}px"
      style:width="{rahmen.b}px"
      style:height="{rahmen.h}px"
    ></div>
  {:else}
    <div class="dunkel"></div>
  {/if}

  {#if schritt}
    <section class="blase" bind:this={blase} style:top="{blasenTop}px" aria-live="polite">
      <div class="kopf">
        <strong>{schritt.titel}</strong>
        <span class="zaehler">{stelle + 1}/{schritte.length}</span>
      </div>
      <p>{schritt.text}</p>
      <div class="knoepfe">
        {#if !letzter}<button type="button" class="leise" onclick={beenden}>beenden</button>{/if}
        <span class="rechts">
          {#if stelle > 0}<button type="button" onclick={zurueck}>zurück</button>{/if}
          {#if letzter && zumSchluss}
            <button type="button" onclick={zumSchluss.aktion}>{zumSchluss.titel}</button>
          {/if}
          <button type="button" class="haupt" onclick={weiter}>{letzter ? 'fertig' : 'weiter'}</button>
        </span>
      </div>
    </section>
  {/if}
</div>

<style>
  /* Ein Platzhalter hinter dem Inhalt – Polster am Rand reicht nicht, weil
     der Inhalt über den Hauptbereich hinauswächst. */
  :global(body.tour-laeuft main)::after {
    content: '';
    display: block;
    height: 70vh;
  }

  .tour {
    position: fixed;
    inset: 0;
    z-index: 50;
  }

  /* Das Ziel bleibt frei, alles drumherum wird dunkel – über den Schatten des Lochs. */
  .loch {
    position: fixed;
    border-radius: 10px;
    box-shadow:
      0 0 0 2px var(--akzent),
      0 0 0 9999px rgba(0, 0, 0, 0.62);
    pointer-events: none;
    transition:
      left 0.15s,
      top 0.15s,
      width 0.15s,
      height 0.15s;
  }

  .dunkel {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.62);
  }

  .blase {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    width: min(24rem, calc(100vw - 32px));
    box-sizing: border-box;
    padding: 14px 16px 12px;
    background: var(--flaeche-hoch);
    color: var(--text);
    border: 1px solid var(--akzent);
    border-radius: 12px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  }

  .kopf {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .zaehler {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  p {
    margin: 8px 0 12px;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .knoepfe {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .rechts {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  button {
    min-height: 40px;
    padding: 0 14px;
  }

  .haupt {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .leise {
    border-color: transparent;
    background: transparent;
    color: var(--text-leise);
  }
</style>
