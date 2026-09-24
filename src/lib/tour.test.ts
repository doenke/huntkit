import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WERKBANK_TOUR } from './tour';

describe('Tour durch die Werkbank', () => {
  it('zeigt nur auf Elemente, die es in der Werkbank gibt', () => {
    // Wird die Oberfläche umgebaut und ein Ziel verschwindet, fällt es hier auf –
    // nicht erst, wenn die Tour ins Leere zeigt.
    const quelle = readFileSync(new URL('../views/Werkbank.svelte', import.meta.url), 'utf8');
    for (const schritt of WERKBANK_TOUR) {
      if (!schritt.ziel) continue;
      expect(quelle, schritt.ziel).toMatch(new RegExp(`data-tour=(\\{[^}]*)?["']${schritt.ziel}["']`));
    }
  });

  it('hat für jeden Schritt Titel und Text', () => {
    for (const schritt of WERKBANK_TOUR) {
      expect(schritt.titel.length).toBeGreaterThan(0);
      expect(schritt.text.length).toBeGreaterThan(20);
    }
  });
});
