import { describe, expect, it } from 'vitest';
import { ausHash, ohneParameter, parameter, umleitung } from './router';

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

  it('kennt Datenschutz und Kontakt', () => {
    expect(ausHash('#/datenschutz')).toBe('datenschutz');
    expect(ausHash('#/kontakt')).toBe('kontakt');
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

describe('Parameter im Hash', () => {
  it('liest Werte, Schalter und fehlende', () => {
    expect(parameter('anmeldung', '#/gruppen?anmeldung=a%20b')).toBe('a b');
    expect(parameter('tour', '#/werkbank?tour')).toBe('');
    expect(parameter('tour', '#/werkbank?w=1&tour')).toBe('');
    expect(parameter('tour', '#/werkbank?touren=1')).toBeNull();
    expect(parameter('e', '#/werkbank')).toBeNull();
  });

  it('nimmt genau die genannten heraus', () => {
    expect(ohneParameter(['tour'], '#/werkbank?tour')).toBe('#/werkbank');
    expect(ohneParameter(['anmeldung', 'anmeldefehler'], '#/gruppen?anmeldefehler=x&y=1')).toBe('#/gruppen?y=1');
    expect(ohneParameter(['a'], '#/werkbank')).toBe('#/werkbank');
  });

  it('leitet alte Einladungslinks auf die Gruppen-Seite', () => {
    expect(umleitung('#/werkbank?einladung=ab-C_1')).toBe('#/gruppen?einladung=ab-C_1');
    expect(umleitung('#/gruppen?einladung=x')).toBeNull();
    expect(umleitung('#/werkbank?tour')).toBeNull();
  });
});
