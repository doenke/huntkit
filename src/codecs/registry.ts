import { abc123 } from './abc123';
import { ascii } from './ascii';
import { basen } from './basen';
import { braille } from './braille';
import { caesar } from './caesar';
import { atbash, bacon, handytasten, polybios, vigenereCodec, zaun } from './chiffren';
import { ausWoertern, gitter, jedesN, laenge, stellen, zaehlen } from './extrahieren';
import { elemente } from './elemente';
import { ersetzen } from './ersetzen';
import { fingeralphabet } from './fingeralphabet';
import { flaggen } from './flaggen';
import { hexahue } from './hexahue';
import { ipa } from './ipa';
import { klopfcode } from './klopfcode';
import { morse } from './morse';
import { base32, base64, roemisch } from './zahlen';
import { nato } from './nato';
import { templer } from './templer';
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
  fingeralphabet,
  flaggen,
  ipa,
  caesar,
  atbash,
  vigenereCodec,
  bacon,
  polybios,
  klopfcode,
  zaun,
  handytasten,
  basen,
  roemisch,
  base64,
  base32,
  jedesN,
  stellen,
  ausWoertern,
  gitter,
  zaehlen,
  laenge,
  ersetzen,
  elemente
];

const NACH_ID = new Map(CODECS.map((codec) => [codec.id, codec]));

export function codec(id: string): Codec | undefined {
  return NACH_ID.get(id);
}
