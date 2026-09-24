<script lang="ts">
  import { rufe } from '../lib/gruppe/api';

  /**
   * Wie es dem Gruppen-Server geht: Datenbank, Tabellen, Größe, Anmeldedienst.
   * Für die Einrichtung – im Alltag braucht das niemand.
   */
  type Tabelle = { name: string; da: boolean; zeilen?: number; bytes?: number | null };
  type Status = {
    php: string;
    erweiterungen: Record<string, boolean>;
    echtzeit: string;
    debug: boolean;
    log: { aktiv: boolean; datei: string | null };
    datenbank: {
      verbunden: boolean;
      fehler?: string;
      treiber?: string;
      version?: string;
      schema?: number;
      tabellen?: Tabelle[];
      bytes?: number;
    };
    oidc: {
      eingerichtet: boolean;
      erreichbar?: boolean;
      fehler?: string;
      issuer?: string;
      redirect_uri?: string;
      anlegegruppe?: string;
      gruppen_claim?: string;
      userinfo?: boolean;
    };
  };

  let status = $state<Status | null>(null);
  let fehler = $state('');
  let laedt = $state(false);

  async function pruefen() {
    laedt = true;
    fehler = '';
    try {
      status = await rufe<Status>('status.php');
    } catch (e) {
      status = null;
      fehler = e instanceof Error ? e.message : String(e);
    } finally {
      laedt = false;
    }
  }

  function groesse(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '–';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  const fehlend = $derived(status?.datenbank.tabellen?.filter((t) => !t.da) ?? []);
</script>

<div class="status">
  <button type="button" onclick={() => void pruefen()} disabled={laedt}>
    {laedt ? 'prüfe …' : status ? 'neu prüfen' : 'Serverstatus anzeigen'}
  </button>

  {#if fehler}
    <p class="warn">{fehler}</p>
  {/if}

  {#if status}
    {@const db = status.datenbank}
    <dl>
      <dt>Datenbank</dt>
      <dd>
        {#if db.verbunden}
          <span class="gut">verbunden</span> · {db.treiber} {db.version}
        {:else}
          <span class="warn">keine Verbindung</span>{#if db.fehler}: {db.fehler}{/if}
        {/if}
      </dd>
      {#if db.verbunden}
        <dt>Tabellen</dt>
        <dd>
          {#if fehlend.length === 0}
            <span class="gut">alle {db.tabellen?.length} da</span> · Schema {db.schema}
          {:else}
            <span class="warn">es fehlen: {fehlend.map((t) => t.name).join(', ')}</span>
          {/if}
        </dd>
        <dt>Größe</dt>
        <dd>{groesse(db.bytes)}</dd>
      {/if}
      <dt>Anmeldedienst</dt>
      <dd>
        {#if !status.oidc.eingerichtet}
          nicht eingerichtet
        {:else if status.oidc.erreichbar}
          <span class="gut">erreichbar</span> · {status.oidc.issuer}
        {:else}
          <span class="warn">nicht erreichbar</span>{#if status.oidc.fehler}: {status.oidc.fehler}{/if}
        {/if}
      </dd>
      {#if status.oidc.redirect_uri}
        <dt>Rückleitung</dt>
        <dd class="mono">{status.oidc.redirect_uri}</dd>
        <dt>Anlegen darf</dt>
        <dd>Gruppe „{status.oidc.anlegegruppe}“ im Claim „{status.oidc.gruppen_claim}“</dd>
      {/if}
      <dt>PHP</dt>
      <dd>
        {status.php}
        {#each Object.entries(status.erweiterungen) as [name, da] (name)}
          · <span class:gut={da} class:leise={!da}>{name}{da ? '' : ' fehlt'}</span>
        {/each}
      </dd>
      <dt>Log</dt>
      <dd>{status.log.aktiv ? `${status.log.datei} im Daten-Ordner` : 'nur im error_log von PHP'}{status.debug ? ' · debug an' : ''}</dd>
      <dt>Echtzeit</dt>
      <dd>{status.echtzeit}</dd>
    </dl>

    {#if db.verbunden && db.tabellen}
      <details>
        <summary>Tabellen im Einzelnen</summary>
        <table>
          <thead><tr><th>Tabelle</th><th>Zeilen</th><th>Größe</th></tr></thead>
          <tbody>
            {#each db.tabellen as t (t.name)}
              <tr>
                <td class="mono">{t.name}</td>
                <td>{t.da ? t.zeilen : '–'}</td>
                <td>{t.da ? groesse(t.bytes) : 'fehlt'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </details>
    {/if}
  {/if}
</div>

<style>
  .status {
    display: grid;
    gap: 8px;
    justify-items: start;
    margin-bottom: 16px;
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

  .gut {
    color: #3a9d5d;
  }

  .warn {
    color: var(--warn);
  }

  .leise {
    color: var(--text-leise);
  }

  details {
    font-size: 0.85rem;
  }

  table {
    border-collapse: collapse;
    margin-top: 6px;
  }

  th,
  td {
    padding: 2px 10px 2px 0;
    text-align: left;
  }

  th {
    color: var(--text-leise);
    font-weight: normal;
  }
</style>
