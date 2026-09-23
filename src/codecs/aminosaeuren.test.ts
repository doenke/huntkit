import { describe, expect, it } from 'vitest';
import { aminosaeuren } from './aminosaeuren';

describe('Aminosäuren', () => {
  it('liest Codons getrennt, am Stück und als DNA', () => {
    expect(aminosaeuren.decode('CAU AUU GUU').text).toBe('HIV');
    expect(aminosaeuren.decode('cauauuguu').text).toBe('HIV');
    expect(aminosaeuren.decode('CATATTGTT').text).toBe('HIV');
  });

  it('macht aus Stoppcodons Wortgrenzen', () => {
    expect(aminosaeuren.decode('UGG AUU UAA GUU').text).toBe('WI V');
    expect(aminosaeuren.encode('WI V').text).toBe('UGG AUU UAA GUU');
  });

  it('liest Kürzel und Namen ohne Rücksicht auf Schreibung', () => {
    expect(aminosaeuren.decode('Gly-Leu-Glu-Asn-Asn').text).toBe('GLENN');
    expect(aminosaeuren.decode('glutaminsaeure Threonin Glutaminsäure').text).toBe('ETE');
    expect(aminosaeuren.encode('ASK', { code: 'kuerzel' }).text).toBe('Ala Ser Lys');
  });

  it('meldet Buchstaben ohne Aminosäure', () => {
    expect(aminosaeuren.encode('BAU').luecken.map((l) => l.zeichen)).toEqual(['B', 'U']);
  });
});
