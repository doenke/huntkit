import { describe, expect, it } from 'vitest';
import { hexahue, hexahueMuster } from './hexahue';
import { templer } from './templer';
import { winker } from './winker';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('Winkeralphabet', () => {
  it('kennt jeden Buchstaben genau einmal', () => {
    const zeichen = winker.tabelle!().map((e) => e.zeichen).sort().join('');
    expect(zeichen).toBe(ALPHABET);
  });

  it('gibt keine Armstellung zweimal', () => {
    const stellungen = winker.tabelle!().map((e) => e.darstellung);
    expect(new Set(stellungen).size).toBe(26);
  });

  it('benutzt nur die acht Richtungen, je zwei verschiedene', () => {
    const erlaubt = new Set(['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']);
    for (const eintrag of winker.tabelle!()) {
      const teile = eintrag.darstellung.split('+');
      expect(teile, eintrag.zeichen).toHaveLength(2);
      expect(teile[0], eintrag.zeichen).not.toBe(teile[1]);
      for (const t of teile) expect(erlaubt.has(t), `${eintrag.zeichen}: ${t}`).toBe(true);
    }
  });

  it('kodiert und dekodiert', () => {
    const kodiert = winker.encode('HALLO');
    expect(kodiert.luecken).toEqual([]);
    expect(winker.decode(kodiert.text).text).toBe('HALLO');
  });

  it('zeichnet zwei Flaggen je Buchstabe', () => {
    for (const buchstabe of ALPHABET) {
      const glyph = winker.zeichne!(buchstabe);
      expect(glyph, buchstabe).not.toBeNull();
      expect(glyph!.inhalt.match(/<line/g)?.length, buchstabe).toBe(2);
    }
  });
});

describe('Hexahue', () => {
  const FARBEN = ['M', 'R', 'G', 'Y', 'B', 'C'];

  it('kennt jeden Buchstaben genau einmal', () => {
    expect(hexahue.tabelle!().map((e) => e.zeichen).sort().join('')).toBe(ALPHABET);
  });

  it('benutzt je Buchstabe alle sechs Farben genau einmal', () => {
    // Unabhängige Probe auf die ausgelesene Tafel: Wäre beim Auslesen ein Feld
    // verrutscht, käme hier eine Farbe doppelt vor.
    for (const [zeichen, muster] of hexahueMuster) {
      expect([...muster].sort().join(''), zeichen).toBe([...FARBEN].sort().join(''));
    }
  });

  it('unterscheidet sich von Buchstabe zu Buchstabe durch genau einen Tausch benachbarter Felder', () => {
    // Die zweite unabhängige Probe: Hexahue ist so aufgebaut, dass Magenta
    // schrittweise durch das Feld wandert.
    for (let i = 1; i < hexahueMuster.length; i++) {
      const vorher = hexahueMuster[i - 1]![1];
      const jetzt = hexahueMuster[i]![1];
      const anders = [...vorher].map((z, k) => (z === jetzt[k] ? null : k)).filter((k) => k !== null);
      expect(anders, hexahueMuster[i]![0]).toHaveLength(2);
      const [a, b] = anders as number[];
      expect(b! - a!, hexahueMuster[i]![0]).toBe(1);
      expect(vorher[a!]).toBe(jetzt[b!]);
      expect(vorher[b!]).toBe(jetzt[a!]);
    }
  });

  it('zeichnet sechs Farbfelder', () => {
    for (const buchstabe of ALPHABET) {
      const glyph = hexahue.zeichne!(buchstabe);
      expect(glyph!.inhalt.match(/<rect/g)?.length, buchstabe).toBe(6);
    }
  });

  it('kodiert und dekodiert', () => {
    const kodiert = hexahue.encode('HEXA');
    expect(kodiert.text.split(' ')[0]).toBe('GYRBCM');
    expect(hexahue.decode(kodiert.text).text).toBe('HEXA');
  });
});

describe('Templercode', () => {
  it('kennt jeden Buchstaben genau einmal', () => {
    expect(templer.tabelle!().map((e) => e.zeichen).sort().join('')).toBe(ALPHABET);
  });

  it('gibt der zweiten Alphabethälfte einen Punkt und der ersten nicht', () => {
    for (const eintrag of templer.tabelle!()) {
      const zweiteHaelfte = eintrag.zeichen >= 'N';
      const hatPunkt = eintrag.darstellung.endsWith('+');
      // N steht allein in der Mitte und braucht keinen Punkt zur Unterscheidung.
      if (eintrag.zeichen === 'N') continue;
      expect(hatPunkt, eintrag.zeichen).toBe(zweiteHaelfte);
    }
  });

  it('legt I und J auf dieselbe Form, wie in der Quelle', () => {
    const form = (z: string) => templer.tabelle!().find((e) => e.zeichen === z)!.darstellung;
    expect(form('I')).toBe(form('J'));
    // Beim Entschlüsseln gewinnt der erste Eintrag – das ist I.
    expect(templer.decode(templer.encode('J').text).text).toBe('I');
  });

  it('kodiert und dekodiert alles außer dem mehrdeutigen J', () => {
    const ohneJ = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
    const kodiert = templer.encode(ohneJ);
    expect(kodiert.luecken).toEqual([]);
    expect(templer.decode(kodiert.text).text).toBe(ohneJ);
  });

  it('zeichnet das ganze Kreuz als Orientierung plus die gemeinte Form', () => {
    for (const buchstabe of ALPHABET) {
      const glyph = templer.zeichne!(buchstabe);
      expect(glyph, buchstabe).not.toBeNull();
      expect(glyph!.inhalt.match(/<path/g)?.length, buchstabe).toBe(4);
    }
  });
});
