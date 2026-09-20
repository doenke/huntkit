import { describe, expect, it } from 'vitest';
import { satzZerlegen, zerlegungen } from './elementspeller';

describe('Element-Speller', () => {
  it('zerlegt ein Wort in Elementsymbole', () => {
    const treffer = zerlegungen('BACON');
    const symbole = treffer.map((z) => z.symbole.join('-'));
    expect(symbole).toContain('Ba-C-O-N');
  });

  it('zeigt alle Lesarten, nicht nur eine', () => {
    // CON ist C-O-N oder Co-N – beides muss auftauchen.
    const symbole = zerlegungen('CON').map((z) => z.symbole.join('-'));
    expect(symbole).toContain('C-O-N');
    expect(symbole).toContain('Co-N');
    expect(symbole).toHaveLength(2);
  });

  it('liefert zu jeder Zerlegung die Ordnungszahlen', () => {
    const treffer = zerlegungen('CON').find((z) => z.symbole.join('') === 'CoN');
    expect(treffer?.ordnungszahlen).toEqual([27, 7]);
  });

  it('gibt nichts zurück, wenn sich das Wort nicht zerlegen lässt', () => {
    expect(zerlegungen('QQQ')).toEqual([]);
  });

  it('ignoriert Groß- und Kleinschreibung sowie Satzzeichen', () => {
    expect(zerlegungen('ba-c-o-n!').length).toBeGreaterThan(0);
  });

  it('zerlegt einen Satz wortweise', () => {
    const treffer = satzZerlegen('Bacon Cons');
    expect(treffer).toHaveLength(2);
    expect(treffer[0]?.wort).toBe('Bacon');
    expect(treffer[1]?.zerlegungen.length).toBeGreaterThan(0);
  });

  it('bricht bei vielen Lesarten ab, statt die Oberfläche zu fluten', () => {
    expect(zerlegungen('CONCONCONCONCON', 5)).toHaveLength(5);
  });
});
