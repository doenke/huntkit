import { ALPHABET, anteil, zeichenCodec } from './hilfen';
import type { Codec } from './types';

const zeichen = zeichenCodec({
  tabelle: [...ALPHABET].map((buchstabe, i) => [buchstabe, String(i + 1)] as const),
  trenner: ' ',
  worttrenner: '/'
});

export const abc123: Codec = {
  id: 'abc123',
  name: 'ABC123',
  beschreibung: 'Buchstabe zu Zahl, A=1 bis Z=26.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle(),
  passt(eingabe) {
    const stuecke = eingabe.trim().split(/[\s/,]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    const passend = stuecke.filter((s) => /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 26);
    return (passend.length / stuecke.length) * anteil(eingabe, /[\d/,]/);
  }
};
