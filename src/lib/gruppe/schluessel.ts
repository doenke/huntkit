import type { Blatt, Spalte, Zeile } from '../blatt';

/**
 * Ein Blatt als flache Tabelle von Schlüsseln – so wird es mit der Gruppe
 * abgeglichen.
 *
 * Jeder Schlüssel ist für sich: Ändern zwei Leute gleichzeitig verschiedene
 * Zellen, kommt beides an. Ändern sie dieselbe, gewinnt, wer später beim
 * Server ist. Mehr Zusammenführen braucht es nicht, weil jede Eingabezelle
 * schon eine feste Adresse hat – Zeile mal Spalte. Werkzeugspalten werden
 * gerechnet; von ihnen gehen nur die Einstellungen über die Leitung.
 *
 * | Schlüssel            | Wert                                   |
 * |----------------------|----------------------------------------|
 * | `name`               | Name der Werkbank                      |
 * | `spalten`            | Reihenfolge der Spalten-Ids            |
 * | `spalte/<id>`        | die ganze Spalte                       |
 * | `zeile/<id>`         | `{ nummer }`                           |
 * | `z/<zeile>/<spalte>` | Inhalt einer Eingabezelle              |
 * | `geloescht`          | `true`, wenn die Werkbank weg ist      |
 *
 * `null` heißt gelöscht. Die Sortierung fehlt mit Absicht: Sie ist reine
 * Ansicht, und jede*r darf die Tabelle anders sortiert vor sich haben.
 */

export type Wert = unknown;
export type Schluessel = Record<string, Wert>;

export const zellschluessel = (zeile: string, spalte: string) => `z/${zeile}/${spalte}`;

/** Zeile und Spalte aus einem Zellschlüssel – oder null, wenn es keiner ist. */
export function ausZellschluessel(schluessel: string): { zeile: string; spalte: string } | null {
  const teile = schluessel.split('/');
  return teile.length === 3 && teile[0] === 'z' ? { zeile: teile[1] as string, spalte: teile[2] as string } : null;
}

/** Nur Zeichen, die der Server in einem Schlüssel annimmt. */
export function tauglicheKennung(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

export function zuSchluesseln(blatt: Blatt, name?: string): Schluessel {
  const s: Schluessel = {};
  if (name !== undefined) s.name = name;
  s.spalten = blatt.spalten.map((sp) => sp.id);
  for (const spalte of blatt.spalten) s[`spalte/${spalte.id}`] = spalte;
  for (const zeile of blatt.zeilen) {
    s[`zeile/${zeile.id}`] = { nummer: zeile.nummer };
    for (const [spalte, wert] of Object.entries(zeile.werte)) {
      // Eine leere Zelle ist dasselbe wie keine.
      if (wert !== '') s[zellschluessel(zeile.id, spalte)] = wert;
    }
  }
  return s;
}

/**
 * Das Blatt aus einem Stand. Unvollständiges wird nicht geraten, sondern
 * weggelassen: eine Zelle ohne Zeile, eine Zeile ohne Nummer.
 */
export function ausSchluesseln(stand: Schluessel): Blatt {
  const spaltenNachId = new Map<string, Spalte>();
  const zeilenNachId = new Map<string, Zeile>();
  for (const [schluessel, wert] of Object.entries(stand)) {
    if (wert === null || wert === undefined) continue;
    if (schluessel.startsWith('spalte/') && typeof wert === 'object') {
      const spalte = wert as Spalte;
      if (spalte.id === schluessel.slice(7)) spaltenNachId.set(spalte.id, structuredClone(spalte));
    } else if (schluessel.startsWith('zeile/')) {
      const nummer = (wert as { nummer?: unknown }).nummer;
      if (typeof nummer === 'number') {
        const id = schluessel.slice(6);
        zeilenNachId.set(id, { id, nummer, werte: {} });
      }
    }
  }

  // Erst die bekannte Reihenfolge. Was dort fehlt – zwei Leute haben
  // gleichzeitig eine Spalte angelegt, und nur eine Reihenfolge hat gewonnen –,
  // kommt hinten dran, statt verloren zu gehen.
  const reihenfolge = Array.isArray(stand.spalten) ? (stand.spalten as unknown[]) : [];
  const spalten: Spalte[] = [];
  for (const id of reihenfolge) {
    const spalte = typeof id === 'string' ? spaltenNachId.get(id) : undefined;
    if (spalte && !spalten.includes(spalte)) spalten.push(spalte);
  }
  for (const spalte of spaltenNachId.values()) if (!spalten.includes(spalte)) spalten.push(spalte);

  for (const [schluessel, wert] of Object.entries(stand)) {
    if (typeof wert !== 'string') continue;
    const zelle = ausZellschluessel(schluessel);
    if (!zelle) continue;
    const zeile = zeilenNachId.get(zelle.zeile);
    if (zeile && spaltenNachId.has(zelle.spalte)) zeile.werte[zelle.spalte] = wert;
  }

  const zeilen = [...zeilenNachId.values()].sort((a, b) => a.nummer - b.nummer || (a.id < b.id ? -1 : 1));
  return { spalten, zeilen };
}

/** Was sich von `alt` zu `neu` geändert hat. Weggefallene Schlüssel werden `null`. */
export function unterschiede(alt: Schluessel, neu: Schluessel): Array<[string, Wert]> {
  const ergebnis: Array<[string, Wert]> = [];
  for (const [schluessel, wert] of Object.entries(neu)) {
    if (!gleich(alt[schluessel], wert)) ergebnis.push([schluessel, wert]);
  }
  for (const [schluessel, wert] of Object.entries(alt)) {
    if (wert !== null && wert !== undefined && !(schluessel in neu)) ergebnis.push([schluessel, null]);
  }
  return ergebnis;
}

export function gleich(a: Wert, b: Wert): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return (a ?? null) === (b ?? null);
  return stabil(a) === stabil(b);
}

/** JSON mit sortierten Feldern – sonst wäre dieselbe Spalte mit anderer Feldreihenfolge „geändert“. */
function stabil(wert: Wert): string {
  return JSON.stringify(wert, (_, w: unknown) =>
    w && typeof w === 'object' && !Array.isArray(w)
      ? Object.fromEntries(Object.entries(w as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : w
  );
}
