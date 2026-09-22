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

const UMLAUTE: ReadonlyArray<readonly [string, string]> = [
  ['Ä', 'AE'], ['Ö', 'OE'], ['Ü', 'UE'],
  ['ä', 'ae'], ['ö', 'oe'], ['ü', 'ue']
];

/**
 * Umlaute auflösen – keine Geheimschrift, sondern eine Regel der Veranstaltung:
 * „Umlaute wie in gängigen Kreuzworträtseln, z.B. Ä → AE, ß → SS, sofern nicht
 * anders auf dem Rätsel vermerkt.“ (Regelheft der Dortmunder Nachtschicht 2026)
 *
 * Das ist kein eigenes Werkzeug mehr, sondern passiert von selbst – aber nur
 * dort, wo ein Code den Umlaut nicht selbst kennt. Morse und Braille haben
 * eigene Zeichen für Ä, Ö, Ü und ß; dort wäre die Auflösung schlicht falsch.
 */
export function ohneUmlaute(eingabe: string): string {
  // Das Eszett hat keine Großform: In durchgehend großgeschriebenem Text wird
  // es zu SS, sonst zu ss. Sonst käme aus „Straße“ ein „StraSSe“. Das Eszett
  // selbst muss dabei aus der Prüfung heraus – 'ß'.toUpperCase() ist 'SS',
  // wodurch jeder Text mit Eszett als gemischt geschrieben gälte.
  const ohneEszett = eingabe.split('ß').join('');
  const nurGross = ohneEszett === ohneEszett.toUpperCase();
  let heraus = eingabe.split('ß').join(nurGross ? 'SS' : 'ss');
  for (const [umlaut, ersatz] of UMLAUTE) heraus = heraus.split(umlaut).join(ersatz);
  return heraus;
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
        if (darstellung !== undefined) {
          teile.push(darstellung);
          return;
        }
        // Kennt dieser Code den Umlaut nicht, wird er aufgelöst: Ä zu AE.
        const ersatz = ohneUmlaute(rohzeichen);
        if (ersatz !== rohzeichen) {
          const stuecke = [...ersatz].map(nachschlagen);
          if (stuecke.every((d) => d !== undefined)) {
            teile.push(...(stuecke as string[]));
            return;
          }
        }
        luecken.push({ position, zeichen: rohzeichen });
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
