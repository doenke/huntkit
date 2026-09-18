import { anteil, zeichenCodec } from './hilfen';
import type { Codec } from './types';

const TABELLE = [
  ['A', '.-'], ['B', '-...'], ['C', '-.-.'], ['D', '-..'], ['E', '.'],
  ['F', '..-.'], ['G', '--.'], ['H', '....'], ['I', '..'], ['J', '.---'],
  ['K', '-.-'], ['L', '.-..'], ['M', '--'], ['N', '-.'], ['O', '---'],
  ['P', '.--.'], ['Q', '--.-'], ['R', '.-.'], ['S', '...'], ['T', '-'],
  ['U', '..-'], ['V', '...-'], ['W', '.--'], ['X', '-..-'], ['Y', '-.--'],
  ['Z', '--..'],
  ['0', '-----'], ['1', '.----'], ['2', '..---'], ['3', '...--'], ['4', '....-'],
  ['5', '.....'], ['6', '-....'], ['7', '--...'], ['8', '---..'], ['9', '----.'],
  // Deutsche Umlaute – auf Schildern und Gedenktafeln keine Seltenheit.
  ['Ä', '.-.-'], ['Ö', '---.'], ['Ü', '..--'], ['ß', '...--..'],
  ['.', '.-.-.-'], [',', '--..--'], ['?', '..--..'], ["'", '.----.'],
  ['!', '-.-.--'], ['/', '-..-.'], ['(', '-.--.'], [')', '-.--.-'],
  ['&', '.-...'], [':', '---...'], [';', '-.-.-.'], ['=', '-...-'],
  ['+', '.-.-.'], ['-', '-....-'], ['_', '..--.-'], ['"', '.-..-.'],
  ['@', '.--.-.']
] as const;

const zeichen = zeichenCodec({ tabelle: TABELLE, trenner: ' ', worttrenner: '/' });

export const morse: Codec = {
  id: 'morse',
  name: 'Morse',
  beschreibung: 'Punkt und Strich. Zeichen durch Leerzeichen getrennt, Wörter durch /.',
  encode: (eingabe) => zeichen.encode(eingabe),
  decode: (eingabe) => zeichen.decode(eingabe),
  tabelle: () => zeichen.tabelle(),
  // Sehr aussagekräftig: Eine Eingabe aus nur Punkten und Strichen ist praktisch
  // immer Morse.
  passt: (eingabe) => anteil(eingabe, /[.\-/]/) ** 2
};
