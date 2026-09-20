import { describe, expect, it } from 'vitest';
import { alsFragment, ausFragment } from './teilen';
import type { Werkbankzustand } from './werkbank';

const ZUSTAND: Werkbankzustand = {
  eingabe: '-.-. .- . ... .- .-.',
  schritte: [
    { id: 'a', codecId: 'morse', richtung: 'decode', optionen: {}, aktiv: true },
    { id: 'b', codecId: 'caesar', richtung: 'decode', optionen: { verschiebung: 13 }, aktiv: true }
  ]
};

describe('Teilen per Link', () => {
  it('geht hin und zurück', async () => {
    const fragment = await alsFragment(ZUSTAND);
    expect(await ausFragment(fragment)).toEqual(ZUSTAND);
  });

  it('benutzt nur Zeichen, die in einer Adresse erlaubt sind', async () => {
    const fragment = await alsFragment(ZUSTAND);
    expect(fragment).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('staucht längere Stände', async () => {
    const lang: Werkbankzustand = { eingabe: 'A'.repeat(2000), schritte: ZUSTAND.schritte };
    const fragment = await alsFragment(lang);
    // Gestauchte Fragmente tragen das Kennzeichen z und sind viel kürzer.
    expect(fragment[0]).toBe('z');
    expect(fragment.length).toBeLessThan(400);
    expect(await ausFragment(fragment)).toEqual(lang);
  });

  it('gibt bei beschädigtem Fragment nichts zurück, statt abzustürzen', async () => {
    expect(await ausFragment('zNICHTGUELTIG!!!')).toBeNull();
    expect(await ausFragment('')).toBeNull();
    expect(await ausFragment('r' + btoa('{"kein":"zustand"}'))).toBeNull();
  });
});
