import { describe, expect, it } from 'vitest';
import { atbash, bacon, handytasten, polybios, vigenereCodec, zaun, zaunFolge } from './chiffren';
import { alsRoemisch, ausRoemisch, roemisch } from './zahlen';

describe('Atbash', () => {
  it('dreht das Alphabet um und ist seine eigene Umkehrung', () => {
    expect(atbash.encode('ABC XYZ').text).toBe('ZYX CBA');
    expect(atbash.decode(atbash.encode('Nachtschicht').text).text).toBe('Nachtschicht');
  });
});

describe('Vigenère', () => {
  it('verschlüsselt mit wechselnder Verschiebung', () => {
    // Klassisches Lehrbuchbeispiel.
    expect(vigenereCodec.encode('ATTACKATDAWN', { schluessel: 'LEMON' }).text).toBe('LXFOPVEFRNHR');
  });

  it('geht hin und zurück und lässt Satzzeichen stehen', () => {
    const original = 'Treffpunkt: Reinoldikirche, 3 Uhr!';
    const kodiert = vigenereCodec.encode(original, { schluessel: 'NACHT' });
    expect(vigenereCodec.decode(kodiert.text, { schluessel: 'NACHT' }).text).toBe(original);
  });

  it('lässt den Text ohne Schlüssel unverändert', () => {
    expect(vigenereCodec.encode('HALLO', { schluessel: '' }).text).toBe('HALLO');
  });
});

describe('Bacon', () => {
  it('schreibt fünf Zeichen je Buchstabe', () => {
    expect(bacon.encode('A', { variante: '26' }).text).toBe('AAAAA');
    expect(bacon.encode('B', { variante: '26' }).text).toBe('AAAAB');
  });

  it('geht hin und zurück, auch ohne Trennzeichen', () => {
    const kodiert = bacon.encode('NACHTSCHICHT', { variante: '26' });
    expect(bacon.decode(kodiert.text, { variante: '26' }).text).toBe('NACHTSCHICHT');
    expect(bacon.decode(kodiert.text.replace(/ /g, ''), { variante: '26' }).text).toBe('NACHTSCHICHT');
  });

  it('legt in der klassischen Variante I/J und U/V zusammen', () => {
    const treffer = bacon.encode('IJ', { variante: '24' });
    const teile = treffer.text.split(' ');
    expect(teile[0]).toBe(teile[1]);
    expect(bacon.decode(treffer.text, { variante: '24' }).text).toBe('II');
  });

  it('versteht auch 0 und 1 statt A und B', () => {
    expect(bacon.decode('00000 00001').text).toBe('AB');
  });
});

describe('Polybios', () => {
  it('gibt Zeile und Spalte', () => {
    expect(polybios.encode('A').text).toBe('11');
    expect(polybios.encode('Z').text).toBe('55');
  });

  it('geht hin und zurück, mit I für J', () => {
    const kodiert = polybios.encode('NACHTSCHICHT');
    expect(polybios.decode(kodiert.text).text).toBe('NACHTSCHICHT');
    expect(polybios.decode(polybios.encode('JA').text).text).toBe('IA');
  });
});

describe('Zaunmuster', () => {
  it('läuft im Zickzack', () => {
    expect(zaunFolge(7, 3)).toEqual([0, 1, 2, 1, 0, 1, 2]);
  });

  it('geht hin und zurück', () => {
    for (const zeilen of [2, 3, 4, 7]) {
      const original = 'DIELOESUNGISTGOLD';
      const kodiert = zaun.encode(original, { zeilen });
      expect(zaun.decode(kodiert.text, { zeilen }).text, String(zeilen)).toBe(original);
    }
  });

  it('sammelt die Zeilen von oben nach unten ein', () => {
    // WIRSINDENTDECKT im Zickzack über drei Zeilen:
    //   W···I···N···C··      Zeile 0: WINC
    //   ·I·S·N·E·T·E·K·      Zeile 1: ISNETEK
    //   ··R···D···D···T      Zeile 2: RDDT
    expect(zaun.encode('WIRSINDENTDECKT', { zeilen: 3 }).text).toBe('WINCISNETEKRDDT');
  });
});

describe('Handytastatur', () => {
  it('schreibt Buchstaben als Tastenwiederholung', () => {
    expect(handytasten.encode('ABC').text).toBe('2 22 222');
    expect(handytasten.decode('2 22 222').text).toBe('ABC');
  });

  it('geht hin und zurück', () => {
    const kodiert = handytasten.encode('NACHTSCHICHT');
    expect(handytasten.decode(kodiert.text).text).toBe('NACHTSCHICHT');
  });

  it('meldet gemischte Gruppen', () => {
    expect(handytasten.decode('23').luecken).toHaveLength(1);
  });
});

describe('Römische Zahlen', () => {
  it('rechnet in beide Richtungen', () => {
    expect(alsRoemisch(1987)).toBe('MCMLXXXVII');
    expect(ausRoemisch('MCMLXXXVII')).toBe(1987);
    expect(alsRoemisch(4)).toBe('IV');
    expect(alsRoemisch(3999)).toBe('MMMCMXCIX');
  });

  it('weist falsche Schreibweisen zurück statt zu raten', () => {
    // IIII und IC sind keine gültige Schreibweise – das faellt beim
    // Zurueckschreiben auf.
    expect(ausRoemisch('IIII')).toBeNull();
    expect(ausRoemisch('IC')).toBeNull();
    expect(alsRoemisch(0)).toBeNull();
    expect(alsRoemisch(4000)).toBeNull();
  });

  it('geht über alle Zahlen von 1 bis 3999 hin und zurück', () => {
    for (let n = 1; n <= 3999; n++) {
      expect(ausRoemisch(alsRoemisch(n) as string), String(n)).toBe(n);
    }
  });

  it('arbeitet als Codec auf mehreren Zahlen', () => {
    expect(roemisch.encode('4 9 14').text).toBe('IV IX XIV');
    expect(roemisch.decode('IV IX XIV').text).toBe('4 9 14');
  });
});
