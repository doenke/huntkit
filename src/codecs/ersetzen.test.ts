import { describe, expect, it } from 'vitest';
import { ersetzen } from './ersetzen';

const ersetze = (text: string, von: string, nach: string, schreibung = 'egal') =>
  ersetzen.encode(text, { von, nach, schreibung }).text;

describe('Ersetzen', () => {
  it('ersetzt jedes Zeichen durch das an gleicher Stelle der zweiten Liste', () => {
    expect(ersetze('ABRACADABRA', 'ABC', 'XYZ')).toBe('XYRXZXDXYRX');
  });

  it('ersetzt in einem Durchgang – so lassen sich Zeichen vertauschen', () => {
    expect(ersetze('AABB', 'AB', 'BA')).toBe('BBAA');
    // Morse: Punkt und Strich tauschen.
    expect(ersetze('.- -...', '.-', '-.')).toBe('-. .---');
  });

  it('löscht Zeichen ohne Gegenstück', () => {
    expect(ersetze('A B C', ' ', '')).toBe('ABC');
    expect(ersetze('ABCDE', 'BD', 'X')).toBe('AXCE');
  });

  it('lässt Groß- und Kleinschreibung standardmäßig egal sein und behält sie', () => {
    expect(ersetze('Anna', 'a', 'o')).toBe('Onno');
    expect(ersetze('Anna', 'a', 'o', 'genau')).toBe('Anno');
  });

  it('nimmt bei doppelten Zeichen das erste Gegenstück', () => {
    expect(ersetze('AAA', 'AA', 'XY')).toBe('XXX');
  });

  it('lässt den Text unverändert, solange keine Zeichen angegeben sind', () => {
    expect(ersetze('HALLO', '', 'XYZ')).toBe('HALLO');
  });

  it('versteht Zeichen außerhalb des Alphabets', () => {
    // ß ist ein Kleinbuchstabe – mit „egal“ wird auch der Ersatz klein.
    expect(ersetze('Straße 1', 'ß1', 'S2')).toBe('Strase 2');
    expect(ersetze('Straße 1', 'ß1', 'S2', 'genau')).toBe('StraSe 2');
  });

  it('ist einseitig und rechnet in beide Richtungen dasselbe', () => {
    expect(ersetzen.einseitig).toBe(true);
    expect(ersetzen.decode('ABC', { von: 'A', nach: 'Z' }).text).toBe('ZBC');
  });
});
