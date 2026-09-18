import { describe, expect, it } from 'vitest';
import { braille } from './braille';

/**
 * Braille ist in Unicode exakt festgelegt: Punkt 1 ist Bit 0, Punkt 6 ist Bit 5,
 * ab U+2800. Damit lässt sich die Tabelle gegen eine unabhängige Quelle prüfen –
 * die bekannten Codepunkte – statt nur gegen sich selbst.
 */
describe('Braille', () => {
  it('trifft die bekannten Unicode-Zeichen', () => {
    const erwartet: Record<string, string> = {
      A: '⠁', B: '⠃', C: '⠉', D: '⠙', E: '⠑', F: '⠋', G: '⠛', H: '⠓',
      I: '⠊', J: '⠚', K: '⠅', L: '⠇', M: '⠍', N: '⠝', O: '⠕', P: '⠏',
      Q: '⠟', R: '⠗', S: '⠎', T: '⠞', U: '⠥', V: '⠧', W: '⠺', X: '⠭',
      Y: '⠽', Z: '⠵',
      Ä: '⠜', Ö: '⠪', Ü: '⠳', ß: '⠮', '#': '⠼'
    };
    for (const [buchstabe, zeichen] of Object.entries(erwartet)) {
      expect(braille.encode(buchstabe).text, buchstabe).toBe(zeichen);
    }
  });

  it('kodiert und dekodiert ganze Wörter', () => {
    expect(braille.encode('HALLO WELT').text).toBe('⠓⠁⠇⠇⠕ / ⠺⠑⠇⠞');
    expect(braille.decode('⠓⠁⠇⠇⠕ / ⠺⠑⠇⠞').text).toBe('HALLO WELT');
  });

  it('vergibt kein Punktmuster doppelt', () => {
    const muster = braille.tabelle!().map((e) => e.darstellung);
    expect(new Set(muster).size).toBe(muster.length);
  });

  it('zeichnet jedes Zeichen der Tabelle', () => {
    for (const eintrag of braille.tabelle!()) {
      const glyph = braille.zeichne!(eintrag.zeichen);
      expect(glyph, eintrag.zeichen).not.toBeNull();
      // Sechs Punkte, immer – gesetzte gefüllt, die übrigen als blasse Umrisse,
      // damit die Zelle als Ganzes lesbar bleibt.
      expect(glyph!.inhalt.match(/<circle/g)?.length, eintrag.zeichen).toBe(6);
    }
  });

  it('zeichnet genau so viele gefüllte Punkte, wie das Muster hat', () => {
    const gefuellt = (zeichen: string) =>
      (braille.zeichne!(zeichen)!.inhalt.match(/fill="currentColor"/g) ?? []).length;
    expect(gefuellt('A')).toBe(1);
    expect(gefuellt('B')).toBe(2);
    expect(gefuellt('Q')).toBe(5);
    expect(gefuellt('Y')).toBe(5);
  });

  it('kennt keine Glyphe für Fremdzeichen', () => {
    expect(braille.zeichne!('§')).toBeNull();
  });

  it('erkennt Brailletext an den Codepunkten', () => {
    expect(braille.passt!('⠓⠁⠇⠇⠕')).toBe(1);
    expect(braille.passt!('HALLO')).toBe(0);
  });
});
