import { anteil, ergebnis, zahl } from './hilfen';
import type { Codec, Luecke } from './types';

const ZIFFERNVORRAT = '0123456789abcdefghijklmnopqrstuvwxyz';

export function umrechnen(stueck: string, von: number, nach: number): string | null {
  const erlaubt = ZIFFERNVORRAT.slice(0, von);
  const sauber = stueck.trim().toLowerCase();
  if (sauber.length === 0) return null;
  const negativ = sauber.startsWith('-');
  const ziffern = negativ ? sauber.slice(1) : sauber;
  if (ziffern.length === 0) return null;
  for (const ziffer of ziffern) if (!erlaubt.includes(ziffer)) return null;

  // Über BigInt, damit lange Ziffernfolgen nicht an der Gleitkommagenauigkeit
  // scheitern – im Rätsel steht auch mal eine 40-stellige Binärzahl.
  let wert = 0n;
  const basisVon = BigInt(von);
  for (const ziffer of ziffern) wert = wert * basisVon + BigInt(ZIFFERNVORRAT.indexOf(ziffer));
  return (negativ ? '-' : '') + wert.toString(nach).toUpperCase();
}

function rechne(eingabe: string, von: number, nach: number) {
  const luecken: Luecke[] = [];
  let position = 0;
  const teile = eingabe
    .trim()
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map((stueck) => {
      const umgerechnet = umrechnen(stueck, von, nach);
      position += stueck.length + 1;
      if (umgerechnet === null) {
        luecken.push({ position, zeichen: stueck });
        return '';
      }
      return umgerechnet;
    })
    .filter((s) => s.length > 0);
  return ergebnis(teile.join(' '), luecken);
}

const BASIS_OPTION = { art: 'zahl', min: 2, max: 36 } as const;

export const basen: Codec = {
  id: 'basen',
  name: 'Zahlensysteme',
  beschreibung: 'Zahlen zwischen beliebigen Basen umrechnen, 2 bis 36.',
  optionen: [
    { id: 'von', titel: 'von Basis', standard: 16, ...BASIS_OPTION },
    { id: 'nach', titel: 'nach Basis', standard: 10, ...BASIS_OPTION }
  ],
  encode: (eingabe, optionen) =>
    rechne(eingabe, zahl(optionen, 'von', 16), zahl(optionen, 'nach', 10)),
  // Rückwärts heißt hier schlicht: andersherum rechnen.
  decode: (eingabe, optionen) =>
    rechne(eingabe, zahl(optionen, 'nach', 10), zahl(optionen, 'von', 16)),
  passt: (eingabe) => anteil(eingabe, /[0-9a-fA-F]/) * 0.4
};
