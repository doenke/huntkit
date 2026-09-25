import { braille } from '../codecs/braille';
import { ohneUmlaute } from '../codecs/hilfen';
import { begleiteTafel, neueEingabespalte, neueWerkzeugspalte, neueZeile, type Blatt } from './werkbank/blatt';
import type { Geteilt } from './werkbank/teilen';

/**
 * Übungsrätsel: kleine, echte Rätsel, an denen man die Werkzeuge der App
 * kennenlernt – so, wie man sie in der Nacht braucht. Zu jedem gibt es
 * gestufte Tipps und den Lösungsweg als fertige Werkbank.
 */

/** Ein Punkteraster: Zeilen aus Braille-Zellen, ohne Abstand zwischen den Zellen. */
export interface Punkteraster {
  art: 'punkteraster';
  /** Je Zeile ein Text aus Braille-Zeichen (U+2800 …), alle gleich lang. */
  zeilen: ReadonlyArray<string>;
}

export interface Uebung {
  id: string;
  titel: string;
  aufgabe: Punkteraster;
  loesung: string;
  tipps: ReadonlyArray<string>;
  /** Wie man es mit der Werkbank löst – als neue Werkbank zum Öffnen. */
  loesungsweg(): Geteilt;
}

/** Gilt eine Antwort als richtig? Groß/klein, Abstände und Umlaute zählen nicht. */
export function stimmt(uebung: Uebung, antwort: string): boolean {
  const glatt = (s: string) => ohneUmlaute(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return glatt(antwort).length > 0 && glatt(antwort) === glatt(uebung.loesung);
}

/**
 * Wörter als rechtsbündiges Raster: Kürzere Wörter werden links mit leeren
 * Zellen aufgefüllt, damit das Ganze ein Rechteck ist.
 */
function alsRaster(woerter: ReadonlyArray<string>): Punkteraster {
  const zeilen = woerter.map((wort) => braille.encode(wort).text);
  const breite = Math.max(...zeilen.map((z) => [...z].length));
  return { art: 'punkteraster', zeilen: zeilen.map((z) => '⠀'.repeat(breite - [...z].length) + z) };
}

/** Punkte 1–6 einer Braille-Zelle, als Bits wie in Unicode (Punkt 1 = 1, Punkt 4 = 8). */
export function punkteDerZelle(zeichen: string): number {
  const code = zeichen.codePointAt(0) ?? 0;
  return code >= 0x2800 && code <= 0x283f ? code - 0x2800 : 0;
}

// ---------------------------------------------------------------------------

/** In dieser Reihenfolge stehen sie im Raster – nicht sortiert, das ist Teil der Aufgabe. */
const SAEULEN_WOERTER = ['LOKALER', 'SPUR', 'VIRTUELL', 'UNKLAR', 'TRUPP'];

const saeulenkunde: Uebung = {
  id: 'saeulenkunde',
  titel: 'Kleine Säulenkunde: Nur durchgehend zählt’s',
  aufgabe: alsRaster(SAEULEN_WOERTER),
  loesung: 'PUNKT',
  tipps: [
    'Das Raster ist Braille. Eine Zelle ist zwei Punkte breit und drei hoch; jede Zeile aus drei Punktreihen ist ein Wort, rechtsbündig. Links ist mit leeren Zellen aufgefüllt.',
    'Klein vor groß: Ordne die Wörter nach ihrer Länge, das kürzeste zuerst.',
    'Eine Säule sind drei Punkte senkrecht übereinander in einer Zelle. Das haben L, P, Q, R und V links, W und Y rechts. Zähle je Wort, wie viele seiner Buchstaben eine Säule haben.',
    'Diese Zahl sagt, der wievielte Buchstabe des Worts gilt. Von oben nach unten gelesen ergeben sie die Lösung.'
  ],
  loesungsweg() {
    const eingabe = { ...neueEingabespalte('braille'), titel: 'Braille' };
    const blatt: Blatt = {
      spalten: [eingabe],
      zeilen: saeulenkunde.aufgabe.zeilen.map((zeile, i) => {
        const neu = neueZeile(i + 1);
        // Die Füllzellen gehören nicht zum Wort.
        neu.werte[eingabe.id] = zeile.replace(/^⠀+/, '');
        return neu;
      })
    };
    const wort = begleiteTafel(blatt, eingabe);
    if (!wort) throw new Error('Braille hat keine Entschlüsselung');
    wort.titel = 'Wort';

    const laenge = { ...neueWerkzeugspalte(wort.id, 'laenge'), titel: 'Länge' };
    const saeulen = { ...neueWerkzeugspalte(wort.id, 'zaehlen'), titel: 'Säulen' };
    saeulen.optionen = {
      ...saeulen.optionen,
      suche: { art: 'fest', wert: 'LPQRVWY' },
      art: { art: 'fest', wert: 'jedes' }
    };
    const buchstabe = { ...neueWerkzeugspalte(wort.id, 'stellen'), titel: 'Buchstabe' };
    buchstabe.optionen = { ...buchstabe.optionen, liste: { art: 'spalte', spalte: saeulen.id } };

    blatt.spalten.push(laenge, saeulen, buchstabe);
    blatt.sortierung = { spalte: laenge.id, art: 'zahl', richtung: 'auf' };
    return { blatt, name: 'Lösungsweg: Säulenkunde' };
  }
};

export const UEBUNGEN: ReadonlyArray<Uebung> = [saeulenkunde];

// ---------------------------------------------------------------------------

const GELOEST = 'huntkit:uebungen-geloest';

/** Welche Übungen auf diesem Gerät schon gelöst sind – reine Bequemlichkeit. */
export function geloeste(): Set<string> {
  try {
    const gelesen = JSON.parse(localStorage.getItem(GELOEST) ?? '[]') as unknown;
    return new Set(Array.isArray(gelesen) ? gelesen.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function merkeGeloest(id: string): void {
  try {
    localStorage.setItem(GELOEST, JSON.stringify([...geloeste(), id]));
  } catch {
    // Ohne Speicher gibt es eben keinen Haken – das Rätsel geht trotzdem.
  }
}
