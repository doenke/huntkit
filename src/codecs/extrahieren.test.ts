import { describe, expect, it } from 'vitest';
import { ausWoertern, gitter, gitterLesen, jedesN, laenge, stellen, zaehlen } from './extrahieren';

describe('Jeden n-ten', () => {
  it('nimmt jeden dritten Buchstaben ab der ersten Stelle', () => {
    expect(jedesN.encode('ABCDEFGHI', { n: 3, versatz: 1 }).text).toBe('ADG');
  });

  it('beachtet den Versatz', () => {
    expect(jedesN.encode('ABCDEFGHI', { n: 3, versatz: 2 }).text).toBe('BEH');
    expect(jedesN.encode('ABCDEFGHI', { n: 3, versatz: 3 }).text).toBe('CFI');
  });

  it('überspringt standardmäßig Leerzeichen und Satzzeichen', () => {
    // Sonst zählt man Leerzeichen mit und verschiebt alles.
    expect(jedesN.encode('AB CD, EF!', { n: 2, versatz: 1 }).text).toBe('ACE');
    // Mit allen Zeichen zählen Leerzeichen und Komma mit: A, Leerzeichen, D,
    // Leerzeichen, F.
    expect(jedesN.encode('AB CD, EF!', { n: 2, versatz: 1, grundlage: 'zeichen' }).text)
      .toBe('A D F');
  });
});

describe('Buchstaben an Stellen', () => {
  it('liest eine Stellenliste in der angegebenen Reihenfolge', () => {
    expect(stellen.encode('NACHTSCHICHT', { liste: '3,1,4,1,5' }).text).toBe('CNHNT');
  });

  it('zählt negative Angaben von hinten', () => {
    expect(stellen.encode('ABCDE', { liste: '-1,-2' }).text).toBe('ED');
  });

  it('meldet Stellen, die es nicht gibt', () => {
    const treffer = stellen.encode('ABC', { liste: '1,99' });
    expect(treffer.text).toBe('A');
    expect(treffer.luecken).toHaveLength(1);
  });
});

describe('Aus jedem Wort', () => {
  it('bildet das Akrostichon', () => {
    expect(ausWoertern.encode('Gold liegt unter der Eiche', { stelle: 1 }).text).toBe('GludE');
  });

  it('nimmt den letzten Buchstaben jedes Wortes', () => {
    expect(ausWoertern.encode('alle drei nun', { stelle: -1 }).text).toBe('ein');
  });

  it('meldet Wörter, die zu kurz sind', () => {
    const treffer = ausWoertern.encode('ab c def', { stelle: 3 });
    expect(treffer.luecken).toHaveLength(2);
    expect(treffer.text).toBe('f');
  });
});

describe('Gitter lesen', () => {
  // ABCDE
  // FGHIJ
  // KLMNO
  const zeichen = [...'ABCDEFGHIJKLMNO'];

  it('liest spaltenweise', () => {
    expect(gitterLesen(zeichen, 5, 'spalten')).toBe('AFKBGLCHMDINEJO');
  });

  it('liest Zeilen abwechselnd', () => {
    expect(gitterLesen(zeichen, 5, 'bustrophedon')).toBe('ABCDEJIHGFKLMNO');
  });

  it('liest Diagonalen', () => {
    expect(gitterLesen(zeichen, 5, 'diagonalen')).toBe('ABFCGKDHLEIMJNO');
  });

  it('liest im Uhrzeigersinn von außen nach innen', () => {
    expect(gitterLesen(zeichen, 5, 'spirale')).toBe('ABCDEJONMLKFGHI');
  });

  it('gibt zeilenweise den Text unverändert zurück', () => {
    expect(gitterLesen(zeichen, 5, 'zeilen')).toBe('ABCDEFGHIJKLMNO');
  });

  it('kommt mit unvollständiger letzter Zeile zurecht', () => {
    expect(gitterLesen([...'ABCDEFG'], 3, 'spalten')).toBe('ADGBECF');
  });

  it('hängt als Schritt in der Kette', () => {
    expect(gitter.encode('ABCDEFGHIJKLMNO', { breite: 5, richtung: 'spalten' }).text)
      .toBe('AFKBGLCHMDINEJO');
  });
});

describe('Einseitigkeit', () => {
  it('ist bei allen Extraktionshelfern vermerkt', () => {
    // Die Oberfläche blendet den Richtungsschalter aus, statt eine Umkehr
    // vorzutäuschen, die es nicht gibt.
    for (const helfer of [jedesN, stellen, ausWoertern, gitter]) {
      expect(helfer.einseitig, helfer.id).toBe(true);
      expect(helfer.decode('ABCDEF', { n: 2, versatz: 1, breite: 3, liste: '1', stelle: 1 }).text)
        .toBe(helfer.encode('ABCDEF', { n: 2, versatz: 1, breite: 3, liste: '1', stelle: 1 }).text);
    }
  });
});

describe('Zeichen zählen', () => {
  it('zählt, wie oft ein Zeichen vorkommt', () => {
    expect(zaehlen.encode('NACHTSCHICHT', { suche: 'C', schreibung: 'egal' }).text).toBe('3');
    expect(zaehlen.encode('NACHTSCHICHT', { suche: 'X', schreibung: 'egal' }).text).toBe('0');
  });

  it('nimmt Groß- und Kleinschreibung standardmäßig nicht wichtig', () => {
    expect(zaehlen.encode('Anna', { suche: 'a', schreibung: 'egal' }).text).toBe('2');
    expect(zaehlen.encode('Anna', { suche: 'a', schreibung: 'genau' }).text).toBe('1');
  });

  it('zählt auch mehrstellige Suchen, ohne sich zu überlappen', () => {
    expect(zaehlen.encode('.- .- ...', { suche: '.-', schreibung: 'genau' }).text).toBe('2');
    // AAAA enthält AA zweimal, wenn man wie von Hand weiterzählt.
    expect(zaehlen.encode('AAAA', { suche: 'AA', schreibung: 'genau' }).text).toBe('2');
  });

  it('zählt Leerzeichen und Satzzeichen mit, wenn man danach sucht', () => {
    expect(zaehlen.encode('A B C', { suche: ' ', schreibung: 'egal' }).text).toBe('2');
  });

  it('behauptet bei leerer Eingabe oder leerer Suche keine Null', () => {
    expect(zaehlen.encode('', { suche: 'E', schreibung: 'egal' }).text).toBe('');
    expect(zaehlen.encode('EEE', { suche: '', schreibung: 'egal' }).text).toBe('');
  });
});

describe('Länge', () => {
  const satz = 'Der 3. Weg, gut!';

  it('zählt ohne Angabe nur die Buchstaben', () => {
    // Standard ist „nur Buchstaben“: Ziffer, Punkt, Komma, Ausrufezeichen und
    // Leerzeichen bleiben draußen – DerWeggut sind neun.
    expect(laenge.encode(satz, {}).text).toBe('9');
    expect(laenge.encode(satz, { was: 'buchstaben' }).text).toBe('9');
  });

  it('zählt alle Zeichen, wenn man es so einstellt', () => {
    expect(laenge.encode(satz, { was: 'zeichen' }).text).toBe(String([...satz].length));
    expect(laenge.encode('A B', { was: 'zeichen' }).text).toBe('3');
  });

  it('lässt auf Wunsch die Leerzeichen weg', () => {
    expect(laenge.encode('A B C', { was: 'ohne-leer' }).text).toBe('3');
    // Auch Zeilenumbrüche und Tabulatoren sind Abstand, kein Zeichen.
    expect(laenge.encode('A\tB\nC', { was: 'ohne-leer' }).text).toBe('3');
  });

  it('zählt Sonderzeichen: weder Buchstabe noch Ziffer noch Abstand', () => {
    // Punkt, Komma, Ausrufezeichen – die 3 zählt als Ziffer nicht mit.
    expect(laenge.encode(satz, { was: 'sonderzeichen' }).text).toBe('3');
    expect(laenge.encode('ABC123', { was: 'sonderzeichen' }).text).toBe('0');
  });

  it('zählt Wörter über den Abstand, nicht über die Satzzeichen', () => {
    expect(laenge.encode(satz, { was: 'woerter' }).text).toBe('4');
    // Vorne und hinten Abstand ergibt keine leeren Wörter.
    expect(laenge.encode('  eins   zwei  ', { was: 'woerter' }).text).toBe('2');
  });

  it('zählt Umlaute und ß als je einen Buchstaben', () => {
    expect(laenge.encode('Größe', { was: 'buchstaben' }).text).toBe('5');
  });

  it('behauptet bei leerer Eingabe keine Null', () => {
    for (const was of ['buchstaben', 'zeichen', 'ohne-leer', 'sonderzeichen', 'woerter']) {
      expect(laenge.encode('', { was }).text, was).toBe('');
    }
  });

  it('ist einseitig und rechnet in beide Richtungen dasselbe', () => {
    expect(laenge.einseitig).toBe(true);
    expect(laenge.decode(satz, { was: 'zeichen' }).text).toBe(
      laenge.encode(satz, { was: 'zeichen' }).text
    );
  });
});
