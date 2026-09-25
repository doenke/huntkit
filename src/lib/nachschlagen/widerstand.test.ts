import { describe, expect, it } from 'vitest';
import { alsText, FARBEN, ringeFuer, wert } from './widerstand';

describe('Widerstandsfarbcode', () => {
  it('rechnet die beiden Beispiele der Tafel nach', () => {
    // Die Quelle zeigt genau diese zwei Widerstände – die beste Gegenprobe.
    expect(wert(['gelb', 'violett', 'schwarz', 'orange', 'braun'])?.ohm).toBe(470000);
    expect(wert(['blau', 'grau', 'rot', 'gold'])?.ohm).toBe(6800);
  });

  it('schreibt Werte lesbar', () => {
    expect(alsText(470000)).toBe('470 kΩ');
    expect(alsText(6800)).toBe('6,8 kΩ');
    expect(alsText(220)).toBe('220 Ω');
    expect(alsText(1.5e6)).toBe('1,5 MΩ');
  });

  it('liest Toleranz und Temperaturbeiwert', () => {
    expect(wert(['braun', 'schwarz', 'rot', 'gold'])?.toleranz).toBe(5);
    expect(wert(['braun', 'schwarz', 'schwarz', 'rot', 'braun', 'rot'])?.temperatur).toBe(50);
    // Bei weniger als sechs Ringen gibt es keinen Temperaturbeiwert.
    expect(wert(['braun', 'schwarz', 'rot', 'gold'])?.temperatur).toBeNull();
  });

  it('weist unmögliche Ringfolgen zurück statt zu raten', () => {
    expect(wert(['gold', 'schwarz', 'rot', 'gold'])).toBeNull(); // Gold ist keine Ziffer
    expect(wert(['rot', 'rot'])).toBeNull();
    expect(wert(['rot', 'rot', 'rot', 'lila'])).toBeNull();
  });

  it('findet zu einem Wert die Ringe zurück', () => {
    expect(ringeFuer(6800, 4)).toEqual(['blau', 'grau', 'rot', 'gold']);
    expect(ringeFuer(470000, 5, 1)).toEqual(['gelb', 'violett', 'schwarz', 'orange', 'braun']);
    expect(ringeFuer(220, 4)).toEqual(['rot', 'rot', 'braun', 'gold']);
  });

  it('geht hin und zurück', () => {
    for (const ohm of [10, 47, 100, 220, 1000, 4700, 6800, 10000, 470000, 1e6]) {
      const ringe = ringeFuer(ohm, 4);
      expect(ringe, String(ohm)).not.toBeNull();
      expect(wert(ringe!)?.ohm, String(ohm)).toBe(ohm);
    }
  });

  it('sagt nein, wenn ein Wert nicht darstellbar ist', () => {
    expect(ringeFuer(1234, 4)).toBeNull(); // vier Ziffern passen nicht in zwei Ringe
    expect(ringeFuer(0, 4)).toBeNull();
  });

  it('hält die Farbtabelle vollständig', () => {
    expect(FARBEN.filter((f) => f.ziffer !== null)).toHaveLength(10);
    expect(FARBEN.map((f) => f.ziffer).filter((z) => z !== null)).toEqual([0,1,2,3,4,5,6,7,8,9]);
  });
});
