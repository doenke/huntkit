import { describe, expect, it } from 'vitest';
import { ausHash } from './router';

describe('Hash-Routing', () => {
  it('erkennt bekannte Seiten', () => {
    expect(ausHash('#/nachschlagen')).toBe('nachschlagen');
  });

  it('führt die alte Codes-Seite zu Nachschlagen', () => {
    expect(ausHash('#/codes')).toBe('nachschlagen');
  });

  it('faellt bei Unbekanntem und Leerem auf die Werkbank zurueck', () => {
    expect(ausHash('')).toBe('werkbank');
    expect(ausHash('#')).toBe('werkbank');
    expect(ausHash('#/gibtesnicht')).toBe('werkbank');
  });

  it('kennt die Gruppen-Seite', () => {
    expect(ausHash('#/gruppen?anmeldung=abc')).toBe('gruppen');
  });

  it('ignoriert weitere Pfadteile', () => {
    expect(ausHash('#/nachschlagen/morse')).toBe('nachschlagen');
  });

  it('ignoriert angehängte Parameter', () => {
    // Ein geteilter Link trägt den Werkbank-Stand hinter einem Fragezeichen.
    expect(ausHash('#/werkbank?w=zABC123')).toBe('werkbank');
    expect(ausHash('#/nachschlagen?x=1')).toBe('nachschlagen');
  });
});
