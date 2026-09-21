import { describe, expect, it } from 'vitest';
import { codec } from '../codecs/registry';
import { zeichenbar, zerlegeCode } from './codeanzeige';

const morse = codec('morse')!;
const braille = codec('braille')!;
const hexahue = codec('hexahue')!;
const abc123 = codec('abc123')!;

describe('Code in Gruppen zerlegen', () => {
  it('trennt Morse an den Leerzeichen und kennt die Wortlücke', () => {
    const teile = zerlegeCode(morse, '... --- ... / -- .-');
    expect(teile.map((t) => t.zeichen ?? t.art)).toEqual(['S', 'O', 'S', 'wortluecke', 'M', 'A']);
  });

  it('zeichnet jede Morsegruppe, auch ohne Tabelleneintrag', () => {
    const teile = zerlegeCode(morse, '.- .-.-.-.-');
    expect(teile[0]?.glyph).not.toBeNull();
    // Ein Muster, das es nicht gibt, bleibt trotzdem zeichenbar – man sieht,
    // was man getippt hat, statt dass die Zeile verschwindet.
    expect(teile[1]?.zeichen).toBeUndefined();
    expect(teile[1]?.glyph).not.toBeNull();
  });

  it('gibt Unsinn als Gruppe ohne Bild zurück, statt ihn zu verschlucken', () => {
    const teile = zerlegeCode(morse, 'XYZ');
    expect(teile).toHaveLength(1);
    expect(teile[0]?.text).toBe('XYZ');
    expect(teile[0]?.glyph).toBeNull();
  });

  it('zerlegt Braille zeichenweise, weil es dort keinen Trenner gibt', () => {
    const teile = zerlegeCode(braille, '⠓⠁⠇⠇⠕');
    expect(teile.map((t) => t.zeichen)).toEqual(['H', 'A', 'L', 'L', 'O']);
    expect(teile.every((t) => t.glyph)).toBe(true);
  });

  it('zerlegt Hexahue an den Leerzeichen', () => {
    const codeText = hexahue.encode('AB').text;
    const teile = zerlegeCode(hexahue, codeText);
    expect(teile.map((t) => t.zeichen)).toEqual(['A', 'B']);
    expect(teile.every((t) => t.glyph)).toBe(true);
  });

  it('sagt, welche Codecs etwas zu zeigen haben', () => {
    expect(zeichenbar(morse)).toBe(true);
    expect(zeichenbar(braille)).toBe(true);
    // ABC123 ist reine Zahlenschrift – da gibt es kein Bild.
    expect(zeichenbar(abc123)).toBe(false);
    expect(zeichenbar(undefined)).toBe(false);
  });
});

describe('Morse zeichnen', () => {
  it('macht aus Punkt und Strich Balken in einer Spur', () => {
    const glyph = morse.zeichneCode!('.-')!;
    expect(glyph.viewBox).toBe('0 0 50 10');
    // Punkt 10 breit, Lücke 10, Strich 30 – alle auf derselben Höhe.
    expect(glyph.inhalt).toContain('x="0" y="0" width="10" height="10"');
    expect(glyph.inhalt).toContain('x="20" y="0" width="30" height="10"');
  });

  it('zeichnet nichts, was kein Morse ist', () => {
    expect(morse.zeichneCode!('ab')).toBeNull();
    expect(morse.zeichneCode!('')).toBeNull();
  });
});
