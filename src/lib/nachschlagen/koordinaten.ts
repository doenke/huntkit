/**
 * Koordinaten umrechnen.
 *
 * Die Nachtschicht gibt Standorte im Format (X)XX°XX.XXX an – Grad und
 * Dezimalminuten. Genau das ist die Schreibweise, die auf Handys am seltensten
 * voreingestellt ist, deshalb steht sie hier an erster Stelle.
 */

export interface Punkt {
  breite: number;
  laenge: number;
}

function teile(wert: number) {
  const betrag = Math.abs(wert);
  const grad = Math.floor(betrag);
  const minutenGesamt = (betrag - grad) * 60;
  const minuten = Math.floor(minutenGesamt);
  const sekunden = (minutenGesamt - minuten) * 60;
  return { grad, minutenGesamt, minuten, sekunden, negativ: wert < 0 };
}

/** Grad mit Dezimalminuten: 51°30.789 – die Schreibweise der Nachtschicht. */
export function alsGradMinuten(wert: number, istBreite: boolean): string {
  const { grad, minutenGesamt, negativ } = teile(wert);
  const richtung = istBreite ? (negativ ? 'S' : 'N') : negativ ? 'W' : 'E';
  return `${richtung} ${grad}°${minutenGesamt.toFixed(3).padStart(6, '0')}`;
}

/** Grad, Minuten, Sekunden: 51°30'47.3" */
export function alsGradMinutenSekunden(wert: number, istBreite: boolean): string {
  const { grad, minuten, sekunden, negativ } = teile(wert);
  const richtung = istBreite ? (negativ ? 'S' : 'N') : negativ ? 'W' : 'E';
  return `${richtung} ${grad}°${String(minuten).padStart(2, '0')}'${sekunden.toFixed(1).padStart(4, '0')}"`;
}

/** Dezimalgrad: 51.51315 */
export function alsDezimalgrad(wert: number): string {
  return wert.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Der Punkt auf OpenStreetMap: mit Markierung genau dort und so nah
 * herangezoomt, dass man Straße und Hausnummer erkennt. Die Nachtschicht gibt
 * Standorte auf etwa zwei Meter genau an – Zoom 18 zeigt das.
 */
export function osmLink({ breite, laenge }: Punkt): string {
  const b = alsDezimalgrad(breite);
  const l = alsDezimalgrad(laenge);
  return `https://www.openstreetmap.org/?mlat=${b}&mlon=${l}#map=18/${b}/${l}`;
}

/**
 * Liest eine Koordinate in allen drei gängigen Schreibweisen. Erkannt wird an
 * der Anzahl der Zahlen: eine ist Dezimalgrad, zwei sind Grad und Minuten,
 * drei sind Grad, Minuten und Sekunden.
 */
export function leseZahl(text: string): number | null {
  const sauber = text.trim();
  if (sauber.length === 0) return null;
  const negativ = /^-|[SWsw]/.test(sauber.replace(/[^-SWsw\d]/g, '').slice(0, 1))
    || /[SWsw]/.test(sauber);
  const zahlen = (sauber.match(/\d+(?:[.,]\d+)?/g) ?? []).map((z) => Number(z.replace(',', '.')));
  if (zahlen.length === 0 || zahlen.length > 3) return null;

  const grad = zahlen[0] as number;
  const minuten = zahlen[1] ?? 0;
  const sekunden = zahlen[2] ?? 0;
  if (minuten >= 60 || sekunden >= 60) return null;

  const betrag = grad + minuten / 60 + sekunden / 3600;
  return negativ ? -betrag : betrag;
}

export interface Lesung {
  punkt: Punkt;
  /** Was erkannt wurde – zur Kontrolle, nicht zur Zierde. */
  form: 'dezimalgrad' | 'gradminuten' | 'gradminutensekunden';
}

export function lese(eingabe: string): Lesung | null {
  // Breite und Länge trennen: an Komma, Semikolon oder am Wechsel der Richtung.
  const getrennt = eingabe.split(/[;,]|(?<=[\d"'])\s+(?=[NSEWnsew\d-])/);
  const teile = getrennt.map((t) => t.trim()).filter((t) => t.length > 0);
  if (teile.length < 2) return null;

  const breite = leseZahl(teile[0] as string);
  const laenge = leseZahl(teile.slice(1).join(' '));
  if (breite === null || laenge === null) return null;
  if (Math.abs(breite) > 90 || Math.abs(laenge) > 180) return null;

  const zahlenImErsten = (teile[0] as string).match(/\d+(?:[.,]\d+)?/g)?.length ?? 1;
  const form =
    zahlenImErsten >= 3 ? 'gradminutensekunden' : zahlenImErsten === 2 ? 'gradminuten' : 'dezimalgrad';
  return { punkt: { breite, laenge }, form };
}
