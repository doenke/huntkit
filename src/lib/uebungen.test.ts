import { describe, expect, it } from 'vitest';
import { braille } from '../codecs/braille';
import { rechne } from './blatt';
import { punkteDerZelle, stimmt, UEBUNGEN } from './uebungen';

describe('Übungsrätsel', () => {
  for (const uebung of UEBUNGEN) {
    it(`${uebung.id}: der Lösungsweg in der Werkbank ergibt die Lösung`, () => {
      const { blatt } = uebung.loesungsweg();
      const letzte = blatt.spalten[blatt.spalten.length - 1];
      const gerechnet = rechne(blatt);
      expect(gerechnet.fehler).toEqual([]);
      const gelesen = gerechnet.zeilen.map((z) => z.zellen[letzte?.id ?? '']?.text ?? '').join('');
      expect(stimmt(uebung, gelesen), gelesen).toBe(true);
    });
  }

  it('Säulenkunde: das Raster ist ein Rechteck, links mit leeren Zellen aufgefüllt', () => {
    const uebung = UEBUNGEN.find((u) => u.id === 'saeulenkunde');
    const zeilen = uebung?.aufgabe.zeilen ?? [];
    const breiten = new Set(zeilen.map((z) => [...z].length));
    expect(breiten.size).toBe(1);
    expect(zeilen.map((z) => braille.decode(z.replace(/^⠀+/, '')).text)).toEqual([
      'LOKALER', 'SPUR', 'VIRTUELL', 'UNKLAR', 'TRUPP'
    ]);
    // Aufgefüllt wird nur links: Rechts endet jede Zeile mit einem Buchstaben.
    for (const zeile of zeilen) expect(punkteDerZelle([...zeile].at(-1) ?? '')).toBeGreaterThan(0);
  });

  it('nimmt die Antwort ohne Rücksicht auf Schreibung und Abstände', () => {
    const uebung = UEBUNGEN[0];
    if (!uebung) throw new Error('keine Übung');
    expect(stimmt(uebung, ' p u n k t ')).toBe(true);
    expect(stimmt(uebung, 'PUNKTE')).toBe(false);
    expect(stimmt(uebung, '')).toBe(false);
  });
});
