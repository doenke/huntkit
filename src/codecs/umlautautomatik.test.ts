import { describe, expect, it } from 'vitest';
import { ohneUmlaute } from './hilfen';
import { codec } from './registry';
import { verschiebe } from './caesar';

/**
 * Umlaute sind kein Werkzeug mehr, sondern passieren von selbst.
 *
 * Das Regelheft der Nachtschicht schreibt sie vor: „Umlaute wie in gängigen
 * Kreuzworträtseln, z.B. Ä → AE, ß → SS.“ Wer das von Hand macht, vertippt sich
 * nachts – und Lösungswörter werden zeichengenau geprüft.
 */

describe('Umlaute auflösen', () => {
  it('folgt der Regel des Regelhefts', () => {
    expect(ohneUmlaute('STRASSE ÜBER DEN FLÖZWEG')).toBe('STRASSE UEBER DEN FLOEZWEG');
    expect(ohneUmlaute('Fördertürme')).toBe('Foerdertuerme');
  });

  it('schreibt das Eszett nach der Umgebung', () => {
    // Das Eszett kennt keine Großform – in gemischtem Text also ss, nicht SS.
    expect(ohneUmlaute('Straße')).toBe('Strasse');
    expect(ohneUmlaute('STRAßE')).toBe('STRASSE');
  });

  it('lässt alles andere in Ruhe', () => {
    expect(ohneUmlaute('Nachtschicht 2026 – los!')).toBe('Nachtschicht 2026 – los!');
  });
});

describe('Codes lösen Umlaute von selbst auf', () => {
  it('ABC123 zählt GRÜSSE als GRUESSE', () => {
    expect(codec('abc123')!.encode('GRÜSSE').text).toBe('7 18 21 5 19 19 5');
  });

  it('NATO buchstabiert das aufgelöste Wort', () => {
    expect(codec('nato')!.encode('ÖL').text).toBe('OSCAR ECHO LIMA');
  });

  it('meldet dabei keine Lücke – es ist kein Fehler, sondern die Regel', () => {
    expect(codec('abc123')!.encode('GRÜSSE').luecken).toEqual([]);
  });

  it('gilt auch für die Chiffren', () => {
    // GRÜN wird zu GRUEN und dann um eins verschoben.
    expect(verschiebe('GRÜN', 1)).toBe('HSVFO');
    expect(codec('atbash')!.encode('ÖL').text).toBe('LVO');
    // Polybios wirft Nicht-A–Z weg; ohne Auflösung fiele das Ü einfach heraus.
    expect(codec('polybios')!.encode('GRÜN').text).toBe('22 42 45 15 33');
  });

  it('gilt auch für ASCII, wo 220 gerade kein ASCII wäre', () => {
    expect(codec('ascii')!.encode('Ü').text).toBe('85 69');
  });
});

describe('Codes mit eigenen Umlautzeichen behalten sie', () => {
  it('Morse hat eigene Zeichen für Ä, Ö, Ü und ß', () => {
    expect(codec('morse')!.encode('Ü').text).toBe('..--');
    expect(codec('morse')!.encode('ß').text).toBe('...--..');
    // Und zurück kommt der Umlaut auch wieder heraus.
    expect(codec('morse')!.decode('..--').text).toBe('Ü');
  });

  it('Braille ebenso', () => {
    const braille = codec('braille')!;
    const code = braille.encode('Ü').text;
    expect(code).not.toBe(braille.encode('UE').text);
    expect(braille.decode(code).text).toBe('Ü');
  });
});
