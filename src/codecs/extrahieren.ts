import { ergebnis, text, zahl } from './hilfen';
import type { Codec, OptionWerte } from './types';

/**
 * Extraktionshelfer.
 *
 * Der letzte Schritt fast jedes Rätsels: „nimm jeden dritten Buchstaben“,
 * „lies die Spalten“, „die Anfangsbuchstaben ergeben das Lösungswort“. Von Hand
 * verzählt man sich dabei – nachts zuverlässig.
 *
 * Alle Helfer sind einseitig: Aus dem Ergebnis lässt sich der Ausgangstext
 * nicht zurückgewinnen.
 */

function buchstaben(eingabe: string): string[] {
  return [...eingabe].filter((z) => /\p{L}|\p{N}/u.test(z));
}

const GRUNDLAGE = {
  id: 'grundlage',
  titel: 'zählt',
  art: 'auswahl',
  standard: 'buchstaben',
  werte: [
    { wert: 'buchstaben', titel: 'nur Buchstaben und Ziffern' },
    { wert: 'zeichen', titel: 'alle Zeichen' }
  ]
} as const;

function zeichenliste(eingabe: string, optionen: OptionWerte | undefined): string[] {
  return text(optionen, 'grundlage', 'buchstaben') === 'zeichen'
    ? [...eingabe]
    : buchstaben(eingabe);
}

/**
 * Jeden n-ten – oder nur den n-ten. Das Ganze aus dem ganzen Text oder aus
 * jedem Wort einzeln; aus jedem Wort einmal den ersten ist das Akrostichon.
 *
 * Negative n zählen von hinten: einmal −1 ist der letzte Buchstabe, wiederholt
 * −2 jeder zweite vom Ende her. Gelesen wird trotzdem von vorn nach hinten.
 */
export const jedesN: Codec = {
  id: 'jedes-n',
  name: 'Jeden n-ten',
  nurWerkbank: true,
  beschreibung:
    'Jeden n-ten Buchstaben herausziehen – oder einmal den n-ten, etwa aus jedem Wort den ersten. Negative n zählen von hinten.',
  einseitig: true,
  optionen: [
    { id: 'n', titel: 'n', art: 'zahl', min: -40, max: 40, standard: 3 },
    {
      id: 'modus',
      titel: 'wie oft',
      art: 'auswahl',
      standard: 'wiederholen',
      werte: [
        { wert: 'wiederholen', titel: 'wiederholen' },
        { wert: 'einmal', titel: 'einmal' }
      ]
    },
    {
      id: 'bereich',
      titel: 'aus',
      art: 'auswahl',
      standard: 'text',
      werte: [
        { wert: 'text', titel: 'ganzer Text' },
        { wert: 'wort', titel: 'jedes Wort' }
      ]
    },
    { id: 'versatz', titel: 'ab Stelle (beim Wiederholen)', art: 'zahl', min: 1, max: 40, standard: 1 },
    GRUNDLAGE
  ],
  encode: (eingabe, optionen) => {
    const n = zahl(optionen, 'n', 3) || 1;
    const einmal = text(optionen, 'modus', 'wiederholen') === 'einmal';
    const start = Math.max(1, zahl(optionen, 'versatz', 1)) - 1;
    const luecken: { position: number; zeichen: string }[] = [];

    const ausTeil = (teil: string, stelle: number): string => {
      const vorn = zeichenliste(teil, optionen);
      if (einmal) {
        const treffer = vorn[n < 0 ? vorn.length + n : n - 1];
        if (treffer === undefined) luecken.push({ position: stelle, zeichen: teil });
        return treffer ?? '';
      }
      // Von hinten: umdrehen, wie von vorn nehmen, zurückdrehen.
      const liste = n < 0 ? [...vorn].reverse() : vorn;
      const heraus: string[] = [];
      for (let i = start; i < liste.length; i += Math.abs(n)) heraus.push(liste[i] as string);
      return (n < 0 ? heraus.reverse() : heraus).join('');
    };

    if (text(optionen, 'bereich', 'text') === 'wort') {
      const woerter = eingabe.trim().split(/\s+/).filter((w) => w.length > 0);
      return ergebnis(woerter.map(ausTeil).join(''), luecken);
    }
    return ergebnis(ausTeil(eingabe, 0), luecken);
  },
  decode: (eingabe, optionen) => jedesN.encode(eingabe, optionen)
};

export const stellen: Codec = {
  id: 'stellen',
  name: 'Buchstaben an Stellen',
  nurWerkbank: true,
  beschreibung: 'Eine Liste von Stellen angeben, z.B. 3,1,4,1,5 – gezählt ab 1.',
  einseitig: true,
  optionen: [
    { id: 'liste', titel: 'Stellen', art: 'text', standard: '1', platzhalter: '3,1,4,1,5' },
    GRUNDLAGE
  ],
  encode: (eingabe, optionen) => {
    const liste = zeichenliste(eingabe, optionen);
    const stellenliste = text(optionen, 'liste', '1')
      .split(/[^\d-]+/)
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const luecken: { position: number; zeichen: string }[] = [];
    const heraus = stellenliste.map((stelle, i) => {
      // Negative Angaben zählen von hinten: −1 ist der letzte Buchstabe.
      const index = stelle < 0 ? liste.length + stelle : stelle - 1;
      const zeichen = liste[index];
      if (zeichen === undefined) {
        luecken.push({ position: i, zeichen: String(stelle) });
        return '';
      }
      return zeichen;
    });
    return ergebnis(heraus.join(''), luecken);
  },
  decode: (eingabe, optionen) => stellen.encode(eingabe, optionen)
};

export const zaehlen: Codec = {
  id: 'zaehlen',
  name: 'Zeichen zählen',
  nurWerkbank: true,
  beschreibung: 'Wie oft ein Zeichen oder eine Zeichenfolge im Text vorkommt – oder wie viele Zeichen aus einer Auswahl.',
  einseitig: true,
  optionen: [
    { id: 'suche', titel: 'Zeichen', art: 'text', standard: 'E', platzhalter: 'E oder ·' },
    {
      id: 'art',
      titel: 'Zählt',
      art: 'auswahl',
      standard: 'folge',
      werte: [
        { wert: 'folge', titel: 'die Zeichenfolge' },
        { wert: 'jedes', titel: 'jedes dieser Zeichen' }
      ]
    },
    {
      id: 'schreibung',
      titel: 'Schreibung',
      art: 'auswahl',
      standard: 'egal',
      werte: [
        { wert: 'egal', titel: 'Groß/klein egal' },
        { wert: 'genau', titel: 'genau so' }
      ]
    }
  ],
  encode: (eingabe, optionen) => {
    const suche = text(optionen, 'suche', '');
    // Ohne Eingabe oder ohne Suchzeichen gibt es nichts zu zählen – eine 0 wäre
    // hier eine Behauptung über einen Text, den es noch gar nicht gibt.
    if (eingabe.length === 0 || suche.length === 0) return ergebnis('');
    const genau = text(optionen, 'schreibung', 'egal') === 'genau';
    const heuhaufen = genau ? eingabe : eingabe.toLowerCase();
    const nadel = genau ? suche : suche.toLowerCase();
    // „AEIOU“ als Auswahl: Jedes Zeichen, das darin vorkommt, zählt einmal –
    // die Vokale eines Worts, oder alle Buchstaben mit einem bestimmten Merkmal.
    if (text(optionen, 'art', 'folge') === 'jedes') {
      const auswahl = new Set(nadel);
      return ergebnis(String([...heuhaufen].filter((z) => auswahl.has(z)).length));
    }
    // Über split gezählt: Das zählt auch mehrstellige Suchen („.-“, „SCH“)
    // ohne Überlappung, so wie man von Hand zählen würde.
    return ergebnis(String(heuhaufen.split(nadel).length - 1));
  },
  decode: (eingabe, optionen) => zaehlen.encode(eingabe, optionen)
};

/** Was bei „Länge“ als ein Zeichen zählt – je Einstellung ein Prüfer. */
const istBuchstabe = (z: string) => /\p{L}/u.test(z);
const ZAEHLT_MIT: Record<string, (zeichen: string) => boolean> = {
  buchstaben: istBuchstabe,
  ziffern: (z) => /\p{N}/u.test(z),
  'buchstaben-ziffern': (z) => /\p{L}|\p{N}/u.test(z),
  zeichen: () => true,
  'ohne-leer': (z) => !/\s/u.test(z),
  // Alles, was weder Buchstabe noch Ziffer noch Abstand ist: Punkt, Komma,
  // Klammer, Schrägstrich – oft der eigentliche Hinweis.
  sonderzeichen: (z) => !/\p{L}|\p{N}|\s/u.test(z)
};

/**
 * Wie lang ist der Text? Klingt banal, ist es beim Rätseln aber nicht: Die
 * Länge eines Textes ist oft selbst die gesuchte Zahl, und je nach Aufgabe
 * zählt etwas anderes mit. Deshalb steht hier nicht eine Länge, sondern die
 * Wahl, was überhaupt als Zeichen gilt.
 */
export const laenge: Codec = {
  id: 'laenge',
  name: 'Länge',
  nurWerkbank: true,
  beschreibung: 'Wie lang der Text ist – wahlweise nach Zeichen, Buchstaben, Ziffern oder Wörtern.',
  einseitig: true,
  optionen: [
    {
      id: 'was',
      titel: 'zählt',
      art: 'auswahl',
      standard: 'buchstaben',
      werte: [
        { wert: 'buchstaben', titel: 'nur Buchstaben' },
        { wert: 'ziffern', titel: 'nur Ziffern' },
        { wert: 'buchstaben-ziffern', titel: 'Buchstaben und Ziffern' },
        { wert: 'zeichen', titel: 'alle Zeichen' },
        { wert: 'ohne-leer', titel: 'alle Zeichen außer Leerzeichen' },
        { wert: 'sonderzeichen', titel: 'Sonderzeichen' },
        { wert: 'woerter', titel: 'Wörter' }
      ]
    }
  ],
  encode: (eingabe, optionen) => {
    // Wie beim Zählen: Zu einem leeren Text sagen wir nichts. Eine 0 sähe aus
    // wie ein Ergebnis, ist aber nur die fehlende Eingabe.
    if (eingabe.length === 0) return ergebnis('');
    const was = text(optionen, 'was', 'buchstaben');
    if (was === 'woerter') {
      return ergebnis(String(eingabe.trim().split(/\s+/).filter((w) => w.length > 0).length));
    }
    const zaehltMit = ZAEHLT_MIT[was] ?? istBuchstabe;
    return ergebnis(String([...eingabe].filter(zaehltMit).length));
  },
  decode: (eingabe, optionen) => laenge.encode(eingabe, optionen)
};

/** Liest ein zeilenweise gefülltes Gitter in verschiedenen Richtungen aus. */
export function gitterLesen(zeichen: string[], breite: number, richtung: string): string {
  const b = Math.max(1, breite);
  const hoehe = Math.ceil(zeichen.length / b);
  const feld = (zeile: number, spalte: number) => zeichen[zeile * b + spalte] ?? '';

  if (richtung === 'spalten') {
    const heraus: string[] = [];
    for (let s = 0; s < b; s++) for (let z = 0; z < hoehe; z++) heraus.push(feld(z, s));
    return heraus.join('');
  }

  if (richtung === 'bustrophedon') {
    // Wie der Ochse pflügt: Zeile für Zeile, jede zweite rückwärts.
    const heraus: string[] = [];
    for (let z = 0; z < hoehe; z++) {
      for (let s = 0; s < b; s++) heraus.push(feld(z, z % 2 === 0 ? s : b - 1 - s));
    }
    return heraus.join('');
  }

  if (richtung === 'diagonalen') {
    const heraus: string[] = [];
    for (let d = 0; d <= hoehe + b - 2; d++) {
      for (let z = 0; z < hoehe; z++) {
        const s = d - z;
        if (s >= 0 && s < b) heraus.push(feld(z, s));
      }
    }
    return heraus.join('');
  }

  if (richtung === 'spirale') {
    const heraus: string[] = [];
    let oben = 0;
    let unten = hoehe - 1;
    let links = 0;
    let rechts = b - 1;
    while (oben <= unten && links <= rechts) {
      for (let s = links; s <= rechts; s++) heraus.push(feld(oben, s));
      oben++;
      for (let z = oben; z <= unten; z++) heraus.push(feld(z, rechts));
      rechts--;
      if (oben <= unten) {
        for (let s = rechts; s >= links; s--) heraus.push(feld(unten, s));
        unten--;
      }
      if (links <= rechts) {
        for (let z = unten; z >= oben; z--) heraus.push(feld(z, links));
        links++;
      }
    }
    return heraus.join('');
  }

  return zeichen.join('');
}

export const gitter: Codec = {
  id: 'gitter',
  name: 'Gitter lesen',
  nurWerkbank: true,
  beschreibung: 'Text zeilenweise in ein Gitter füllen und in anderer Richtung auslesen.',
  einseitig: true,
  optionen: [
    { id: 'breite', titel: 'Spalten', art: 'zahl', min: 2, max: 40, standard: 5 },
    {
      id: 'richtung',
      titel: 'lesen',
      art: 'auswahl',
      standard: 'spalten',
      werte: [
        { wert: 'spalten', titel: 'spaltenweise' },
        { wert: 'bustrophedon', titel: 'Zeilen abwechselnd' },
        { wert: 'diagonalen', titel: 'Diagonalen' },
        { wert: 'spirale', titel: 'Spirale' },
        { wert: 'zeilen', titel: 'zeilenweise' }
      ]
    },
    GRUNDLAGE
  ],
  encode: (eingabe, optionen) =>
    ergebnis(
      gitterLesen(
        zeichenliste(eingabe, optionen),
        zahl(optionen, 'breite', 5),
        text(optionen, 'richtung', 'spalten')
      )
    ),
  decode: (eingabe, optionen) => gitter.encode(eingabe, optionen)
};
