import { describe, expect, it } from 'vitest';
import { hexahue, hexahueMuster, hexahueZiffern } from './hexahue';
import { templer } from './templer';
import { winker } from './winker';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('Winkeralphabet', () => {
  const buchstaben = () => winker.tabelle!().filter((e) => e.gruppe === 'Buchstaben');

  it('kennt jeden Buchstaben genau einmal', () => {
    const zeichen = buchstaben().map((e) => e.zeichen).sort().join('');
    expect(zeichen).toBe(ALPHABET);
  });

  it('gibt keine Armstellung zweimal – auch Zahlzeichen und Leerzeichen nicht', () => {
    const stellungen = winker
      .tabelle!()
      .map((e) => e.darstellung)
      .filter((d) => !d.includes(' '));
    expect(stellungen).toHaveLength(28);
    expect(new Set(stellungen).size).toBe(28);
  });

  it('benutzt für Buchstaben nur die acht Richtungen, je zwei verschiedene', () => {
    const erlaubt = new Set(['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW']);
    for (const eintrag of buchstaben()) {
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

  it('setzt vor Ziffern das Zahlzeichen und nimmt A–I und K', () => {
    // Regelheft Anhang G: A/1 … I/9, K/0, davor „Zahl“.
    expect(winker.encode('10').text).toBe('N+NO S+SW SW+N');
    expect(winker.decode('N+NO S+SW SW+N').text).toBe('10');
  });

  it('schaltet mit J auf Buchstaben zurück, auch über Wortgrenzen hinweg', () => {
    const kodiert = winker.encode('A1 B2C');
    // A, Zahl 1 | J B, Zahl 2, J C – nach Ziffern kommt vor jedem Buchstaben das J.
    expect(kodiert.text).toBe('S+SW N+NO S+SW / N+O S+W N+NO S+W N+O S+NW');
    expect(winker.decode(kodiert.text).text).toBe('A1 B2C');
    // Ohne J bleibt es bei Ziffern: Das ist die Regel der Tafel.
    expect(winker.decode('N+NO S+SW S+W').text).toBe('12');
    expect(winker.decode('N+NO S+SW N+O S+W').text).toBe('1B');
  });

  it('liest J ohne vorangehende Ziffern als J', () => {
    expect(winker.decode('N+O S+SW').text).toBe('JA');
  });

  it('verschluckt kein Wort, wenn das J nach den Ziffern fehlt', () => {
    // L hat keine Ziffernbedeutung, also ist die Zahl dort offensichtlich vorbei.
    expect(winker.decode('N+NO S+W SW+NO').text).toBe('2L');
  });

  it('liest beide Arme unten als Leerzeichen', () => {
    expect(winker.decode('S+SW S+S S+W').text).toBe('A B');
  });

  it('bringt beim Antippen einer Ziffer das Zahlzeichen mit', () => {
    const eins = winker.tabelle!().find((e) => e.zeichen === '1');
    expect(eins?.darstellung).toBe('N+NO S+SW');
    expect(winker.decode(eins!.darstellung).text).toBe('1');
  });

  it('zeichnet zwei Flaggen je Buchstabe, Ziffer und Zeichen', () => {
    for (const zeichen of [...ALPHABET, ...'0123456789', '#', '␣']) {
      const glyph = winker.zeichne!(zeichen);
      expect(glyph, zeichen).not.toBeNull();
      expect(glyph!.inhalt.match(/<line/g)?.length, zeichen).toBe(2);
    }
    // Die Ziffer sieht aus wie ihr Buchstabe.
    expect(winker.zeichne!('1')).toEqual(winker.zeichne!('A'));
  });

  it('löst Umlaute auf, statt sie zu verlieren', () => {
    expect(winker.decode(winker.encode('Bär').text).text).toBe('BAER');
  });
});

describe('Hexahue', () => {
  const FARBEN = ['M', 'R', 'G', 'Y', 'B', 'C'];

  it('kennt jeden Buchstaben genau einmal', () => {
    const buchstaben = hexahue.tabelle!().filter((e) => e.gruppe === 'Buchstaben');
    expect(buchstaben.map((e) => e.zeichen).sort().join('')).toBe(ALPHABET);
  });

  it('kennt die Ziffern, Punkt, Komma und das Leerzeichen der Tafel', () => {
    const weitere = hexahue.tabelle!().filter((e) => e.gruppe === 'Zahlen und Zeichen');
    expect(weitere.map((e) => e.zeichen).join('')).toBe('0123456789.,␣');
    // Kein Muster doppelt – sonst wäre die Rückrichtung nicht eindeutig.
    const alle = hexahue.tabelle!().map((e) => e.darstellung);
    expect(new Set(alle).size).toBe(alle.length);
  });

  it('benutzt je Ziffer Schwarz, Weiß und Grau genau zweimal', () => {
    // Dieselbe Art Probe wie bei den Buchstaben, nur mit drei Farben.
    for (const [ziffer, muster] of hexahueZiffern.slice(0, 10)) {
      expect([...muster].sort().join(''), ziffer).toBe('AAKKWW');
    }
  });

  it('unterscheidet sich von Ziffer zu Ziffer durch genau einen Tausch benachbarter Felder', () => {
    // Dieselbe Bauart wie beim Alphabet – eine unabhängige Probe auf die
    // ausgelesene Reihe: Ein verrutschtes Feld ergäbe mehr als einen Tausch.
    for (let i = 1; i < 10; i++) {
      const vorher = hexahueZiffern[i - 1]![1];
      const jetzt = hexahueZiffern[i]![1];
      const anders = [...vorher].map((z, k) => (z === jetzt[k] ? null : k)).filter((k) => k !== null);
      expect(anders, String(i)).toHaveLength(2);
      const [a, b] = anders as number[];
      expect(b! - a!, String(i)).toBe(1);
      expect(vorher[a!]).toBe(jetzt[b!]);
      expect(vorher[b!]).toBe(jetzt[a!]);
    }
  });

  it('kodiert Ziffern und Satzzeichen und liest das schwarze Feld als Leerzeichen', () => {
    const kodiert = hexahue.encode('A1.');
    expect(kodiert.luecken).toEqual([]);
    expect(kodiert.text).toBe('MRGYBC AKWKAW KWWKKW');
    expect(hexahue.decode(kodiert.text).text).toBe('A1.');
    expect(hexahue.decode('MRGYBC KKKKKK RMGYBC').text).toBe('A B');
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
    for (const buchstabe of [...ALPHABET, ...'0123456789.,␣']) {
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
