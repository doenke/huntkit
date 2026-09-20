import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingeralphabet } from './fingeralphabet';

describe('Fingeralphabet', () => {
  it('kennt das Alphabet samt Umlauten und Sch', () => {
    const zeichen = fingeralphabet.tabelle!().map((e) => e.zeichen);
    expect(zeichen).toHaveLength(30);
    for (const z of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') expect(zeichen, z).toContain(z);
    for (const z of ['Ä', 'Ö', 'Ü', 'Sch']) expect(zeichen, z).toContain(z);
  });

  it('hat zu jedem Zeichen ein Bild, das auch wirklich vorliegt', () => {
    // Ein fehlendes Bild fiele sonst erst im Funkloch auf – dann ist es zu spät.
    for (const eintrag of fingeralphabet.tabelle!()) {
      const glyph = fingeralphabet.zeichne!(eintrag.zeichen);
      expect(glyph, eintrag.zeichen).not.toBeNull();
      const treffer = glyph!.inhalt.match(/href="([^"]+)"/);
      expect(treffer, eintrag.zeichen).not.toBeNull();
      expect(existsSync(`public/${treffer![1]}`), `${eintrag.zeichen}: ${treffer![1]}`).toBe(true);
    }
  });

  it('verweist nur auf relative Pfade, damit die App im Unterverzeichnis läuft', () => {
    for (const eintrag of fingeralphabet.tabelle!()) {
      const inhalt = fingeralphabet.zeichne!(eintrag.zeichen)!.inhalt;
      expect(inhalt, eintrag.zeichen).not.toMatch(/href="[/h]/);
    }
  });

  it('ist als Nachschlagecode gekennzeichnet und nennt seine Quelle', () => {
    // Beides hat Folgen: kein Schritt in der Werkbank, und die Namensnennung
    // ist Bedingung der Lizenz.
    expect(fingeralphabet.nurNachschlagen).toBe(true);
    expect(fingeralphabet.quelle?.text).toMatch(/CC BY-SA 4\.0/);
    expect(fingeralphabet.quelle?.url).toMatch(/^https:\/\//);
  });

  it('liefert keine Glyphe für Unbekanntes', () => {
    expect(fingeralphabet.zeichne!('§')).toBeNull();
  });
});
