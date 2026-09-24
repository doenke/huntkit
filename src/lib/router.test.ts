import { describe, expect, it } from 'vitest';
import { ausHash, leistenplatz } from './router';

describe('Hash-Routing', () => {
  it('erkennt bekannte Seiten', () => {
    expect(ausHash('#/codes')).toBe('codes');
    expect(ausHash('#/nachschlagen')).toBe('nachschlagen');
  });

  it('faellt bei Unbekanntem und Leerem auf die Werkbank zurueck', () => {
    expect(ausHash('')).toBe('werkbank');
    expect(ausHash('#')).toBe('werkbank');
    expect(ausHash('#/gibtesnicht')).toBe('werkbank');
  });

  it('kennt Unterseiten, die in der Leiste zu einer anderen gehören', () => {
    expect(ausHash('#/gruppen?anmeldung=abc')).toBe('gruppen');
    expect(leistenplatz('gruppen')).toBe('mehr');
    expect(leistenplatz('codes')).toBe('codes');
  });

  it('ignoriert weitere Pfadteile', () => {
    expect(ausHash('#/codes/morse')).toBe('codes');
  });

  it('ignoriert angehängte Parameter', () => {
    // Ein geteilter Link trägt den Werkbank-Stand hinter einem Fragezeichen.
    expect(ausHash('#/werkbank?w=zABC123')).toBe('werkbank');
    expect(ausHash('#/nachschlagen?x=1')).toBe('nachschlagen');
  });
});
