/**
 * Umlaute schon beim Tippen auflösen: Aus „Größe“ wird noch im Feld „Groesse“.
 * So steht in der Zelle, was die Nachtschicht als Lösung erwartet, und jedes
 * Werkzeug danach zählt und verschiebt dieselben Buchstaben, die man sieht.
 *
 * Eine Vorliebe des Geräts, kein Teil des Blatts: Wer sie ausschaltet, will
 * das beim nächsten Blatt auch nicht wieder einschalten müssen – und ein
 * geteilter Link soll niemandem die eigene Tippgewohnheit umstellen.
 */

const SCHLUESSEL = 'huntkit:umlaute-aufloesen';

export function umlauteAufloesenGespeichert(): boolean {
  try {
    return localStorage.getItem(SCHLUESSEL) !== 'nein';
  } catch {
    // Ohne Speicher gilt der Standard: an.
    return true;
  }
}

export function speichereUmlauteAufloesen(an: boolean): void {
  try {
    localStorage.setItem(SCHLUESSEL, an ? 'ja' : 'nein');
  } catch {
    // Dann gilt die Wahl eben nur bis zum Neuladen.
  }
}

const KLEIN: Readonly<Record<string, string>> = { ä: 'ae', ö: 'oe', ü: 'ue' };
const GROSS: Readonly<Record<string, string>> = { Ä: 'A', Ö: 'O', Ü: 'U' };

const istGross = (z: string | undefined) => z !== undefined && /\p{Lu}/u.test(z);
const istKlein = (z: string | undefined) => z !== undefined && /\p{Ll}/u.test(z);
const istBuchstabe = (z: string | undefined) => z !== undefined && /\p{L}/u.test(z);

/**
 * Umlaute auflösen, während noch getippt wird.
 *
 * Groß oder klein entscheidet der Nachbar, nicht der ganze Text: In
 * „Größe STRAßE“ ist das erste ß ein ss, das zweite ein SS. Und ein großer
 * Umlaut am Wortanfang wird erst aufgelöst, wenn der nächste Buchstabe da
 * ist – erst der zeigt, ob „Übel“ (Ue) oder „ÜBEL“ (UE) gemeint ist. Bis
 * dahin bleibt das Ü stehen; mit `fertig` (das Feld wird verlassen) oder
 * nach einem Leerzeichen gilt ein allein stehendes Ü als UE.
 */
export function umlauteBeimTippen(text: string, fertig = false): string {
  const zeichen = [...text];
  let heraus = '';
  for (let i = 0; i < zeichen.length; i++) {
    const z = zeichen[i] as string;
    const davor = zeichen[i - 1];
    const danach = zeichen[i + 1];
    const klein = KLEIN[z];
    const gross = GROSS[z];
    if (klein !== undefined) {
      heraus += klein;
    } else if (z === 'ß' || z === 'ẞ') {
      // Das ß beginnt kein Wort; der Buchstabe davor sagt fast immer genug.
      heraus += istKlein(davor) || istKlein(danach) ? 'ss' : 'SS';
    } else if (gross !== undefined) {
      if (istBuchstabe(danach)) heraus += gross + (istKlein(danach) ? 'e' : 'E');
      else if (istGross(davor)) heraus += gross + 'E';
      else if (istKlein(davor)) heraus += gross + 'e';
      else if (fertig || danach !== undefined) heraus += gross + 'E';
      else heraus += z;
    } else {
      heraus += z;
    }
  }
  return heraus;
}

/**
 * Schreibt den Inhalt eines Eingabefelds um und lässt die Schreibmarke dort,
 * wo getippt wurde. Ohne das spränge sie bei jedem Umlaut ans Ende – wer
 * mitten im Wort korrigiert, tippt sonst hinten weiter.
 *
 * Die Marke rückt um so viel nach, wie der Text länger geworden ist. Das
 * stimmt, weil beim Tippen nur vor der Marke etwas hinzukommt.
 */
export function feldUmschreiben(
  feld: HTMLInputElement | HTMLTextAreaElement,
  fertig = false
): string {
  const alt = feld.value;
  const neu = umlauteBeimTippen(alt, fertig);
  if (neu === alt) return alt;
  const marke = feld.selectionStart;
  feld.value = neu;
  if (marke !== null) {
    const stelle = marke + (neu.length - alt.length);
    feld.setSelectionRange(stelle, stelle);
  }
  return neu;
}
