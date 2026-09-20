/**
 * Wortmuster- und Anagrammsuche über ein Wörterbuch, das im Gerät liegt.
 *
 * Die Liste wird erst beim ersten Gebrauch geladen – die App startet auch ohne
 * sie. Danach liegt sie im Cache des Service Workers und steht offline bereit.
 * Ihre Reihenfolge ist grob nach Häufigkeit; Treffer werden entsprechend
 * sortiert, damit gebräuchliche Wörter oben stehen und Bruchstücke unten.
 */

let liste: string[] | null = null;
let laden: Promise<string[]> | null = null;

/** Umlaute auflösen und großschreiben – so schreibt die Nachtschicht Lösungen. */
export function vereinfacht(wort: string): string {
  return wort
    .toUpperCase()
    .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS')
    .replace(/[^A-Z]/g, '');
}

export function istGeladen(): boolean {
  return liste !== null;
}

export async function woerterbuch(): Promise<string[]> {
  if (liste) return liste;
  if (!laden) {
    // Relativer Pfad, damit die App auch im Unterverzeichnis läuft.
    laden = fetch(new URL('woerter.txt', location.href))
      .then((antwort) => {
        if (!antwort.ok) throw new Error('nicht gefunden');
        return antwort.text();
      })
      .then((text) => {
        liste = text.split('\n').filter((w) => w.length > 0);
        return liste;
      });
  }
  return laden;
}

/**
 * Wandelt ein Suchmuster in einen regulären Ausdruck.
 *   ?  ein beliebiger Buchstabe
 *   *  beliebig viele
 *   sonst der Buchstabe selbst
 */
export function musterAlsRegel(muster: string): RegExp {
  const regel = [...muster]
    .map((zeichen) => {
      if (zeichen === '?') return '.';
      if (zeichen === '*') return '.*';
      return vereinfacht(zeichen); // Buchstaben; alles Übrige fällt weg
    })
    .join('');
  return new RegExp(`^${regel}$`);
}

export interface Suchergebnis {
  treffer: string[];
  /** Wie viele es insgesamt gibt – die Liste selbst ist gekürzt. */
  gesamt: number;
}

/** Sucht in einer gegebenen Liste – so lässt sich die Suche ohne Datei prüfen. */
export function suchenIn(worte: ReadonlyArray<string>, muster: string, hoechstens = 200): Suchergebnis {
  if (muster.trim().length === 0) return { treffer: [], gesamt: 0 };
  const regel = musterAlsRegel(muster);
  const treffer: string[] = [];
  let gesamt = 0;
  for (const wort of worte) {
    if (regel.test(vereinfacht(wort))) {
      gesamt++;
      if (treffer.length < hoechstens) treffer.push(wort);
    }
  }
  return { treffer, gesamt };
}

function buchstabenzaehlung(wort: string): Map<string, number> {
  const zaehlung = new Map<string, number>();
  for (const zeichen of vereinfacht(wort)) zaehlung.set(zeichen, (zaehlung.get(zeichen) ?? 0) + 1);
  return zaehlung;
}

function passtIn(kandidat: Map<string, number>, vorrat: Map<string, number>): boolean {
  for (const [zeichen, anzahl] of kandidat) {
    if ((vorrat.get(zeichen) ?? 0) < anzahl) return false;
  }
  return true;
}

export interface Anagrammfund {
  wort: string;
  /** true, wenn alle Buchstaben aufgebraucht sind. */
  vollstaendig: boolean;
}

/**
 * Anagramme. Neben den vollständigen werden auch Wörter gezeigt, die sich aus
 * einem Teil der Buchstaben legen lassen – im Rätsel steckt die Lösung oft in
 * einem Teilwort.
 */
export function anagrammeIn(
  worte: ReadonlyArray<string>,
  buchstaben: string,
  hoechstens = 120
): { treffer: Anagrammfund[]; gesamt: number } {
  const vorrat = buchstabenzaehlung(buchstaben);
  const laenge = vereinfacht(buchstaben).length;
  if (laenge === 0) return { treffer: [], gesamt: 0 };

  const treffer: Anagrammfund[] = [];
  let gesamt = 0;
  for (const wort of worte) {
    const einfach = vereinfacht(wort);
    if (einfach.length < 3 || einfach.length > laenge) continue;
    if (!passtIn(buchstabenzaehlung(wort), vorrat)) continue;
    gesamt++;
    if (treffer.length < hoechstens) {
      treffer.push({ wort, vollstaendig: einfach.length === laenge });
    }
  }
  // Vollständige zuerst, dann die längsten – sonst gehen sie in Teilwörtern unter.
  treffer.sort((a, b) =>
    Number(b.vollstaendig) - Number(a.vollstaendig) || b.wort.length - a.wort.length
  );
  return { treffer, gesamt };
}

export async function suchen(muster: string, hoechstens = 200): Promise<Suchergebnis> {
  return suchenIn(await woerterbuch(), muster, hoechstens);
}

export async function anagramme(
  buchstaben: string,
  hoechstens = 120
): Promise<{ treffer: Anagrammfund[]; gesamt: number }> {
  return anagrammeIn(await woerterbuch(), buchstaben, hoechstens);
}
