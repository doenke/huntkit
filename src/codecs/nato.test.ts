import { describe, expect, it } from 'vitest';
import { nato } from './nato';

describe('Buchstabiertafel', () => {
  it('schreibt NATO-Wörter wie beide Hefte: FOXTROT, JULIETT, XRAY', () => {
    expect(nato.encode('FJX').text).toBe('FOXTROT JULIETT XRAY');
  });

  it('liest ohne Rücksicht auf Groß- und Kleinschreibung', () => {
    // So stehen die Wörter in den Heften – das ging vorher schief.
    expect(nato.decode('ALFA BRAVO').text).toBe('AB');
    expect(nato.decode('alfa bravo').text).toBe('AB');
    expect(nato.decode('Alfa Bravo').text).toBe('AB');
  });

  it('versteht die üblichen Nebenformen', () => {
    expect(nato.decode('ALPHA FOXTROTT JULIET WHISKY X-RAY').text).toBe('AFJWX');
    expect(nato.decode('FOXTROT XRAY').text).toBe('FX');
  });

  it('kennt die alte und die neue deutsche Tafel aus dem Regelheft', () => {
    expect(nato.encode('NACHT', { tafel: 'alt' }).text).toBe('NORDPOL ANTON CÄSAR HEINRICH THEODOR');
    expect(nato.encode('NACHT', { tafel: 'neu' }).text).toBe('NÜRNBERG AACHEN CHEMNITZ HAMBURG TÜBINGEN');
  });

  it('liest jede Tafel, egal welche eingestellt ist', () => {
    expect(nato.decode('DORA OTTO RICHARD TANGO MÜNCHEN UNNA NÜRNBERG DÜSSELDORF').text).toBe('DORTMUND');
  });

  it('buchstabiert Ziffern deutsch und liest sie zurück', () => {
    expect(nato.encode('A7').text).toBe('ALFA SIEBEN');
    expect(nato.decode('alfa sieben').text).toBe('A7');
  });

  it('hat je Tafel alle 26 Buchstaben', () => {
    for (const tafel of ['nato', 'alt', 'neu']) {
      const buchstaben = nato.tabelle!({ tafel }).filter((e) => e.gruppe === 'Buchstaben');
      expect(buchstaben.map((e) => e.zeichen).join(''), tafel).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }
  });
});
