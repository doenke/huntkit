/**
 * Die eine Abstraktion, an der alles hängt.
 *
 * Jeder Code ist ein Plugin mit dieser Schnittstelle. Konverter, Referenztabelle
 * und – später – die Auto-Erkennung ergeben sich daraus von selbst; ein neuer
 * Code ist eine Datei und ein Eintrag in der Registry.
 */

export type Richtung = 'encode' | 'decode';

/** Ein Zeichen, das nicht übersetzt werden konnte. */
export interface Luecke {
  /** Position in der Eingabe – damit die Oberfläche darauf zeigen kann. */
  position: number;
  zeichen: string;
}

export interface CodecErgebnis {
  text: string;
  /**
   * Bewusst Teil des Ergebnisses statt ein Fehler: Bei einem verwitterten
   * Schild ist gerade das Unlesbare die interessante Information.
   */
  luecken: Luecke[];
}

export type OptionWerte = Readonly<Record<string, string | number>>;

export type OptionSpec =
  | {
      id: string;
      titel: string;
      art: 'zahl';
      min: number;
      max: number;
      standard: number;
    }
  | {
      id: string;
      titel: string;
      art: 'auswahl';
      werte: ReadonlyArray<{ wert: string; titel: string }>;
      standard: string;
    };

export interface TabellenEintrag {
  zeichen: string;
  darstellung: string;
}

export interface Codec {
  id: string;
  name: string;
  beschreibung: string;
  optionen?: ReadonlyArray<OptionSpec>;

  encode(eingabe: string, optionen?: OptionWerte): CodecErgebnis;
  decode(eingabe: string, optionen?: OptionWerte): CodecErgebnis;

  /** Referenztabelle zum Nachschlagen; erzeugt auch den späteren Visual Picker. */
  tabelle?(optionen?: OptionWerte): ReadonlyArray<TabellenEintrag>;

  /**
   * Wie gut passt die Eingabe strukturell zu diesem Code? 0 bis 1.
   * Grundlage für die Auto-Erkennung in Phase 4.
   */
  passt?(eingabe: string): number;
}

export function standardOptionen(codec: Codec): OptionWerte {
  const werte: Record<string, string | number> = {};
  for (const option of codec.optionen ?? []) werte[option.id] = option.standard;
  return werte;
}
