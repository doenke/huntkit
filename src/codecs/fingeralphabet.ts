import { ergebnis } from './hilfen';
import type { Codec, Glyph } from './types';
import { nachtschicht } from './quellen';

/**
 * Fingeralphabet der Deutschen Gebärdensprache (DGS).
 *
 * Anders als alle übrigen Codes sind die Zeichen hier keine eigenen Zeichnungen,
 * sondern die Tafel aus dem Regelheft der Nachtschicht. Handformen so
 * nachzuzeichnen, dass sie nachts auf einem Handy erkennbar bleiben, ist eine
 * eigene Kunst – die Vorlage ist besser als alles, was hier entstünde.
 *
 * Bild: Landesverband Bayern der Gehörlosen e. V., CC BY-SA 4.0, zugeschnitten
 * und auf Schwarzweiß reduziert. Die Bilder stehen deshalb weiterhin unter
 * CC BY-SA 4.0 – siehe public/finger/LIZENZ.md.
 */

/** Dateinamen ohne Umlaute, damit die Pfade überall unverändert ankommen. */
const ZEICHEN: ReadonlyArray<readonly [zeichen: string, datei: string]> = [
  ['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['F', 'F'],
  ['G', 'G'], ['H', 'H'], ['I', 'I'], ['J', 'J'], ['K', 'K'], ['L', 'L'],
  ['M', 'M'], ['N', 'N'], ['O', 'O'], ['P', 'P'], ['Q', 'Q'], ['R', 'R'],
  ['S', 'S'], ['T', 'T'], ['U', 'U'], ['V', 'V'], ['W', 'W'], ['X', 'X'],
  ['Y', 'Y'], ['Z', 'Z'],
  ['Ä', 'Ae'], ['Ö', 'Oe'], ['Ü', 'Ue'],
  // Sch ist ein eigenes Zeichen der Tafel und deshalb drei Buchstaben lang.
  ['Sch', 'Sch']
];

const NACH_ZEICHEN = new Map(ZEICHEN.map(([z, datei]) => [z, datei]));

export const fingeralphabet: Codec = {
  id: 'fingeralphabet',
  name: 'Fingeralphabet',
  quellen: [nachtschicht('B', 'Fingeralphabet')],
  beschreibung: 'Handformen der Deutschen Gebärdensprache, mit Ä, Ö, Ü und Sch.',
  nurNachschlagen: true,
  quelle: {
    text: 'Landesverband Bayern der Gehörlosen e. V., CC BY-SA 4.0 – zugeschnitten und auf Schwarzweiß reduziert',
    url: 'https://commons.wikimedia.org/w/index.php?curid=53190516'
  },

  encode: (eingabe) => ergebnis(eingabe),
  decode: (eingabe) => ergebnis(eingabe),
  tabelle: () => ZEICHEN.map(([zeichen]) => ({ zeichen, darstellung: zeichen })),

  zeichne(gesucht): Glyph | null {
    const datei = NACH_ZEICHEN.get(gesucht) ?? NACH_ZEICHEN.get(gesucht.toUpperCase());
    if (!datei) return null;
    // Pfad bewusst relativ: Die App läuft auch in einem Unterverzeichnis.
    return {
      viewBox: '0 0 237 306',
      inhalt: `<image href="finger/${datei}.png" width="237" height="306"/>`
    };
  }
};
