import { describe, expect, it } from 'vitest';
import type { Blatt, Spalte, Werkzeugspalte, Zeile } from './blatt';
import { alsText, f, op, rechne, text, zahl, zelle } from './formel';
import { festerInhalt, tabelleFuerZwischenablage } from './tabellenexport';

function werkzeug(id: string, quelle: string, codecId: string, optionen: Werkzeugspalte['optionen'] = {}, richtung: 'encode' | 'decode' = 'encode'): Werkzeugspalte {
  return { art: 'werkzeug', id, quelle, codecId, richtung, optionen };
}

function blatt(spalten: Spalte[], eingaben: string[][]): Blatt {
  const zeilen: Zeile[] = eingaben.map((werte, i) => ({
    id: `z${i}`,
    nummer: i + 1,
    werte: Object.fromEntries(werte.map((w, j) => [spalten.filter((s) => s.art === 'eingabe')[j]?.id ?? '', w]))
  }));
  return { spalten, zeilen };
}

/** Die Zellen als Tabelle: Zeile, dann Spalte. */
function zellen(b: Blatt, ziel: Parameters<typeof tabelleFuerZwischenablage>[1] = 'excel-en') {
  return tabelleFuerZwischenablage(b, ziel).text.split('\n').map((z) => z.split('\t'));
}

const A: Spalte = { art: 'eingabe', id: 'a', titel: 'Wort' };

describe('Formeln in mehreren Sprachen', () => {
  const formel = f('IF', op('=', zelle(0, 1), text('')), text(''), f('LEN', zelle(0, 1)));

  it('schreibt Excel deutsch mit deutschen Namen und Semikolon', () => {
    expect(alsText(formel, 'excel-de')).toBe('=WENN(A2="";"";LÄNGE(A2))');
    expect(alsText(formel, 'excel-en')).toBe('=IF(A2="","",LEN(A2))');
  });

  it('schreibt Google Sheets mit englischen Namen, deutsch mit Semikolon', () => {
    expect(alsText(formel, 'sheets-de')).toBe('=IF(A2="";"";LEN(A2))');
    expect(alsText(formel, 'sheets-en')).toBe('=IF(A2="","",LEN(A2))');
  });

  it('packt Listenformeln für Google Sheets in ARRAYFORMULA', () => {
    const liste = f('SUMPRODUCT', f('LEN', f('MID', zelle(0, 1), f('SEQUENCE', zahl(3)), zahl(1))));
    expect(alsText(liste, 'sheets-en')).toMatch(/^=ARRAYFORMULA\(SUMPRODUCT/);
    expect(alsText(liste, 'excel-en')).toMatch(/^=SUMPRODUCT/);
  });

  it('klammert nur, wo es nötig ist', () => {
    expect(alsText(op('-', op('-', zahl(1), zahl(2)), zahl(3)), 'excel-en')).toBe('=1-2-3');
    expect(alsText(op('-', zahl(1), op('-', zahl(2), zahl(3))), 'excel-en')).toBe('=1-(2-3)');
    expect(alsText(op('*', op('+', zahl(1), zahl(2)), zahl(3)), 'excel-en')).toBe('=(1+2)*3');
  });

  it('rechnet wie Excel: = ohne Rücksicht auf Groß und klein, IDENTISCH mit', () => {
    const leer = () => '';
    expect(rechne(op('=', text('a'), text('A')), leer)).toBe(true);
    expect(rechne(f('EXACT', text('a'), text('A')), leer)).toBe(false);
    expect(rechne(f('UPPER', text('Straße')), leer)).toBe('STRAßE');
  });
});

describe('Fester Text', () => {
  it('lässt Zahlen und schlichte Wörter, wie sie sind', () => {
    expect(festerInhalt('12', 'excel-de').roh).toBe('12');
    expect(festerInhalt('-3', 'excel-de').roh).toBe('-3');
    expect(festerInhalt('Roter Kater', 'excel-de').roh).toBe('Roter Kater');
  });

  it('schützt alles, was die Tabelle sonst umdeuten würde', () => {
    expect(festerInhalt('0101', 'excel-de').roh).toBe('="0101"');
    expect(festerInhalt('-.- ---', 'excel-de').roh).toBe('="-.- ---"');
    expect(festerInhalt('1.2', 'excel-de').roh).toBe('="1.2"');
    expect(festerInhalt('=A1', 'excel-de').roh).toBe('="=A1"');
    expect(festerInhalt('WAHR', 'excel-de').roh).toBe('="WAHR"');
    expect(festerInhalt('Sag "Hallo"', 'excel-de').roh).toBe('="Sag ""Hallo"""');
  });

  it('teilt lange Texte, weil Excel höchstens 255 Zeichen am Stück nimmt', () => {
    const roh = festerInhalt('.-'.repeat(200), 'excel-de').roh;
    expect(roh.startsWith('=(')).toBe(true);
    expect(roh.split('&')).toHaveLength(2);
  });
});

describe('Die Werkbank als Tabelle', () => {
  it('schreibt Kopf und Zeilen, eine Zeile je Eingabe', () => {
    const b = blatt([A, werkzeug('l', 'a', 'laenge', { was: { art: 'fest', wert: 'zeichen' } })], [['Hallo'], ['Nacht']]);
    const t = zellen(b);
    expect(t[0]).toEqual(['Wort', 'B']);
    expect(t[1]).toEqual(['Hallo', '=IF(A2="","",LEN(A2))']);
    expect(t[2]).toEqual(['Nacht', '=IF(A3="","",LEN(A3))']);
  });

  it('nimmt für jedes unterstützte Werkzeug eine Formel, die dasselbe ergibt', () => {
    const faelle: Array<[Werkzeugspalte, string[]]> = [
      [werkzeug('w', 'a', 'laenge'), ['Straße 12', 'Hallo Welt']],
      [werkzeug('w', 'a', 'laenge', { was: { art: 'fest', wert: 'woerter' } }), ['Hallo  Welt', 'eins']],
      [werkzeug('w', 'a', 'laenge', { was: { art: 'fest', wert: 'sonderzeichen' } }), ['a.b, c!']],
      [werkzeug('w', 'a', 'zaehlen', { suche: { art: 'fest', wert: 'e' } }), ['Eine Elfe']],
      [werkzeug('w', 'a', 'zaehlen', { suche: { art: 'fest', wert: 'AEIOU' }, art: { art: 'fest', wert: 'jedes' } }), ['Nachtschicht Dortmund']],
      [werkzeug('w', 'a', 'stellen', { liste: { art: 'fest', wert: '3,1,-1' } }), ['Rätsel-Nacht']],
      [werkzeug('w', 'a', 'jedes-n', { n: { art: 'fest', wert: 2 } }), ['Nachtschicht']],
      [werkzeug('w', 'a', 'jedes-n', { n: { art: 'fest', wert: -3 }, versatz: { art: 'fest', wert: 2 } }), ['ABCDEFGHIJ']],
      [werkzeug('w', 'a', 'jedes-n', { n: { art: 'fest', wert: 1 }, modus: { art: 'fest', wert: 'einmal' } }), ['Otto']],
      [werkzeug('w', 'a', 'ersetzen', { von: { art: 'fest', wert: 'ab' }, nach: { art: 'fest', wert: 'ba' } }), ['Abba baut']],
      [werkzeug('w', 'a', 'caesar', { verschiebung: { art: 'fest', wert: 3 } }), ['Hallo, Welt!', 'Größe']],
      [werkzeug('w', 'a', 'caesar', { verschiebung: { art: 'fest', wert: 3 } }, 'decode'), ['KDOOR']],
      [werkzeug('w', 'a', 'atbash'), ['Straße']],
      [werkzeug('w', 'a', 'abc123'), ['HALLO']],
      [werkzeug('w', 'a', 'roemisch'), ['1987']],
      [werkzeug('w', 'a', 'roemisch', {}, 'decode'), ['MCMLXXXVII']],
      [werkzeug('w', 'a', 'basen', { von: { art: 'fest', wert: 2 }, nach: { art: 'fest', wert: 10 } }), ['101010']]
    ];
    for (const [spalte, eingaben] of faelle) {
      const b = blatt([A, spalte], eingaben.map((e) => [e]));
      const export_ = tabelleFuerZwischenablage(b, 'excel-de');
      expect(export_.formeln, `${spalte.codecId} ${JSON.stringify(spalte.optionen)}`).toBe(eingaben.length);
    }
  });

  it('nimmt eine Option aus einer Spalte als Zellbezug', () => {
    const n: Spalte = { art: 'eingabe', id: 'n', titel: 'n' };
    const b = blatt(
      [A, n, werkzeug('w', 'a', 'jedes-n', { n: { art: 'spalte', spalte: 'n' }, modus: { art: 'fest', wert: 'einmal' } })],
      [['Nacht', '2'], ['Schicht', '-1']]
    );
    const t = zellen(b, 'excel-de');
    expect(t[1]?.[2]).toContain('B2');
    expect(t[1]?.[2]).toMatch(/^=WENN\(A2="";"";WENN\(GLÄTTEN\(B2\)="";""/);
    expect(tabelleFuerZwischenablage(b, 'excel-de').formeln).toBe(2);
  });

  it('übernimmt Codes und alles ohne Formel als festen Text', () => {
    const morse: Spalte = { art: 'eingabe', id: 'm', tafel: 'morse' };
    const b = blatt([morse, werkzeug('k', 'm', 'morse', {}, 'decode')], [['.... .-'], ['-. .-']]);
    const t = zellen(b);
    expect(t[1]).toEqual(['=".... .-"', 'HA']);
    expect(t[2]).toEqual(['="-. .-"', 'NA']);
    expect(tabelleFuerZwischenablage(b, 'excel-en').formeln).toBe(0);
  });

  it('fällt auf den festen Text zurück, wo die Formel anders rechnen würde', () => {
    // Römisch ist in der Werkbank streng, ARABISCH in Excel nicht: IIII bleibt leer.
    const b = blatt([A, werkzeug('r', 'a', 'roemisch', {}, 'decode')], [['XII'], ['IIII']]);
    const t = zellen(b);
    expect(t[1]?.[1]).toBe('=IF(A2="","",ARABIC(A2))');
    expect(t[2]?.[1]).toBe('');
  });

  it('zählt die Position nach Zahlen mit ZÄHLENWENN, Gleichstand nach Eingabe', () => {
    const zahlen: Spalte = { art: 'eingabe', id: 'z', titel: 'Zahl' };
    const platz: Spalte = { art: 'position', id: 'p', nach: { spalte: 'z', richtung: 'auf', art: 'zahl' } };
    const b = blatt([zahlen, platz], [['5'], ['2'], ['5'], ['9']]);
    const t = zellen(b, 'excel-de');
    expect(t[1]?.[1]).toBe('=WENN(A2="";"";ZÄHLENWENN(A$2:A$5;"<"&A2)+ZÄHLENWENN(A$2:A2;A2))');
    expect(tabelleFuerZwischenablage(b, 'excel-de').formeln).toBe(4);
  });

  it('setzt Werkzeug auf Werkzeug als Kette von Formeln', () => {
    const b = blatt(
      [A, werkzeug('c', 'a', 'caesar', { verschiebung: { art: 'fest', wert: 13 } }), werkzeug('l', 'c', 'laenge')],
      [['Hallo']]
    );
    const t = zellen(b);
    expect(t[1]?.[1]).toMatch(/^=IF\(A2="",""/);
    expect(t[1]?.[2]).toMatch(/^=IF\(B2="",""/);
  });
});
