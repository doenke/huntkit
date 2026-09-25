import { describe, expect, it } from 'vitest';
import { codec } from '../../codecs/registry';
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
    // Punkt 3 breit, Lücke 3, Strich 9 – zusammen 15 in einer 10 hohen Spur.
    expect(glyph.viewBox).toBe('0 0 15 10');
    expect(glyph.inhalt).toContain('x="0" y="3.5" width="3" height="3"');
    expect(glyph.inhalt).toContain('x="6" y="3.5" width="9" height="3"');
  });

  it('legt jeden Balken in dieselbe Spur, egal wie lang die Gruppe ist', () => {
    // Der Punkt sitzt nicht unten und der Strich nicht in der Mitte – genau das
    // macht Morse als Text so mühsam.
    for (const code of ['.', '-', '...--..']) {
      const inhalt = morse.zeichneCode!(code)!.inhalt;
      expect([...inhalt.matchAll(/y="([\d.]+)"/g)].every((t) => t[1] === '3.5')).toBe(true);
    }
  });

  it('zeichnet nichts, was kein Morse ist', () => {
    expect(morse.zeichneCode!('ab')).toBeNull();
    expect(morse.zeichneCode!('')).toBeNull();
  });
});
