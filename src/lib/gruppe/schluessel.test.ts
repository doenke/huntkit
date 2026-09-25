import { describe, expect, it } from 'vitest';
import type { Blatt } from '../werkbank/blatt';
import { ausSchluesseln, gleich, unterschiede, zuSchluesseln } from './schluessel';

const BLATT: Blatt = {
  spalten: [
    { art: 'eingabe', id: 'a', tafel: 'morse' },
    { art: 'werkzeug', id: 'b', quelle: 'a', codecId: 'morse', richtung: 'decode', optionen: {} }
  ],
  zeilen: [
    { id: 'z1', nummer: 1, werte: { a: '... --- ...' } },
    { id: 'z2', nummer: 2, werte: { a: '' } }
  ],
  sortierung: { spalte: 'b', richtung: 'auf', art: 'text' }
};

describe('Blatt als Schlüssel', () => {
  it('geht hin und zurück – ohne Sortierung und ohne leere Zellen', () => {
    const zurueck = ausSchluesseln(zuSchluesseln(BLATT, 'Station'));
    expect(zurueck.spalten).toEqual(BLATT.spalten);
    expect(zurueck.zeilen).toEqual([
      { id: 'z1', nummer: 1, werte: { a: '... --- ...' } },
      { id: 'z2', nummer: 2, werte: {} }
    ]);
    expect(zurueck.sortierung).toBeUndefined();
  });

  it('eine geänderte Zelle ist genau ein Schlüssel', () => {
    const neu = structuredClone(BLATT);
    (neu.zeilen[1] as { werte: Record<string, string> }).werte.a = '.-';
    expect(unterschiede(zuSchluesseln(BLATT), zuSchluesseln(neu))).toEqual([['z/z2/a', '.-']]);
  });

  it('eine gelöschte Zeile löscht auch ihre Zellen', () => {
    const neu = structuredClone(BLATT);
    neu.zeilen = neu.zeilen.filter((z) => z.id !== 'z1');
    expect(unterschiede(zuSchluesseln(BLATT), zuSchluesseln(neu))).toEqual([
      ['zeile/z1', null],
      ['z/z1/a', null]
    ]);
  });

  it('Zellen einer gelöschten Zeile tauchen nicht wieder auf', () => {
    const stand = zuSchluesseln(BLATT);
    stand['zeile/z1'] = null;
    expect(ausSchluesseln(stand).zeilen.map((z) => z.id)).toEqual(['z2']);
  });

  it('Spalten, die in der Reihenfolge fehlen, kommen hinten dran', () => {
    // Zwei Leute legen gleichzeitig eine Spalte an; die Reihenfolge der einen gewinnt.
    const stand = zuSchluesseln(BLATT);
    stand['spalte/c'] = { art: 'eingabe', id: 'c' };
    stand['spalte/d'] = { art: 'eingabe', id: 'd' };
    stand.spalten = ['a', 'b', 'd'];
    expect(ausSchluesseln(stand).spalten.map((s) => s.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('eine gelöschte Spalte fehlt, auch wenn die Reihenfolge sie noch nennt', () => {
    const stand = zuSchluesseln(BLATT);
    stand['spalte/b'] = null;
    expect(ausSchluesseln(stand).spalten.map((s) => s.id)).toEqual(['a']);
  });

  it('Zeilen stehen nach Nummer, bei gleicher Nummer nach Kennung', () => {
    const stand = zuSchluesseln(BLATT);
    stand['zeile/z0'] = { nummer: 2 };
    expect(ausSchluesseln(stand).zeilen.map((z) => z.id)).toEqual(['z1', 'z0', 'z2']);
  });

  it('die Feldreihenfolge einer Spalte ist keine Änderung', () => {
    expect(gleich({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(gleich({ a: 1 }, { a: 2 })).toBe(false);
    expect(gleich(undefined, null)).toBe(true);
  });
});
