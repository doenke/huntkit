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
 * einer, der aktiven, und jede Änderung landet sofort in ihr – gespeichert
 * wird immer automatisch. (Früher ließ sich das abschalten, dann entstand ein
 * Entwurf; ein solcher wird beim Laden zum gespeicherten Stand.)
 */

export interface Werkbank {
  id: string;
  name: string;
  /** Zeitpunkt der letzten gespeicherten Änderung, ms seit 1970. */
  geaendert: number;
  blatt: Blatt;
  /**
   * Gehört die Werkbank einer Gruppe, steht hier deren Kennung. Dann ist die
   * Kennung der Werkbank auch die auf dem Server.
   */
  gruppe?: string;
}

export interface Sammlung {
  aktiv: string;
  werkbaenke: Werkbank[];
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

function frisch(): Sammlung {
  const erste = neueWerkbank('Werkbank 1');
  return { aktiv: erste.id, werkbaenke: [erste] };
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
    const werkbaenke = roh.werkbaenke.map((w) => {
      // Ein Entwurf aus der Zeit, als man das Speichern abschalten konnte, ist
      // die jüngste Arbeit – er wird der Stand der Werkbank.
      const { entwurf } = w as Werkbank & { entwurf?: unknown };
      return {
        id: w.id,
        name: typeof w.name === 'string' && w.name.trim() ? w.name : 'Werkbank',
        geaendert: typeof w.geaendert === 'number' ? w.geaendert : Date.now(),
        blatt: inHeutigerForm(istBlatt(entwurf) ? entwurf : w.blatt),
        ...(typeof w.gruppe === 'string' ? { gruppe: w.gruppe } : {})
      };
    });
    const aktiv = werkbaenke.some((w) => w.id === roh.aktiv) ? roh.aktiv : (werkbaenke[0] as Werkbank).id;
    return { aktiv, werkbaenke };
  }
  // Das eine Blatt von früher wird die erste Werkbank.
  if (istBlatt(altesBlatt)) {
    const erste = neueWerkbank('Werkbank 1', inHeutigerForm(altesBlatt));
    return { aktiv: erste.id, werkbaenke: [erste] };
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
 * Den Stand der Arbeitskopie in die aktive Werkbank übernehmen. Gibt zurück,
 * ob sich etwas geändert hat – nur dann rückt die Änderungszeit vor.
 */
export function uebernimm(sammlung: Sammlung, stand: Blatt, jetzt = Date.now()): boolean {
  const werkbank = aktiveWerkbank(sammlung);
  const neu = JSON.stringify(stand);
  if (neu === JSON.stringify(werkbank.blatt)) return false;
  werkbank.blatt = JSON.parse(neu) as Blatt;
  werkbank.geaendert = jetzt;
  return true;
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
