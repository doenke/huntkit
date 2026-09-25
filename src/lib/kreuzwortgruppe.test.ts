import { describe, expect, it } from 'vitest';
import { istKreuzwort, kreuzwortKennung, wortschluessel, zustandAus } from './kreuzwortgruppe';
import { neuesWort, schonGefunden } from './loesungsplan';

const TAUGLICH = /^[A-Za-z0-9_-]{1,64}(\/[A-Za-z0-9_-]{1,64}){0,3}$/;

describe('Kreuzworträtsel der Gruppe', () => {
  it('hat eine eigene Kennung, die keine Werkbank ist', () => {
    const id = kreuzwortKennung('abc123');
    expect(istKreuzwort(id)).toBe(true);
    expect(istKreuzwort('abc123')).toBe(false);
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it('gibt demselben Wort in jeder Schreibweise denselben Schlüssel', () => {
    expect(wortschluessel('Roter Kater')).toBe('wort/ROTERKATER');
    expect(wortschluessel('roterkater')).toBe('wort/ROTERKATER');
    expect(wortschluessel('  ROTER-KATER ')).toBe('wort/ROTERKATER');
  });

  it('hält Umlaute auseinander und bleibt dabei ein tauglicher Schlüssel', () => {
    expect(wortschluessel('Tür')).toBe('wort/T_dcR');
    expect(wortschluessel('Tür')).not.toBe(wortschluessel('Tuer'));
    for (const text of ['Tür', 'Straße', 'Ελλάδα', 'x'.repeat(200)]) {
      expect(wortschluessel(text)!, text).toMatch(TAUGLICH);
    }
  });

  it('nimmt nichts ohne Buchstaben', () => {
    expect(wortschluessel('123 !')).toBeNull();
  });

  it('liest Wörter in der Reihenfolge, in der sie gefunden wurden', () => {
    const z = zustandAus({
      laengen: '5, 7',
      'wort/B': { text: 'B', eingetragen: true, zeit: 20 },
      'wort/A': { text: 'A', eingetragen: false, zeit: 10 },
      'wort/C': null
    });
    expect(z.laengenText).toBe('5, 7');
    expect(z.woerter).toEqual([
      { id: 'wort/A', text: 'A', eingetragen: false },
      { id: 'wort/B', text: 'B', eingetragen: true }
    ]);
  });
});

describe('Doppelte Lösungswörter', () => {
  it('erkennt ein Wort wieder, egal wie es geschrieben ist', () => {
    const woerter = [neuesWort('Roter Kater'), neuesWort('Hund')];
    expect(schonGefunden(woerter, 'roterkater')?.text).toBe('Roter Kater');
    expect(schonGefunden(woerter, 'HUND ')?.text).toBe('Hund');
    expect(schonGefunden(woerter, 'Katze')).toBeUndefined();
    expect(schonGefunden(woerter, '  ')).toBeUndefined();
  });
});
