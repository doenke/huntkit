<script lang="ts">
  import { rufe, type Kontoinfo } from '../lib/gruppe/api';

  /**
   * Prüft, ob Server-Sent Events auf diesem Webspace tragen.
   *
   * Der Server schickt sechs Ereignisse im Sekundentakt und danach alle fünf
   * Sekunden ein Lebenszeichen. Kommen die sechs einzeln an, reicht nichts
   * sie gepuffert weiter. Hält die Verbindung eine Minute, bricht der Hoster
   * sie auch nicht vorzeitig ab. Dann taugt `echtzeit => 'auto'` in der
   * config.php; sonst bleibt es beim Polling.
   */
  const DAUER = 60;

  type Ergebnis = {
    laeuft: boolean;
    server?: { erreichbar: boolean; eingerichtet: boolean; echtzeit?: string; oidc?: boolean; antwortzeit?: number; fehler?: string };
    erstes?: number;
    takte: number[];
    gehalten?: number;
    beendet?: 'normal' | 'abgebrochen' | 'fehler';
  };

  let ergebnis = $state<Ergebnis | null>(null);
  let quelle: EventSource | null = null;

  $effect(() => () => quelle?.close());

  async function serverPruefen(): Promise<Ergebnis['server']> {
    const start = performance.now();
    try {
      const info = await rufe<Kontoinfo>('konto.php');
      return {
        erreichbar: true,
        eingerichtet: true,
        echtzeit: info.echtzeit,
        oidc: info.oidc,
        antwortzeit: Math.round(performance.now() - start)
      };
    } catch (e) {
      const status = (e as { status?: number }).status ?? 0;
      return {
        // 403 und 404 kommen vom Webserver, nicht von huntkit: PHP läuft dort nicht
        // oder der Ordner ist gesperrt. Unser PHP antwortet ohne Einrichtung mit 503.
        erreichbar: status !== 0 && status !== 403 && status !== 404,
        eingerichtet: false,
        fehler: e instanceof Error ? e.message : String(e)
      };
    }
  }

  async function starten() {
    quelle?.close();
    ergebnis = { laeuft: true, takte: [] };
    ergebnis.server = await serverPruefen();

    if (typeof EventSource === 'undefined') {
      ergebnis.laeuft = false;
      ergebnis.beendet = 'fehler';
      return;
    }
    const start = performance.now();
    const seit = () => Math.round(performance.now() - start);
    const es = new EventSource(`api/echtzeittest.php?dauer=${DAUER}`);
    quelle = es;
    es.addEventListener('takt', () => {
      if (!ergebnis) return;
      ergebnis.erstes ??= seit();
      ergebnis.takte.push(seit());
      ergebnis.gehalten = seit();
    });
    es.addEventListener('lebt', () => {
      if (ergebnis) ergebnis.gehalten = seit();
    });
    es.addEventListener('ende', () => {
      es.close();
      if (!ergebnis) return;
      ergebnis.gehalten = seit();
      ergebnis.laeuft = false;
      ergebnis.beendet = 'normal';
    });
    es.addEventListener('error', () => {
      es.close();
      if (!ergebnis || !ergebnis.laeuft) return;
      ergebnis.laeuft = false;
      ergebnis.beendet = ergebnis.takte.length > 0 ? 'abgebrochen' : 'fehler';
    });
  }

  function abbrechen() {
    quelle?.close();
    if (ergebnis) {
      ergebnis.laeuft = false;
      ergebnis.beendet ??= 'abgebrochen';
    }
  }

  /** Kamen die sechs Takte einzeln? Gepuffert kommen sie alle auf einmal. */
  const einzeln = $derived.by(() => {
    const t = ergebnis?.takte ?? [];
    if (t.length < 6) return null;
    return (t[5] as number) - (t[0] as number) > 3500;
  });

  const empfehlung = $derived.by(() => {
    const e = ergebnis;
    if (!e || e.laeuft) return null;
    // Kommt gar nichts an und antwortet auch der Server nicht, lässt sich über SSE
    // nichts sagen – dann läuft PHP nicht oder der Ordner api/ ist gesperrt.
    if (e.beendet === 'fehler' && e.server && !e.server.erreichbar) {
      return 'Der Server ist nicht erreichbar – der Test sagt so nichts über SSE. Läuft PHP auf dem Webspace, und ist der Ordner api/ freigegeben?';
    }
    if (e.beendet === 'fehler') return 'Server-Sent Events kommen hier nicht an. Es bleibt beim Polling: echtzeit => \'polling\'.';
    if (einzeln === false) return 'Die Ereignisse kommen gebündelt an – irgendwo puffert der Server. Besser beim Polling bleiben.';
    if ((e.gehalten ?? 0) < DAUER * 1000 - 2000) {
      return `Die Verbindung hielt nur ${Math.round((e.gehalten ?? 0) / 1000)} s. Das geht noch (der Server beendet sie ohnehin nach 25 s), aber „auto“ ist sicherer als „sse“.`;
    }
    return 'Server-Sent Events tragen hier. In der config.php kann echtzeit => \'auto\' stehen.';
  });

  const ms = (n: number | undefined) => (n === undefined ? '–' : n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);
</script>

<div class="test">
  <p class="leise">
    Nur für Gruppen wichtig: Prüft, ob der Server Änderungen sofort melden kann (Server-Sent
    Events) oder ob die App regelmäßig nachfragen muss. Dauert eine Minute.
  </p>
  {#if ergebnis?.laeuft}
    <button type="button" onclick={abbrechen}>abbrechen</button>
  {:else}
    <button type="button" onclick={() => void starten()}>Serververbindung testen</button>
  {/if}

  {#if ergebnis}
    <dl>
      <dt>Gruppen-Server</dt>
      <dd>
        {#if !ergebnis.server}
          prüfe …
        {:else if ergebnis.server.eingerichtet}
          erreichbar, Antwort in {ms(ergebnis.server.antwortzeit)} · Modus „{ergebnis.server.echtzeit}“ · OIDC {ergebnis.server.oidc ? 'an' : 'aus'}
        {:else}
          {ergebnis.server.fehler}
        {/if}
      </dd>
      <dt>Erstes Ereignis</dt>
      <dd>{ms(ergebnis.erstes)}</dd>
      <dt>Takte</dt>
      <dd>
        {ergebnis.takte.length} von 6
        {#if einzeln === true}· einzeln angekommen{:else if einzeln === false}· gebündelt angekommen{/if}
        {#if ergebnis.takte.length > 0}
          <span class="mono leise">({ergebnis.takte.map((t) => ms(t)).join(', ')})</span>
        {/if}
      </dd>
      <dt>Verbindung gehalten</dt>
      <dd>{ms(ergebnis.gehalten)}{#if ergebnis.laeuft}&nbsp;…{/if}</dd>
    </dl>
    {#if empfehlung}<p class="empfehlung">{empfehlung}</p>{/if}
  {/if}
</div>

<style>
  .test {
    display: grid;
    gap: 8px;
    margin-bottom: 24px;
    justify-items: start;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    margin: 0;
    font-size: 0.85rem;
  }

  dt {
    color: var(--text-leise);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.9rem;
    margin: 0;
  }

  .empfehlung {
    margin: 0;
    color: var(--akzent);
    font-size: 0.9rem;
  }
</style>
