import { describe, expect, it } from 'vitest';
import { anwenden, ergebnisText, neuerSchritt, type Werkbankzustand } from './werkbank';

function kette(eingabe: string, ...schritte: ReturnType<typeof neuerSchritt>[]): Werkbankzustand {
  return { eingabe, schritte };
}

describe('Werkbank', () => {
  it('gibt ohne Schritte die Eingabe zurück', () => {
    expect(ergebnisText(kette('Hallo'))).toBe('Hallo');
  });

  it('wendet mehrere Schritte nacheinander an', () => {
    // Morse -> Text, dann Caesar zurückdrehen: der typische Ablauf im Rätsel.
    const morse = neuerSchritt('morse');
    const caesar = neuerSchritt('caesar');
    caesar.optionen = { verschiebung: 13 };
    expect(ergebnisText(kette('-.-. .- . ... .- .-.', morse, caesar))).toBe('PNRFNE');
  });

  it('liefert jeden Zwischenstand, damit man die Kette lesen kann', () => {
    const staende = anwenden(kette('.-', neuerSchritt('morse')));
    expect(staende).toHaveLength(2);
    expect(staende[0]?.text).toBe('.-');
    expect(staende[1]?.text).toBe('A');
  });

  it('überspringt abgeschaltete Schritte, ohne sie zu vergessen', () => {
    const schritt = neuerSchritt('morse');
    schritt.aktiv = false;
    const staende = anwenden(kette('.-', schritt));
    expect(staende[1]?.text).toBe('.-');
    expect(staende[1]?.schritt).toBe(schritt);
  });

  it('bricht nicht ab, wenn ein Codec fehlt', () => {
    const schritt = neuerSchritt('gibtesnicht');
    const staende = anwenden(kette('Text', schritt));
    expect(staende[1]?.fehlt).toBe(true);
    expect(staende[1]?.text).toBe('Text');
  });

  it('setzt die Standardoptionen eines neuen Schritts', () => {
    expect(neuerSchritt('caesar').optionen).toEqual({ verschiebung: 3 });
    expect(neuerSchritt('ascii').optionen).toEqual({ basis: '10' });
  });
});
