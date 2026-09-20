import { ergebnis } from './hilfen';
import type { Codec, Luecke } from './types';

/** Römische Zahlen, Base64 und Base32 – Kleinkram, der oft gebraucht wird. */

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

// --------------------------------------------------------------------------

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bytes(text: string): number[] {
  return [...new TextEncoder().encode(text)];
}

export const base64: Codec = {
  id: 'base64',
  name: 'Base64',
  beschreibung: 'Text als Base64 und zurück.',
  encode(eingabe) {
    const roh = bytes(eingabe).map((b) => String.fromCharCode(b)).join('');
    return ergebnis(btoa(roh));
  },
  decode(eingabe) {
    try {
      const roh = atob(eingabe.replace(/\s/g, ''));
      const daten = Uint8Array.from([...roh].map((z) => z.charCodeAt(0)));
      return ergebnis(new TextDecoder().decode(daten));
    } catch {
      return ergebnis('', [{ position: 0, zeichen: eingabe.slice(0, 12) }]);
    }
  },
  passt: (eingabe) => {
    const sauber = eingabe.replace(/\s/g, '');
    if (sauber.length < 4 || sauber.length % 4 !== 0) return 0;
    return /^[A-Za-z0-9+/]+={0,2}$/.test(sauber) ? 0.8 : 0;
  }
};

export const base32: Codec = {
  id: 'base32',
  name: 'Base32',
  beschreibung: 'Text als Base32 (RFC 4648) und zurück.',
  encode(eingabe) {
    let bits = '';
    for (const b of bytes(eingabe)) bits += b.toString(2).padStart(8, '0');
    let heraus = '';
    for (let i = 0; i < bits.length; i += 5) {
      heraus += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
    }
    while (heraus.length % 8 !== 0) heraus += '=';
    return ergebnis(heraus);
  },
  decode(eingabe) {
    const sauber = eingabe.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const zeichen of sauber) {
      const wert = B32.indexOf(zeichen);
      if (wert < 0) return ergebnis('', [{ position: 0, zeichen }]);
      bits += wert.toString(2).padStart(5, '0');
    }
    const daten: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) daten.push(parseInt(bits.slice(i, i + 8), 2));
    return ergebnis(new TextDecoder().decode(Uint8Array.from(daten)));
  },
  passt: (eingabe) => {
    const sauber = eingabe.replace(/[\s=]/g, '');
    if (sauber.length < 4) return 0;
    return /^[A-Za-z2-7]+$/.test(sauber) ? 0.5 : 0;
  }
};
