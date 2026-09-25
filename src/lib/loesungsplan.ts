/**
 * Lösungswörter einem Wortgitter zuordnen.
 *
 * Rätselrallyes und Bilderrätsel bestehen aus vielen kleinen Rätseln, die je
 * ein Lösungswort ergeben. Im Gitter sieht man zunächst nur, wie lang die
 * gesuchten Wörter sind. Wer eines gefunden hat, muss also erst die Lücke
 * finden, in die es gehört – und darf es nur eintragen, wenn es dafür nur
 * eine Möglichkeit gibt. Genau das rechnet dieser Teil aus.
 *
 * Er steht bewusst für sich: kein Codec, keine Werkbank, keine Erkennung.
 */

export interface Wort {
  id: string;
  /** Wie eingetippt – die Anzeige zeigt die Buchstaben daraus. */
  text: string;
  /** Schon ins Gitter übertragen; belegt damit eine Lücke. */
  eingetragen: boolean;
}

export interface Zeile {
  /** Fehlt bei einer Lücke, für die noch kein Wort gefunden ist. */
  wort: Wort | null;
  buchstaben: string[];
  /**
   * Es gibt für dieses Wort nur noch eine Lücke dieser Länge – es kann ohne
   * Rätselraten ins Gitter.
   */
  eindeutig: boolean;
}

export interface Gruppe {
  laenge: number;
  /** Lücken dieser Länge im Gitter. */
  plaetze: number;
  /** Lücken, in die noch nichts eingetragen ist. */
  offenePlaetze: number;
  /** Gefundene Wörter über die Zahl der Lücken hinaus – immer ein Fehler. */
  zuviel: number;
  zeilen: Zeile[];
}

export interface Plan {
  gruppen: Gruppe[];
  /** Wörter, deren Länge im Gitter überhaupt nicht vorkommt. */
  ohnePlatz: Wort[];
  plaetze: number;
  gefunden: number;
  eingetragen: number;
  /** Wie viele Wörter gerade eindeutig zuzuordnen sind. */
  eindeutige: number;
}

export interface Zustand {
  laengenText: string;
  woerter: Wort[];
}

/**
 * Für die Länge zählen Buchstaben – ein Gitter hat keine Felder für
 * Leerzeichen oder Bindestriche. Umlaute bleiben ein Buchstabe und bekommen
 * ein Feld; das ß wird beim Großschreiben zu SS und damit zu zwei Feldern,
 * genau wie im Rätsel. Die Anzeige nennt die gezählte Länge, damit man beides
 * sofort sieht.
 */
export function buchstaben(text: string): string[] {
  return [...text.toUpperCase()].filter((zeichen) => /\p{Letter}/u.test(zeichen));
}

export function laengeVon(text: string): number {
  return buchstaben(text).length;
}

/**
 * Die Längen kommen so, wie man sie im Gitter abzählt: „5, 7, 7, 3“. Komma,
 * Leerzeichen und Zeilenumbruch trennen gleichermaßen. Was keine Zahl ist,
 * wird nicht stillschweigend verschluckt, sondern zurückgemeldet.
 */
export function laengenLesen(text: string): { laengen: number[]; unlesbar: string[] } {
  const laengen: number[] = [];
  const unlesbar: string[] = [];
  for (const stueck of text.split(/[\s,;]+/)) {
    if (stueck.length === 0) continue;
    const zahl = Number(stueck);
    if (/^\d+$/.test(stueck) && zahl >= 1 && zahl <= 99) laengen.push(zahl);
    else unlesbar.push(stueck);
  }
  return { laengen: laengen.sort((a, b) => a - b), unlesbar };
}

/**
 * Woran man ein Lösungswort wiedererkennt: seine Buchstaben, groß. „Roter
 * Kater“ und „roterkater“ sind dasselbe Wort – im Gitter stehen sie gleich.
 */
export function wortform(text: string): string {
  return buchstaben(text).join('');
}

/** Das schon gefundene Wort mit denselben Buchstaben, falls es eins gibt. */
export function schonGefunden(woerter: ReadonlyArray<Wort>, text: string): Wort | undefined {
  const form = wortform(text);
  return form ? woerter.find((w) => wortform(w.text) === form) : undefined;
}

export function neuesWort(text: string): Wort {
  return { id: kennung(), text, eingetragen: false };
}

function kennung(): string {
  return globalThis.crypto?.randomUUID?.() ?? `w${Date.now()}${Math.random()}`;
}

/**
 * Der Plan: je Länge eine Gruppe, darin die gefundenen Wörter und die noch
 * leeren Lücken.
 *
 * Eindeutig ist ein Wort, wenn für seine Länge genau eine Lücke offen ist und
 * genau ein Wort dafür bereitsteht. Zwei Wörter auf zwei Lücken sind es nicht:
 * Welches wohin gehört, sagt erst das Gitter. Hakt man eines ab, wird das
 * andere dadurch eindeutig – deshalb rechnet das hier bei jeder Änderung neu.
 */
export function planen(laengen: ReadonlyArray<number>, woerter: ReadonlyArray<Wort>): Plan {
  const plaetzeJeLaenge = new Map<number, number>();
  for (const laenge of laengen) {
    plaetzeJeLaenge.set(laenge, (plaetzeJeLaenge.get(laenge) ?? 0) + 1);
  }

  const woerterJeLaenge = new Map<number, Wort[]>();
  const ohnePlatz: Wort[] = [];
  for (const wort of woerter) {
    const laenge = laengeVon(wort.text);
    if (laenge === 0) continue;
    if (!plaetzeJeLaenge.has(laenge)) {
      ohnePlatz.push(wort);
      continue;
    }
    const bisher = woerterJeLaenge.get(laenge);
    if (bisher) bisher.push(wort);
    else woerterJeLaenge.set(laenge, [wort]);
  }

  const gruppen = [...plaetzeJeLaenge.keys()]
    .sort((a, b) => a - b)
    .map((laenge) => gruppe(laenge, plaetzeJeLaenge.get(laenge) ?? 0, woerterJeLaenge.get(laenge) ?? []));

  return {
    gruppen,
    ohnePlatz,
    plaetze: laengen.length,
    gefunden: woerter.length,
    eingetragen: woerter.filter((w) => w.eingetragen).length,
    eindeutige: gruppen.reduce((summe, g) => summe + g.zeilen.filter((z) => z.eindeutig).length, 0)
  };
}

function gruppe(laenge: number, plaetze: number, woerter: ReadonlyArray<Wort>): Gruppe {
  const offenePlaetze = Math.max(0, plaetze - woerter.filter((w) => w.eingetragen).length);
  const offeneWoerter = woerter.filter((w) => !w.eingetragen);
  const eindeutig = offenePlaetze === 1 && offeneWoerter.length === 1;

  const zeilen: Zeile[] = woerter
    .map((wort) => ({
      wort,
      buchstaben: buchstaben(wort.text),
      eindeutig: eindeutig && !wort.eingetragen
    }))
    // Was jetzt eintragbar ist, steht oben; Erledigtes rutscht nach unten.
    .sort((a, b) => rang(a) - rang(b));

  for (let i = woerter.length; i < plaetze; i++) {
    zeilen.push({ wort: null, buchstaben: [], eindeutig: false });
  }

  return { laenge, plaetze, offenePlaetze, zuviel: Math.max(0, woerter.length - plaetze), zeilen };
}

function rang(zeile: Zeile): number {
  if (zeile.wort?.eingetragen) return 2;
  return zeile.eindeutig ? 0 : 1;
}

const SPEICHER = 'huntkit:loesungen';

export function leererZustand(): Zustand {
  return { laengenText: '', woerter: [] };
}

export function laden(): Zustand {
  try {
    const roh = localStorage.getItem(SPEICHER);
    if (!roh) return leererZustand();
    const gelesen = JSON.parse(roh) as Partial<Zustand>;
    return {
      laengenText: typeof gelesen.laengenText === 'string' ? gelesen.laengenText : '',
      woerter: Array.isArray(gelesen.woerter) ? gelesen.woerter : []
    };
  } catch {
    // Gesperrter Speicher oder kaputter Eintrag – dann eben leer anfangen.
    return leererZustand();
  }
}

export function sichern(zustand: Zustand): void {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(zustand));
  } catch {
    // Ein Rätsel ist auch ohne Speicher lösbar, nur nicht über das Neuladen hinweg.
  }
}
