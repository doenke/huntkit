/**
 * Farbcode von Widerständen, in beide Richtungen.
 *
 * Geprüft gegen die Tafel im Regelheft der Nachtschicht (Anhang O), inklusive
 * ihrer beiden Beispiele: gelb-violett-schwarz-orange ergibt 470 kΩ,
 * blau-grau-rot ergibt 6,8 kΩ.
 */

export interface Farbe {
  name: string;
  hex: string;
  /** Ziffernwert; null bei Gold und Silber, die nur hinten stehen dürfen. */
  ziffer: number | null;
  multiplikator: number | null;
  toleranz: number | null;
  temperatur: number | null;
}

export const FARBEN: ReadonlyArray<Farbe> = [
  { name: 'schwarz', hex: '#111111', ziffer: 0, multiplikator: 1, toleranz: null, temperatur: null },
  { name: 'braun', hex: '#8b4513', ziffer: 1, multiplikator: 10, toleranz: 1, temperatur: 100 },
  { name: 'rot', hex: '#d32020', ziffer: 2, multiplikator: 100, toleranz: 2, temperatur: 50 },
  { name: 'orange', hex: '#e8862a', ziffer: 3, multiplikator: 1e3, toleranz: null, temperatur: 15 },
  { name: 'gelb', hex: '#efd41f', ziffer: 4, multiplikator: 1e4, toleranz: null, temperatur: 25 },
  { name: 'grün', hex: '#27a336', ziffer: 5, multiplikator: 1e5, toleranz: 0.5, temperatur: null },
  { name: 'blau', hex: '#2a5fd8', ziffer: 6, multiplikator: 1e6, toleranz: 0.25, temperatur: 10 },
  { name: 'violett', hex: '#8b3ecc', ziffer: 7, multiplikator: 1e7, toleranz: 0.1, temperatur: 5 },
  { name: 'grau', hex: '#9a9a9a', ziffer: 8, multiplikator: 1e8, toleranz: 0.05, temperatur: null },
  { name: 'weiß', hex: '#f2f2f2', ziffer: 9, multiplikator: 1e9, toleranz: null, temperatur: null },
  { name: 'gold', hex: '#c9a227', ziffer: null, multiplikator: 0.1, toleranz: 5, temperatur: null },
  { name: 'silber', hex: '#b9c0c7', ziffer: null, multiplikator: 0.01, toleranz: 10, temperatur: null }
];

export function farbe(name: string): Farbe | undefined {
  return FARBEN.find((f) => f.name === name);
}

export interface Ergebnis {
  ohm: number;
  toleranz: number | null;
  temperatur: number | null;
}

/**
 * Wert aus den Ringen. Erlaubt sind vier, fünf oder sechs Ringe: zwei oder drei
 * Ziffern, dann Multiplikator, Toleranz und – beim sechsten Ring – der
 * Temperaturbeiwert.
 */
export function wert(ringe: ReadonlyArray<string>): Ergebnis | null {
  if (ringe.length < 4 || ringe.length > 6) return null;
  const ziffernAnzahl = ringe.length >= 5 ? 3 : 2;
  const farben = ringe.map(farbe);
  if (farben.some((f) => f === undefined)) return null;

  let ziffern = 0;
  for (let i = 0; i < ziffernAnzahl; i++) {
    const z = farben[i]?.ziffer;
    if (z === null || z === undefined) return null; // Gold und Silber sind keine Ziffern
    ziffern = ziffern * 10 + z;
  }
  const multiplikator = farben[ziffernAnzahl]?.multiplikator;
  if (multiplikator === null || multiplikator === undefined) return null;

  return {
    ohm: ziffern * multiplikator,
    toleranz: farben[ziffernAnzahl + 1]?.toleranz ?? null,
    temperatur: ringe.length === 6 ? (farben[5]?.temperatur ?? null) : null
  };
}

/** Lesbare Schreibweise: 470000 wird zu „470 kΩ“. */
export function alsText(ohm: number): string {
  const stufen: ReadonlyArray<[number, string]> = [
    [1e9, 'GΩ'], [1e6, 'MΩ'], [1e3, 'kΩ'], [1, 'Ω']
  ];
  for (const [teiler, einheit] of stufen) {
    if (ohm >= teiler) {
      const zahl = ohm / teiler;
      const gerundet = Math.round(zahl * 100) / 100;
      return `${String(gerundet).replace('.', ',')} ${einheit}`;
    }
  }
  return `${String(Math.round(ohm * 1000) / 1000).replace('.', ',')} Ω`;
}

/**
 * Rückrichtung: Welche Ringe ergeben diesen Wert? Nicht jeder Wert lässt sich
 * darstellen – dann kommt null zurück statt eines falschen Vorschlags.
 */
export function ringeFuer(ohm: number, anzahl: 4 | 5, toleranz: number | null = null): string[] | null {
  if (!Number.isFinite(ohm) || ohm <= 0) return null;
  const ziffernAnzahl = anzahl === 5 ? 3 : 2;

  // Exponent so wählen, dass genau so viele Ziffern übrig bleiben.
  const exponent = Math.floor(Math.log10(ohm)) - (ziffernAnzahl - 1);
  const ziffern = Math.round(ohm / 10 ** exponent);
  if (ziffern * 10 ** exponent !== ohm) return null;

  const multiplikator = FARBEN.find(
    (f) => f.multiplikator !== null && Math.abs(f.multiplikator - 10 ** exponent) < 1e-12
  );
  if (!multiplikator) return null;

  const stellen = String(ziffern).padStart(ziffernAnzahl, '0').split('');
  const ziffernfarben = stellen.map((s) => FARBEN.find((f) => f.ziffer === Number(s))?.name);
  if (ziffernfarben.some((n) => n === undefined)) return null;

  const toleranzfarbe = toleranz === null
    ? 'gold'
    : FARBEN.find((f) => f.toleranz === toleranz)?.name;
  if (!toleranzfarbe) return null;

  return [...(ziffernfarben as string[]), multiplikator.name, toleranzfarbe];
}
