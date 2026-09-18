import { codec } from '../codecs/registry';
import { standardOptionen, type Luecke, type Richtung } from '../codecs/types';

/**
 * Die Werkbank: ein gemeinsamer Textpuffer und darauf eine Kette von Schritten.
 *
 * Das ersetzt das Kopieren zwischen Einzelwerkzeugen und ist gleichzeitig ein
 * Protokoll dessen, was man schon probiert hat – nachts um drei mehr wert, als
 * es klingt.
 */

export interface Schritt {
  id: string;
  codecId: string;
  richtung: Richtung;
  optionen: Record<string, string | number>;
  aktiv: boolean;
}

export interface Werkbankzustand {
  eingabe: string;
  schritte: Schritt[];
}

export interface Zwischenstand {
  /** null steht für die unveränderte Eingabe. */
  schritt: Schritt | null;
  text: string;
  luecken: Luecke[];
  /** Gesetzt, wenn der Codec zum Schritt nicht mehr existiert. */
  fehlt?: boolean;
}

const SPEICHER = 'huntkit:werkbank';

export function leererZustand(): Werkbankzustand {
  return { eingabe: '', schritte: [] };
}

export function neuerSchritt(codecId: string): Schritt {
  const gewaehlt = codec(codecId);
  return {
    id: kennung(),
    codecId,
    richtung: 'decode',
    optionen: { ...(gewaehlt ? standardOptionen(gewaehlt) : {}) },
    aktiv: true
  };
}

function kennung(): string {
  return globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}${Math.random()}`;
}

/** Wendet die Kette an und liefert jeden Zwischenstand – auch die Eingabe selbst. */
export function anwenden(zustand: Werkbankzustand): Zwischenstand[] {
  const staende: Zwischenstand[] = [
    { schritt: null, text: zustand.eingabe, luecken: [] }
  ];

  for (const schritt of zustand.schritte) {
    const vorher = staende[staende.length - 1]?.text ?? '';
    if (!schritt.aktiv) {
      staende.push({ schritt, text: vorher, luecken: [] });
      continue;
    }
    const gewaehlt = codec(schritt.codecId);
    if (!gewaehlt) {
      staende.push({ schritt, text: vorher, luecken: [], fehlt: true });
      continue;
    }
    const ergebnis = gewaehlt[schritt.richtung](vorher, schritt.optionen);
    staende.push({ schritt, text: ergebnis.text, luecken: ergebnis.luecken });
  }

  return staende;
}

export function ergebnisText(zustand: Werkbankzustand): string {
  const staende = anwenden(zustand);
  return staende[staende.length - 1]?.text ?? '';
}

export function laden(): Werkbankzustand {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (!roh) return leererZustand();
    const gelesen = JSON.parse(roh) as Partial<Werkbankzustand>;
    return {
      eingabe: typeof gelesen.eingabe === 'string' ? gelesen.eingabe : '',
      schritte: Array.isArray(gelesen.schritte) ? gelesen.schritte : []
    };
  } catch {
    // Privater Modus, gesperrter Speicher oder kaputter Eintrag – dann eben leer.
    return leererZustand();
  }
}

export function sichern(zustand: Werkbankzustand): void {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(zustand));
  } catch {
    // Nicht speichern zu können ist kein Grund, die Arbeit abzubrechen.
  }
}
