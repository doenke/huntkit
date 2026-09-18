import { describe, expect, it } from 'vitest';
import { ausHash } from './router';

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

  it('ignoriert weitere Pfadteile', () => {
    expect(ausHash('#/codes/morse')).toBe('codes');
  });
});
