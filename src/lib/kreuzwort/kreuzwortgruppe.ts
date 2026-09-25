import { wortform, type Wort, type Zustand } from './loesungsplan';

/**
 * Das Kreuzworträtsel einer Gruppe – abgeglichen wie eine Werkbank, als
 * flache Tabelle von Schlüsseln:
 *
 * | Schlüssel      | Wert                                   |
 * |----------------|----------------------------------------|
 * | `laengen`      | die Längenliste, wie eingetippt        |
 * | `wort/<form>`  | `{ text, eingetragen, zeit }` – `null` heißt gelöscht |
 *
 * Der Schlüssel eines Worts sind seine Buchstaben. Tippen zwei Leute
 * gleichzeitig dasselbe Wort ein, landen beide auf demselben Schlüssel – ein
 * doppeltes Lösungswort kann so gar nicht entstehen, auch nicht, wenn der
 * Server die zweite Eingabe erst nach Minuten sieht.
 *
 * Jede Gruppe hat genau ein Rätsel. Es läuft über die Leitung der Werkbänke
 * unter einer eigenen Kennung und taucht deshalb nicht als Werkbank auf.
 */

const VORSILBE = 'kreuzwort-';

export function kreuzwortKennung(gruppe: string): string {
  return VORSILBE + gruppe;
}

export function istKreuzwort(werkbank: string): boolean {
  return werkbank.startsWith(VORSILBE);
}

/**
 * Der Server nimmt in Schlüsseln nur A–Z, a–z, 0–9, _ und -. A–Z bleibt
 * stehen, jeder andere Buchstabe wird zu `_` und seiner Nummer: Ä ist `_c4`.
 * So bleiben TÜR und TUER zwei Wörter – im Gitter sind sie verschieden lang.
 */
export function wortschluessel(text: string): string | null {
  const form = wortform(text);
  if (!form) return null;
  const teil = [...form].map((z) => (/[A-Z]/.test(z) ? z : `_${z.codePointAt(0)!.toString(16)}`)).join('');
  return `wort/${teil.length <= 64 ? teil : streuwert(form)}`;
}

/** Für Wörter, die länger sind als ein Schlüssel sein darf – kommt praktisch nicht vor. */
function streuwert(text: string): string {
  let h = 0x811c9dc5;
  for (const z of text) {
    h ^= z.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `lang_${[...text].length}_${h.toString(16)}`;
}

export interface Wortwert {
  text: string;
  eingetragen: boolean;
  /** Wann es zuerst gefunden wurde – bestimmt die Reihenfolge. */
  zeit: number;
}

function istWortwert(wert: unknown): wert is Wortwert {
  const w = wert as Partial<Wortwert> | null;
  return typeof w === 'object' && w !== null && typeof w.text === 'string';
}

/** Der Zustand, wie ihn die Seite anzeigt. Die Kennung eines Worts ist sein Schlüssel. */
export function zustandAus(stand: Readonly<Record<string, unknown>>): Zustand {
  const woerter: Array<Wort & { zeit: number }> = [];
  for (const [schluessel, wert] of Object.entries(stand)) {
    if (!schluessel.startsWith('wort/') || !istWortwert(wert)) continue;
    woerter.push({ id: schluessel, text: wert.text, eingetragen: wert.eingetragen === true, zeit: Number(wert.zeit) || 0 });
  }
  woerter.sort((a, b) => a.zeit - b.zeit || a.id.localeCompare(b.id));
  return {
    laengenText: typeof stand.laengen === 'string' ? stand.laengen : '',
    woerter: woerter.map(({ id, text, eingetragen }) => ({ id, text, eingetragen }))
  };
}

/** Der gespeicherte Wert eines Worts – nötig, um beim Abhaken die Zeit zu behalten. */
export function wortwert(stand: Readonly<Record<string, unknown>>, schluessel: string): Wortwert | null {
  const wert = stand[schluessel];
  return istWortwert(wert) ? { text: wert.text, eingetragen: wert.eingetragen === true, zeit: Number(wert.zeit) || 0 } : null;
}
