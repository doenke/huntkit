import { ergebnis } from './hilfen';
import type { Codec, Luecke } from './types';
import { nachtschicht } from './quellen';

/** Römische Zahlen – Kleinkram, der oft gebraucht wird. */

const ROEMISCH: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];

export function alsRoemisch(zahl: number): string | null {
  if (!Number.isInteger(zahl) || zahl < 1 || zahl > 3999) return null;
  let rest = zahl;
  let heraus = '';
  for (const [wert, zeichen] of ROEMISCH) {
    while (rest >= wert) {
      heraus += zeichen;
      rest -= wert;
    }
  }
  return heraus;
}

export function ausRoemisch(text: string): number | null {
  const sauber = text.toUpperCase().trim();
  if (!/^[MDCLXVI]+$/.test(sauber)) return null;
  const werte: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let summe = 0;
  for (let i = 0; i < sauber.length; i++) {
    const jetzt = werte[sauber[i] as string] as number;
    const naechst = werte[sauber[i + 1] as string];
    summe += naechst !== undefined && naechst > jetzt ? -jetzt : jetzt;
  }
  // Gegenprobe: Nur wer sich zurückschreiben lässt, war richtig geschrieben.
  return alsRoemisch(summe) === sauber ? summe : null;
}

export const roemisch: Codec = {
  id: 'roemisch',
  name: 'Römische Zahlen',
  quellen: [nachtschicht('R', 'Römische Zahlen')],
  beschreibung: 'Zwischen römischer und arabischer Schreibweise, 1 bis 3999.',
  encode(eingabe) {
    const luecken: Luecke[] = [];
    const teile = eingabe.trim().split(/[\s,;]+/).filter((s) => s.length > 0)
      .map((stueck, i) => {
        const wert = alsRoemisch(Number(stueck));
        if (wert === null) {
          luecken.push({ position: i, zeichen: stueck });
          return '';
        }
        return wert;
      });
    return ergebnis(teile.filter((t) => t).join(' '), luecken);
  },
  decode(eingabe) {
    const luecken: Luecke[] = [];
    const teile = eingabe.trim().split(/[\s,;]+/).filter((s) => s.length > 0)
      .map((stueck, i) => {
        const wert = ausRoemisch(stueck);
        if (wert === null) {
          luecken.push({ position: i, zeichen: stueck });
          return '';
        }
        return String(wert);
      });
    return ergebnis(teile.filter((t) => t).join(' '), luecken);
  },
  passt: (eingabe) => {
    const stuecke = eingabe.trim().split(/[\s,;]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    return stuecke.filter((s) => ausRoemisch(s) !== null).length / stuecke.length;
  }
};
