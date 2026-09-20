import { CODECS } from '../codecs/registry';
import { standardOptionen, type Codec, type OptionWerte } from '../codecs/types';
import { sprachwert } from './sprachwert';

/**
 * Auto-Erkennung: „Was ist das überhaupt?“
 *
 * Zweistufig, wie im Konzept beschrieben. Erst der billige Struktur-Check jedes
 * Codecs – nur Punkte und Striche sind praktisch immer Morse. Dann wird
 * tatsächlich entschlüsselt und das Ergebnis danach bewertet, ob es sich wie
 * Sprache liest. Der zweite Schritt gibt den Ausschlag: „Zeichensatz passt“ ist
 * ein schwaches Argument.
 */

export interface Fund {
  codec: Codec;
  optionen: OptionWerte;
  /** Was beim Entschlüsseln herauskommt. */
  text: string;
  struktur: number;
  sprache: number;
  bewertung: number;
  luecken: number;
}

function varianten(codec: Codec): OptionWerte[] {
  return codec.erkennungsoptionen ? [...codec.erkennungsoptionen] : [standardOptionen(codec)];
}

export function erkenne(eingabe: string, hoechstens = 6): Fund[] {
  const text = eingabe.trim();
  if (text.length < 2) return [];

  const funde: Fund[] = [];

  for (const codec of CODECS) {
    if (codec.nurNachschlagen) continue;
    const struktur = codec.passt?.(text) ?? 0.3;
    if (struktur === 0) continue;

    let bester: Fund | null = null;
    for (const optionen of varianten(codec)) {
      let ergebnis;
      try {
        ergebnis = codec.decode(text, optionen);
      } catch {
        continue; // Ein Codec, der an einer fremden Eingabe scheitert, ist kein Treffer.
      }
      if (ergebnis.text.trim().length === 0) continue;
      // Ein Ergebnis, das der Eingabe gleicht, erklärt nichts.
      if (ergebnis.text.trim().toUpperCase() === text.toUpperCase()) continue;

      const sprache = sprachwert(ergebnis.text);
      const anteilLuecken = ergebnis.luecken.length / Math.max(1, text.split(/\s+/).length);
      const bewertung = (struktur * 0.35 + sprache * 0.65) * Math.max(0, 1 - anteilLuecken);

      if (!bester || bewertung > bester.bewertung) {
        bester = {
          codec,
          optionen,
          text: ergebnis.text,
          struktur,
          sprache,
          bewertung,
          luecken: ergebnis.luecken.length
        };
      }
    }
    // Aufnahme nur, wenn das Ergebnis nach Sprache aussieht oder die Struktur
    // deutlich passt. Ein Code, der die Zeichen bloß umsortiert, erklärt nichts
    // und macht die Liste länger, nicht besser.
    if (bester && (bester.sprache > 0.08 || bester.struktur >= 0.6) && bester.bewertung > 0.05) {
      funde.push(bester);
    }
  }

  return funde.sort((a, b) => b.bewertung - a.bewertung).slice(0, hoechstens);
}

/**
 * Beschreibt die gewählten Einstellungen in Worten – „Verschiebung 13“ sagt
 * mehr als ein Objekt.
 */
export function optionenText(fund: Fund): string {
  const teile = (fund.codec.optionen ?? []).map((option) => {
    const wert = fund.optionen[option.id];
    if (option.art === 'auswahl') {
      const gefunden = option.werte.find((w) => w.wert === String(wert));
      return `${option.titel}: ${gefunden?.titel ?? wert}`;
    }
    return `${option.titel} ${wert}`;
  });
  return teile.join(', ');
}
