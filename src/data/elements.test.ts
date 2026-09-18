import { describe, expect, it } from 'vitest';
import elemente from '../../data/elements.json';

/**
 * Die Elementdaten sind maschinell aus einer Grafik ausgelesen (siehe
 * data/QUELLE.md). Diese Tests halten fest, was dabei stimmen muss – ein
 * stiller Datenfehler faellt sonst erst im Rätsel auf.
 */
describe('Elementdaten', () => {
  it('enthaelt die Ordnungszahlen 1 bis 118 lueckenlos', () => {
    expect(elemente.map((e) => e.ordnungszahl)).toEqual(
      Array.from({ length: 118 }, (_, i) => i + 1)
    );
  });

  it('hat eindeutige Symbole und Namen', () => {
    expect(new Set(elemente.map((e) => e.symbol)).size).toBe(elemente.length);
    expect(new Set(elemente.map((e) => e.name)).size).toBe(elemente.length);
  });

  it('bestaetigt jede Elektronenkonfiguration gegen die Ordnungszahl', () => {
    // Unabhaengige Gegenprobe: Die Summe der Schalenbesetzung muss die
    // Ordnungszahl ergeben. Faengt Auslesefehler und falsch zusammengesetzte,
    // in der Grafik umbrochene Werte.
    for (const e of elemente) {
      const summe = e.elektronenkonfiguration
        .split('/')
        .reduce((a, b) => a + Number(b), 0);
      expect(summe, `${e.symbol} (${e.ordnungszahl})`).toBe(e.ordnungszahl);
    }
  });

  it('hat vollstaendige Pflichtfelder', () => {
    for (const e of elemente) {
      expect(e.symbol, String(e.ordnungszahl)).toBeTruthy();
      expect(e.name, e.symbol).toBeTruthy();
      expect(e.serie, e.symbol).toBeTruthy();
      expect(e.aggregatzustand, e.symbol).toBeTruthy();
      expect(e.atomgewicht, e.symbol).toBeGreaterThan(0);
    }
  });

  it('haelt Elektronegativitaeten im erwarteten Bereich', () => {
    for (const e of elemente) {
      if (e.elektronegativitaet === null) continue;
      expect(e.elektronegativitaet, e.symbol).toBeGreaterThanOrEqual(0.7);
      expect(e.elektronegativitaet, e.symbol).toBeLessThanOrEqual(4.0);
    }
  });
});
