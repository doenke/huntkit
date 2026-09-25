import type { Blatt } from '../werkbank/blatt';
import { kennung } from '../werkbank/blatt';
import { istKreuzwort, kreuzwortKennung } from '../kreuzwort/kreuzwortgruppe';
import {
  ansicht,
  bestaetige,
  blattAus,
  ladeGruppenspeicher,
  neueGruppe,
  nimmLokal,
  nimmServer,
  setzeAusgang,
  sichereGruppenspeicher,
  werkbaenkeDer,
  type Gruppenspeicher,
  type Gruppenstand
} from './abgleich';
import { ApiFehler, rufe, type Abruf, type GruppenDetails, type Kontoinfo, type ServerAenderung } from './api';

/**
 * Hält die Gruppen mit dem Server in Gleichklang: schickt den Ausgang, holt
 * Neues ab und meldet, welche Werkbank sich geändert hat.
 *
 * Abgeholt wird per Polling – alle 1,5 s für die aktive Gruppe,
 * seltener für die übrigen und bei verstecktem Tab. Erlaubt der Server
 * Server-Sent Events, klingelt er stattdessen, sobald es Neues gibt; dann
 * wird nur noch zur Sicherheit gelegentlich nachgesehen. Scheitert die
 * Klingel wiederholt, bleibt es für eine Weile beim Polling.
 *
 * Ohne Netz passiert nichts Schlimmes: Der Ausgang liegt im Speicher des
 * Geräts und geht raus, sobald wieder Verbindung besteht.
 */

export type Verbindungsart = 'live' | 'abfrage' | 'offline' | 'kein-zugang' | 'start';

export interface Gruppenstatus {
  verbindung: Verbindungsart;
  ausstehend: number;
  fehler?: string;
}

export interface Meldungen {
  /** Eine Werkbank hat sich durch den Server geändert (oder ist neu, oder gelöscht). */
  werkbank(gruppe: string, werkbank: string, stand: { blatt: Blatt; name: string; geloescht: boolean }): void;
  /** Jemand anderes hat diese Schlüssel angefasst – für die kurze Markierung in der Tabelle. */
  fremd?(gruppe: string, aenderungen: ServerAenderung[]): void;
  /** Status, Konto oder Gruppenliste haben sich geändert. */
  zustand(): void;
}

const TAKT_AKTIV = 1500;
const TAKT_RUHIG = 15_000;
const TAKT_MIT_KLINGEL = 30_000;
const KLINGELPAUSE = 5 * 60_000;

export class Gruppenabgleich {
  readonly speicher: Gruppenspeicher;
  readonly status: Record<string, Gruppenstatus> = {};
  info: Kontoinfo | null = null;

  private aktiv: string | null = null;
  private sichtbar = true;
  private uhren = new Map<string, ReturnType<typeof setTimeout>>();
  private laeuft = new Set<string>();
  private nochmal = new Set<string>();
  private fehlversuche = new Map<string, number>();
  private klingel: { gruppe: string; quelle: EventSource } | null = null;
  private klingelFehler = 0;
  private klingelGesperrtBis = 0;
  private sicherUhr: ReturnType<typeof setTimeout> | undefined;
  private beendet = false;
  /** Gruppen, die in dieser Sitzung schon einmal abgeholt wurden. Der erste Abruf markiert nichts als „frisch“. */
  private geholt = new Set<string>();
  private signaturen = new Map<string, string>();
  private termine = new Map<string, number>();

  constructor(
    private readonly meldungen: Meldungen,
    private readonly abruf?: Abruf,
    speicher?: Gruppenspeicher
  ) {
    this.speicher = speicher ?? ladeGruppenspeicher();
    for (const id of Object.keys(this.speicher.gruppen)) this.status[id] = this.anfangsstatus(id);
  }

  /* ---------- Steuerung ---------- */

  start(): void {
    this.beendet = false;
    void this.kontoLaden();
    for (const id of Object.keys(this.speicher.gruppen)) this.plane(id, 0);
  }

  stopp(): void {
    this.beendet = true;
    for (const uhr of this.uhren.values()) clearTimeout(uhr);
    this.uhren.clear();
    this.termine.clear();
    this.klingelAus();
  }

  /** Die aktive Gruppe bekommt den schnellen Takt (und die Klingel). */
  setzeAktiv(gruppe: string | null): void {
    if (this.aktiv === gruppe) return;
    this.aktiv = gruppe;
    this.klingelAus();
    if (gruppe) this.plane(gruppe, 0);
  }

  setzeSichtbar(sichtbar: boolean): void {
    this.sichtbar = sichtbar;
    if (sichtbar && this.aktiv) this.plane(this.aktiv, 0);
    if (!sichtbar) this.klingelAus();
  }

  /** Wieder Netz: alle sofort versuchen. */
  wiederOnline(): void {
    this.fehlversuche.clear();
    for (const id of Object.keys(this.speicher.gruppen)) this.plane(id, 0);
  }

  /* ---------- Konto ---------- */

  tokenFuer(gruppe: string): string | null {
    return this.speicher.gruppen[gruppe]?.token ?? this.speicher.konto?.token ?? null;
  }

  async kontoLaden(): Promise<void> {
    try {
      this.info = await rufe<Kontoinfo>('konto.php', { token: this.speicher.konto?.token ?? null, abruf: this.abruf });
      if (this.speicher.konto) {
        if (this.info.ich?.art === 'oidc') this.speicher.konto.ich = this.info.ich;
        else delete this.speicher.konto; // Sitzung auf dem Server nicht mehr gültig.
        this.sichere();
      }
      if (this.speicher.konto) await this.gruppenDesKontos();
    } catch {
      // Kein Server oder kein Netz – dann eben später.
    }
    this.meldungen.zustand();
  }

  /** Nach der Rückkehr von der OIDC-Anmeldung. */
  async anmeldungEinloesen(code: string): Promise<void> {
    const antwort = await rufe<{ token: string; ich: NonNullable<Kontoinfo['ich']> }>('konto.php', {
      koerper: { aktion: 'einloesen', code },
      abruf: this.abruf
    });
    this.speicher.konto = { token: antwort.token, ich: antwort.ich };
    // Sofort: Wer gleich danach neu lädt, soll angemeldet bleiben.
    this.sichereJetzt();
    await this.kontoLaden();
  }

  async abmelden(): Promise<void> {
    const token = this.speicher.konto?.token;
    delete this.speicher.konto;
    this.sichereJetzt();
    this.meldungen.zustand();
    if (token) await rufe('konto.php', { token, koerper: { aktion: 'abmelden' }, abruf: this.abruf }).catch(() => {});
  }

  /** Alle Gruppen, in denen das Konto Mitglied ist, aufnehmen. */
  async gruppenDesKontos(): Promise<void> {
    const token = this.speicher.konto?.token;
    if (!token) return;
    const { gruppen } = await rufe<{ gruppen: Array<{ id: string; name: string }> }>('gruppen.php', {
      token,
      abruf: this.abruf
    });
    for (const g of gruppen) this.aufnehmen(g.id, g.name);
  }

  /* ---------- Gruppen ---------- */

  aufnehmen(id: string, name: string, token?: string, details?: GruppenDetails): void {
    const vorhanden = this.speicher.gruppen[id];
    if (vorhanden) {
      vorhanden.name = name;
      if (token) vorhanden.token = token;
      if (details) vorhanden.details = details;
    } else {
      const g = neueGruppe(id, name, token);
      if (details) g.details = details;
      this.speicher.gruppen[id] = g;
      this.status[id] = this.anfangsstatus(id);
    }
    this.sichere();
    this.meldungen.zustand();
    this.plane(id, 0);
  }

  /** Die Gruppe hier vergessen. Ihre Werkbänke entscheidet der Aufrufer. */
  vergessen(id: string): void {
    delete this.speicher.gruppen[id];
    delete this.status[id];
    const uhr = this.uhren.get(id);
    if (uhr) clearTimeout(uhr);
    this.uhren.delete(id);
    this.termine.delete(id);
    if (this.klingel?.gruppe === id) this.klingelAus();
    this.sichere();
    this.meldungen.zustand();
  }

  details(id: string): GruppenDetails | undefined {
    return this.speicher.gruppen[id]?.details;
  }

  async detailsLaden(id: string): Promise<GruppenDetails | undefined> {
    const g = this.speicher.gruppen[id];
    if (!g) return undefined;
    try {
      g.details = await rufe<GruppenDetails>(`gruppen.php?gruppe=${encodeURIComponent(id)}`, {
        token: this.tokenFuer(id),
        abruf: this.abruf
      });
      g.name = g.details.name;
      this.sichere();
      this.meldungen.zustand();
    } catch (fehler) {
      this.fehlerMerken(id, fehler);
    }
    return g.details;
  }

  /** Eine Aktion auf der Gruppe (anlegen ausgenommen); die Antwort sind neue Details. */
  async gruppenAktion(id: string, aktion: string, daten: Record<string, unknown> = {}): Promise<GruppenDetails> {
    const details = await rufe<GruppenDetails>('gruppen.php', {
      token: this.tokenFuer(id),
      koerper: { aktion, gruppe: id, ...daten },
      abruf: this.abruf
    });
    const g = this.speicher.gruppen[id];
    if (g) {
      g.details = details;
      g.name = details.name;
      this.sichere();
    }
    this.meldungen.zustand();
    return details;
  }

  /* ---------- Werkbänke ---------- */

  /** Die offene Werkbank hat sich lokal geändert. */
  lokal(gruppe: string, werkbank: string, blatt: Blatt, name: string): void {
    const g = this.speicher.gruppen[gruppe];
    if (!g) return;
    if (nimmLokal(g, werkbank, blatt, name, kennung)) {
      this.sichere();
      this.aktualisiereStatus(gruppe);
      this.plane(gruppe, 250);
    }
  }

  /** Eine Werkbank der Gruppe löschen – für alle. Nur Admins. */
  loeschen(gruppe: string, werkbank: string): void {
    const g = this.speicher.gruppen[gruppe];
    if (!g) return;
    g.ausgang.push({ op: kennung(), werkbank, schluessel: 'geloescht', wert: true });
    this.sichere();
    this.aktualisiereStatus(gruppe);
    this.plane(gruppe, 0);
  }

  werkbaenke(gruppe: string): Array<{ id: string; blatt: Blatt; name: string; geloescht: boolean }> {
    const g = this.speicher.gruppen[gruppe];
    if (!g) return [];
    return werkbaenkeDer(g)
      .filter((id) => !istKreuzwort(id))
      .map((id) => ({ id, ...blattAus(g, id) }));
  }

  /* ---------- Kreuzworträtsel ---------- */

  /** Das Kreuzworträtsel der Gruppe als Schlüssel – bestätigt, mit dem Ausgang obendrauf. */
  kreuzwort(gruppe: string): Record<string, unknown> {
    const g = this.speicher.gruppen[gruppe];
    return g ? ansicht(g, kreuzwortKennung(gruppe)) : {};
  }

  /** Einen Schlüssel des Kreuzworträtsels ändern; `null` löscht ihn. */
  kreuzwortSetzen(gruppe: string, aenderungen: ReadonlyArray<readonly [string, unknown]>): void {
    const g = this.speicher.gruppen[gruppe];
    if (!g || aenderungen.length === 0) return;
    for (const [schluessel, wert] of aenderungen) setzeAusgang(g, kreuzwortKennung(gruppe), schluessel, wert, kennung);
    this.sichere();
    this.aktualisiereStatus(gruppe);
    // Die Seite liest nach jeder Meldung frisch – so steht die eigene Eingabe sofort da.
    this.meldungen.zustand();
    this.plane(gruppe, 250);
  }

  /** Wer einen Schlüssel des Kreuzworträtsels zuletzt geändert hat. */
  kreuzwortEintrag(gruppe: string, schluessel: string) {
    return this.eintrag(gruppe, kreuzwortKennung(gruppe), schluessel);
  }

  /** Wer einen Schlüssel zuletzt geändert hat, soweit bekannt. */
  eintrag(gruppe: string, werkbank: string, schluessel: string) {
    return this.speicher.gruppen[gruppe]?.werkbaenke[werkbank]?.[schluessel];
  }

  istAusstehend(gruppe: string, werkbank: string, schluessel: string): boolean {
    return Boolean(
      this.speicher.gruppen[gruppe]?.ausgang.some((a) => a.werkbank === werkbank && a.schluessel === schluessel)
    );
  }

  /* ---------- Takt ---------- */

  private plane(gruppe: string, verzoegerung?: number): void {
    if (this.beendet || !this.speicher.gruppen[gruppe]) return;
    const warten = verzoegerung ?? this.naechsterTakt(gruppe);
    const faellig = Date.now() + warten;
    // Ein früherer Termin bleibt stehen. Sonst ersetzte das Ende eines
    // laufenden Abrufs den kurzen Termin fürs Senden, den das Tippen
    // währenddessen gesetzt hat, durch den langen Ruhetakt.
    const alt = this.uhren.get(gruppe);
    if (alt && (this.termine.get(gruppe) ?? Infinity) <= faellig) return;
    if (alt) clearTimeout(alt);
    this.termine.set(gruppe, faellig);
    this.uhren.set(
      gruppe,
      setTimeout(() => {
        this.uhren.delete(gruppe);
        this.termine.delete(gruppe);
        void this.takt(gruppe);
      }, warten)
    );
  }

  private naechsterTakt(gruppe: string): number {
    const fehler = this.fehlversuche.get(gruppe) ?? 0;
    if (fehler > 0) return Math.min(30_000, 1000 * 2 ** Math.min(fehler, 5));
    if (this.status[gruppe]?.verbindung === 'kein-zugang') return 5 * 60_000;
    if (this.klingel?.gruppe === gruppe) return TAKT_MIT_KLINGEL;
    return gruppe === this.aktiv && this.sichtbar ? TAKT_AKTIV : TAKT_RUHIG;
  }

  private async takt(gruppe: string): Promise<void> {
    if (this.laeuft.has(gruppe)) {
      this.nochmal.add(gruppe);
      return;
    }
    this.laeuft.add(gruppe);
    try {
      // Die eigene Mitgliedsnummer muss bekannt sein, bevor etwas bestätigt
      // wird – sonst stünde im Stand nicht, dass man es selbst war.
      if (!this.speicher.gruppen[gruppe]?.details) await this.detailsLaden(gruppe);
      await this.senden(gruppe);
      await this.holen(gruppe);
      this.fehlversuche.delete(gruppe);
      const s = this.status[gruppe];
      if (s) {
        s.verbindung = this.klingel?.gruppe === gruppe ? 'live' : 'abfrage';
        delete s.fehler;
      }
      this.klingelPruefen(gruppe);
    } catch (fehler) {
      this.fehlerMerken(gruppe, fehler);
    } finally {
      this.laeuft.delete(gruppe);
      this.aktualisiereStatus(gruppe);
      if (this.nochmal.delete(gruppe)) this.plane(gruppe, 0);
      else this.plane(gruppe);
    }
  }

  private async senden(gruppe: string): Promise<void> {
    for (;;) {
      const g = this.speicher.gruppen[gruppe];
      if (!g || g.ausgang.length === 0) return;
      const stapel = g.ausgang.slice(0, 200);
      for (const a of stapel) a.unterwegs = true;
      const antwort = await rufe<{ bestaetigt: Array<{ op: string; seq: number }>; seq: number }>('abgleich.php', {
        token: this.tokenFuer(gruppe),
        koerper: {
          gruppe,
          aenderungen: stapel.map((a) => ({ op: a.op, werkbank: a.werkbank, schluessel: a.schluessel, wert: a.wert }))
        },
        abruf: this.abruf
      });
      bestaetige(g, antwort.bestaetigt, g.details?.ich ?? -1, Date.now());
      this.sichere();
      this.aktualisiereStatus(gruppe);
    }
  }

  private async holen(gruppe: string): Promise<void> {
    const g = this.speicher.gruppen[gruppe];
    if (!g) return;
    const ersterAbruf = !this.geholt.has(gruppe);
    this.geholt.add(gruppe);
    const geaendert = new Set<string>();
    const fremd: ServerAenderung[] = [];
    for (;;) {
      const antwort = await rufe<{ seq: number; weiter: boolean; aenderungen: ServerAenderung[] }>(
        `abgleich.php?gruppe=${encodeURIComponent(gruppe)}&seit=${g.seq}`,
        { token: this.tokenFuer(gruppe), abruf: this.abruf }
      );
      const neu = nimmServer(g, antwort.aenderungen, g.details?.ich);
      for (const w of neu.werkbaenke) geaendert.add(w);
      fremd.push(...neu.fremd);
      g.seq = antwort.seq;
      if (!antwort.weiter) break;
    }
    if (geaendert.size === 0) {
      this.sichere();
      return;
    }
    this.sichere();
    // Unbekannte Namen im Protokoll? Dann ist jemand neu dazugekommen.
    const bekannt = new Set([...(g.details?.mitglieder ?? []), ...(g.details?.ehemalige ?? [])].map((m) => m.id));
    if (fremd.some((a) => !bekannt.has(a.von))) void this.detailsLaden(gruppe);
    let kreuzwort = false;
    for (const w of geaendert) {
      if (istKreuzwort(w)) kreuzwort = true;
      else this.meldungen.werkbank(gruppe, w, blattAus(g, w));
    }
    if (kreuzwort) this.meldungen.zustand();
    if (!ersterAbruf && fremd.length > 0) this.meldungen.fremd?.(gruppe, fremd);
  }

  private fehlerMerken(gruppe: string, fehler: unknown): void {
    const s = this.status[gruppe];
    if (!s) return;
    if (fehler instanceof ApiFehler && (fehler.status === 401 || fehler.status === 403 || fehler.status === 404)) {
      s.verbindung = 'kein-zugang';
      s.fehler = fehler.message;
    } else {
      this.fehlversuche.set(gruppe, (this.fehlversuche.get(gruppe) ?? 0) + 1);
      s.verbindung = 'offline';
      s.fehler = fehler instanceof Error ? fehler.message : String(fehler);
    }
    this.aktualisiereStatus(gruppe);
  }

  private aktualisiereStatus(gruppe: string): void {
    const s = this.status[gruppe];
    const g = this.speicher.gruppen[gruppe];
    if (!s || !g) return;
    s.ausstehend = g.ausgang.length;
    // Nur melden, was sich geändert hat – sonst zeichnete die Oberfläche bei
    // jedem Abruf im Sekundentakt neu.
    const signatur = JSON.stringify(s);
    if (this.signaturen.get(gruppe) === signatur) return;
    this.signaturen.set(gruppe, signatur);
    this.meldungen.zustand();
  }

  private anfangsstatus(gruppe: string): Gruppenstatus {
    return { verbindung: 'start', ausstehend: this.speicher.gruppen[gruppe]?.ausgang.length ?? 0 };
  }

  /* ---------- Klingel (Server-Sent Events) ---------- */

  private klingelPruefen(gruppe: string): void {
    const modus = this.info?.echtzeit ?? 'polling';
    if (modus === 'polling' || typeof EventSource === 'undefined') return;
    if (gruppe !== this.aktiv || !this.sichtbar || this.klingel) return;
    if (Date.now() < this.klingelGesperrtBis) return;
    const g = this.speicher.gruppen[gruppe];
    if (!g) return;

    const quelle = new EventSource(`api/ereignisse.php?gruppe=${encodeURIComponent(gruppe)}&seit=${g.seq}`);
    this.klingel = { gruppe, quelle };
    let offen = false;
    const aufgeben = setTimeout(() => {
      if (!offen) this.klingelGescheitert(quelle);
    }, 5000);

    quelle.addEventListener('open', () => {
      offen = true;
      clearTimeout(aufgeben);
      this.klingelFehler = 0;
      const s = this.status[gruppe];
      if (s && s.verbindung !== 'offline') s.verbindung = 'live';
      this.meldungen.zustand();
    });
    quelle.addEventListener('stand', (e) => {
      const seq = Number((e as MessageEvent).data);
      if (seq > (this.speicher.gruppen[gruppe]?.seq ?? 0)) this.plane(gruppe, 0);
    });
    // Der Server beendet jede Verbindung nach kurzer Zeit von selbst. Neu
    // verbunden wird mit dem aktuellen Stand, nicht mit der alten Adresse.
    quelle.addEventListener('ende', () => {
      clearTimeout(aufgeben);
      if (this.klingel?.quelle === quelle) this.klingelAus();
      setTimeout(() => this.klingelPruefen(gruppe), 200);
    });
    quelle.addEventListener('error', () => {
      if (quelle.readyState === EventSource.CLOSED || !offen) {
        clearTimeout(aufgeben);
        this.klingelGescheitert(quelle);
      }
    });
  }

  private klingelGescheitert(quelle: EventSource): void {
    if (this.klingel?.quelle !== quelle) return;
    this.klingelAus();
    this.klingelFehler++;
    if (this.klingelFehler >= 3 || this.info?.echtzeit !== 'sse') {
      this.klingelGesperrtBis = Date.now() + KLINGELPAUSE;
      this.klingelFehler = 0;
    }
    this.meldungen.zustand();
  }

  private klingelAus(): void {
    if (!this.klingel) return;
    const { gruppe, quelle } = this.klingel;
    quelle.close();
    this.klingel = null;
    const s = this.status[gruppe];
    if (s?.verbindung === 'live') s.verbindung = 'abfrage';
    this.plane(gruppe);
  }

  /* ---------- Speicher ---------- */

  /** Gebündelt: Beim Tippen soll nicht jeder Buchstabe den ganzen Speicher schreiben. */
  private sichere(): void {
    clearTimeout(this.sicherUhr);
    this.sicherUhr = setTimeout(() => sichereGruppenspeicher(this.speicher), 200);
  }

  /** Sofort sichern – vor dem Schließen der Seite. */
  sichereJetzt(): void {
    clearTimeout(this.sicherUhr);
    sichereGruppenspeicher(this.speicher);
  }
}

export type { Gruppenstand };
