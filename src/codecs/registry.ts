import { abc123 } from './abc123';
import { ascii } from './ascii';
import { basen } from './basen';
import { braille } from './braille';
import { caesar } from './caesar';
import { elemente } from './elemente';
import { hexahue } from './hexahue';
import { morse } from './morse';
import { nato } from './nato';
import { templer } from './templer';
import { umlaute } from './umlaute';
import { winker } from './winker';
import type { Codec } from './types';

/**
 * Sammelstelle. Ein neuer Code wird hier eingetragen und ist damit überall
 * verfügbar: in der Werkbank, in der Übersicht und – ab Phase 4 – in der
 * Auto-Erkennung.
 */
export const CODECS: ReadonlyArray<Codec> = [
  morse,
  abc123,
  ascii,
  nato,
  braille,
  winker,
  hexahue,
  templer,
  caesar,
  basen,
  umlaute,
  elemente
];

const NACH_ID = new Map(CODECS.map((codec) => [codec.id, codec]));

export function codec(id: string): Codec | undefined {
  return NACH_ID.get(id);
}
