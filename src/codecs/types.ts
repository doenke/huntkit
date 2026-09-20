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

/**
 * Ein gezeichnetes Zeichen. Visuelle Codes liefern ihre Glyphen selbst als SVG,
 * statt Bilder mitzuliefern: bleibt in jeder Größe scharf, funktioniert offline
 * und wirft keine Lizenzfragen auf.
 */
export interface Glyph {
  viewBox: string;
  /** SVG-Inhalt ohne umgebendes <svg>. Stammt ausschließlich aus eigenem Code. */
  inhalt: string;
}

export interface Codec {
  id: string;
  name: string;
  beschreibung: string;
  optionen?: ReadonlyArray<OptionSpec>;

  /**
   * Reiner Nachschlagecode: Man liest ihn ab, rechnet aber nichts um. Solche
   * Codes tauchen in der Werkbank nicht als Schritt auf – ein Schritt, der
   * nichts tut, stiftet dort nur Verwirrung.
   */
  nurNachschlagen?: boolean;

  /** Herkunftsangabe, wenn die Zeichen aus einer fremden Vorlage stammen. */
  quelle?: { text: string; url: string };

  encode(eingabe: string, optionen?: OptionWerte): CodecErgebnis;
  decode(eingabe: string, optionen?: OptionWerte): CodecErgebnis;

  /** Referenztabelle zum Nachschlagen; erzeugt auch den Visual Picker. */
  tabelle?(optionen?: OptionWerte): ReadonlyArray<TabellenEintrag>;

  /**
   * Zeichnet ein Zeichen. Sobald ein Codec das kann, bekommt er automatisch den
   * Visual Picker: Glyphe antippen statt tippen – die einzige Bedienung, die bei
   * Braille, Winker oder Flaggen am Handy überhaupt praktikabel ist.
   */
  zeichne?(zeichen: string): Glyph | null;

  /** Wie gut passt die Eingabe strukturell zu diesem Code? 0 bis 1. */
  passt?(eingabe: string): number;

  /**
   * Einstellungen, die die Auto-Erkennung durchprobieren soll. Ohne Angabe
   * werden nur die Standardwerte versucht. Caesar nennt hier alle 26
   * Verschiebungen, ASCII seine drei Zahlensysteme.
   */
  erkennungsoptionen?: ReadonlyArray<OptionWerte>;
}

export function standardOptionen(codec: Codec): OptionWerte {
  const werte: Record<string, string | number> = {};
  for (const option of codec.optionen ?? []) werte[option.id] = option.standard;
  return werte;
}
