import { describe, expect, it } from 'vitest';
import { alsFragment, ausFragment } from './teilen';
import { rechne, type Blatt } from './blatt';

const BLATT: Blatt = {
  spalten: [
    { art: 'eingabe', id: 'a' },
    { art: 'werkzeug', id: 'b', quelle: 'a', codecId: 'morse', richtung: 'decode', optionen: {} }
  ],
  zeilen: [
    { id: 'z1', nummer: 1, werte: { a: '-.-. .- . ... .- .-.' } },
    { id: 'z2', nummer: 2, werte: { a: '... --- ...' } }
  ],
  sortierung: { spalte: 'b', richtung: 'auf', art: 'text' }
};

describe('Teilen per Link', () => {
  it('geht hin und zurück', async () => {
    const fragment = await alsFragment(BLATT);
    expect(await ausFragment(fragment)).toEqual(BLATT);
  });

  it('benutzt nur Zeichen, die in einer Adresse erlaubt sind', async () => {
    const fragment = await alsFragment(BLATT);
    expect(fragment).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('liest auch Links aus der Zeit der Schrittkette', async () => {
    // Ein alter geteilter Link darf nicht ins Leere laufen: Aus Text und Kette
    // wird ein Blatt mit einer Zeile.
    const alt = 'r' + btoa(JSON.stringify({
      eingabe: '... --- ...',
      schritte: [{ id: 'a', codecId: 'morse', richtung: 'decode', optionen: {}, aktiv: true }]
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const blatt = await ausFragment(alt);
    expect(blatt).not.toBeNull();
    const letzte = blatt!.spalten[1]!;
    expect(rechne(blatt!).zeilen[0]?.zellen[letzte.id]?.text).toBe('SOS');
  });

  it('staucht längere Stände', async () => {
    const lang: Blatt = {
      ...BLATT,
      zeilen: [{ id: 'z1', nummer: 1, werte: { a: 'A'.repeat(2000) } }]
    };
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
