import { describe, expect, it } from 'vitest';
import { codec } from '../../codecs/registry';
import { erkenne, optionenText } from './erkennen';

/** Der erste Vorschlag – das, was die App oben anzeigt. */
function erster(eingabe: string) {
  return erkenne(eingabe)[0];
}

describe('Auto-Erkennung', () => {
  it('erkennt Morse an Punkt und Strich', () => {
    const treffer = erster('-.. .. . / .-.. --- . ... ..- -. --. / .. ... - / --. --- .-.. -..');
    expect(treffer?.codec.id).toBe('morse');
    expect(treffer?.text).toBe('DIE LOESUNG IST GOLD');
  });

  it('erkennt ABC123', () => {
    const kodiert = codec('abc123')!.encode('DIE LOESUNG IST GOLD').text;
    const treffer = erster(kodiert);
    expect(treffer?.codec.id).toBe('abc123');
    expect(treffer?.text).toBe('DIE LOESUNG IST GOLD');
  });

  it('erkennt ASCII und nennt das richtige Zahlensystem', () => {
    for (const basis of ['10', '2', '16']) {
      const kodiert = codec('ascii')!.encode('Die Loesung ist Gold', { basis }).text;
      const treffer = erster(kodiert);
      expect(treffer?.codec.id, basis).toBe('ascii');
      expect(treffer?.optionen['basis'], basis).toBe(basis);
      expect(treffer?.text, basis).toBe('Die Loesung ist Gold');
    }
  });

  it('erkennt Caesar und findet die Verschiebung', () => {
    const kodiert = codec('caesar')!.encode('Der naechste Hinweis steht am Eingang', { verschiebung: 13 }).text;
    const treffer = erster(kodiert);
    expect(treffer?.codec.id).toBe('caesar');
    expect(treffer?.optionen['verschiebung']).toBe(13);
    expect(optionenText(treffer!)).toBe('Verschiebung 13');
  });

  it('erkennt Braille und das Winkeralphabet', () => {
    const braille = codec('braille')!.encode('DIE LOESUNG IST GOLD').text;
    expect(erster(braille)?.codec.id).toBe('braille');
    const winker = codec('winker')!.encode('DIE LOESUNG IST GOLD').text;
    expect(erster(winker)?.codec.id).toBe('winker');
  });

  it('erkennt Hexahue und den Templercode', () => {
    const hexahue = codec('hexahue')!.encode('DIE LOESUNG').text;
    expect(erster(hexahue)?.codec.id).toBe('hexahue');
    const templer = codec('templer')!.encode('DIE LOESUNG').text;
    expect(erster(templer)?.codec.id).toBe('templer');
  });

  it('erkennt Elementsymbole', () => {
    // 26 20 56 sind Fe, Ca, Ba – ein Standardgriff im Rätsel.
    const treffer = erkenne('26 20 56').find((f) => f.codec.id === 'elemente');
    expect(treffer).toBeDefined();
    expect(treffer?.text).toBe('Fe Ca Ba');
  });

  it('liefert bei mehrdeutiger Eingabe eine Rangliste', () => {
    // Zahlenfolgen kann man als ABC123, als ASCII oder als Zahlensystem lesen.
    // Die Rangliste zeigt alle drei, oben steht die, die Sprache ergibt.
    const funde = erkenne(codec('abc123')!.encode('DIE LOESUNG IST GOLD').text);
    expect(funde.length).toBeGreaterThan(1);
    expect(funde[0]!.codec.id).toBe('abc123');
    for (let i = 1; i < funde.length; i++) {
      expect(funde[i - 1]!.bewertung).toBeGreaterThanOrEqual(funde[i]!.bewertung);
    }
  });

  it('bleibt bei eindeutiger Eingabe knapp', () => {
    // Nur Punkte und Striche lassen wenig Spielraum – dann ist eine lange
    // Liste keine Hilfe, sondern Rauschen.
    expect(erkenne('.... .- .-.. .-.. ---')).toHaveLength(1);
  });

  it('schlägt nichts vor, was die Eingabe nur wiederholt', () => {
    for (const fund of erkenne('Dies ist ganz gewoehnlicher deutscher Text')) {
      expect(fund.text.toUpperCase(), fund.codec.id)
        .not.toBe('Dies ist ganz gewoehnlicher deutscher Text'.toUpperCase());
    }
  });

  it('schweigt bei zu kurzer Eingabe', () => {
    expect(erkenne('')).toEqual([]);
    expect(erkenne('x')).toEqual([]);
  });

  it('setzt das entschlüsselte Ergebnis über den bloßen Zeichensatz', () => {
    // Beide Codes bestehen den Struktur-Check; entscheiden muss das Ergebnis.
    const treffer = erster('.... .- .-.. .-.. --- / .-- . .-.. -');
    expect(treffer?.codec.id).toBe('morse');
    expect(treffer?.sprache).toBeGreaterThan(treffer!.struktur * 0.2);
  });
});
