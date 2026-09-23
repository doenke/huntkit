import type { Codec, Glyph } from '../codecs/types';

/**
 * Einen Code-Text in seine Gruppen zerlegen, damit man ihn zeichnen kann.
 *
 * Auf dem Papier steht ein Code als Bild: sechs Farbfelder, zwei Flaggen, ein
 * Punktmuster, Punkt und Strich. Als Text getippt geht genau das verloren –
 * `... --- ...` liest sich schlechter als drei gezeichnete Gruppen. Hier wird
 * deshalb aus dem Text wieder eine Folge von Gruppen, jede mit ihrem Bild und
 * ihrem Buchstaben.
 *
 * Nichts wird dabei verschluckt: Was in keiner Tabelle steht, bleibt als Text
 * stehen und wird als unbekannt gekennzeichnet.
 */

export interface Codeteil {
  art: 'gruppe' | 'wortluecke';
  /** Die Codegruppe, wie sie im Text steht. */
  text: string;
  /** Der zugehörige Buchstabe, falls die Gruppe in der Tabelle steht. */
  zeichen?: string;
  glyph?: Glyph | null;
}

/**
 * Trennt ein Codec seine Zeichen mit Leerzeichen, oder steht jedes Zeichen für
 * sich? Dieselbe Frage wie auf der Codekarte: Wo eine Darstellung länger als
 * ein Zeichen ist, braucht es einen Trenner.
 */
export function einzelzeichen(codec: Codec): boolean {
  if (codec.zeichenweise !== undefined) return codec.zeichenweise;
  const eintraege = codec.tabelle?.() ?? [];
  return eintraege.length > 0 && eintraege.every((e) => [...e.darstellung].length === 1);
}

export function zerlegeCode(codec: Codec, text: string): Codeteil[] {
  const eintraege = codec.tabelle?.() ?? [];
  const nachCode = new Map(eintraege.map((e) => [e.darstellung.toUpperCase(), e.zeichen]));

  const stuecke = einzelzeichen(codec) ? [...text] : text.split(/\s+/);
  const teile: Codeteil[] = [];
  for (const stueck of stuecke) {
    if (stueck.length === 0) continue;
    // Der Schrägstrich trennt Wörter – bei Morse ausdrücklich, anderswo
    // schadet es nicht, ihn genauso zu lesen.
    if (stueck === '/' || stueck.trim().length === 0) {
      teile.push({ art: 'wortluecke', text: stueck });
      continue;
    }
    const zeichen = nachCode.get(stueck.toUpperCase());
    const glyph = codec.zeichneCode?.(stueck) ?? (zeichen ? (codec.zeichne?.(zeichen) ?? null) : null);
    teile.push({ art: 'gruppe', text: stueck, ...(zeichen ? { zeichen } : {}), glyph });
  }
  return teile;
}

/** Kann dieser Codec überhaupt etwas zeichnen? Sonst bleibt es bei Text. */
export function zeichenbar(codec: Codec | undefined): boolean {
  if (!codec) return false;
  if (codec.zeichneCode) return true;
  if (!codec.zeichne) return false;
  return (codec.tabelle?.() ?? []).some((e) => codec.zeichne?.(e.zeichen));
}
