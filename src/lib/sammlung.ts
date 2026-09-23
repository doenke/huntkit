import {
  ausAlterKette,
  inHeutigerForm,
  istBlatt,
  kennung,
  leeresBlatt,
  type Blatt
} from './blatt';

/**
 * Mehrere Werkbänke auf einem Gerät.
 *
 * Jede Werkbank ist ein Blatt mit Namen. Gearbeitet wird immer an genau
 * einer, der aktiven. Automatisches Speichern ist ab Werk an: Jede Änderung
 * landet sofort in ihrer Werkbank. Wer es ausschaltet, arbeitet an einem
 * Entwurf – der hängt an der Werkbank, übersteht Neuladen und Wechseln, und
 * wird erst mit „Speichern“ zum gespeicherten Stand. So lässt sich an einer
 * Werkbank herumprobieren, ohne den bewährten Stand zu verlieren.
 */

export interface Werkbank {
  id: string;
  name: string;
  /** Zeitpunkt der letzten gespeicherten Änderung, ms seit 1970. */
  geaendert: number;
  blatt: Blatt;
  /** Nur bei ausgeschaltetem automatischem Speichern: ungespeicherte Änderungen. */
  entwurf?: Blatt;
}

export interface Sammlung {
  aktiv: string;
  werkbaenke: Werkbank[];
  /** Ab Werk an. */
  automatisch: boolean;
}

const SPEICHER = 'huntkit:werkbaenke';
/** Hier lag das eine Blatt, bevor es mehrere Werkbänke gab. */
const EINZELNES_BLATT = 'huntkit:blatt';
/** Und davor ein einzelner Text mit einer Schrittkette. */
const SCHRITTKETTE = 'huntkit:werkbank';

export function neueWerkbank(name: string, blatt: Blatt = leeresBlatt()): Werkbank {
  return { id: kennung(), name, geaendert: Date.now(), blatt };
}

/** „Werkbank 3“ – die nächste freie Nummer, damit kein Name doppelt vorkommt. */
export function freierName(sammlung: Sammlung, stamm = 'Werkbank'): string {
  const vergeben = new Set(sammlung.werkbaenke.map((w) => w.name));
  if (!vergeben.has(stamm) && stamm !== 'Werkbank') return stamm;
  for (let n = sammlung.werkbaenke.length + 1; ; n++) {
    const name = `${stamm} ${n}`;
    if (!vergeben.has(name)) return name;
  }
}

export function aktiveWerkbank(sammlung: Sammlung): Werkbank {
  return (sammlung.werkbaenke.find((w) => w.id === sammlung.aktiv) ?? sammlung.werkbaenke[0]) as Werkbank;
}

/** Was man vor sich hat: der Entwurf, falls es einen gibt, sonst der gespeicherte Stand. */
export function arbeitsstand(werkbank: Werkbank): Blatt {
  return werkbank.entwurf ?? werkbank.blatt;
}

function frisch(): Sammlung {
  const erste = neueWerkbank('Werkbank 1');
  return { aktiv: erste.id, werkbaenke: [erste], automatisch: true };
}

function istSammlung(wert: unknown): wert is Sammlung {
  const s = wert as Partial<Sammlung> | null;
  return Boolean(
    s &&
      Array.isArray(s.werkbaenke) &&
      s.werkbaenke.length > 0 &&
      s.werkbaenke.every((w) => w && typeof w.id === 'string' && istBlatt(w.blatt))
  );
}

/**
 * Ein gespeicherter Stand in heutiger Form. Unbekanntes oder Kaputtes wird
 * nicht übernommen, sondern durch eine leere Werkbank ersetzt – ein
 * beschädigter Eintrag darf die App nicht lahmlegen.
 */
export function ausGespeichertem(roh: unknown, altesBlatt?: unknown): Sammlung {
  if (istSammlung(roh)) {
    const werkbaenke = roh.werkbaenke.map((w) => ({
      id: w.id,
      name: typeof w.name === 'string' && w.name.trim() ? w.name : 'Werkbank',
      geaendert: typeof w.geaendert === 'number' ? w.geaendert : Date.now(),
      blatt: inHeutigerForm(w.blatt),
      ...(w.entwurf && istBlatt(w.entwurf) ? { entwurf: inHeutigerForm(w.entwurf) } : {})
    }));
    const aktiv = werkbaenke.some((w) => w.id === roh.aktiv) ? roh.aktiv : (werkbaenke[0] as Werkbank).id;
    return { aktiv, werkbaenke, automatisch: roh.automatisch !== false };
  }
  // Das eine Blatt von früher wird die erste Werkbank.
  if (istBlatt(altesBlatt)) {
    const erste = neueWerkbank('Werkbank 1', inHeutigerForm(altesBlatt));
    return { aktiv: erste.id, werkbaenke: [erste], automatisch: true };
  }
  return frisch();
}

export function ladeSammlung(): Sammlung {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (roh) return ausGespeichertem(JSON.parse(roh));
    const alt = localStorage.getItem(EINZELNES_BLATT);
    if (alt) return ausGespeichertem(null, JSON.parse(alt));
    const kette = localStorage.getItem(SCHRITTKETTE);
    if (kette) {
      const gelesen = JSON.parse(kette) as { eingabe?: unknown; schritte?: unknown };
      if (typeof gelesen.eingabe === 'string') {
        const schritte = Array.isArray(gelesen.schritte) ? gelesen.schritte : [];
        return ausGespeichertem(null, ausAlterKette({ eingabe: gelesen.eingabe, schritte }));
      }
    }
  } catch {
    // Gesperrter Speicher oder kaputter Eintrag – dann eben frisch anfangen.
  }
  return frisch();
}

export function sichereSammlung(sammlung: Sammlung): void {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(sammlung));
  } catch {
    // Voll oder gesperrt – die Arbeit geht im Speicher des Tabs weiter.
  }
}

/**
 * Den Stand der Arbeitskopie in die aktive Werkbank übernehmen. Mit
 * automatischem Speichern wird er der gespeicherte Stand, ohne wird er zum
 * Entwurf – oder der Entwurf verschwindet, wenn alles wieder so ist wie
 * gespeichert. Gibt zurück, ob sich etwas geändert hat.
 */
export function uebernimm(sammlung: Sammlung, stand: Blatt, jetzt = Date.now()): boolean {
  const werkbank = aktiveWerkbank(sammlung);
  const neu = JSON.stringify(stand);
  const gespeichert = JSON.stringify(werkbank.blatt);
  if (sammlung.automatisch) {
    if (neu === gespeichert && !werkbank.entwurf) return false;
    werkbank.blatt = JSON.parse(neu) as Blatt;
    delete werkbank.entwurf;
    werkbank.geaendert = jetzt;
    return true;
  }
  if (neu === gespeichert) {
    if (!werkbank.entwurf) return false;
    delete werkbank.entwurf;
    return true;
  }
  if (werkbank.entwurf && JSON.stringify(werkbank.entwurf) === neu) return false;
  werkbank.entwurf = JSON.parse(neu) as Blatt;
  return true;
}

/** Entwurf zum gespeicherten Stand machen. */
export function speichere(werkbank: Werkbank, jetzt = Date.now()): void {
  if (!werkbank.entwurf) return;
  werkbank.blatt = werkbank.entwurf;
  delete werkbank.entwurf;
  werkbank.geaendert = jetzt;
}

/** Eine Werkbank entfernen. Die letzte wird durch eine leere ersetzt, nie ist gar keine da. */
export function entferne(sammlung: Sammlung, id: string): void {
  const stelle = sammlung.werkbaenke.findIndex((w) => w.id === id);
  if (stelle < 0) return;
  sammlung.werkbaenke.splice(stelle, 1);
  if (sammlung.werkbaenke.length === 0) sammlung.werkbaenke.push(neueWerkbank('Werkbank 1'));
  if (sammlung.aktiv === id) {
    const naechste = sammlung.werkbaenke[Math.min(stelle, sammlung.werkbaenke.length - 1)] as Werkbank;
    sammlung.aktiv = naechste.id;
  }
}
