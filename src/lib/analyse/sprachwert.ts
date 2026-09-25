/**
 * Wie sehr sieht ein Text nach Sprache aus? Ergebnis zwischen 0 und 1.
 *
 * Das ist der Kern der Auto-Erkennung: „Zeichensatz passt“ ist ein schwaches
 * Argument, „liest sich wie Deutsch“ ein starkes. Bewusst ohne Wörterbuch und
 * ohne trainiertes Modell – gebraucht wird nur die Unterscheidung zwischen
 * Sprache und Buchstabensalat, und die leisten Buchstabenhäufigkeit und
 * häufige Buchstabenpaare zusammen zuverlässig.
 */

/** Buchstabenhäufigkeit in Promille; veröffentlichte Werte für Fließtext. */
const DEUTSCH: Record<string, number> = {
  E: 174, N: 98, I: 76, S: 73, R: 70, A: 65, T: 62, D: 51, H: 48, U: 44,
  L: 34, C: 31, G: 30, M: 25, O: 25, B: 19, W: 19, F: 17, K: 12, Z: 11,
  P: 8, V: 7, J: 3, Y: 1, X: 1, Q: 1
};

const ENGLISCH: Record<string, number> = {
  E: 127, T: 91, A: 82, O: 75, I: 70, N: 67, S: 63, H: 61, R: 60, D: 43,
  L: 40, C: 28, U: 28, M: 24, W: 24, F: 22, G: 20, Y: 20, P: 19, B: 15,
  V: 10, K: 8, J: 2, X: 2, Q: 1, Z: 1
};

/** Häufige Buchstabenpaare. Sie tragen kurze Texte, wo Häufigkeiten schweigen. */
const PAARE_DE = new Set([
  'ER', 'EN', 'CH', 'DE', 'EI', 'ND', 'TE', 'IN', 'IE', 'GE', 'ST', 'NE',
  'BE', 'ES', 'UN', 'RE', 'HE', 'AN', 'IC', 'IT', 'DI', 'SC', 'HT', 'NG',
  'SE', 'AU', 'LI', 'ZU', 'EL', 'NS'
]);

const PAARE_EN = new Set([
  'TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'EN', 'ND', 'TI', 'ES',
  'OR', 'TE', 'OF', 'ED', 'IS', 'IT', 'AL', 'AR', 'ST', 'TO', 'NT', 'NG',
  'SE', 'HA', 'AS', 'OU', 'IO', 'LE'
]);

/**
 * Häufige Dreiergruppen. Sie sind das stärkste Merkmal bei kurzen Texten:
 * „NACHTSCHICHT“ enthält SCH, ICH und zweimal CHT – Buchstabensalat enthält
 * nichts davon.
 */
const DREIER_DE = new Set([
  'DER', 'DIE', 'UND', 'EIN', 'ICH', 'SCH', 'NDE', 'CHE', 'DEN', 'GEN',
  'END', 'ERS', 'STE', 'CHT', 'UNG', 'EIT', 'BER', 'ENS', 'NIC', 'INE',
  'TEN', 'ESE', 'IST', 'AUS', 'HER', 'RDE', 'SSE', 'LIC', 'EIN', 'NGE'
]);

const DREIER_EN = new Set([
  'THE', 'AND', 'ING', 'ENT', 'ION', 'HER', 'FOR', 'THA', 'NTH', 'INT',
  'ERE', 'TIO', 'TER', 'EST', 'ERS', 'ATI', 'HAT', 'ATE', 'ALL', 'ETH',
  'HAV', 'VER', 'OUT', 'YOU', 'WIT', 'THI', 'ARE', 'NOT', 'ONE', 'OME'
]);

/** Nur Buchstaben, groß; Umlaute wie im Rätsel aufgelöst. */
export function nurBuchstaben(text: string): string {
  return text
    .toUpperCase()
    .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS')
    .replace(/[^A-Z]/g, '');
}

/** Ähnlichkeit zweier Häufigkeitsverteilungen, 0 bis 1. */
function haeufigkeitsnaehe(text: string, erwartet: Record<string, number>): number {
  const zaehlung: Record<string, number> = {};
  for (const zeichen of text) zaehlung[zeichen] = (zaehlung[zeichen] ?? 0) + 1;

  let punkt = 0;
  let laengeA = 0;
  let laengeB = 0;
  for (let i = 0; i < 26; i++) {
    const buchstabe = String.fromCharCode(65 + i);
    const a = (zaehlung[buchstabe] ?? 0) / text.length;
    const b = (erwartet[buchstabe] ?? 0) / 1000;
    punkt += a * b;
    laengeA += a * a;
    laengeB += b * b;
  }
  if (laengeA === 0 || laengeB === 0) return 0;
  return punkt / Math.sqrt(laengeA * laengeB);
}

/** Anteil der Gruppen fester Länge, die in der Liste stehen. */
function gruppenanteil(text: string, laenge: number, liste: ReadonlySet<string>): number {
  if (text.length < laenge) return 0;
  let treffer = 0;
  for (let i = 0; i <= text.length - laenge; i++) {
    if (liste.has(text.slice(i, i + laenge))) treffer++;
  }
  return treffer / (text.length - laenge + 1);
}

/**
 * Ein Wert je Sprache; zurück kommt der bessere. Ein Text muss nur *einer*
 * Sprache ähneln, nicht beiden.
 */
export function sprachwert(text: string): number {
  const sauber = nurBuchstaben(text);
  if (sauber.length < 4) return 0;

  const sprachen = [
    { erwartet: DEUTSCH, paare: PAARE_DE, dreier: DREIER_DE },
    { erwartet: ENGLISCH, paare: PAARE_EN, dreier: DREIER_EN }
  ];

  const werte = sprachen.map(({ erwartet, paare, dreier }) => {
    // Häufigkeiten liegen selbst bei Buchstabensalat hoch, weil eine
    // Verschiebung dieselben Buchstaben behält – deshalb wird gespreizt.
    const haeufigkeit = Math.max(0, (haeufigkeitsnaehe(sauber, erwartet) - 0.6) / 0.4);
    const zwei = Math.min(1, gruppenanteil(sauber, 2, paare) / 0.4);
    const drei = Math.min(1, gruppenanteil(sauber, 3, dreier) / 0.25);

    // Bei kurzen Texten sagt die Häufigkeitsverteilung wenig; dort tragen die
    // Buchstabengruppen fast alles.
    const kurz = sauber.length < 25;
    return kurz
      ? haeufigkeit * 0.1 + zwei * 0.35 + drei * 0.55
      : haeufigkeit * 0.4 + zwei * 0.3 + drei * 0.3;
  });

  return Math.min(1, Math.max(...werte));
}
