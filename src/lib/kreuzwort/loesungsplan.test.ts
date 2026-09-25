import { describe, expect, it } from 'vitest';
import { buchstaben, laengenLesen, neuesWort, planen, type Wort } from './loesungsplan';

/** Kurzschreibweise für die Tests – die Kennung interessiert hier nicht. */
function wort(text: string, eingetragen = false): Wort {
  return { ...neuesWort(text), eingetragen };
}

describe('Buchstaben zählen', () => {
  it('zählt nur Buchstaben – das Gitter hat keine Felder für Leerzeichen', () => {
    expect(buchstaben('Roter Kater').join('')).toBe('ROTERKATER');
    expect(buchstaben('Schiff-Fahrt')).toHaveLength(11);
  });

  it('zählt einen Umlaut als einen Buchstaben', () => {
    expect(buchstaben('Tür').join('')).toBe('TÜR');
  });

  it('schreibt ß als SS – so steht es auch im Gitter', () => {
    // Zwei Felder, nicht eines: Kreuzworträtsel kennen kein ß in Großschrift.
    expect(buchstaben('Straße').join('')).toBe('STRASSE');
  });
});

describe('Längenliste lesen', () => {
  it('nimmt Komma, Leerzeichen und Zeilenumbruch als Trenner und sortiert', () => {
    expect(laengenLesen('7, 5 3\n7').laengen).toEqual([3, 5, 7, 7]);
  });

  it('meldet zurück, was keine Zahl ist, statt es zu verschlucken', () => {
    const gelesen = laengenLesen('5, fünf, 7');
    expect(gelesen.laengen).toEqual([5, 7]);
    expect(gelesen.unlesbar).toEqual(['fünf']);
  });

  it('lässt keine unsinnigen Längen durch', () => {
    expect(laengenLesen('0 5 200').laengen).toEqual([5]);
  });
});

describe('Plan aus Längen und gefundenen Wörtern', () => {
  it('sortiert nach Länge und zeigt leere Lücken mit an', () => {
    const plan = planen([7, 3, 5], [wort('Haus')]);
    expect(plan.gruppen.map((g) => g.laenge)).toEqual([3, 5, 7]);
    expect(plan.gruppen.every((g) => g.zeilen.length === g.plaetze)).toBe(true);
    // „Haus“ hat vier Buchstaben – dafür gibt es keine Lücke.
    expect(plan.ohnePlatz.map((w) => w.text)).toEqual(['Haus']);
  });

  it('nennt ein Wort eindeutig, wenn es die einzige Lücke seiner Länge füllt', () => {
    const plan = planen([5, 7], [wort('Feder')]);
    const fuenf = plan.gruppen.find((g) => g.laenge === 5)!;
    expect(fuenf.zeilen[0]?.eindeutig).toBe(true);
    expect(plan.eindeutige).toBe(1);
  });

  it('nennt zwei Wörter auf zwei gleich langen Lücken nicht eindeutig', () => {
    const plan = planen([5, 5], [wort('Feder'), wort('Segel')]);
    expect(plan.gruppen[0]?.zeilen.every((z) => !z.eindeutig)).toBe(true);
    expect(plan.eindeutige).toBe(0);
  });

  it('macht das zweite Wort eindeutig, sobald das erste abgehakt ist', () => {
    // Genau der Ablauf am Gitter: eintragen, abhaken, der Rest klärt sich.
    const plan = planen([5, 5], [wort('Feder', true), wort('Segel')]);
    const fuenf = plan.gruppen[0]!;
    expect(fuenf.offenePlaetze).toBe(1);
    expect(fuenf.zeilen[0]?.wort?.text).toBe('Segel');
    expect(fuenf.zeilen[0]?.eindeutig).toBe(true);
    // Das erledigte Wort rutscht nach unten, bleibt aber sichtbar.
    expect(fuenf.zeilen[1]?.wort?.text).toBe('Feder');
    expect(fuenf.zeilen[1]?.eindeutig).toBe(false);
  });

  it('meldet mehr Wörter als Lücken einer Länge', () => {
    const plan = planen([5], [wort('Feder'), wort('Segel')]);
    expect(plan.gruppen[0]?.zuviel).toBe(1);
    expect(plan.gruppen[0]?.zeilen).toHaveLength(2);
  });

  it('zählt Lücken, Funde und Eingetragenes für die Übersicht', () => {
    const plan = planen([3, 5, 5], [wort('Feder', true), wort('Segel'), wort('Zug')]);
    expect(plan.plaetze).toBe(3);
    expect(plan.gefunden).toBe(3);
    expect(plan.eingetragen).toBe(1);
    // „Zug“ ist die einzige Drei, „Segel“ die letzte offene Fünf.
    expect(plan.eindeutige).toBe(2);
  });

  it('liefert die Buchstaben je Zeile für die Kreuzungspunkte', () => {
    const plan = planen([5], [wort('Feder')]);
    expect(plan.gruppen[0]?.zeilen[0]?.buchstaben).toEqual(['F', 'E', 'D', 'E', 'R']);
  });
});
