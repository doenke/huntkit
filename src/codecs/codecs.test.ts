import { describe, expect, it } from 'vitest';
import { CODECS, codec } from './registry';
import { standardOptionen } from './types';
import { alleVerschiebungen, verschiebe } from './caesar';
import { umrechnen } from './basen';

/** Zufälliger Text aus dem Zeichenvorrat, den ein Codec beherrscht. */
function zufallstext(vorrat: string, laenge: number, streu: () => number): string {
  return Array.from({ length: laenge }, () => {
    const i = Math.floor(streu() * vorrat.length);
    return vorrat[i] as string;
  }).join('');
}

/** Fester Zufall – ein Fehlschlag muss sich nachstellen lassen. */
function streuer(saat: number): () => number {
  let zustand = saat;
  return () => {
    zustand = (zustand * 1103515245 + 12345) % 2147483648;
    return zustand / 2147483648;
  };
}

describe('Registry', () => {
  it('hat eindeutige Kennungen', () => {
    expect(new Set(CODECS.map((c) => c.id)).size).toBe(CODECS.length);
  });

  it('findet jeden Codec über seine Kennung', () => {
    for (const c of CODECS) expect(codec(c.id)).toBe(c);
  });

  it('liefert für leere Eingaben leere Ergebnisse statt Fehler', () => {
    for (const c of CODECS) {
      const optionen = standardOptionen(c);
      expect(c.encode('', optionen).text, c.id).toBe('');
      expect(c.decode('', optionen).text, c.id).toBe('');
    }
  });
});

describe('Hin und zurück', () => {
  // Der wichtigste Test im Projekt: Ein Tippfehler in einer Tabelle faellt sonst
  // erst nachts um drei vor Ort auf.
  const faelle = [
    { id: 'morse', vorrat: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ' },
    { id: 'abc123', vorrat: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ' },
    { id: 'nato', vorrat: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ' },
    { id: 'ascii', vorrat: 'ABCdef123 .,!?' }
  ];

  for (const fall of faelle) {
    it(`${fall.id}: decode(encode(x)) ergibt wieder x`, () => {
      const c = codec(fall.id)!;
      const optionen = standardOptionen(c);
      const streu = streuer(20260918);
      for (let durchgang = 0; durchgang < 200; durchgang++) {
        const original = zufallstext(fall.vorrat, 1 + Math.floor(streu() * 12), streu)
          .replace(/\s+/g, ' ')
          .trim();
        if (original.length === 0) continue;
        const kodiert = c.encode(original, optionen);
        expect(kodiert.luecken, `${fall.id}: ${original}`).toEqual([]);
        const zurueck = c.decode(kodiert.text, optionen);
        expect(zurueck.text, `${fall.id}: ${original} -> ${kodiert.text}`).toBe(original);
      }
    });
  }

  it('ASCII in allen drei Zahlensystemen', () => {
    const c = codec('ascii')!;
    for (const basis of ['10', '2', '16']) {
      const original = 'Hallo Welt 42!';
      const kodiert = c.encode(original, { basis });
      expect(c.decode(kodiert.text, { basis }).text, basis).toBe(original);
    }
  });

  it('Caesar für jede Verschiebung', () => {
    const c = codec('caesar')!;
    for (let verschiebung = 0; verschiebung < 26; verschiebung++) {
      const original = 'Nachtschicht Dortmund, 3 Uhr!';
      const kodiert = c.encode(original, { verschiebung });
      expect(c.decode(kodiert.text, { verschiebung }).text, String(verschiebung)).toBe(original);
    }
  });

  it('Zahlensysteme für alle Basispaare', () => {
    const c = codec('basen')!;
    for (let von = 2; von <= 36; von++) {
      for (const nach of [2, 8, 10, 16, 36]) {
        const zahl = '12345';
        const start = umrechnen(zahl, 10, von);
        if (start === null) continue;
        const hin = c.encode(start, { von, nach });
        expect(c.decode(hin.text, { von, nach }).text, `${von}->${nach}`).toBe(start);
      }
    }
  });
});

describe('Vollständigkeit der Tabellen', () => {
  it('deckt A–Z und 0–9 ab, wo es der Code verspricht', () => {
    const pflicht: Record<string, string> = {
      morse: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      abc123: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      nato: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    };
    for (const [id, zeichen] of Object.entries(pflicht)) {
      const eintraege = codec(id)!.tabelle!();
      const vorhanden = new Set(eintraege.map((e) => e.zeichen));
      for (const z of zeichen) expect(vorhanden.has(z), `${id} vermisst ${z}`).toBe(true);
    }
  });

  it('vergibt innerhalb eines Codes keine Darstellung doppelt', () => {
    // Einzige Ausnahme: Im Templercode liegen I und J auf derselben Form. Das
    // ist keine Nachlässigkeit, sondern steht so in der Quelle – beim
    // Entschlüsseln bleibt die Stelle deshalb mehrdeutig.
    const erlaubt: Record<string, number> = { templer: 1 };
    for (const c of CODECS) {
      if (!c.tabelle) continue;
      const darstellungen = c.tabelle(standardOptionen(c)).map((e) => e.darstellung);
      const doppelt = darstellungen.length - new Set(darstellungen).size;
      expect(doppelt, `${c.id}`).toBe(erlaubt[c.id] ?? 0);
    }
  });
});

describe('Eszett', () => {
  // 'ß'.toUpperCase() ergibt in JavaScript 'SS'. Wer vor dem Nachschlagen blind
  // großschreibt, verliert das Zeichen – aufgefallen erst beim Braille-Test.
  it('überlebt in Morse und Braille', () => {
    expect(codec('morse')!.encode('ß').text).toBe('...--..');
    expect(codec('morse')!.encode('ß').luecken).toEqual([]);
    expect(codec('braille')!.encode('ß').text).toBe('⠮');
    expect(codec('braille')!.decode('⠮').text).toBe('ß');
  });

  it('bleibt in einem ganzen Wort erhalten', () => {
    const treffer = codec('braille')!.encode('STRAßE');
    expect(treffer.luecken).toEqual([]);
    expect(codec('braille')!.decode(treffer.text).text).toBe('STRAßE');
  });
});

describe('Lücken', () => {
  it('meldet unübersetzbare Zeichen, statt sie zu verschlucken', () => {
    const treffer = codec('morse')!.encode('AB§C');
    expect(treffer.luecken).toHaveLength(1);
    expect(treffer.luecken[0]?.zeichen).toBe('§');
    expect(treffer.text).toBe('.- -... -.-.');
  });

  it('meldet unbekannte Stücke beim Dekodieren', () => {
    const treffer = codec('morse')!.decode('.- ..--..-- -...');
    expect(treffer.luecken).toHaveLength(1);
  });
});

describe('Caesar-Wand', () => {
  it('liefert alle 26 Verschiebungen, beginnend mit dem Original', () => {
    const wand = alleVerschiebungen('ABC');
    expect(wand).toHaveLength(26);
    expect(wand[0]?.text).toBe('ABC');
    expect(wand[13]?.text).toBe('NOP');
  });

  it('lässt Ziffern, Umlaute und Satzzeichen stehen', () => {
    expect(verschiebe('Ä 7 b!', 1)).toBe('Ä 7 c!');
  });

  it('behandelt negative und überlange Verschiebungen richtig', () => {
    expect(verschiebe('A', -1)).toBe('Z');
    expect(verschiebe('A', 27)).toBe('B');
  });
});

describe('Periodensystem als Schlüssel', () => {
  const c = () => codec('elemente')!;

  it('übersetzt Symbol zu Ordnungszahl', () => {
    expect(c().encode('Fe Ca Ba', { von: 'symbol', nach: 'ordnungszahl' }).text).toBe('26 20 56');
  });

  it('übersetzt zurück', () => {
    expect(c().decode('26 20 56', { von: 'symbol', nach: 'ordnungszahl' }).text).toBe('Fe Ca Ba');
  });

  it('kann beliebige Attributpaare, nicht nur die naheliegenden', () => {
    expect(c().encode('Gold', { von: 'name', nach: 'symbol' }).text).toBe('Au');
    expect(c().encode('79', { von: 'ordnungszahl', nach: 'elektronegativitaet' }).text).toBe('2.4');
  });

  it('meldet Unbekanntes als Lücke', () => {
    expect(c().encode('Xx', { von: 'symbol', nach: 'name' }).luecken).toHaveLength(1);
  });
});
