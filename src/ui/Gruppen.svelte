<script lang="ts">
  import { ANMELDEADRESSE, rufe, type GruppenDetails } from '../lib/gruppe/api';
  import { abgleich, aktiveGruppe, ansicht, einladungslink, setzeAktiveGruppe } from '../lib/gruppe/gruppen.svelte';
  import type { Verbindungsart } from '../lib/gruppe/verbindung';
  import { verschicke } from '../lib/werkbank/teilen';
  import Avatar from './Avatar.svelte';
  import Textzeile from './Textzeile.svelte';

  /**
   * Gruppen: anmelden, Gruppen anlegen und verwalten, einladen.
   *
   * Anlegen dürfen nur OIDC-Benutzer aus der dafür vorgesehenen Gruppe des
   * Anmeldedienstes; wer sie anlegt, ist dort Admin. Einladen darf jedes
   * Mitglied – der Link ist für alle sichtbar.
   */
  let {
    gruppeVergessen,
    melde
  }: {
    gruppeVergessen: (gruppe: string) => void;
    melde: (text: string) => void;
  } = $props();

  // Liest bei jeder Änderung im Abgleich neu – die Daten dort sind nicht reaktiv.
  const stand = $derived.by(() => {
    void ansicht.version;
    return {
      aktiv: aktiveGruppe(),
      info: abgleich.info,
      konto: abgleich.speicher.konto,
      gruppen: Object.values(abgleich.speicher.gruppen)
        .map((g) => ({ id: g.id, name: g.name, details: g.details, status: abgleich.status[g.id] }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    };
  });

  let neuerName = $state('');
  let anlegenOffen = $state(false);
  let offen = $state<string | null>(null);
  let bekannte = $state<Array<{ id: number; name: string; email: string; avatar: string | null }>>([]);
  let hinzuWahl = $state('');
  let verlassenGefragt = $state<string | null>(null);
  let umbenennend = $state<string | null>(null);
  let gruppenname = $state('');
  let fehler = $state('');

  const VERBINDUNG: Record<Verbindungsart, string> = {
    live: 'live',
    abfrage: 'verbunden',
    offline: 'offline',
    'kein-zugang': 'kein Zugang',
    start: '…'
  };

  async function versuche(arbeit: () => Promise<unknown>) {
    fehler = '';
    try {
      await arbeit();
    } catch (e) {
      fehler = e instanceof Error ? e.message : String(e);
    }
  }

  function anlegen() {
    const name = neuerName.trim();
    if (!name) return;
    void versuche(async () => {
      const details = await rufe<GruppenDetails>('gruppen.php', {
        token: stand.konto?.token,
        koerper: { aktion: 'anlegen', name }
      });
      abgleich.aufnehmen(details.id, details.name, undefined, details);
      neuerName = '';
      anlegenOffen = false;
      offen = details.id;
    });
  }

  async function einladen(id: string, name: string) {
    const details = abgleich.details(id) ?? (await abgleich.detailsLaden(id));
    if (!details) {
      fehler = 'Der Einladungslink ist erst mit Verbindung zum Server zu haben.';
      return;
    }
    const ergebnis = await verschicke(einladungslink(details.einladung), `Gruppe „${name}“ in huntkit`);
    if (ergebnis === 'kopiert') melde(`Einladungslink zu „${name}“ kopiert`);
    else if (ergebnis === 'nichts') fehler = einladungslink(details.einladung);
  }

  function aufklappen(id: string) {
    offen = offen === id ? null : id;
    verlassenGefragt = null;
    umbenennend = null;
    bekannte = [];
    if (offen === null) return;
    void abgleich.detailsLaden(id).then((d) => {
      if (d?.rolle !== 'admin') return;
      void versuche(async () => {
        const antwort = await rufe<{ benutzer: typeof bekannte }>(
          `gruppen.php?gruppe=${encodeURIComponent(id)}&bekannte=1`,
          { token: abgleich.tokenFuer(id) }
        );
        bekannte = antwort.benutzer;
      });
    });
  }

  function aktion(id: string, name: string, daten: Record<string, unknown> = {}) {
    void versuche(() => abgleich.gruppenAktion(id, name, daten));
  }

  function verlassen(id: string) {
    void versuche(async () => {
      await rufe('gruppen.php', { token: abgleich.tokenFuer(id), koerper: { aktion: 'verlassen', gruppe: id } });
      gruppeVergessen(id);
    });
  }

  function hinzufuegen(id: string) {
    const benutzer = Number(hinzuWahl);
    if (!benutzer) return;
    aktion(id, 'hinzufuegen', { benutzer });
    hinzuWahl = '';
  }
</script>

<section class="gruppen">
  <div class="kopf">
    {#if stand.konto}
      <span class="konto">
        <Avatar name={stand.konto.ich.name} bild={stand.konto.ich.avatar} groesse={22} />
        <span>{stand.konto.ich.name}</span>
        <button type="button" onclick={() => void abgleich.abmelden()}>abmelden</button>
      </span>
    {:else if stand.info?.oidc}
      <button type="button" onclick={() => (location.href = ANMELDEADRESSE)}>Anmelden</button>
    {/if}
  </div>

  {#if !stand.info && stand.gruppen.length === 0}
    <p class="leise">
      Mit einer Gruppe arbeiten mehrere Leute gleichzeitig an denselben Werkbänken. Dafür braucht es
      den Gruppen-Server – der ist gerade nicht erreichbar. Alles andere geht ohne ihn.
    </p>
  {:else if stand.gruppen.length === 0}
    <p class="leise">
      Mit einer Gruppe arbeiten mehrere Leute gleichzeitig an denselben Werkbänken. Beitreten geht
      über einen Einladungslink aus der Gruppe{#if stand.info?.oidc}; wer angemeldet ist, kann auch
      aufgenommen werden{/if}.
    </p>
  {/if}

  {#if stand.konto?.ich.darfAnlegen}
    {#if anlegenOffen}
      <div class="reihe">
        <Textzeile bind:value={neuerName} aria-label="Name der neuen Gruppe" placeholder="Name der Gruppe" enter={anlegen} />
        <button type="button" onclick={anlegen} disabled={!neuerName.trim()}>anlegen</button>
        <button type="button" onclick={() => (anlegenOffen = false)}>abbrechen</button>
      </div>
    {:else}
      <button type="button" class="neu" onclick={() => (anlegenOffen = true)}>+ Neue Gruppe</button>
    {/if}
  {/if}

  {#if fehler}
    <p class="fehler">{fehler}</p>
  {/if}

  <ul>
    {#each stand.gruppen as g (g.id)}
      {@const status = g.status}
      {@const admin = g.details?.rolle === 'admin'}
      <li class:hier={stand.aktiv === g.id}>
        <button type="button" class="wahl" onclick={() => aufklappen(g.id)} aria-expanded={offen === g.id}>
          <span class="name">{g.name}</span>
          <span class="info">
            {#if status && status.verbindung !== 'start'}
              <span class="punkt {status.verbindung}" aria-hidden="true"></span>
            {/if}
            {[
              status && status.verbindung !== 'start' ? VERBINDUNG[status.verbindung] : '',
              status?.ausstehend ? `${status.ausstehend} ausstehend` : '',
              g.details ? `${g.details.mitglieder.length} ${g.details.mitglieder.length === 1 ? 'Mitglied' : 'Mitglieder'}` : '',
              admin ? 'Admin' : g.details?.rolle === 'gast' ? 'Gast' : '',
              stand.aktiv === g.id ? 'aktiv' : ''
            ].filter(Boolean).join(' · ')}
          </span>
        </button>

        {#if status?.verbindung === 'kein-zugang'}
          <p class="fehler">{status.fehler ?? 'Kein Zugang mehr.'}</p>
          <div class="knoepfe">
            <button type="button" onclick={() => gruppeVergessen(g.id)}>hier entfernen</button>
          </div>
        {:else}
          <div class="knoepfe">
            {#if stand.aktiv === g.id}
              <button type="button" onclick={() => setzeAktiveGruppe(null)} title="Wieder nur auf diesem Gerät arbeiten">
                nicht mehr darin arbeiten
              </button>
            {:else}
              <button type="button" onclick={() => setzeAktiveGruppe(g.id)} title="Werkbänke und Kreuzworträtsel dieser Gruppe öffnen">
                darin arbeiten
              </button>
            {/if}
            <button type="button" onclick={() => void einladen(g.id, g.name)}>Einladen</button>
          </div>
        {/if}

        {#if offen === g.id && g.details}
          <div class="details">
            <ul class="mitglieder">
              {#each g.details.mitglieder as m (m.id)}
                <li>
                  <Avatar name={m.name} bild={m.avatar} groesse={26} />
                  <span class="mname">
                    {m.name}{#if m.id === g.details.ich}&nbsp;(du){/if}
                    <span class="leise">{m.rolle === 'admin' ? 'Admin' : m.rolle === 'gast' ? 'Gast' : ''}</span>
                  </span>
                  {#if admin && m.id !== g.details.ich}
                    {#if m.art === 'oidc'}
                      <button type="button" onclick={() => aktion(g.id, 'rolle', { mitglied: m.id, rolle: m.rolle === 'admin' ? 'mitglied' : 'admin' })}>
                        {m.rolle === 'admin' ? 'kein Admin' : 'zum Admin'}
                      </button>
                    {/if}
                    <button type="button" class="weg" aria-label={`${m.name} entfernen`} onclick={() => aktion(g.id, 'entfernen', { mitglied: m.id })}>✕</button>
                  {/if}
                </li>
              {/each}
            </ul>

            {#if admin}
              {@const dabei = new Set(g.details.mitglieder.filter((m) => m.art === 'oidc').map((m) => m.name))}
              {@const kandidaten = bekannte.filter((b) => !dabei.has(b.name))}
              {#if kandidaten.length > 0}
                <div class="reihe">
                  <select bind:value={hinzuWahl} aria-label="Angemeldeten Benutzer hinzufügen">
                    <option value="">Benutzer hinzufügen …</option>
                    {#each kandidaten as b (b.id)}
                      <option value={String(b.id)}>{b.name}{b.email ? ` (${b.email})` : ''}</option>
                    {/each}
                  </select>
                  <button type="button" onclick={() => hinzufuegen(g.id)} disabled={!hinzuWahl}>hinzufügen</button>
                </div>
              {/if}
              {#if umbenennend === g.id}
                <div class="reihe">
                  <Textzeile bind:value={gruppenname} aria-label="Neuer Name der Gruppe" enter={() => { aktion(g.id, 'umbenennen', { name: gruppenname }); umbenennend = null; }} />
                  <button type="button" onclick={() => { aktion(g.id, 'umbenennen', { name: gruppenname }); umbenennend = null; }}>fertig</button>
                </div>
              {/if}
            {/if}

            <div class="knoepfe">
              {#if admin}
                <button type="button" onclick={() => { umbenennend = g.id; gruppenname = g.name; }}>umbenennen</button>
                <button type="button" onclick={() => aktion(g.id, 'einladung_erneuern')} title="Der bisherige Link gilt danach nicht mehr">
                  neuer Einladungslink
                </button>
              {/if}
              {#if verlassenGefragt === g.id}
                <button type="button" class="ernst" onclick={() => verlassen(g.id)}>wirklich verlassen</button>
                <button type="button" onclick={() => (verlassenGefragt = null)}>abbrechen</button>
              {:else}
                <button type="button" onclick={() => (verlassenGefragt = g.id)}>Gruppe verlassen</button>
              {/if}
            </div>
            {#if verlassenGefragt === g.id}
              <p class="leise">Die Werkbänke der Gruppe bleiben als eigene Kopien auf diesem Gerät.</p>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  /* Den Titel „Gruppen“ trägt schon der Kopf der App; hier steht rechts nur das Konto. */
  .kopf {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .konto {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
  }

  button {
    min-height: 36px;
    font-size: 0.8rem;
  }

  .neu {
    margin-top: 8px;
  }

  .reihe {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .reihe select {
    flex: 1 1 12rem;
    min-width: 0;
  }

  ul {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  li {
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    padding: 6px;
  }

  li.hier {
    border-color: var(--akzent);
  }

  .wahl {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    border: none;
    background: none;
    padding: 2px 4px;
    text-align: left;
  }

  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .info,
  .leise {
    color: var(--text-leise);
    font-size: 0.78rem;
  }

  .punkt {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-leise);
    margin-right: 2px;
  }

  .punkt.live,
  .punkt.abfrage {
    background: #3a9d5d;
  }

  .punkt.offline {
    background: #c9a227;
  }

  .punkt.kein-zugang {
    background: var(--warn);
  }

  .knoepfe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .details {
    border-top: 1px solid var(--rand);
    margin-top: 8px;
    padding-top: 8px;
  }

  .mitglieder {
    margin: 0;
    gap: 4px;
  }

  .mitglieder li {
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
    padding: 2px 0;
  }

  .mname {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-wrap: anywhere;
    font-size: 0.9rem;
  }

  .weg {
    min-width: 36px;
  }

  .ernst {
    border-color: var(--warn);
    color: var(--warn);
  }

  .fehler {
    color: var(--warn);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
</style>
