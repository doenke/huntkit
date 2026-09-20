import { describe, expect, it } from 'vitest';
import { verschiebe } from '../codecs/caesar';
import { nurBuchstaben, sprachwert } from './sprachwert';

const DEUTSCH = [
  'Denksport im Schatten der naechtlichen Foerdertuerme',
  'Die Loesung liegt unter der Bruecke am Phoenixsee',
  'Der naechste Hinweis steht auf dem Schild neben dem Eingang'
];

const ENGLISCH = [
  'the quick brown fox jumps over the lazy dog',
  'meet me at the old mill before the clock strikes three'
];

/** Rang der richtigen Verschiebung unter allen 26 – 1 ist der beste. */
function rangDerLoesung(text: string): number {
  const werte = Array.from({ length: 26 }, (_, n) => sprachwert(verschiebe(text, n)));
  const richtig = werte[0] as number;
  return werte.filter((w) => w > richtig).length + 1;
}

describe('Sprachwert', () => {
  it('erkennt bei längeren Texten die richtige Verschiebung', () => {
    for (const text of [...DEUTSCH, ...ENGLISCH]) {
      expect(rangDerLoesung(text), text.slice(0, 30)).toBe(1);
    }
  });

  it('hebt den richtigen Text deutlich von den falschen ab', () => {
    for (const text of DEUTSCH) {
      const werte = Array.from({ length: 26 }, (_, n) => sprachwert(verschiebe(text, n)));
      const zweitbester = [...werte].sort((a, b) => b - a)[1] as number;
      expect(werte[0]!, text.slice(0, 30)).toBeGreaterThan(zweitbester * 1.5);
    }
  });

  it('gibt Buchstabensalat einen Wert nahe null', () => {
    expect(sprachwert('XQJZKVWPFQXZJKVQWPXZJKVWQ')).toBeLessThan(0.1);
    expect(sprachwert('QQQQQQQQQQQQQQQQ')).toBeLessThan(0.1);
  });

  it('bleibt bei sehr kurzen Texten zurückhaltend', () => {
    // Neun Buchstaben tragen keine Statistik. Der Wert bleibt niedrig, und das
    // ist richtig so: Die Rangliste ist eine Hilfe, kein Orakel.
    expect(sprachwert('HALLO WELT')).toBeLessThan(0.7);
    expect(rangDerLoesung('HALLO WELT')).toBeLessThanOrEqual(3);
    expect(sprachwert('AB')).toBe(0);
  });

  it('erkennt ein einzelnes langes deutsches Wort', () => {
    expect(sprachwert('NACHTSCHICHT')).toBeGreaterThan(0.6);
    expect(rangDerLoesung('NACHTSCHICHT')).toBe(1);
  });

  it('löst Umlaute auf und wirft alles Übrige weg', () => {
    expect(nurBuchstaben('Größe 42, über!')).toBe('GROESSEUEBER');
  });
});
