/**
 * Eine geführte Tour durch die Werkbank: Schritt für Schritt wird ein echtes
 * Element hervorgehoben und daneben erklärt, was es tut.
 *
 * Die Schritte sind Daten. Jeder zeigt über `ziel` auf ein Element mit dem
 * passenden `data-tour`-Attribut – ein Test prüft, dass es diese Elemente
 * gibt. So veraltet die Tour nicht still, wenn die Oberfläche umgebaut wird.
 */

export interface Tourschritt {
  /** Wert von `data-tour` am hervorgehobenen Element; ohne Ziel steht der Text mittig. */
  ziel?: string;
  titel: string;
  text: string;
  /** Welche Box für diesen Schritt offen sein soll – sonst sind alle zu. */
  oeffne?: 'zelle' | 'einstellung';
}

export const WERKBANK_TOUR: ReadonlyArray<Tourschritt> = [
  {
    ziel: 'werkbank-name',
    titel: 'Deine Werkbank',
    text: 'Hier löst du Rätsel – als Tabelle. Tippst du auf den Namen, öffnet sich die Verwaltung: Dort wechselst du Werkbänke, legst neue an oder kopierst eine an einen anderen Ort.'
  },
  {
    ziel: 'neue-zeile',
    titel: 'Zeilen',
    text: 'Eine Zeile je Fundstück: eine Station, ein Foto, ein Wort. Neue Zeilen legst du hier an – oder du drückst Enter in der letzten Zeile.'
  },
  {
    ziel: 'neue-spalte',
    titel: 'Spalten',
    text: 'Eine Eingabe nimmst du für alles, was du abtippst, ein Werkzeug für alles, was du aus einer anderen Spalte rechnen lässt: Morse lesen, Länge, jeden n-ten Buchstaben … Dazu kommt der Platz in einer Reihenfolge.'
  },
  {
    ziel: 'zelle',
    titel: 'Zellen',
    text: 'Du tippst hinein, drückst Enter und bist in der nächsten Zeile. Jede Zelle rechnet nur aus ihrer eigenen Zeile.'
  },
  {
    ziel: 'zellenbox',
    oeffne: 'zelle',
    titel: 'Die Zellenbox',
    text: 'Zur gewählten Zelle findest du hier die Codetafel zum Antippen, wenn die Spalte eine hat, dazu die Analyse und Kopieren. Tippst du daneben, geht die Box wieder zu.'
  },
  {
    ziel: 'spaltenkopf',
    titel: 'Spaltenkopf',
    text: 'Tippst du auf den Kopf einer Spalte, öffnen sich ihre Einstellungen.'
  },
  {
    ziel: 'spalteneinstellung',
    oeffne: 'einstellung',
    titel: 'Spalteneinstellung',
    text: 'Bei einer Eingabe wählst du die Codetafel – Morse, Braille, Flaggen … –, und was schon drinsteht, wird umgewandelt. Bei einem Werkzeug wählst du, welches, woraus und mit welchen Optionen. Zahlen und Texte kannst du je Zeile aus einer anderen Spalte holen.'
  },
  {
    ziel: 'sortieren',
    titel: 'Sortieren',
    text: 'Damit sortierst du nur die Anzeige, kein Wert ändert sich. Soll der Platz in die Rechnung eingehen, nimm eine Spalte „Platz in einer Reihenfolge“.'
  },
  {
    ziel: 'tabelle',
    titel: 'In Tabelle kopieren',
    text: 'Hier kopierst du die ganze Werkbank für Excel oder Google Sheets. Werkzeuge werden zu Formeln, wo es geht; Codes und alles andere kommen als Text. Füge alles in Zelle A1 ein.'
  },
  {
    titel: 'Los geht’s',
    text: 'Am besten lernst du es an einem Rätsel: Unter „Mehr“ warten Übungen, samt Lösungsweg als fertige Werkbank. Diese Tour gibt es jederzeit wieder im Menü ☰ oben rechts.'
  }
];

const GESEHEN = 'huntkit:tour-werkbank';

/** Hat dieses Gerät die Tour schon gezeigt? Ohne Speicher gilt: ja – lieber keine ungefragte Tour. */
export function tourGesehen(): boolean {
  try {
    return localStorage.getItem(GESEHEN) !== null;
  } catch {
    return true;
  }
}

export function merkeTourGesehen(): void {
  try {
    localStorage.setItem(GESEHEN, '1');
  } catch {
    // Dann kommt sie eben beim nächsten Mal noch einmal.
  }
}
