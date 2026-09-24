import type { Blatt } from '../blatt';
import type { Mitglied } from './api';
import { Gruppenabgleich } from './verbindung';

/**
 * Der eine Abgleich der App und das, was die Oberfläche davon beobachtet.
 *
 * Die Daten selbst sind bewusst nicht reaktiv – das wären tausende Zellen in
 * Proxys. Stattdessen zählt `ansicht.version` bei jeder Änderung hoch, und
 * wer anzeigt, liest danach frisch aus dem Abgleich.
 */

export const ansicht = $state({
  version: 0,
  /** Zellen, die gerade jemand anderes geändert hat: `werkbank|schlüssel` → wer, bis wann. */
  frisch: {} as Record<string, { von: number; bis: number }>
});

type Werkbankmeldung = (gruppe: string, werkbank: string, stand: { blatt: Blatt; name: string; geloescht: boolean }) => void;

let empfaenger: Werkbankmeldung | null = null;
let aufraeumer: ReturnType<typeof setTimeout> | undefined;

export const abgleich = new Gruppenabgleich({
  werkbank: (g, w, s) => empfaenger?.(g, w, s),
  fremd: (_, liste) => {
    const bis = Date.now() + 8000;
    for (const a of liste) {
      if (a.schluessel.startsWith('z/')) ansicht.frisch[`${a.werkbank}|${a.schluessel}`] = { von: a.von, bis };
    }
    clearTimeout(aufraeumer);
    aufraeumer = setTimeout(() => {
      const jetzt = Date.now();
      for (const [k, v] of Object.entries(ansicht.frisch)) if (v.bis <= jetzt) delete ansicht.frisch[k];
    }, 8100);
  },
  zustand: () => {
    ansicht.version++;
  }
});

// Vor dem Schließen alles sichern, egal welche Seite gerade offen ist –
// der Speicher schreibt sonst gebündelt mit kurzer Verzögerung.
if (typeof addEventListener === 'function') addEventListener('pagehide', () => abgleich.sichereJetzt());

/** Wer die Werkbank-Meldungen bekommt – die Werkbank-Ansicht, solange sie offen ist. */
export function empfangeWerkbaenke(f: Werkbankmeldung | null): void {
  empfaenger = f;
}

/** Ein Mitglied nach Nummer, auch ein ehemaliges. */
export function mitglied(gruppe: string, id: number): Pick<Mitglied, 'id' | 'name'> & Partial<Mitglied> {
  // Liest die Version mit: Kommt ein neues Mitglied erst nach seiner ersten
  // Änderung an, wird der Name nachgetragen.
  void ansicht.version;
  const d = abgleich.details(gruppe);
  const aktiv = d?.mitglieder.find((m) => m.id === id);
  if (aktiv) return aktiv;
  const frueher = d?.ehemalige.find((m) => m.id === id);
  if (frueher) return { ...frueher, art: 'gast', avatar: null };
  return { id, name: id === d?.ich ? 'du' : 'jemand' };
}

/** Link, mit dem man der Gruppe beitritt. */
export function einladungslink(code: string): string {
  return `${location.href.split('#')[0]}#/werkbank?einladung=${encodeURIComponent(code)}`;
}
