import elementeDaten from '../../data/elements.json';

/**
 * Das Periodensystem als Gitter.
 *
 * Gruppe und Periode stehen bewusst nicht im Datensatz: Die Stellung im
 * Periodensystem hängt nicht an der Quelle, sondern ergibt sich aus der
 * Ordnungszahl. Sie wird hier gerechnet und von Tests abgesichert.
 */

export type Element = (typeof elementeDaten)[number];

export const ELEMENTE: ReadonlyArray<Element> = elementeDaten;

/**
 * Welche Darstellung gemeint ist, entscheidet über sämtliche Koordinaten – ein
 * Rätsel meint immer eine bestimmte. Deshalb ist das eine sichtbare Einstellung
 * und keine Geschmacksfrage.
 */
export type Layout = 'standard' | 'lang' | 'kompakt';

export const LAYOUTS: ReadonlyArray<{ id: Layout; titel: string; hinweis: string }> = [
  { id: 'standard', titel: '18 Spalten', hinweis: 'Lanthanoide und Actinoide ausgelagert' },
  { id: 'lang', titel: '32 Spalten', hinweis: 'f-Block eingegliedert' },
  { id: 'kompakt', titel: 'kompakt', hinweis: 'lückenlos, 18 je Reihe' }
];

export interface Zelle {
  element: Element;
  spalte: number;
  reihe: number;
  gruppe: number | null;
  periode: number;
}

/** Letzte Ordnungszahl jeder Periode. */
const PERIODENENDE = [2, 10, 18, 36, 54, 86, 118];

export function periode(ordnungszahl: number): number {
  return PERIODENENDE.findIndex((ende) => ordnungszahl <= ende) + 1;
}

function imFBlock(element: Element): boolean {
  // Die Quelle entscheidet, wer im f-Block steht: La und Ac zählt sie zu den
  // Übergangsmetallen, die ausgelagerten Reihen umfassen je 14 Elemente.
  return element.serie === 'Lanthanoide' || element.serie === 'Actinoide';
}

export function gruppe(element: Element): number | null {
  if (imFBlock(element)) return null;
  const z = element.ordnungszahl;
  const p = periode(z);
  if (p === 1) return z === 1 ? 1 : 18;

  const beginn = (PERIODENENDE[p - 2] ?? 0) + 1;
  const stelle = z - beginn; // 0-basiert innerhalb der Periode
  if (p === 2 || p === 3) return stelle < 2 ? stelle + 1 : stelle + 11;
  if (p === 4 || p === 5) return stelle + 1;
  // Perioden 6 und 7: Nach den ersten drei Elementen (Gruppen 1 bis 3) folgen
  // die 14 Elemente des ausgelagerten f-Blocks. Erst an Stelle 17 geht es mit
  // Gruppe 4 weiter – also Gruppe = Stelle − 13.
  return stelle < 3 ? stelle + 1 : stelle - 13;
}

function fBlockStelle(element: Element): number {
  const reihe = ELEMENTE.filter((e) => e.serie === element.serie);
  return reihe.findIndex((e) => e.ordnungszahl === element.ordnungszahl);
}

export function raster(layout: Layout): Zelle[] {
  return ELEMENTE.map((element) => {
    const p = periode(element.ordnungszahl);
    const g = gruppe(element);

    if (layout === 'kompakt') {
      const i = element.ordnungszahl - 1;
      return { element, gruppe: g, periode: p, spalte: (i % 18) + 1, reihe: Math.floor(i / 18) + 1 };
    }

    if (imFBlock(element)) {
      const stelle = fBlockStelle(element);
      if (layout === 'lang') {
        // Eingegliedert: die 14 f-Plätze liegen zwischen Gruppe 2 und Gruppe 3.
        return { element, gruppe: g, periode: p, spalte: 3 + stelle, reihe: p };
      }
      // Ausgelagert: zwei Reihen unterhalb der Tafel, eine Leerzeile Abstand.
      return {
        element,
        gruppe: g,
        periode: p,
        spalte: 3 + stelle,
        reihe: element.serie === 'Lanthanoide' ? 9 : 10
      };
    }

    const spalte = layout === 'lang' && g !== null && g >= 3 ? g + 14 : (g ?? 1);
    return { element, gruppe: g, periode: p, spalte, reihe: p };
  });
}

export function spaltenZahl(layout: Layout): number {
  return layout === 'lang' ? 32 : 18;
}

export function reihenZahl(layout: Layout): number {
  if (layout === 'kompakt') return 7;
  return layout === 'lang' ? 7 : 10;
}

/** Element an einer Gitterstelle – die Umkehrung, die Rätsel oft brauchen. */
export function anStelle(layout: Layout, spalte: number, reihe: number): Element | undefined {
  return raster(layout).find((z) => z.spalte === spalte && z.reihe === reihe)?.element;
}

// ---------------------------------------------------------------------------
// Suchen und Markieren
// ---------------------------------------------------------------------------

function istPrimzahl(n: number): boolean {
  if (n < 2) return false;
  for (let t = 2; t * t <= n; t++) if (n % t === 0) return false;
  return true;
}

const ZAHLENFELDER: Record<string, (e: Element) => number | null> = {
  z: (e) => e.ordnungszahl,
  masse: (e) => e.atomgewicht,
  en: (e) => e.elektronegativitaet
};

/**
 * Sucht Elemente. Eine Aufgabe nennt mal Elemente und mal Eigenschaften –
 * deshalb versteht die Suche beides und lässt sich direkt in eine Markierung
 * überführen.
 *
 *   fe, gold, 26          Symbol, Name oder Ordnungszahl
 *   serie:edelgase        Serie
 *   zustand:gas           Aggregatzustand
 *   radioaktiv            nur radioaktive
 *   primzahl              Ordnungszahl ist Primzahl
 *   z>50  masse<20  en>2  Zahlenvergleiche
 *
 * Mehrere Begriffe werden mit UND verknüpft.
 */
export function finde(anfrage: string): Element[] {
  const teile = anfrage.trim().toLowerCase().split(/[\s,;]+/).filter((t) => t.length > 0);
  if (teile.length === 0) return [];

  return ELEMENTE.filter((element) =>
    teile.every((teil) => {
      if (teil === 'radioaktiv') return element.radioaktiv;
      if (teil === 'primzahl') return istPrimzahl(element.ordnungszahl);

      const doppelpunkt = teil.match(/^(serie|zustand):(.+)$/);
      if (doppelpunkt) {
        const feld = doppelpunkt[1] === 'serie' ? element.serie : element.aggregatzustand;
        return (feld ?? '').toLowerCase().startsWith(doppelpunkt[2] ?? '');
      }

      const vergleich = teil.match(/^(z|masse|en)(>=|<=|>|<|=)(-?[\d.]+)$/);
      if (vergleich) {
        const wert = ZAHLENFELDER[vergleich[1] as string]?.(element);
        if (wert === null || wert === undefined) return false;
        const grenze = Number(vergleich[3]);
        switch (vergleich[2]) {
          case '>': return wert > grenze;
          case '<': return wert < grenze;
          case '>=': return wert >= grenze;
          case '<=': return wert <= grenze;
          default: return wert === grenze;
        }
      }

      // Der Name wird erst ab drei Zeichen als Teilwort gesucht. Sonst fände
      // „fe“ neben Eisen auch Schwefel, Kupfer und Fermium.
      return (
        element.symbol.toLowerCase() === teil ||
        String(element.ordnungszahl) === teil ||
        (teil.length >= 3 && element.name.toLowerCase().includes(teil))
      );
    })
  );
}

export type Reihenfolge = 'gitter' | 'spalten' | 'zahl' | 'auswahl';
export type Ausgabe = 'symbol' | 'name' | 'ordnungszahl' | 'anfang';

export const REIHENFOLGEN: ReadonlyArray<{ id: Reihenfolge; titel: string }> = [
  { id: 'gitter', titel: 'zeilenweise' },
  { id: 'spalten', titel: 'spaltenweise' },
  { id: 'zahl', titel: 'nach Ordnungszahl' },
  { id: 'auswahl', titel: 'wie angetippt' }
];

export const AUSGABEN: ReadonlyArray<{ id: Ausgabe; titel: string }> = [
  { id: 'symbol', titel: 'Symbol' },
  { id: 'anfang', titel: 'Anfangsbuchstabe' },
  { id: 'name', titel: 'Name' },
  { id: 'ordnungszahl', titel: 'Ordnungszahl' }
];

/**
 * Liest markierte Zellen aus. Die Reihenfolge ist der eigentliche Rätselschritt:
 * dieselben Elemente ergeben zeilenweise etwas anderes als nach Ordnungszahl.
 */
export function auslesen(
  markiert: ReadonlyArray<number>,
  layout: Layout,
  reihenfolge: Reihenfolge,
  ausgabe: Ausgabe
): string {
  const zellen = raster(layout);
  const gewaehlt = markiert
    .map((z) => zellen.find((zelle) => zelle.element.ordnungszahl === z))
    .filter((z): z is Zelle => z !== undefined);

  const sortiert = [...gewaehlt];
  if (reihenfolge === 'gitter') {
    sortiert.sort((a, b) => a.reihe - b.reihe || a.spalte - b.spalte);
  } else if (reihenfolge === 'spalten') {
    sortiert.sort((a, b) => a.spalte - b.spalte || a.reihe - b.reihe);
  } else if (reihenfolge === 'zahl') {
    sortiert.sort((a, b) => a.element.ordnungszahl - b.element.ordnungszahl);
  }
  // 'auswahl' behält die Reihenfolge, in der angetippt wurde.

  return sortiert
    .map(({ element }) => {
      switch (ausgabe) {
        case 'name': return element.name;
        case 'ordnungszahl': return String(element.ordnungszahl);
        case 'anfang': return element.name.slice(0, 1);
        default: return element.symbol;
      }
    })
    .join(ausgabe === 'anfang' ? '' : ' ');
}
