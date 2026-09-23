import { describe, expect, it } from 'vitest';
import { klopfcode } from './klopfcode';

describe('Klopfcode', () => {
  it('verschlüsselt Zeile und Spalte als Zahlenpaar', () => {
    expect(klopfcode.encode('HALLO WELT').text).toBe('23 11 31 31 34 / 52 15 31 44');
  });

  it('entschlüsselt Paare mit und ohne Leerzeichen', () => {
    expect(klopfcode.decode('23 11 31 31 34').text).toBe('HALLO');
    expect(klopfcode.decode('2311313134').text).toBe('HALLO');
    expect(klopfcode.decode('2-3 1-1').text).toBe('HA');
  });

  it('liest auch Klopfer: zwei Gruppen je Buchstabe', () => {
    expect(klopfcode.decode('·· ··· · ·').text).toBe('HA');
    expect(klopfcode.decode('.. ... . . / . .').text).toBe('HA A');
  });

  it('legt C und K auf dasselbe Feld – entschlüsselt wird C', () => {
    expect(klopfcode.encode('K').text).toBe('13');
    expect(klopfcode.encode('C').text).toBe('13');
    expect(klopfcode.decode('13').text).toBe('C');
  });

  it('löst Umlaute auf und meldet, was nicht ins Gitter passt', () => {
    expect(klopfcode.encode('Ä').text).toBe('11 15');
    expect(klopfcode.encode('A1').luecken.map((l) => l.zeichen)).toEqual(['1']);
    expect(klopfcode.decode('66').luecken.map((l) => l.zeichen)).toEqual(['66']);
  });

  it('zeichnet die Klopfer als zwei Punktgruppen', () => {
    const bild = klopfcode.zeichneCode!('23');
    expect(bild?.inhalt.match(/<circle/g)).toHaveLength(5);
    expect(klopfcode.zeichneCode!('70')).toBeNull();
  });

  it('erkennt Zahlenpaare aus 1 bis 5', () => {
    expect(klopfcode.passt!('23 11 31')).toBe(1);
    expect(klopfcode.passt!('23 61')).toBe(0.5);
  });
});
