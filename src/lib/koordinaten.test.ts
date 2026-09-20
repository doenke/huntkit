import { describe, expect, it } from 'vitest';
import {
  alsDezimalgrad, alsGradMinuten, alsGradMinutenSekunden, lese, leseZahl
} from './koordinaten';

describe('Koordinaten lesen', () => {
  it('liest Dezimalgrad', () => {
    expect(leseZahl('51.51315')).toBeCloseTo(51.51315, 5);
  });

  it('liest Grad mit Dezimalminuten – die Schreibweise der Nachtschicht', () => {
    expect(leseZahl("51°30.789")).toBeCloseTo(51 + 30.789 / 60, 6);
  });

  it('liest Grad, Minuten und Sekunden', () => {
    expect(leseZahl(`51°30'47.3"`)).toBeCloseTo(51 + 30 / 60 + 47.3 / 3600, 6);
  });

  it('versteht Süd und West als negativ', () => {
    expect(leseZahl('S 33°52.000')).toBeLessThan(0);
    expect(leseZahl('W 7°27.000')).toBeLessThan(0);
  });

  it('weist unmögliche Werte zurück', () => {
    expect(leseZahl('51°70.000')).toBeNull();
    expect(leseZahl('')).toBeNull();
  });

  it('liest ein Paar und merkt sich die erkannte Form', () => {
    const treffer = lese('51°30.789 N, 7°27.456 E');
    expect(treffer?.form).toBe('gradminuten');
    expect(treffer?.punkt.breite).toBeCloseTo(51.51315, 4);
    expect(treffer?.punkt.laenge).toBeCloseTo(7.4576, 4);
  });

  it('liest auch ein Paar aus Dezimalgrad ohne Trennzeichen', () => {
    const treffer = lese('51.51315 7.45760');
    expect(treffer?.form).toBe('dezimalgrad');
    expect(treffer?.punkt.laenge).toBeCloseTo(7.4576, 4);
  });

  it('gibt bei unvollständiger Eingabe nichts zurück', () => {
    expect(lese('51.51315')).toBeNull();
    expect(lese('100.0, 7.0')).toBeNull();
  });
});

describe('Koordinaten schreiben', () => {
  const breite = 51.51315;

  it('schreibt die drei Formen', () => {
    expect(alsGradMinuten(breite, true)).toBe('N 51°30.789');
    expect(alsGradMinutenSekunden(breite, true)).toBe(`N 51°30'47.3"`);
    expect(alsDezimalgrad(breite)).toBe('51.51315');
  });

  it('schreibt Süd und West richtig', () => {
    expect(alsGradMinuten(-33.8688, true)).toMatch(/^S /);
    expect(alsGradMinuten(-7.45, false)).toMatch(/^W /);
  });

  it('geht hin und zurück', () => {
    for (const wert of [51.51315, 7.4576, -33.8688, 0.5]) {
      const geschrieben = alsGradMinuten(wert, true);
      expect(leseZahl(geschrieben), geschrieben).toBeCloseTo(wert, 4);
    }
  });
});
