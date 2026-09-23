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
 *    keinen einzigen Wert, sondern nur die Reihenfolge der Anzeige.
 * 2. **Die Reihenfolge wird inhaltlich nur über eine Positionsspalte wirksam.**
 *    Sie liefert den Platz einer Zeile – in der Eingabe oder sortiert nach
 *    einer Spalte – und kann damit Werkzeugoptionen füttern („n-ter
 *    Buchstabe, n = Platz nach Spalte D“). Wie die Tabelle gerade angezeigt
 *    wird, spielt dafür keine Rolle, und jede Zeile behält ihre Eingabenummer.
 *
 * Früher gab es hier Sortierschritte, die aufeinander aufbauten und je eine
 * eigene Ordnung erzeugten. Seit die Positionsspalte direkt nach einer Spalte
 * zählen kann, war das doppelt – und schwer zu durchschauen.
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
  /**
   * Wie die Zellen aussehen sollen. Ohne Angabe gilt das Bild – ein Code steht
   * auf dem Zettel als Bild, und als Zeichenfolge ist er nur eine Krücke fürs
   * Tippen. Wo es nichts zu zeichnen gibt, bleibt es ohnehin bei den Zeichen.
   *
   * Das ist reine Anzeige: Gerechnet und sortiert wird immer mit den Zeichen,
   * sonst hinge das Ergebnis davon ab, wie man gerade hinschaut.
   */
  darstellung?: 'zeichen' | 'grafik';
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
  /**
   * Automatisch zur Codetafel der Quellspalte entstanden. Nur eine so
   * gekennzeichnete Spalte wird beim Tafelwechsel mitgeführt – eine von Hand
   * eingerichtete Spalte gehört der Person, auch wenn sie zufällig daneben
   * steht und auf dieselbe Quelle zeigt.
   */
  ausTafel?: boolean;
}

export interface Positionsspalte extends Grundspalte {
  art: 'position';
  /**
   * Wonach gezählt wird. Ohne Angabe ist es der Platz in der Eingabe-
   * reihenfolge. Bei Gleichstand entscheidet immer die Eingabereihenfolge.
   */
  nach?: Sortierung;
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

/** Eine Sortierstufe: Spalte, Art, Richtung. */
export interface Sortierstufe {
  spalte: SpaltenId;
  richtung: 'auf' | 'ab';
  art: Sortierart;
}

/**
 * Wonach sortiert wird – für die Anzeige wie für eine Positionsspalte.
 * `dann` entscheidet bei Gleichstand; steht es auch dort gleich, gilt die
 * Eingabereihenfolge.
 */
export interface Sortierung extends Sortierstufe {
  dann?: Sortierstufe;
}

/**
 * Eine Sortierung ohne die Spalte `id` – für das Löschen einer Spalte. Fällt
 * die erste Stufe weg, rückt die zweite nach; fällt die zweite weg, bleibt
 * nur die erste.
 */
export function sortierungOhne(sortierung: Sortierung | undefined, id: SpaltenId): Sortierung | undefined {
  if (!sortierung) return undefined;
  const { dann, ...erste } = sortierung;
  const zweite = dann && dann.spalte !== id ? dann : undefined;
  if (erste.spalte === id) return zweite ? { ...zweite } : undefined;
  return zweite ? { ...erste, dann: zweite } : erste;
}

export interface Blatt {
  spalten: Spalte[];
  zeilen: Zeile[];
  /** Wie die Tabelle angezeigt wird. Reine Ansicht – kein Wert hängt davon ab. */
  sortierung?: Sortierung;
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
  /** Platz in der Anzeige, ab 1. */
  platz: number;
  /** Platz in der Eingabereihenfolge – daraus ergibt sich die Verschiebung. */
  eingabeplatz: number;
}

export interface Berechnung {
  zeilen: BerechneteZeile[];
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
  return { spalten: [spalte], zeilen: [neueZeile(1)] };
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

export function neuePositionsspalte(nach?: Sortierung): Positionsspalte {
  return nach ? { art: 'position', id: kennung(), nach: { ...nach } } : { art: 'position', id: kennung() };
}

/** Spalten, die als Quelle oder Optionsgeber in Frage kommen: alle davor. */
export function spaltenDavor(blatt: Blatt, id: SpaltenId): Spalte[] {
  const stelle = blatt.spalten.findIndex((s) => s.id === id);
  return stelle < 0 ? [...blatt.spalten] : blatt.spalten.slice(0, stelle);
}

const LEER: Zelle = { text: '', luecken: [] };

/**
 * Rechnet das ganze Blatt durch und liefert die Zeilen in der Reihenfolge der
 * Anzeige. Zellen werden bei Bedarf berechnet und gemerkt. Eine Positionsspalte
 * braucht die Werte ihrer Sortierspalte; hängt die ihrerseits an der Position,
 * ist das ein Ring – ein Bedienfehler, der gemeldet wird, statt die Oberfläche
 * aufzuhängen.
 */
export function rechne(blatt: Blatt): Berechnung {
  const fehler: string[] = [];
  const nachId = new Map(blatt.spalten.map((s) => [s.id, s]));
  const zellen = new Map<string, Zelle>();
  const inArbeit = new Set<string>();
  const eingabe = [...blatt.zeilen].sort((a, b) => a.nummer - b.nummer);
  /** Rangfolgen der Positionsspalten, die nach einer Spalte zählen. */
  const rangfolgen = new Map<SpaltenId, Zeile[] | null>();
  const rangfolgeInArbeit = new Set<SpaltenId>();

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
      const reihe = spalte.nach ? rangfolgeVon(spalte) : eingabe;
      if (!reihe) return { text: '', luecken: [], fehler: 'Ringbezug' };
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

  /**
   * Die Zeilen, sortiert nach der Spalte einer Positionsspalte. Hängt die
   * Sortierspalte selbst von dieser Position ab, ist das ein Ring.
   */
  function rangfolgeVon(spalte: Positionsspalte): Zeile[] | null {
    const sortierung = spalte.nach;
    if (!sortierung) return eingabe;
    if (rangfolgen.has(spalte.id)) return rangfolgen.get(spalte.id) ?? null;
    if (rangfolgeInArbeit.has(spalte.id)) return null;
    rangfolgeInArbeit.add(spalte.id);
    const reihe = sortiere(sortierung);
    const stufen = [sortierung.spalte, ...(sortierung.dann ? [sortierung.dann.spalte] : [])];
    const ring = eingabe.some((z) => stufen.some((s) => hole(s, z).fehler?.includes('Ringbezug')));
    rangfolgeInArbeit.delete(spalte.id);
    rangfolgen.set(spalte.id, ring ? null : reihe);
    return ring ? null : reihe;
  }

  /**
   * Stabil sortiert: Bei Gleichstand entscheidet die zweite Stufe, steht es
   * auch dort gleich, bleibt die Eingabereihenfolge. Eine Stufe, deren Spalte
   * es nicht mehr gibt, zählt nicht.
   */
  function sortiere(sortierung: Sortierung): Zeile[] {
    const stufen = [sortierung, sortierung.dann].filter(
      (stufe): stufe is Sortierstufe => stufe !== undefined && nachId.has(stufe.spalte)
    );
    return [...eingabe].sort((a, b) => {
      for (const stufe of stufen) {
        const ergebnis = vergleiche(stufe, a, b);
        if (ergebnis !== 0) return ergebnis;
      }
      return 0;
    });
  }

  function vergleiche(sortierung: Sortierstufe, a: Zeile, b: Zeile): number {
    const links = hole(sortierung.spalte, a).text.trim();
    const rechts = hole(sortierung.spalte, b).text.trim();
    // Leeres und Unlesbares steht immer hinten, in beiden Richtungen: Eine noch
    // nicht gefüllte Zeile soll die Liste nie anführen.
    const wertA = sortierwert(sortierung.art, links);
    const wertB = sortierwert(sortierung.art, rechts);
    if (wertA === null && wertB === null) return 0;
    if (wertA === null) return 1;
    if (wertB === null) return -1;
    const roh =
      typeof wertA === 'number' && typeof wertB === 'number'
        ? wertA - wertB
        : String(wertA).localeCompare(String(wertB), 'de');
    return sortierung.richtung === 'ab' ? -roh : roh;
  }

  const sortierung = blatt.sortierung && nachId.has(blatt.sortierung.spalte) ? blatt.sortierung : null;
  const angezeigt = sortierung ? sortiere(sortierung) : eingabe;
  const eingabeplaetze = new Map(eingabe.map((z, i) => [z.id, i + 1]));

  const zeilen: BerechneteZeile[] = angezeigt.map((zeile, i) => {
    const werte: Record<SpaltenId, Zelle> = {};
    for (const spalte of blatt.spalten) werte[spalte.id] = hole(spalte.id, zeile);
    return { zeile, zellen: werte, platz: i + 1, eingabeplatz: eingabeplaetze.get(zeile.id) ?? i + 1 };
  });

  for (const zeile of zeilen) {
    for (const spalte of blatt.spalten) {
      const fehlertext = zeile.zellen[spalte.id]?.fehler;
      if (fehlertext) melde(`${spaltenname(blatt, spalte.id)}: ${fehlertext}`);
    }
  }

  return { zeilen, fehler };
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

/**
 * Eine Eingabespalte mit Codetafel bekommt die passende Entschlüsselung gleich
 * daneben. Wer eine Spalte in Morse anlegt, will sie in aller Regel auch lesen –
 * und legt sonst jedes Mal von Hand dieselbe Werkzeugspalte an.
 *
 * Wechselt die Tafel, wird die vorhandene Begleitspalte umgestellt statt eine
 * zweite anzulegen. Reine Nachschlagecodes bekommen keine: Aus dem
 * Fingeralphabet rechnet niemand etwas zurück.
 */
export function begleiteTafel(blatt: Blatt, spalte: Eingabespalte): Werkzeugspalte | null {
  const tafel = spalte.tafel;
  const gewaehlt = tafel ? codec(tafel) : undefined;
  if (!tafel || !gewaehlt || gewaehlt.nurNachschlagen) return null;

  const stelle = blatt.spalten.findIndex((s) => s.id === spalte.id);
  if (stelle < 0) return null;

  const daneben = blatt.spalten[stelle + 1];
  if (daneben?.art === 'werkzeug' && daneben.ausTafel && daneben.quelle === spalte.id) {
    daneben.codecId = tafel;
    daneben.richtung = 'decode';
    daneben.optionen = neueWerkzeugspalte(spalte.id, tafel).optionen;
    return daneben;
  }

  const begleiter = neueWerkzeugspalte(spalte.id, tafel);
  begleiter.richtung = 'decode';
  begleiter.ausTafel = true;
  blatt.spalten.splice(stelle + 1, 0, begleiter);
  return begleiter;
}

/** Zeigt diese Spalte Bilder? Ohne ausdrückliche Wahl: ja. */
export function zeigtBild(spalte: Spalte): boolean {
  return spalte.darstellung !== 'zeichen';
}

/**
 * Welche Codetafel den Inhalt einer Spalte zeichnen kann – oder keine.
 * Eine Werkzeugspalte steht nur dann im Code, wenn sie dorthin übersetzt;
 * beim Entschlüsseln kommt Klartext heraus, und der hat kein Bild.
 */
export function anzeigetafel(spalte: Spalte): string | null {
  if (spalte.art === 'eingabe') return spalte.tafel ?? null;
  if (spalte.art === 'werkzeug' && spalte.richtung === 'encode') return spalte.codecId;
  return null;
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
  const blatt: Blatt = { spalten: [erste], zeilen: [zeile] };
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

/**
 * Ein gespeichertes oder geteiltes Blatt in die heutige Form bringen.
 *
 * Ältere Stände haben statt einer Sortierung eine Liste von Sortierschritten,
 * und ihre Positionsspalten zeigen auf „Platz nach Schritt n“. Daraus wird:
 * Die Anzeige sortiert wie der letzte Schritt (den zeigte die Tabelle auch
 * vorher), und eine Position zählt nach der Spalte ihres Schritts. Genau
 * gleich ist das nur bei einem einzelnen Schritt – mehrere bauten aufeinander
 * auf, und diese Verkettung gibt es nicht mehr.
 */
export function inHeutigerForm(gelesen: Blatt): Blatt {
  const alt = gelesen as Blatt & { sortierungen?: Array<Sortierung & { id?: string }> };
  const schritte = Array.isArray(alt.sortierungen) ? alt.sortierungen : [];
  const ohneKennung = (s: Sortierung & { id?: string }): Sortierung => ({
    spalte: s.spalte,
    richtung: s.richtung,
    art: s.art
  });
  const spalten = gelesen.spalten.map((spalte) => {
    if (spalte.art !== 'position') return spalte;
    const { ordnung, ...rest } = spalte as Positionsspalte & { ordnung?: number };
    if (rest.nach || !ordnung) return rest;
    const schritt = schritte[ordnung - 1];
    return schritt ? { ...rest, nach: ohneKennung(schritt) } : rest;
  });
  const letzter = schritte[schritte.length - 1];
  const sortierung = gelesen.sortierung ?? (letzter ? ohneKennung(letzter) : undefined);
  return sortierung
    ? { spalten, zeilen: gelesen.zeilen, sortierung }
    : { spalten, zeilen: gelesen.zeilen };
}

export function laden(): Blatt {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (roh) {
      const gelesen = JSON.parse(roh) as unknown;
      if (istBlatt(gelesen)) {
        return inHeutigerForm(gelesen);
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
