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
    }
  | {
      id: string;
      titel: string;
      art: 'text';
      standard: string;
      platzhalter?: string;
    };

export interface TabellenEintrag {
  zeichen: string;
  darstellung: string;
  /**
   * Abschnitt der Codekarte, z.B. „Buchstaben“ oder „Zahlen“. Ohne Angabe
   * stehen alle Zeichen in einem Abschnitt. Auf dem Handy entscheidet das
   * darüber, ob man scrollen muss.
   */
  gruppe?: string;
  /** Erklärung zum Eintrag, etwa Lautwert und Beispielwort bei der IPA-Tabelle. */
  hinweis?: string;
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

/** Eine Quellenangabe: Titel und, wo es eine gibt, die Adresse. */
export interface Quelle {
  titel: string;
  url?: string;
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

  /**
   * Der Schritt kennt keine Gegenrichtung. Aus „jeden dritten Buchstaben“ lässt
   * sich der ursprüngliche Text nicht zurückgewinnen – die Oberfläche blendet
   * den Richtungsschalter dann aus, statt eine Umkehr vorzutäuschen.
   */
  einseitig?: boolean;

  /** Herkunftsangabe, wenn die Zeichen aus einer fremden Vorlage stammen. */
  quelle?: { text: string; url: string };

  /**
   * Woher die Tafel stammt: Heft und Anhang, Wikipedia-Seiten und Normen, wie
   * die Hefte sie nennen. Die Codekarte zeigt sie unter der Tabelle.
   */
  quellen?: ReadonlyArray<Quelle>;

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

  /**
   * Zeichnet eine Codegruppe so, wie sie dasteht – etwa „.-“ als Punkt und
   * Strich. Gedacht für die Anzeige ganzer Zellen und Zeilen: Morse als Text
   * ist auf einem Handy kaum zu lesen, weil der Punkt auf der Grundlinie sitzt
   * und der Strich in der Mitte.
   *
   * Der Unterschied zu `zeichne`: Diese Funktion bekommt den Code, nicht den
   * Buchstaben, und braucht deshalb keinen Tabelleneintrag. Wer nur `zeichne`
   * hat, wird über die Tabelle bedient.
   */
  zeichneCode?(gruppe: string): Glyph | null;

  /**
   * Ein Gesamtbild des Codes, das die Codekarte über der Tabelle zeigt – etwa
   * die ganze Handytastatur. Nur zum Ansehen: Die Tabelle darunter bleibt
   * das, was man antippt.
   */
  uebersicht?: { titel: string; bild: Glyph };

  /**
   * Zusätzliche Tasten zum Eintippen des Codes. Morse braucht Punkt, Strich und
   * Trenner – die stehen auf keiner Handytastatur nebeneinander.
   */
  eingabetasten?: ReadonlyArray<{ titel: string; einfuegen: string; hinweis?: string }>;

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
