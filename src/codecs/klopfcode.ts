import { ergebnis, ohneUmlaute } from './hilfen';
import { raetselnacht } from './quellen';
import type { Codec, Glyph, Luecke, TabellenEintrag } from './types';

/**
 * Klopfcode (Tap Code), wie ihn das Infoheft der RätselNacht 5 zeigt
 * (Anhang T): ein 5×5-Gitter, erst wird die Zeile geklopft, dann die Spalte.
 * C und K teilen sich ein Feld – beim Entschlüsseln kommt dort C heraus.
 *
 * Als Text steht jedes Zeichen als Zahlenpaar, „13“ für Zeile 1, Spalte 3.
 * Gelesen wird auch, was man tatsächlich hört: zwei Gruppen von Klopfern,
 * etwa „· ···“.
 */

const GITTER = ['AB?DE', 'FGHIJ', 'LMNOP', 'QRSTU', 'VWXYZ'];

const PAAR = new Map<string, string>();
GITTER.forEach((reihe, z) =>
  [...reihe].forEach((b, s) => {
    if (b !== '?') PAAR.set(b, `${z + 1}${s + 1}`);
  })
);
PAAR.set('C', '13');
PAAR.set('K', '13');

const BUCHSTABE = new Map<string, string>();
for (const [b, paar] of PAAR) if (!BUCHSTABE.has(paar)) BUCHSTABE.set(paar, b);

function kodieren(eingabe: string) {
  const luecken: Luecke[] = [];
  const woerter: string[][] = [[]];
  [...eingabe].forEach((rohzeichen, position) => {
    if (/\s/.test(rohzeichen)) {
      if ((woerter[woerter.length - 1] as string[]).length > 0) woerter.push([]);
      return;
    }
    // Umlaute wie überall aufgelöst: Ä wird AE.
    const buchstaben = [...ohneUmlaute(rohzeichen).toUpperCase()];
    if (!buchstaben.every((b) => PAAR.has(b))) {
      luecken.push({ position, zeichen: rohzeichen });
      return;
    }
    for (const b of buchstaben) (woerter[woerter.length - 1] as string[]).push(PAAR.get(b) as string);
  });
  return ergebnis(
    woerter
      .filter((w) => w.length > 0)
      .map((w) => w.join(' '))
      .join(' / '),
    luecken
  );
}

const KLOPFER = /^[.·•*]+$/;

/** Ein Wort in Zahlenpaare zerlegen – aus Ziffern oder aus Klopfergruppen. */
function paareAus(wort: string): string[] {
  const stuecke = wort.split(/[\s,;-]+/).filter((s) => s.length > 0);
  if (stuecke.length > 0 && stuecke.every((s) => KLOPFER.test(s))) {
    const paare: string[] = [];
    for (let i = 0; i < stuecke.length; i += 2) {
      paare.push(`${stuecke[i]?.length ?? 0}${stuecke[i + 1]?.length ?? 0}`);
    }
    return paare;
  }
  // Ziffern: „13 15“, „1315“ oder „1-3 1-5“ – immer zwei Ziffern je Zeichen.
  const ziffern = wort.replace(/[^0-9]/g, '');
  const paare: string[] = [];
  for (let i = 0; i < ziffern.length; i += 2) paare.push(ziffern.slice(i, i + 2));
  return paare;
}

function dekodieren(eingabe: string) {
  const luecken: Luecke[] = [];
  let position = 0;
  const woerter = eingabe
    .trim()
    .split(/\s*\/+\s*|\s{2,}/)
    .map((wort) =>
      paareAus(wort)
        .map((paar) => {
          const b = BUCHSTABE.get(paar);
          if (!b) luecken.push({ position, zeichen: paar });
          position += paar.length;
          return b ?? '';
        })
        .join('')
    );
  return ergebnis(woerter.filter((w) => w.length > 0).join(' '), luecken);
}

/** Zwei Gruppen von Klopfern, dazwischen eine Pause. */
function klopfer(paar: string): Glyph | null {
  const [z, s] = [...paar].map(Number);
  if (!z || !s || z > 5 || s > 5) return null;
  const punkte: string[] = [];
  let x = 5;
  for (const anzahl of [z, s]) {
    for (let i = 0; i < anzahl; i++) {
      punkte.push(`<circle cx="${x}" cy="8" r="3.2" fill="currentColor"/>`);
      x += 9;
    }
    x += 9;
  }
  return { viewBox: `0 0 ${x - 13} 16`, inhalt: punkte.join('') };
}

export const klopfcode: Codec = {
  id: 'klopfcode',
  name: 'Klopfcode',
  quellen: [raetselnacht('T', 'Klopfcode (Tap code)')],
  beschreibung:
    'Gitter aus 5×5 Buchstaben: erst Zeile, dann Spalte klopfen. 13 ist C – und K, beide teilen sich ein Feld.',
  encode: kodieren,
  decode: dekodieren,
  tabelle: (): ReadonlyArray<TabellenEintrag> =>
    [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((b) => ({ zeichen: b, darstellung: PAAR.get(b) as string })),
  zeichneCode: (gruppe) => klopfer(gruppe.replace(/[^0-9]/g, '')),
  passt(eingabe) {
    const stuecke = eingabe.trim().split(/[\s/]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    return stuecke.filter((s) => /^[1-5]{2}$/.test(s)).length / stuecke.length;
  }
};
