import { codec } from '../codecs/registry';
import { standardOptionen, type Codec, type Luecke, type OptionWerte, type Richtung } from '../codecs/types';

/**
 * Die Werkbank als Blatt: Zeilen und Spalten.
 *
 * Ein Rätsel liefert selten einen Text, sondern meist eine Handvoll – eine
 * Zeile je Station, je Foto, je Fund. Die Arbeit daran ist immer dieselbe:
 * erste Spalte eintippen, nächste Spalte aus der vorigen rechnen, irgendwann
 * sortieren, dann weiterrechnen.
 *
 * Zwei Entscheidungen tragen das Ganze:
 *
 * 1. **Jede Zelle rechnet aus ihrer eigenen Zeile.** Sortieren ändert deshalb
 *    keinen einzigen Wert, sondern nur die Reihenfolge.
 * 2. **Sortierschritte sind Daten, keine einmalige Aktion.** Jeder Schritt
 *    erzeugt eine Ordnung – O0 ist die Eingabereihenfolge, O1 die nach dem
 *    ersten Schritt und so weiter. Eine Positionsspalte liefert den Platz in
 *    einer bestimmten Ordnung und kann damit Werkzeugoptionen füttern
 *    („n-ter Buchstabe, n = Platz nach der ersten Sortierung“). Erst dadurch
 *    wird die Reihenfolge überhaupt inhaltlich wirksam – und bleibt trotzdem
 *    nachvollziehbar, weil jede Zeile ihre Eingabenummer behält.
 */

export type SpaltenId = string;

/** Eine Werkzeugoption: entweder fest eingestellt oder je Zeile aus einer Spalte. */
export type Optionswert =
  | { art: 'fest'; wert: string | number }
  | { art: 'spalte'; spalte: SpaltenId };

interface Grundspalte {
  id: SpaltenId;
  /** Eigener Name; ohne Angabe steht der Buchstabe der Spalte da. */
  titel?: string;
}

export interface Eingabespalte extends Grundspalte {
  art: 'eingabe';
  /**
   * Codetafel für die Eingabe. Wer hier Morse eintippt, will auch Morse sehen –
   * die Zelle speichert genau das Eingetippte, nicht eine Übersetzung davon.
   */
  tafel?: string;
}

export interface Werkzeugspalte extends Grundspalte {
  art: 'werkzeug';
  quelle: SpaltenId;
  codecId: string;
  richtung: Richtung;
  optionen: Record<string, Optionswert>;
}

export interface Positionsspalte extends Grundspalte {
  art: 'position';
  /** 0 = Eingabereihenfolge, n = Reihenfolge nach dem n-ten Sortierschritt. */
  ordnung: number;
}

export type Spalte = Eingabespalte | Werkzeugspalte | Positionsspalte;

export interface Zeile {
  id: string;
  /** Reihenfolge der Eingabe. Bleibt der Zeile, egal wie oft sortiert wird. */
  nummer: number;
  /** Inhalte der Eingabespalten, je Spalten-Id. */
  werte: Record<SpaltenId, string>;
}

export type Sortierart = 'text' | 'zahl' | 'laenge';

export interface Sortierschritt {
  id: string;
  spalte: SpaltenId;
  richtung: 'auf' | 'ab';
  art: Sortierart;
}

export interface Blatt {
  spalten: Spalte[];
  zeilen: Zeile[];
  sortierungen: Sortierschritt[];
}

export interface Zelle {
  text: string;
  luecken: Luecke[];
  /** Gesetzt, wenn die Zelle nicht gerechnet werden konnte. */
  fehler?: string;
}

export interface BerechneteZeile {
  zeile: Zeile;
  zellen: Record<SpaltenId, Zelle>;
  /** Platz in der angezeigten Ordnung, ab 1. */
  platz: number;
  /** Platz in der Ordnung davor – daraus ergibt sich die Verschiebung. */
  vorher: number;
}

export interface Berechnung {
  zeilen: BerechneteZeile[];
  /** Welche Ordnung gezeigt wird: 0 = Eingabe, n = nach dem n-ten Schritt. */
  ordnung: number;
  fehler: string[];
}

export function kennung(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k${Date.now()}${Math.random().toString(16).slice(2)}`;
}

/** A, B, C … AA – der Buchstabe steht für die Stelle, nicht für den Inhalt. */
export function spaltenzeichen(stelle: number): string {
  let rest = stelle;
  let name = '';
  do {
    name = String.fromCharCode(65 + (rest % 26)) + name;
    rest = Math.floor(rest / 26) - 1;
  } while (rest >= 0);
  return name;
}

export function spaltenname(blatt: Blatt, id: SpaltenId): string {
  const stelle = blatt.spalten.findIndex((s) => s.id === id);
  if (stelle < 0) return '?';
  const spalte = blatt.spalten[stelle];
  return spalte?.titel?.trim() || spaltenzeichen(stelle);
}

export function leeresBlatt(): Blatt {
  const spalte: Eingabespalte = { art: 'eingabe', id: kennung() };
  return { spalten: [spalte], zeilen: [neueZeile(1)], sortierungen: [] };
}

export function neueZeile(nummer: number): Zeile {
  return { id: kennung(), nummer, werte: {} };
}

export function neueEingabespalte(tafel?: string): Eingabespalte {
  return { art: 'eingabe', id: kennung(), ...(tafel ? { tafel } : {}) };
}

export function neueWerkzeugspalte(quelle: SpaltenId, codecId: string): Werkzeugspalte {
  const gewaehlt = codec(codecId);
  const optionen: Record<string, Optionswert> = {};
  for (const [id, wert] of Object.entries(gewaehlt ? standardOptionen(gewaehlt) : {})) {
    optionen[id] = { art: 'fest', wert };
  }
  return {
    art: 'werkzeug',
    id: kennung(),
    quelle,
    codecId,
    richtung: gewaehlt?.einseitig ? 'encode' : 'decode',
    optionen
  };
}

export function neuePositionsspalte(ordnung: number): Positionsspalte {
  return { art: 'position', id: kennung(), ordnung };
}

/** Spalten, die als Quelle oder Optionsgeber in Frage kommen: alle davor. */
export function spaltenDavor(blatt: Blatt, id: SpaltenId): Spalte[] {
  const stelle = blatt.spalten.findIndex((s) => s.id === id);
  return stelle < 0 ? [...blatt.spalten] : blatt.spalten.slice(0, stelle);
}

const LEER: Zelle = { text: '', luecken: [] };

/**
 * Rechnet das ganze Blatt durch und liefert die Zeilen in der gewünschten
 * Ordnung. Zellen und Ordnungen hängen wechselseitig voneinander ab – eine
 * Positionsspalte braucht eine Ordnung, eine Ordnung braucht die Werte ihrer
 * Sortierspalte. Beides wird deshalb bei Bedarf berechnet und gemerkt; ein
 * Ring darin ist ein Bedienfehler und wird als solcher gemeldet, statt die
 * Oberfläche aufzuhängen.
 */
export function rechne(blatt: Blatt, anzeige?: number): Berechnung {
  const ordnung = Math.max(0, Math.min(anzeige ?? blatt.sortierungen.length, blatt.sortierungen.length));
  const fehler: string[] = [];
  const nachId = new Map(blatt.spalten.map((s) => [s.id, s]));
  const zellen = new Map<string, Zelle>();
  const inArbeit = new Set<string>();
  const ordnungen = new Map<number, Zeile[]>();
  const ordnungInArbeit = new Set<number>();

  function melde(text: string): void {
    if (!fehler.includes(text)) fehler.push(text);
  }

  function hole(spalteId: SpaltenId, zeile: Zeile): Zelle {
    const schluessel = `${spalteId}\u0000${zeile.id}`;
    const gemerkt = zellen.get(schluessel);
    if (gemerkt) return gemerkt;
    if (inArbeit.has(schluessel)) {
      return { text: '', luecken: [], fehler: 'Ringbezug' };
    }
    inArbeit.add(schluessel);
    const gerechnet = rechneZelle(spalteId, zeile);
    inArbeit.delete(schluessel);
    zellen.set(schluessel, gerechnet);
    return gerechnet;
  }

  function rechneZelle(spalteId: SpaltenId, zeile: Zeile): Zelle {
    const spalte = nachId.get(spalteId);
    if (!spalte) return { text: '', luecken: [], fehler: 'Spalte fehlt' };

    if (spalte.art === 'eingabe') {
      return { text: zeile.werte[spalte.id] ?? '', luecken: [] };
    }

    if (spalte.art === 'position') {
      const reihe = ordnungVon(spalte.ordnung);
      if (!reihe) return { text: '', luecken: [], fehler: 'Ordnung fehlt' };
      const platz = reihe.findIndex((z) => z.id === zeile.id) + 1;
      return { text: platz > 0 ? String(platz) : '', luecken: [] };
    }

    const quelle = hole(spalte.quelle, zeile);
    const gewaehlt = codec(spalte.codecId);
    if (!gewaehlt) return { text: '', luecken: [], fehler: 'Werkzeug fehlt' };
    if (quelle.fehler) return { text: '', luecken: [], fehler: quelle.fehler };
    if (quelle.text.length === 0) return LEER;

    const optionen = werteDerOptionen(spalte, gewaehlt, zeile);
    if (optionen.fehler) return { text: '', luecken: [], fehler: optionen.fehler };
    if (optionen.wartet) return LEER;

    const ergebnis = gewaehlt[spalte.richtung](quelle.text, optionen.werte);
    return { text: ergebnis.text, luecken: ergebnis.luecken };
  }

  /** Optionen einer Werkzeugspalte für eine Zeile auflösen. */
  function werteDerOptionen(
    spalte: Werkzeugspalte,
    gewaehlt: Codec,
    zeile: Zeile
  ): { werte: OptionWerte; fehler?: string; wartet?: boolean } {
    const werte: Record<string, string | number> = {};
    for (const spec of gewaehlt.optionen ?? []) {
      const bindung = spalte.optionen[spec.id] ?? { art: 'fest' as const, wert: spec.standard };
      if (bindung.art === 'fest') {
        werte[spec.id] = bindung.wert;
        continue;
      }
      const zelle = hole(bindung.spalte, zeile);
      if (zelle.fehler) return { werte, fehler: `${spec.titel}: ${zelle.fehler}` };
      const roh = zelle.text.trim();
      // Eine noch leere Spalte ist kein Fehler – sie ist nur noch nicht gefüllt.
      if (roh.length === 0) return { werte, wartet: true };
      if (spec.art === 'zahl') {
        const zahl = Number(roh);
        if (!Number.isFinite(zahl)) return { werte, fehler: `${spec.titel}: „${roh}“ ist keine Zahl` };
        werte[spec.id] = zahl;
      } else if (spec.art === 'auswahl') {
        if (!spec.werte.some((w) => w.wert === roh)) {
          return { werte, fehler: `${spec.titel}: „${roh}“ ist keine gültige Einstellung` };
        }
        werte[spec.id] = roh;
      } else {
        werte[spec.id] = roh;
      }
    }
    return { werte };
  }

  function ordnungVon(stufe: number): Zeile[] | null {
    if (stufe <= 0) return [...blatt.zeilen].sort((a, b) => a.nummer - b.nummer);
    if (stufe > blatt.sortierungen.length) return null;
    const gemerkt = ordnungen.get(stufe);
    if (gemerkt) return gemerkt;
    if (ordnungInArbeit.has(stufe)) {
      melde(`Sortierschritt ${stufe} benutzt eine Spalte, die es selbst erst sortiert.`);
      return null;
    }
    ordnungInArbeit.add(stufe);
    const vorher = ordnungVon(stufe - 1);
    const schritt = blatt.sortierungen[stufe - 1];
    let reihe: Zeile[] = vorher ? [...vorher] : [];
    if (schritt && vorher) {
      // Stabil: Bei Gleichstand bleibt die Reihenfolge des vorigen Schritts.
      reihe = [...vorher].sort((a, b) => vergleiche(schritt, a, b));
    }
    ordnungInArbeit.delete(stufe);
    ordnungen.set(stufe, reihe);
    return reihe;
  }

  function vergleiche(schritt: Sortierschritt, a: Zeile, b: Zeile): number {
    const links = hole(schritt.spalte, a).text.trim();
    const rechts = hole(schritt.spalte, b).text.trim();
    // Leeres und Unlesbares steht immer hinten, in beiden Richtungen: Eine noch
    // nicht gefüllte Zeile soll die Liste nie anführen.
    const wertA = sortierwert(schritt.art, links);
    const wertB = sortierwert(schritt.art, rechts);
    if (wertA === null && wertB === null) return 0;
    if (wertA === null) return 1;
    if (wertB === null) return -1;
    const roh =
      typeof wertA === 'number' && typeof wertB === 'number'
        ? wertA - wertB
        : String(wertA).localeCompare(String(wertB), 'de');
    return schritt.richtung === 'ab' ? -roh : roh;
  }

  const angezeigt = ordnungVon(ordnung) ?? ordnungVon(0) ?? [];
  const davor = ordnungVon(Math.max(0, ordnung - 1)) ?? [];
  const plaetzeDavor = new Map(davor.map((z, i) => [z.id, i + 1]));

  const zeilen: BerechneteZeile[] = angezeigt.map((zeile, i) => {
    const werte: Record<SpaltenId, Zelle> = {};
    for (const spalte of blatt.spalten) werte[spalte.id] = hole(spalte.id, zeile);
    return { zeile, zellen: werte, platz: i + 1, vorher: plaetzeDavor.get(zeile.id) ?? i + 1 };
  });

  for (const zeile of zeilen) {
    for (const spalte of blatt.spalten) {
      const fehlertext = zeile.zellen[spalte.id]?.fehler;
      if (fehlertext) melde(`${spaltenname(blatt, spalte.id)}: ${fehlertext}`);
    }
  }

  return { zeilen, ordnung, fehler };
}

function sortierwert(art: Sortierart, text: string): string | number | null {
  if (text.length === 0) return null;
  if (art === 'laenge') return [...text].length;
  if (art === 'zahl') {
    const zahl = Number(text);
    return Number.isFinite(zahl) ? zahl : null;
  }
  return text.toUpperCase();
}

/** Spalten, die eine Zeile zum Sortieren anbietet – alle, die etwas liefern. */
export function sortierbareSpalten(blatt: Blatt): Spalte[] {
  return blatt.spalten;
}

const SPEICHER = 'huntkit:blatt';
const ALTER_SPEICHER = 'huntkit:werkbank';

/**
 * Der frühere Stand war ein einzelner Text mit einer Schrittkette. Das ist
 * genau ein Blatt mit einer Zeile, also wird es eines – niemand soll seinen
 * Zwischenstand verlieren, nur weil die Werkbank umgebaut wurde.
 */
export function ausAlterKette(alt: {
  eingabe: string;
  schritte: ReadonlyArray<{ codecId: string; richtung: Richtung; optionen: Record<string, string | number>; aktiv?: boolean }>;
}): Blatt {
  const erste = neueEingabespalte();
  const zeile = neueZeile(1);
  zeile.werte[erste.id] = alt.eingabe;
  const blatt: Blatt = { spalten: [erste], zeilen: [zeile], sortierungen: [] };
  let quelle = erste.id;
  for (const schritt of alt.schritte) {
    if (schritt.aktiv === false) continue;
    const spalte = neueWerkzeugspalte(quelle, schritt.codecId);
    spalte.richtung = schritt.richtung;
    for (const [id, wert] of Object.entries(schritt.optionen ?? {})) {
      spalte.optionen[id] = { art: 'fest', wert };
    }
    blatt.spalten.push(spalte);
    quelle = spalte.id;
  }
  return blatt;
}

export function istBlatt(wert: unknown): wert is Blatt {
  const blatt = wert as Partial<Blatt> | null;
  return Boolean(blatt && Array.isArray(blatt.spalten) && Array.isArray(blatt.zeilen));
}

export function laden(): Blatt {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (roh) {
      const gelesen = JSON.parse(roh) as unknown;
      if (istBlatt(gelesen)) {
        return { spalten: gelesen.spalten, zeilen: gelesen.zeilen, sortierungen: gelesen.sortierungen ?? [] };
      }
    }
    const alt = localStorage.getItem(ALTER_SPEICHER);
    if (alt) {
      const gelesen = JSON.parse(alt) as { eingabe?: string; schritte?: [] };
      if (typeof gelesen.eingabe === 'string') {
        return ausAlterKette({ eingabe: gelesen.eingabe, schritte: gelesen.schritte ?? [] });
      }
    }
  } catch {
    // Gesperrter Speicher oder kaputter Eintrag – dann eben leer anfangen.
  }
  return leeresBlatt();
}

export function sichern(blatt: Blatt): void {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(blatt));
  } catch {
    // Nicht speichern zu können ist kein Grund, die Arbeit abzubrechen.
  }
}

/**
 * Text aus einem anderen Bereich übernehmen: Er wird eine neue Zeile in der
 * ersten Eingabespalte. Die Werkbank liest ihren Stand beim Öffnen, deshalb
 * genügt es, ihn abzulegen und dorthin zu wechseln.
 */
export function anWerkbank(text: string): void {
  const blatt = laden();
  const erste = blatt.spalten.find((s): s is Eingabespalte => s.art === 'eingabe');
  const spalte = erste ?? neueEingabespalte();
  if (!erste) blatt.spalten.unshift(spalte);

  const leereZeile = blatt.zeilen.find((z) => Object.values(z.werte).every((w) => !w?.trim()));
  const ziel = leereZeile ?? neueZeile(hoechsteNummer(blatt) + 1);
  ziel.werte[spalte.id] = text;
  if (!leereZeile) blatt.zeilen.push(ziel);

  sichern(blatt);
  location.hash = '#/werkbank';
}

export function hoechsteNummer(blatt: Blatt): number {
  return blatt.zeilen.reduce((groesste, z) => Math.max(groesste, z.nummer), 0);
}
