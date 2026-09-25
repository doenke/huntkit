import type { Blatt } from '../werkbank/blatt';
import type { GruppenDetails, Ich, ServerAenderung } from './api';
import { ausSchluesseln, gleich, unterschiede, zuSchluesseln, type Schluessel, type Wert } from './schluessel';

/**
 * Was ein Gerät über seine Gruppen weiß – und was es noch loswerden muss.
 *
 * Je Werkbank gibt es zwei Schichten:
 * - den **bestätigten Stand**: jeder Schlüssel so, wie der Server ihn zuletzt
 *   gemeldet hat, mit seiner Nummer;
 * - den **Ausgang**: eigene Änderungen, die der Server noch nicht bestätigt hat.
 *
 * Was man sieht, ist der bestätigte Stand mit dem Ausgang obendrauf. Kommt
 * Neues vom Server, ändert sich nur die untere Schicht – eigene Änderungen,
 * die noch unterwegs sind, bleiben sichtbar. Deshalb springt eine Zelle, in
 * der man gerade tippt, nicht zurück.
 *
 * Ein Schlüssel wird nur überschrieben, wenn die neue Nummer höher ist. So
 * ist egal, ob die Bestätigung des eigenen Sendens oder der Abruf zuerst
 * ankommt.
 */

export interface Eintrag {
  wert: Wert;
  seq: number;
  /** Mitgliedsnummer. */
  von: number;
  zeit: number;
}

export interface Ausgehend {
  op: string;
  werkbank: string;
  schluessel: string;
  wert: Wert;
  /** Schon einmal abgeschickt – dann wird der Wert nicht mehr verändert. */
  unterwegs?: boolean;
}

export interface Gruppenstand {
  id: string;
  name: string;
  /** Nur für Gäste: das Token dieser einen Mitgliedschaft. */
  token?: string;
  /** Bis zu dieser Nummer ist alles abgeholt. */
  seq: number;
  werkbaenke: Record<string, Record<string, Eintrag>>;
  ausgang: Ausgehend[];
  details?: GruppenDetails;
}

export interface Gruppenspeicher {
  konto?: { token: string; ich: Ich };
  gruppen: Record<string, Gruppenstand>;
}

/** Schlüssel, die nicht aus dem Blatt kommen und deshalb nie als „weggefallen“ gelten. */
const NICHT_AUS_DEM_BLATT = new Set(['geloescht']);

export function neueGruppe(id: string, name: string, token?: string): Gruppenstand {
  return { id, name, seq: 0, werkbaenke: {}, ausgang: [], ...(token ? { token } : {}) };
}

/** Bestätigter Stand mit dem Ausgang obendrauf. */
export function ansicht(g: Gruppenstand, werkbank: string): Schluessel {
  const s: Schluessel = {};
  for (const [k, e] of Object.entries(g.werkbaenke[werkbank] ?? {})) s[k] = e.wert;
  for (const a of g.ausgang) if (a.werkbank === werkbank) s[a.schluessel] = a.wert;
  return s;
}

export function blattAus(g: Gruppenstand, werkbank: string): { blatt: Blatt; name: string; geloescht: boolean } {
  const s = ansicht(g, werkbank);
  return {
    blatt: ausSchluesseln(s),
    name: typeof s.name === 'string' && s.name.trim() ? s.name : 'Werkbank',
    geloescht: s.geloescht === true
  };
}

/** Werkbänke, die es in der Gruppe gibt – auch solche, die bisher nur im Ausgang stehen. */
export function werkbaenkeDer(g: Gruppenstand): string[] {
  const ids = new Set(Object.keys(g.werkbaenke));
  for (const a of g.ausgang) ids.add(a.werkbank);
  return [...ids];
}

/**
 * Eine lokale Änderung aufnehmen: vergleichen, was man jetzt vor sich hat,
 * mit dem, was bisher galt, und die Unterschiede in den Ausgang legen.
 * Liefert, ob etwas dazukam.
 */
export function nimmLokal(
  g: Gruppenstand,
  werkbank: string,
  blatt: Blatt,
  name: string,
  neueKennung: () => string
): boolean {
  const bisher = ansicht(g, werkbank);
  for (const k of NICHT_AUS_DEM_BLATT) delete bisher[k];
  const jetzt = zuSchluesseln(blatt, name);
  const liste = unterschiede(bisher, jetzt);
  for (const [schluessel, wert] of liste) setzeAusgang(g, werkbank, schluessel, wert, neueKennung);
  return liste.length > 0;
}

export function setzeAusgang(
  g: Gruppenstand,
  werkbank: string,
  schluessel: string,
  wert: Wert,
  neueKennung: () => string
): void {
  // Noch nicht abgeschickt: einfach den Wert ersetzen. Wer zehn Buchstaben
  // tippt, soll nicht zehn Änderungen ins Protokoll schreiben.
  const offen = g.ausgang.find((a) => !a.unterwegs && a.werkbank === werkbank && a.schluessel === schluessel);
  if (offen) {
    offen.wert = wert;
    return;
  }
  g.ausgang.push({ op: neueKennung(), werkbank, schluessel, wert });
}

/** Der Server hat angenommen. Aus dem Ausgang in den bestätigten Stand. */
export function bestaetige(g: Gruppenstand, liste: Array<{ op: string; seq: number }>, ich: number, jetzt: number): void {
  const nachOp = new Map(liste.map((b) => [b.op, b.seq]));
  const bleibt: Ausgehend[] = [];
  for (const a of g.ausgang) {
    const seq = nachOp.get(a.op);
    if (seq === undefined) {
      bleibt.push(a);
      continue;
    }
    const stand = (g.werkbaenke[a.werkbank] ??= {});
    const alt = stand[a.schluessel];
    if (!alt || alt.seq < seq) stand[a.schluessel] = { wert: a.wert, seq, von: ich, zeit: jetzt };
  }
  g.ausgang = bleibt;
}

/**
 * Neues vom Server. Liefert, welche Werkbänke sich geändert haben und welche
 * Schlüssel jemand anderes angefasst hat.
 */
export function nimmServer(
  g: Gruppenstand,
  aenderungen: ServerAenderung[],
  ich: number | undefined
): { werkbaenke: Set<string>; fremd: ServerAenderung[] } {
  const werkbaenke = new Set<string>();
  const fremd: ServerAenderung[] = [];
  for (const a of aenderungen) {
    const stand = (g.werkbaenke[a.werkbank] ??= {});
    const alt = stand[a.schluessel];
    if (alt && alt.seq >= a.seq) continue;
    const vorher = alt?.wert;
    stand[a.schluessel] = { wert: a.wert, seq: a.seq, von: a.von, zeit: a.zeit };
    if (!gleich(vorher, a.wert)) {
      werkbaenke.add(a.werkbank);
      if (a.von !== ich) fremd.push(a);
    }
  }
  return { werkbaenke, fremd };
}

/* ---------- Speicher ---------- */

const SPEICHER = 'huntkit:gruppen';

export function ladeGruppenspeicher(): Gruppenspeicher {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (roh) {
      const gelesen = JSON.parse(roh) as Partial<Gruppenspeicher>;
      if (gelesen && typeof gelesen.gruppen === 'object' && gelesen.gruppen) {
        return { gruppen: gelesen.gruppen, ...(gelesen.konto ? { konto: gelesen.konto } : {}) };
      }
    }
  } catch {
    // Kaputt oder gesperrt – dann ohne Gruppen weiter. Die Werkbänke selbst
    // liegen getrennt und bleiben erhalten.
  }
  return { gruppen: {} };
}

export function sichereGruppenspeicher(speicher: Gruppenspeicher): void {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(speicher));
  } catch {
    // Voll oder gesperrt – der Ausgang lebt dann nur bis zum Neuladen.
  }
}
