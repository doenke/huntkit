import { ergebnis } from './hilfen';
import type { Codec } from './types';

/**
 * Umlaute auflösen und wiederherstellen.
 *
 * Kein Geheimcode, sondern eine Regel der Veranstaltung: „Umlaute wie in
 * gängigen Kreuzworträtseln, z.B. Ä → AE, ß → SS, sofern nicht anders auf dem
 * Rätsel vermerkt.“ (Regelheft der Dortmunder Nachtschicht 2026). Wer das von
 * Hand macht, vertippt sich nachts – und Lösungswörter werden zeichengenau
 * geprüft.
 */

const PAARE: ReadonlyArray<readonly [string, string]> = [
  ['Ä', 'AE'], ['Ö', 'OE'], ['Ü', 'UE'],
  ['ä', 'ae'], ['ö', 'oe'], ['ü', 'ue']
];

export const umlaute: Codec = {
  id: 'umlaute',
  name: 'Umlaute',
  beschreibung:
    'Ä zu AE, ß zu SS und zurück – so, wie die Nachtschicht Lösungswörter schreibt.',

  encode(eingabe) {
    // Das Eszett hat keine Großform: In durchgehend großgeschriebenem Text wird
    // es zu SS, sonst zu ss. Sonst käme aus „Straße“ ein „StraSSe“.
    // Das Eszett selbst muss aus der Prüfung heraus: 'ß'.toUpperCase() ist 'SS',
    // wodurch jeder Text mit Eszett als gemischt gälte.
    const ohneEszett = eingabe.split('ß').join('');
    const nurGross = ohneEszett === ohneEszett.toUpperCase();
    let text = eingabe.split('ß').join(nurGross ? 'SS' : 'ss');
    for (const [umlaut, ersatz] of PAARE) text = text.split(umlaut).join(ersatz);
    return ergebnis(text);
  },

  decode(eingabe) {
    // Rückrichtung ist mehrdeutig: „AUE“ kann A+UE oder AU+E sein. Das Werkzeug
    // liefert die naheliegende Lesart, die Entscheidung bleibt bei der Person.
    let text = eingabe;
    for (const [umlaut, ersatz] of PAARE) {
      text = text.split(ersatz).join(umlaut);
      text = text.split(ersatz.toUpperCase()).join(umlaut.toUpperCase());
    }
    return ergebnis(text);
  },

  tabelle: () => [
    ...PAARE.filter(([u]) => u === u.toUpperCase()),
    ['ß', 'SS'] as const
  ].map(([zeichen, darstellung]) => ({ zeichen, darstellung }))
};
