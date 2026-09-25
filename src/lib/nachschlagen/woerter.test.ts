import { describe, expect, it } from 'vitest';
import { anagrammeIn, musterAlsRegel, suchenIn, vereinfacht } from './woerter';

/** Kleine Liste in derselben Ordnung wie das echte Wörterbuch: häufig zuerst. */
const LISTE = [
  'und', 'die', 'gold', 'nacht', 'schicht', 'strasse', 'größe', 'lager', 'regal',
  'klage', 'gerla', 'riegel', 'nachts', 'tag', 'rat', 'tor', 'ort', 'rot', 'gar'
];

describe('Muster', () => {
  it('übersetzt Platzhalter in einen regulären Ausdruck', () => {
    expect(musterAlsRegel('?A??LE').source).toBe('^.A..LE$');
    expect(musterAlsRegel('GO*').source).toBe('^GO.*$');
  });

  it('versteht eine Auswahl in eckigen Klammern', () => {
    expect(musterAlsRegel('[GHI][ABC]?').source).toBe('^[GHI][ABC].$');
    expect(suchenIn(LISTE, '[MNO][ABC][ABC][GHI][TUV]').treffer).toEqual(['nacht']);
  });

  it('löst Umlaute im Muster auf', () => {
    expect(vereinfacht('Größe')).toBe('GROESSE');
    expect(musterAlsRegel('grö?e').source).toBe('^GROE.E$');
  });
});

describe('Wortmustersuche', () => {
  it('findet Wörter mit festen Stellen', () => {
    expect(suchenIn(LISTE, '?O?D').treffer).toEqual(['gold']);
  });

  it('versteht den Stern für beliebig viele Buchstaben', () => {
    expect(suchenIn(LISTE, 'NACHT*').treffer).toEqual(['nacht', 'nachts']);
  });

  it('findet auch über aufgelöste Umlaute', () => {
    // Im Rätsel steht GROESSE, im Wörterbuch Größe.
    expect(suchenIn(LISTE, 'GROESSE').treffer).toEqual(['größe']);
  });

  it('behält die Reihenfolge der Liste, also die Häufigkeit', () => {
    expect(suchenIn(LISTE, '???').treffer.slice(0, 3)).toEqual(['und', 'die', 'tag']);
  });

  it('meldet, wie viele Treffer es insgesamt gibt', () => {
    const treffer = suchenIn(LISTE, '???', 2);
    expect(treffer.treffer).toHaveLength(2);
    expect(treffer.gesamt).toBeGreaterThan(2);
  });

  it('gibt bei leerem Muster nichts zurück statt alles', () => {
    expect(suchenIn(LISTE, '  ').treffer).toEqual([]);
  });
});

describe('Anagramme', () => {
  it('findet vollständige Anagramme', () => {
    const treffer = anagrammeIn(LISTE, 'LAGER').treffer;
    expect(treffer.filter((t) => t.vollstaendig).map((t) => t.wort).sort())
      .toEqual(['gerla', 'lager', 'regal']);
  });

  it('stellt vollständige Anagramme vor Teilwörter', () => {
    // „gar“ steckt in LAGER, verbraucht die Buchstaben aber nicht – es gehört
    // deshalb hinter lager, regal und gerla.
    const treffer = anagrammeIn(LISTE, 'LAGER').treffer;
    expect(treffer[0]?.vollstaendig).toBe(true);
    expect(treffer.at(-1)).toEqual({ wort: 'gar', vollstaendig: false });
  });

  it('findet auch Wörter aus einem Teil der Buchstaben', () => {
    const woerter = anagrammeIn(LISTE, 'TORFRAT').treffer.map((t) => t.wort);
    expect(woerter).toContain('rat');
    expect(woerter).toContain('tor');
  });

  it('nimmt keinen Buchstaben zweimal, den es nur einmal gibt', () => {
    // „rot“ braucht ein O – in „RT“ gibt es keins.
    expect(anagrammeIn(LISTE, 'RT').treffer.map((t) => t.wort)).not.toContain('rot');
  });

  it('gibt bei leerer Eingabe nichts zurück', () => {
    expect(anagrammeIn(LISTE, '').treffer).toEqual([]);
  });
});
