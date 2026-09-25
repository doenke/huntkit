import { describe, expect, it } from 'vitest';
import {
  anStelle, auslesen, ELEMENTE, finde, gruppe, periode, raster, spaltenZahl
} from './periodensystem';

function element(symbol: string) {
  return ELEMENTE.find((e) => e.symbol === symbol)!;
}

describe('Stellung im Periodensystem', () => {
  it('ordnet bekannte Elemente richtig ein', () => {
    const erwartet: Array<[string, number | null, number]> = [
      ['H', 1, 1], ['He', 18, 1], ['Li', 1, 2], ['C', 14, 2], ['Ne', 18, 2],
      ['Na', 1, 3], ['Si', 14, 3], ['Ar', 18, 3],
      ['K', 1, 4], ['Fe', 8, 4], ['Br', 17, 4], ['Kr', 18, 4],
      ['Ag', 11, 5], ['I', 17, 5],
      ['Cs', 1, 6], ['La', 3, 6], ['Hf', 4, 6], ['Au', 11, 6], ['Rn', 18, 6],
      ['Ra', 2, 7], ['Ac', 3, 7], ['Rf', 4, 7], ['Og', 18, 7],
      ['Ce', null, 6], ['Lu', null, 6], ['U', null, 7]
    ];
    for (const [symbol, g, p] of erwartet) {
      const e = element(symbol);
      expect(gruppe(e), `${symbol} Gruppe`).toBe(g);
      expect(periode(e.ordnungszahl), `${symbol} Periode`).toBe(p);
    }
  });

  it('gibt jeder Gruppe die erwartete Anzahl Elemente', () => {
    const zaehler = new Map<number, number>();
    for (const e of ELEMENTE) {
      const g = gruppe(e);
      if (g !== null) zaehler.set(g, (zaehler.get(g) ?? 0) + 1);
    }
    // Gruppe 1 hat sieben Elemente (H mitgezählt), Gruppe 18 sieben,
    // die Gruppen 4 bis 12 je vier, Gruppe 3 vier (Sc, Y, La, Ac).
    expect(zaehler.get(1)).toBe(7);
    expect(zaehler.get(18)).toBe(7);
    expect(zaehler.get(3)).toBe(4);
    for (let g = 4; g <= 12; g++) expect(zaehler.get(g), `Gruppe ${g}`).toBe(4);
  });

  it('lässt keine zwei Elemente auf derselben Stelle liegen', () => {
    for (const layout of ['standard', 'lang', 'kompakt'] as const) {
      const stellen = raster(layout).map((z) => `${z.spalte}/${z.reihe}`);
      expect(new Set(stellen).size, layout).toBe(118);
    }
  });

  it('hält sich an die Spaltenzahl des Layouts', () => {
    for (const layout of ['standard', 'lang', 'kompakt'] as const) {
      for (const zelle of raster(layout)) {
        expect(zelle.spalte, `${layout} ${zelle.element.symbol}`).toBeGreaterThanOrEqual(1);
        expect(zelle.spalte, `${layout} ${zelle.element.symbol}`).toBeLessThanOrEqual(spaltenZahl(layout));
      }
    }
  });

  it('verschiebt im 32-Spalten-Layout sämtliche Koordinaten', () => {
    // Genau deshalb muss die Layoutwahl sichtbar sein: Dieselbe Zelle meint je
    // nach Darstellung ein anderes Element.
    expect(anStelle('standard', 4, 6)?.symbol).toBe('Hf');
    expect(anStelle('lang', 4, 6)?.symbol).toBe('Pr');
    expect(anStelle('lang', 18, 6)?.symbol).toBe('Hf');
    expect(anStelle('lang', 3, 6)?.symbol).toBe('Ce');
  });

  it('legt die ausgelagerten Reihen unter die Tafel', () => {
    const lanthan = raster('standard').filter((z) => z.element.serie === 'Lanthanoide');
    expect(lanthan).toHaveLength(14);
    expect(new Set(lanthan.map((z) => z.reihe))).toEqual(new Set([9]));
  });
});

describe('Suche', () => {
  it('findet über Symbol, Name und Ordnungszahl', () => {
    // Kurze Eingaben treffen nur Symbol oder Zahl – sonst wäre „fe“ auch
    // Schwefel, Kupfer und Fermium.
    expect(finde('fe').map((e) => e.symbol)).toEqual(['Fe']);
    expect(finde('eisen').map((e) => e.symbol)).toEqual(['Fe']);
    expect(finde('gold').map((e) => e.symbol)).toEqual(['Au']);
    expect(finde('26').map((e) => e.symbol)).toEqual(['Fe']);
  });

  it('findet über Eigenschaften', () => {
    expect(finde('serie:edelgase').map((e) => e.symbol))
      .toEqual(['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn']);
    expect(finde('zustand:flüssig').map((e) => e.symbol)).toEqual(['Br', 'Hg', 'Cn']);
  });

  it('versteht Zahlenvergleiche und verknüpft mehrere Begriffe mit UND', () => {
    expect(finde('z<5').map((e) => e.symbol)).toEqual(['H', 'He', 'Li', 'Be']);
    const edleGase = finde('serie:edelgase z>50');
    expect(edleGase.map((e) => e.symbol)).toEqual(['Xe', 'Rn']);
  });

  it('kennt Primzahlen als Regel', () => {
    const treffer = finde('primzahl z<15').map((e) => e.ordnungszahl);
    expect(treffer).toEqual([2, 3, 5, 7, 11, 13]);
  });

  it('gibt bei leerer Anfrage nichts zurück statt alles', () => {
    expect(finde('   ')).toEqual([]);
  });
});

describe('Markierungen auslesen', () => {
  const markiert = [26, 8, 20]; // Fe, O, Ca – bewusst nicht in Reihenfolge

  it('liest nach Ordnungszahl', () => {
    expect(auslesen(markiert, 'standard', 'zahl', 'symbol')).toBe('O Ca Fe');
  });

  it('liest in der Reihenfolge des Antippens', () => {
    expect(auslesen(markiert, 'standard', 'auswahl', 'symbol')).toBe('Fe O Ca');
  });

  it('liest zeilenweise und spaltenweise verschieden', () => {
    expect(auslesen(markiert, 'standard', 'gitter', 'symbol')).toBe('O Ca Fe');
    expect(auslesen(markiert, 'standard', 'spalten', 'symbol')).toBe('Ca Fe O');
  });

  it('gibt Anfangsbuchstaben ohne Trennung aus', () => {
    // Der übliche letzte Schritt: aus den Markierungen wird ein Wort.
    expect(auslesen([53, 88, 7], 'standard', 'zahl', 'anfang')).toBe('SIR');
  });
});
