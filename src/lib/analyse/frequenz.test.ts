import { describe, expect, it } from 'vitest';
import { vigenereCodec } from '../../codecs/chiffren';
import { verschiebe } from '../../codecs/caesar';
import { analysiere } from './frequenz';

const TEXT =
  'Die Dortmunder Nachtschicht fuehrt durch die Stadt und stellt Raetsel an vielen ' +
  'Stationen die man gemeinsam loesen muss bis der Morgen graut und die Siegerehrung beginnt';

describe('Häufigkeitsanalyse', () => {
  it('zählt Buchstaben und sortiert nach Häufigkeit', () => {
    const analyse = analysiere('AAABBC');
    expect(analyse.laenge).toBe(6);
    expect(analyse.haeufigkeiten[0]).toEqual({ zeichen: 'A', anzahl: 3, anteil: 0.5 });
    expect(analyse.haeufigkeiten[2]?.zeichen).toBe('C');
  });

  it('erkennt an der Koinzidenz eine einfache Ersetzung', () => {
    // Caesar verschiebt nur – die Verteilung bleibt die der Sprache.
    const analyse = analysiere(verschiebe(TEXT, 7));
    expect(analyse.koinzidenz).toBeGreaterThan(0.062);
    expect(analyse.deutung).toMatch(/Caesar/);
  });

  it('erkennt an der Koinzidenz eine wechselnde Verschiebung', () => {
    const kodiert = vigenereCodec.encode(TEXT, { schluessel: 'NACHTSCHICHT' }).text;
    const analyse = analysiere(kodiert);
    expect(analyse.koinzidenz).toBeLessThan(0.055);
    expect(analyse.deutung).toMatch(/Vigen/);
  });

  it('hält sich bei kurzen Texten zurück', () => {
    expect(analysiere('HALLO').deutung).toMatch(/[Zz]u kurz/);
  });
});
