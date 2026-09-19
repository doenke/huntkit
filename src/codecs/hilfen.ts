import type { CodecErgebnis, Luecke, OptionWerte, TabellenEintrag } from './types';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ZIFFERN = '0123456789';

export function ergebnis(text: string, luecken: Luecke[] = []): CodecErgebnis {
  return { text, luecken };
}

export function zahl(optionen: OptionWerte | undefined, id: string, standard: number): number {
  const wert = optionen?.[id];
  return typeof wert === 'number' ? wert : Number(wert ?? standard);
}

export function text(optionen: OptionWerte | undefined, id: string, standard: string): string {
  const wert = optionen?.[id];
  return wert === undefined ? standard : String(wert);
}

/**
 * Bauplan für alle Codes, die Zeichen einzeln übersetzen – ABC123, NATO, Morse,
 * ASCII und später Braille, Hexahue, Flaggen. Sie unterscheiden sich nur in der
 * Tabelle und in den Trennzeichen.
 */
export interface ZeichenCodecPlan {
  tabelle: ReadonlyArray<readonly [zeichen: string, darstellung: string]>;
  /** Zwischen zwei Zeichen, z.B. ein Leerzeichen bei Morse. */
  trenner: string;
  /** Zwischen zwei Wörtern. */
  worttrenner: string;
}

export interface ZeichenCodec {
  encode(eingabe: string): CodecErgebnis;
  decode(eingabe: string): CodecErgebnis;
  tabelle(): ReadonlyArray<TabellenEintrag>;
}

export function zeichenCodec(plan: ZeichenCodecPlan): ZeichenCodec {
  const hin = new Map(plan.tabelle.map(([z, d]) => [z, d]));

  /**
   * Erst das Zeichen selbst, dann die Großschreibung nachschlagen.
   * Grund: 'ß'.toUpperCase() ist in JavaScript 'SS'. Wer blind großschreibt,
   * verliert das Eszett – und mit ihm jedes deutsche Wort, das eins enthält.
   */
  const nachschlagen = (zeichen: string) => hin.get(zeichen) ?? hin.get(zeichen.toUpperCase());
  // Bei mehrdeutigen Darstellungen gewinnt der erste Eintrag – so bleibt die
  // Rückrichtung vorhersagbar.
  const zurueck = new Map<string, string>();
  for (const [z, d] of plan.tabelle) if (!zurueck.has(d)) zurueck.set(d, z);

  return {
    encode(eingabe) {
      const luecken: Luecke[] = [];
      const woerter: string[] = [];
      let teile: string[] = [];

      [...eingabe].forEach((rohzeichen, position) => {
        if (/\s/.test(rohzeichen)) {
          woerter.push(teile.join(plan.trenner));
          teile = [];
          return;
        }
        const darstellung = nachschlagen(rohzeichen);
        if (darstellung === undefined) luecken.push({ position, zeichen: rohzeichen });
        else teile.push(darstellung);
      });
      woerter.push(teile.join(plan.trenner));

      const zusammen = woerter.filter((w) => w.length > 0).join(` ${plan.worttrenner} `);
      return ergebnis(zusammen, luecken);
    },

    decode(eingabe) {
      const luecken: Luecke[] = [];
      const trennmuster = new RegExp(`\\s*\\${plan.worttrenner}+\\s*|\\s{2,}`);
      const woerter = eingabe.trim().split(trennmuster);
      let position = 0;

      const entschluesselt = woerter.map((wort) => {
        // Drei Fälle: gar kein Trenner (Braille – Zeichen stehen direkt
        // nebeneinander), Leerraum als Trenner (Morse, NATO) oder ein echtes
        // Trennzeichen.
        const stuecke =
          plan.trenner === ''
            ? [...wort]
            : plan.trenner.trim().length === 0
              ? wort.split(/\s+/)
              : wort.split(plan.trenner);
        return stuecke
          .filter((s) => s.length > 0)
          .map((stueck) => {
            const zeichen = zurueck.get(stueck.toUpperCase()) ?? zurueck.get(stueck);
            if (zeichen === undefined) {
              luecken.push({ position, zeichen: stueck });
              position += stueck.length;
              return '';
            }
            position += stueck.length;
            return zeichen;
          })
          .join('');
      });

      return ergebnis(entschluesselt.filter((w) => w.length > 0).join(' '), luecken);
    },

    tabelle() {
      return plan.tabelle.map(([zeichen, darstellung]) => ({ zeichen, darstellung }));
    }
  };
}

/** Anteil der Zeichen, die zu einem Muster passen – Grundlage für `passt`. */
export function anteil(eingabe: string, muster: RegExp): number {
  const relevant = [...eingabe].filter((z) => !/\s/.test(z));
  if (relevant.length === 0) return 0;
  return relevant.filter((z) => muster.test(z)).length / relevant.length;
}
