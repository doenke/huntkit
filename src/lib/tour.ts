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
    text: 'Hier löst du Rätsel – als Tabelle. Ein Tipp auf den Namen öffnet die Verwaltung: Werkbänke wechseln, neu anlegen, kopieren und per Link ans Team schicken.'
  },
  {
    ziel: 'neue-zeile',
    titel: 'Zeilen',
    text: 'Eine Zeile je Fundstück: eine Station, ein Foto, ein Wort. Neue Zeilen gibt es hier – oder einfach mit Enter in der letzten Zeile.'
  },
  {
    ziel: 'neue-spalte',
    titel: 'Spalten',
    text: 'Eingabe für das, was du abtippst. Werkzeug für alles, was aus einer anderen Spalte gerechnet wird: Morse lesen, Länge, jeden n-ten Buchstaben … Und Platz in einer Reihenfolge.'
  },
  {
    ziel: 'zelle',
    titel: 'Zellen',
    text: 'Hineintippen, Enter, weiter in der nächsten Zeile. Jede Zelle rechnet nur aus ihrer eigenen Zeile.'
  },
  {
    ziel: 'zellenbox',
    oeffne: 'zelle',
    titel: 'Die Zellenbox',
    text: 'Zur gewählten Zelle: die Codetafel zum Antippen, wenn die Spalte eine hat, dazu Analyse und kopieren. Ein Tipp daneben schließt sie wieder.'
  },
  {
    ziel: 'spaltenkopf',
    titel: 'Spaltenkopf',
    text: 'Ein Tipp auf den Kopf einer Spalte öffnet ihre Einstellungen.'
  },
  {
    ziel: 'spalteneinstellung',
    oeffne: 'einstellung',
    titel: 'Spalteneinstellung',
    text: 'Bei einer Eingabe wählst du die Codetafel – Morse, Braille, Flaggen … –, und was schon drinsteht, wird umgewandelt. Bei einem Werkzeug: welches, woraus, mit welchen Optionen. Zahlen und Texte dürfen je Zeile aus einer anderen Spalte kommen.'
  },
  {
    ziel: 'sortieren',
    titel: 'Sortieren',
    text: 'Sortiert nur die Anzeige, kein Wert ändert sich. Soll der Platz in die Rechnung eingehen, nimm eine Spalte „Platz in einer Reihenfolge“.'
  },
  {
    titel: 'Los geht’s',
    text: 'Am besten lernst du es an einem Rätsel: Unter „Mehr“ warten Übungen, samt Lösungsweg als fertige Werkbank. Diese Tour gibt es jederzeit wieder über das ? neben „+ Zeile“.'
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
