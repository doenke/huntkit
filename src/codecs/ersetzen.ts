import { ergebnis, text } from './hilfen';
import type { Codec } from './types';

/**
 * Ersetzen: Zeichen für Zeichen nach zwei Listen.
 *
 * Das erste Zeichen der ersten Liste wird zum ersten der zweiten, das zweite
 * zum zweiten und so weiter – wie `tr` auf der Kommandozeile. Ersetzt wird in
 * einem Durchgang, nicht nacheinander: „AB“ → „BA“ vertauscht also A und B,
 * statt am Ende alles zu B zu machen.
 *
 * Hat ein Zeichen kein Gegenstück, weil die zweite Liste kürzer ist, wird es
 * gelöscht. So entfernt eine leere zweite Liste einfach alle genannten Zeichen.
 */

function woerterbuch(von: string, nach: string, schreibungEgal: boolean): Map<string, string> {
  const ziele = [...nach];
  const tabelle = new Map<string, string>();
  [...von].forEach((zeichen, i) => {
    const schluessel = schreibungEgal ? zeichen.toLowerCase() : zeichen;
    // Kommt ein Zeichen doppelt vor, gilt das erste – wie beim Lesen von links.
    if (!tabelle.has(schluessel)) tabelle.set(schluessel, ziele[i] ?? '');
  });
  return tabelle;
}

/** Bei „Groß/klein egal“ behält der Ersatz die Schreibung des ersetzten Zeichens. */
function inSchreibungVon(vorlage: string, ersatz: string): string {
  if (vorlage !== vorlage.toLowerCase()) return ersatz.toUpperCase();
  if (vorlage !== vorlage.toUpperCase()) return ersatz.toLowerCase();
  return ersatz;
}

export const ersetzen: Codec = {
  id: 'ersetzen',
  name: 'Ersetzen',
  nurWerkbank: true,
  beschreibung:
    'Jedes Zeichen der ersten Liste wird durch das Zeichen an gleicher Stelle der zweiten ersetzt. Ohne Gegenstück wird es gelöscht.',
  einseitig: true,
  optionen: [
    { id: 'von', titel: 'Zeichen', art: 'text', standard: '', platzhalter: 'ABC' },
    { id: 'nach', titel: 'ersetzen durch', art: 'text', standard: '', platzhalter: 'XYZ' },
    {
      id: 'schreibung',
      titel: 'Schreibung',
      art: 'auswahl',
      standard: 'egal',
      werte: [
        { wert: 'egal', titel: 'Groß/klein egal' },
        { wert: 'genau', titel: 'genau so' }
      ]
    }
  ],
  encode: (eingabe, optionen) => {
    const von = text(optionen, 'von', '');
    if (von.length === 0) return ergebnis(eingabe);
    const egal = text(optionen, 'schreibung', 'egal') === 'egal';
    const tabelle = woerterbuch(von, text(optionen, 'nach', ''), egal);
    const heraus = [...eingabe]
      .map((zeichen) => {
        const ersatz = tabelle.get(egal ? zeichen.toLowerCase() : zeichen);
        if (ersatz === undefined) return zeichen;
        return egal ? inSchreibungVon(zeichen, ersatz) : ersatz;
      })
      .join('');
    return ergebnis(heraus);
  },
  decode: (eingabe, optionen) => ersetzen.encode(eingabe, optionen)
};
