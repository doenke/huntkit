/**
 * Der Draht zum Gruppen-Server. Adressen sind relativ (`api/…`) – die App
 * findet ihren Server dort, wo sie selbst liegt, auch in einem Unterordner.
 */

export interface Ich {
  art: 'oidc' | 'gast';
  id: number;
  name: string;
  email?: string;
  darfAnlegen?: boolean;
  avatar?: string | null;
  gruppe?: string;
}

export type Rolle = 'admin' | 'mitglied' | 'gast';

export interface Mitglied {
  id: number;
  name: string;
  art: 'oidc' | 'gast';
  rolle: Rolle;
  avatar: string | null;
}

export interface GruppenDetails {
  id: string;
  name: string;
  einladung: string;
  rolle: Rolle;
  /** Die eigene Mitgliedsnummer in dieser Gruppe. */
  ich: number;
  mitglieder: Mitglied[];
  ehemalige: Array<{ id: number; name: string }>;
}

export interface ServerAenderung {
  werkbank: string;
  schluessel: string;
  wert: unknown;
  seq: number;
  von: number;
  zeit: number;
}

export interface Protokolleintrag {
  schluessel: string;
  alt: unknown;
  neu: unknown;
  seq: number;
  von: number;
  zeit: number;
}

export interface Kontoinfo {
  oidc: boolean;
  echtzeit: 'auto' | 'sse' | 'polling';
  ich: Ich | null;
}

export class ApiFehler extends Error {
  /** 0 heißt: keine Verbindung. */
  constructor(
    readonly status: number,
    text: string
  ) {
    super(text);
  }
}

export type Abruf = (adresse: string, init?: RequestInit) => Promise<Response>;

export async function rufe<T>(
  pfad: string,
  optionen: { token?: string | null; koerper?: unknown; abruf?: Abruf } = {}
): Promise<T> {
  const koepfe: Record<string, string> = { Accept: 'application/json' };
  if (optionen.token) koepfe['X-Huntkit-Token'] = optionen.token;
  if (optionen.koerper !== undefined) koepfe['Content-Type'] = 'application/json';
  let antwort: Response;
  try {
    antwort = await (optionen.abruf ?? fetch)(`api/${pfad}`, {
      method: optionen.koerper === undefined ? 'GET' : 'POST',
      headers: koepfe,
      body: optionen.koerper === undefined ? undefined : JSON.stringify(optionen.koerper),
      cache: 'no-store'
    });
  } catch {
    throw new ApiFehler(0, 'Keine Verbindung zum Server.');
  }
  let daten: unknown = null;
  try {
    daten = await antwort.json();
  } catch {
    // Kein JSON – etwa eine Fehlerseite des Webspace oder gar kein PHP.
  }
  if (!antwort.ok) {
    const text = (daten as { fehler?: string } | null)?.fehler;
    throw new ApiFehler(antwort.status, text ?? `Der Server antwortet mit ${antwort.status}.`);
  }
  if (daten === null) throw new ApiFehler(antwort.status, 'Der Server liefert keine lesbare Antwort.');
  return daten as T;
}

/** Wohin der Browser zur Anmeldung geht. */
export const ANMELDEADRESSE = 'api/oidc.php';

/** Adresse eines Avatars, relativ zur App. */
export function avatarAdresse(pfad: string | null | undefined): string | null {
  return pfad ? `api/${pfad}` : null;
}
