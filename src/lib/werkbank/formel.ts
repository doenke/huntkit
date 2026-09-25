/**
 * Formeln für Tabellenkalkulationen – als Baum, damit dieselbe Formel in
 * mehreren Sprachen herauskommt und sich vorher nachrechnen lässt.
 *
 * Nachgerechnet wird, weil Excel anders rechnet als JavaScript: `=` achtet
 * nicht auf Groß- und Kleinschreibung, `LEN` zählt UTF-16-Einheiten, `UPPER`
 * lässt das ß stehen. Der Export nimmt eine Formel nur, wenn sie hier dasselbe
 * ergibt wie die Werkbank – sonst den festen Text. Eine Formel, die in der
 * Tabelle etwas anderes ausrechnet als die App, wäre schlimmer als keine.
 *
 * Der Rechner kennt genau die Funktionen, die der Export verwendet, und bildet
 * deren Verhalten in Excel nach (Google Sheets verhält sich bei ihnen gleich).
 */

export type Ausdruck =
  | { t: 'zahl'; w: number }
  | { t: 'text'; w: string }
  | { t: 'wahr'; w: boolean }
  | { t: 'zelle'; spalte: number; zeile: number; festeZeile?: boolean }
  | { t: 'bereich'; spalte: number; von: number; bis: number; festesEnde?: boolean }
  | { t: 'f'; name: Funktion; args: Ausdruck[] }
  | { t: 'op'; op: Operator; l: Ausdruck; r: Ausdruck }
  | { t: 'minus'; x: Ausdruck };

export type Operator = '&' | '+' | '-' | '*' | '/' | '=' | '<>' | '<' | '>' | '<=' | '>=';

/** Die Funktionen des Exports, mit ihrem Namen im deutschen Excel. */
export const DEUTSCH = {
  ABS: 'ABS',
  ARABIC: 'ARABISCH',
  BASE: 'BASIS',
  COUNTIF: 'ZÄHLENWENN',
  DECIMAL: 'DEZIMAL',
  EXACT: 'IDENTISCH',
  FIND: 'FINDEN',
  IF: 'WENN',
  IFERROR: 'WENNFEHLER',
  INT: 'GANZZAHL',
  LEN: 'LÄNGE',
  LOWER: 'KLEIN',
  MID: 'TEIL',
  MOD: 'REST',
  ROMAN: 'RÖMISCH',
  SEQUENCE: 'SEQUENZ',
  SUBSTITUTE: 'WECHSELN',
  SUMPRODUCT: 'SUMMENPRODUKT',
  TEXTJOIN: 'TEXTVERKETTEN',
  TRIM: 'GLÄTTEN',
  UNICHAR: 'UNIZEICHEN',
  UNICODE: 'UNICODE',
  UPPER: 'GROSS'
} as const;

export type Funktion = keyof typeof DEUTSCH;

/* ---------- Bausteine ---------- */

export const zahl = (w: number): Ausdruck => ({ t: 'zahl', w });
export const text = (w: string): Ausdruck => ({ t: 'text', w });
export const wahr = (w: boolean): Ausdruck => ({ t: 'wahr', w });
export const f = (name: Funktion, ...args: Ausdruck[]): Ausdruck => ({ t: 'f', name, args });
export const op = (o: Operator, l: Ausdruck, r: Ausdruck): Ausdruck => ({ t: 'op', op: o, l, r });
export const minus = (x: Ausdruck): Ausdruck => ({ t: 'minus', x });
export const zelle = (spalte: number, zeile: number): Ausdruck => ({ t: 'zelle', spalte, zeile });
export const verkette = (...teile: Ausdruck[]): Ausdruck =>
  teile.reduce((links, rechts) => op('&', links, rechts));

/* ---------- Ausgabe ---------- */

export type Ziel = 'excel-de' | 'excel-en' | 'sheets-de' | 'sheets-en';

export const ZIELE: ReadonlyArray<{ id: Ziel; titel: string }> = [
  { id: 'excel-de', titel: 'Excel, deutsch' },
  { id: 'excel-en', titel: 'Excel, englisch' },
  { id: 'sheets-de', titel: 'Google Sheets, deutsch' },
  { id: 'sheets-en', titel: 'Google Sheets, englisch' }
];

export function spaltenbuchstabe(spalte: number): string {
  let rest = spalte + 1;
  let heraus = '';
  while (rest > 0) {
    const ziffer = (rest - 1) % 26;
    heraus = String.fromCharCode(65 + ziffer) + heraus;
    rest = Math.floor((rest - 1) / 26);
  }
  return heraus;
}

/** Zeilen und Spalten zählen hier ab 0; im Blatt heißt Zeile 0 „1“. */
export function adresse(spalte: number, zeile: number, festeZeile = false): string {
  return `${spaltenbuchstabe(spalte)}${festeZeile ? '$' : ''}${zeile + 1}`;
}

/** Ein Text als Formelteil. Excel nimmt höchstens 255 Zeichen am Stück. */
function textliteral(w: string): string {
  const stuecke: string[] = [];
  for (let i = 0; i < w.length || stuecke.length === 0; i += 250) {
    stuecke.push(`"${w.slice(i, i + 250).replace(/"/g, '""')}"`);
  }
  return stuecke.length === 1 ? (stuecke[0] as string) : `(${stuecke.join('&')})`;
}

const RANG: Record<Operator, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4 };

export function alsText(a: Ausdruck, ziel: Ziel): string {
  const deutsch = ziel === 'excel-de';
  const trenner = ziel === 'excel-en' || ziel === 'sheets-en' ? ',' : ';';
  const aus = (x: Ausdruck, umgebung = 0): string => {
    switch (x.t) {
      case 'zahl':
        return x.w < 0 ? `(${x.w})` : String(x.w);
      case 'text':
        return textliteral(x.w);
      case 'wahr':
        return deutsch ? (x.w ? 'WAHR' : 'FALSCH') : x.w ? 'TRUE' : 'FALSE';
      case 'zelle':
        return adresse(x.spalte, x.zeile, x.festeZeile);
      case 'bereich':
        return `${adresse(x.spalte, x.von, true)}:${adresse(x.spalte, x.bis, x.festesEnde)}`;
      case 'minus':
        return `-${aus(x.x, 5)}`;
      case 'f':
        return `${deutsch ? DEUTSCH[x.name] : x.name}(${x.args.map((y) => aus(y)).join(trenner)})`;
      case 'op': {
        const rang = RANG[x.op];
        // Links gleichrangig ohne Klammer, rechts mit: a-b-c bleibt (a-b)-c.
        const innen = `${aus(x.l, rang)}${x.op}${aus(x.r, rang + 0.5)}`;
        return rang < umgebung ? `(${innen})` : innen;
      }
    }
  };
  const formel = aus(a);
  // Google Sheets rechnet mit Listen nur innerhalb von ARRAYFORMULA; Excel von selbst.
  const mitListe = ziel.startsWith('sheets') && enthaelt(a, 'SEQUENCE');
  return `=${mitListe ? `ARRAYFORMULA(${formel})` : formel}`;
}

function enthaelt(a: Ausdruck, name: Funktion): boolean {
  if (a.t === 'f') return a.name === name || a.args.some((x) => enthaelt(x, name));
  if (a.t === 'op') return enthaelt(a.l, name) || enthaelt(a.r, name);
  if (a.t === 'minus') return enthaelt(a.x, name);
  return false;
}

export function laenge(a: Ausdruck, ziel: Ziel): number {
  return alsText(a, ziel).length;
}

/* ---------- Nachrechnen ---------- */

export class Fehlerwert {
  constructor(readonly art: string) {}
}

export type Einzelwert = number | string | boolean | Fehlerwert;
export type Wert = Einzelwert | Einzelwert[];

/** Woher die Zellen kommen: der Wert, den die Zelle im Blatt hätte. */
export type Blattwerte = (spalte: number, zeile: number) => Einzelwert;

/**
 * Wo sich Programme unterscheiden könnten, rechnet der Export beide Wege
 * nach und nimmt die Formel nur, wenn beide stimmen. Bisher ist das einer:
 * ob GROSS("ß") das ß stehen lässt (so beschreibt es Excel) oder SS daraus
 * macht (so rechnet etwa JavaScript).
 */
export interface Rechenweise {
  szGross: 'ß' | 'SS';
}

export const RECHENWEISEN: ReadonlyArray<Rechenweise> = [{ szGross: 'ß' }, { szGross: 'SS' }];

let weise: Rechenweise = { szGross: 'ß' };

const WERT = new Fehlerwert('#WERT!');
const ZAHL = new Fehlerwert('#ZAHL!');

const istFehler = (w: unknown): w is Fehlerwert => w instanceof Fehlerwert;

function alsZeichen(w: Einzelwert): string | Fehlerwert {
  if (istFehler(w)) return w;
  if (typeof w === 'boolean') return w ? 'TRUE' : 'FALSE';
  return typeof w === 'number' ? zahlAlsText(w) : w;
}

export function zahlAlsText(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(15)));
}

function alsZahl(w: Einzelwert): number | Fehlerwert {
  if (istFehler(w)) return w;
  if (typeof w === 'number') return w;
  if (typeof w === 'boolean') return w ? 1 : 0;
  const sauber = w.trim();
  if (!/^[+-]?(\d+([.]\d*)?|[.]\d+)$/.test(sauber)) return WERT;
  return Number(sauber);
}

function alsWahr(w: Einzelwert): boolean | Fehlerwert {
  if (istFehler(w)) return w;
  if (typeof w === 'boolean') return w;
  if (typeof w === 'number') return w !== 0;
  const g = w.toUpperCase();
  if (g === 'TRUE') return true;
  if (g === 'FALSE') return false;
  return WERT;
}

/** Excel ändert ein Zeichen nur, wenn daraus wieder genau ein Zeichen wird – das ß bleibt. */
function zeichenweise(s: string, wandel: (z: string) => string): string {
  return [...s].map((z) => {
    const neu = wandel(z);
    return [...neu].length === 1 ? neu : z;
  }).join('');
}

/** Wendet f auf Einzelwerte an; ist ein Argument eine Liste, für jedes Element. */
function jeElement(args: Wert[], fn: (...xs: Einzelwert[]) => Einzelwert): Wert {
  const laengen = args.filter(Array.isArray).map((a) => a.length);
  if (laengen.length === 0) return fn(...(args as Einzelwert[]));
  const n = Math.max(...laengen);
  return Array.from({ length: n }, (_, i) =>
    fn(...args.map((a) => (Array.isArray(a) ? (a[i] ?? new Fehlerwert('#NV')) : a)))
  );
}

function flach(w: Wert): Einzelwert[] {
  return Array.isArray(w) ? w : [w];
}

function vergleiche(a: Einzelwert, b: Einzelwert): number | Fehlerwert {
  if (istFehler(a)) return a;
  if (istFehler(b)) return b;
  // Zahl vor Text vor Wahrheitswert – wie in Excel.
  const rang = (x: Einzelwert) => (typeof x === 'number' ? 0 : typeof x === 'string' ? 1 : 2);
  if (rang(a) !== rang(b)) return rang(a) - rang(b);
  if (typeof a === 'string' && typeof b === 'string') {
    const x = a.toUpperCase();
    const y = b.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return Number(a) - Number(b);
}

const ROEMISCH: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];

function roemisch(n: number): Einzelwert {
  const ganz = Math.trunc(n);
  if (ganz < 0 || ganz > 3999) return WERT;
  let rest = ganz;
  let heraus = '';
  for (const [wert, zeichen] of ROEMISCH) {
    while (rest >= wert) {
      heraus += zeichen;
      rest -= wert;
    }
  }
  return heraus;
}

function arabisch(s: string): Einzelwert {
  let sauber = s.trim().toUpperCase();
  const negativ = sauber.startsWith('-');
  if (negativ) sauber = sauber.slice(1);
  if (sauber.length > 255 || !/^[MDCLXVI]*$/.test(sauber)) return WERT;
  const werte: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let summe = 0;
  for (let i = 0; i < sauber.length; i++) {
    const jetzt = werte[sauber[i] as string] as number;
    const naechst = werte[sauber[i + 1] as string] ?? 0;
    summe += naechst > jetzt ? -jetzt : jetzt;
  }
  return negativ ? -summe : summe;
}

const ZIFFERN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function basis(n: number, radix: number): Einzelwert {
  if (!Number.isInteger(radix) || radix < 2 || radix > 36) return ZAHL;
  const ganz = Math.trunc(n);
  if (ganz < 0 || ganz >= 2 ** 53) return ZAHL;
  return ganz.toString(radix).toUpperCase();
}

function dezimal(s: string, radix: number): Einzelwert {
  if (!Number.isInteger(radix) || radix < 2 || radix > 36) return ZAHL;
  const sauber = s.toUpperCase();
  if (sauber.length === 0 || sauber.length > 255) return ZAHL;
  let wert = 0;
  for (const z of sauber) {
    const ziffer = ZIFFERN.indexOf(z);
    if (ziffer < 0 || ziffer >= radix) return ZAHL;
    wert = wert * radix + ziffer;
  }
  return wert >= 2 ** 53 ? ZAHL : wert;
}

/** ZÄHLENWENN mit einem Vergleich wie "<5" oder einem Wert – nur für Zahlen ausgelegt. */
function zaehleWenn(bereich: Einzelwert[], kriterium: Einzelwert): Einzelwert {
  if (istFehler(kriterium)) return kriterium;
  const k = typeof kriterium === 'number' ? `=${kriterium}` : String(kriterium);
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(k);
  const vergleich = m?.[1] ?? '=';
  const ziel = Number(m?.[2]);
  if (!Number.isFinite(ziel) || (m?.[2] ?? '').trim() === '') return WERT;
  return bereich.filter((w) => {
    if (typeof w !== 'number') return false;
    switch (vergleich) {
      case '<': return w < ziel;
      case '>': return w > ziel;
      case '<=': return w <= ziel;
      case '>=': return w >= ziel;
      case '<>': return w !== ziel;
      default: return w === ziel;
    }
  }).length;
}

export function rechne(a: Ausdruck, blatt: Blattwerte, rechenweise: Rechenweise = RECHENWEISEN[0] as Rechenweise): Wert {
  const vorher = weise;
  weise = rechenweise;
  try {
    return rechneMit(a, blatt);
  } finally {
    weise = vorher;
  }
}

function rechneMit(a: Ausdruck, blatt: Blattwerte): Wert {
  switch (a.t) {
    case 'zahl':
    case 'text':
    case 'wahr':
      return a.w;
    case 'zelle':
      return blatt(a.spalte, a.zeile);
    case 'bereich': {
      const werte: Einzelwert[] = [];
      for (let z = a.von; z <= a.bis; z++) werte.push(blatt(a.spalte, z));
      return werte;
    }
    case 'minus':
      return jeElement([rechneMit(a.x, blatt)], (x) => {
        const n = alsZahl(x);
        return istFehler(n) ? n : -n;
      });
    case 'op':
      return jeElement([rechneMit(a.l, blatt), rechneMit(a.r, blatt)], (l, r) => rechneOp(a.op, l, r));
    case 'f':
      return rechneFunktion(a.name, a.args, blatt);
  }
}

function rechneOp(o: Operator, l: Einzelwert, r: Einzelwert): Einzelwert {
  if (o === '&') {
    const x = alsZeichen(l);
    const y = alsZeichen(r);
    if (istFehler(x)) return x;
    if (istFehler(y)) return y;
    return x + y;
  }
  if (o === '+' || o === '-' || o === '*' || o === '/') {
    const x = alsZahl(l);
    const y = alsZahl(r);
    if (istFehler(x)) return x;
    if (istFehler(y)) return y;
    if (o === '/' && y === 0) return new Fehlerwert('#DIV/0!');
    return o === '+' ? x + y : o === '-' ? x - y : o === '*' ? x * y : x / y;
  }
  const v = vergleiche(l, r);
  if (istFehler(v)) return v;
  switch (o) {
    case '=': return v === 0;
    case '<>': return v !== 0;
    case '<': return v < 0;
    case '>': return v > 0;
    case '<=': return v <= 0;
    default: return v >= 0;
  }
}

function rechneFunktion(name: Funktion, args: Ausdruck[], blatt: Blattwerte): Wert {
  const w = (i: number): Wert => (args[i] ? rechneMit(args[i] as Ausdruck, blatt) : new Fehlerwert('#NV'));

  // Die beiden, die nicht alle Argumente brauchen – Excel rechnet den
  // anderen Zweig gar nicht erst aus.
  if (name === 'IF') {
    const bedingung = w(0);
    if (!Array.isArray(bedingung)) {
      const b = alsWahr(bedingung);
      if (istFehler(b)) return b;
      return b ? w(1) : args[2] ? w(2) : false;
    }
    const ja = w(1);
    const nein = args[2] ? w(2) : false;
    return jeElement([bedingung, ja, nein], (c, x, y) => {
      const b = alsWahr(c);
      return istFehler(b) ? b : b ? x : y;
    });
  }
  if (name === 'IFERROR') {
    const wert = w(0);
    if (!Array.isArray(wert)) return istFehler(wert) ? w(1) : wert;
    const sonst = w(1);
    return jeElement([wert, sonst], (x, y) => (istFehler(x) ? y : x));
  }

  if (name === 'TEXTJOIN') {
    const trenner = w(0);
    const leerAuslassen = w(1);
    if (Array.isArray(trenner) || Array.isArray(leerAuslassen)) return WERT;
    const t = alsZeichen(trenner);
    const auslassen = alsWahr(leerAuslassen);
    if (istFehler(t)) return t;
    if (istFehler(auslassen)) return auslassen;
    const teile: string[] = [];
    for (let i = 2; i < args.length; i++) {
      for (const x of flach(w(i))) {
        const s = alsZeichen(x);
        if (istFehler(s)) return s;
        if (auslassen && s === '') continue;
        teile.push(s);
      }
    }
    return teile.join(t);
  }
  if (name === 'SUMPRODUCT') {
    let summe = 0;
    for (const x of flach(w(0))) {
      if (istFehler(x)) return x;
      // Text und Wahrheitswerte zählen in SUMMENPRODUKT als 0.
      if (typeof x === 'number') summe += x;
    }
    return summe;
  }
  if (name === 'SEQUENCE') {
    const [zeilen, spalten, start, schritt] = [w(0), args[1] ? w(1) : 1, args[2] ? w(2) : 1, args[3] ? w(3) : 1].map((x) =>
      Array.isArray(x) ? WERT : alsZahl(x)
    );
    for (const x of [zeilen, spalten, start, schritt]) if (istFehler(x)) return x;
    const n = Math.trunc(zeilen as number) * Math.trunc(spalten as number);
    if (n < 1) return new Fehlerwert('#KALK!');
    return Array.from({ length: n }, (_, i) => (start as number) + i * (schritt as number));
  }
  if (name === 'COUNTIF') {
    const bereich = w(0);
    return jeElement([w(1)], (k) => zaehleWenn(flach(bereich), k));
  }

  const werte = args.map((_, i) => w(i));
  return jeElement(werte, (...xs) => {
    for (const x of xs) if (istFehler(x)) return x;
    const s = (i: number) => alsZeichen(xs[i] as Einzelwert) as string;
    const n = (i: number) => alsZahl(xs[i] as Einzelwert);
    switch (name) {
      case 'LEN':
        return s(0).length;
      case 'UPPER':
        return zeichenweise(s(0), (z) => z.toUpperCase()).replace(/ß/g, weise.szGross);
      case 'LOWER':
        return zeichenweise(s(0), (z) => z.toLowerCase());
      case 'TRIM':
        return s(0).replace(/ +/g, ' ').replace(/^ | $/g, '');
      case 'EXACT':
        return s(0) === s(1);
      case 'MID': {
        const start = n(1);
        const anzahl = n(2);
        if (istFehler(start)) return start;
        if (istFehler(anzahl)) return anzahl;
        if (start < 1 || anzahl < 0) return WERT;
        return s(0).substr(Math.trunc(start) - 1, Math.trunc(anzahl));
      }
      case 'SUBSTITUTE': {
        const alt = s(1);
        return alt === '' ? s(0) : s(0).split(alt).join(s(2));
      }
      case 'FIND': {
        const gefunden = s(1).indexOf(s(0));
        return gefunden < 0 ? WERT : gefunden + 1;
      }
      case 'UNICODE': {
        const z = s(0);
        return z === '' ? WERT : (z.codePointAt(0) as number);
      }
      case 'UNICHAR': {
        const c = n(0);
        if (istFehler(c)) return c;
        return c < 1 || c > 0x10ffff ? WERT : String.fromCodePoint(Math.trunc(c));
      }
      case 'MOD': {
        const a = n(0);
        const b = n(1);
        if (istFehler(a)) return a;
        if (istFehler(b)) return b;
        if (b === 0) return new Fehlerwert('#DIV/0!');
        return a - b * Math.floor(a / b);
      }
      case 'INT': {
        const a = n(0);
        return istFehler(a) ? a : Math.floor(a);
      }
      case 'ABS': {
        const a = n(0);
        return istFehler(a) ? a : Math.abs(a);
      }
      case 'ROMAN': {
        const a = n(0);
        return istFehler(a) ? a : roemisch(a);
      }
      case 'ARABIC':
        return arabisch(s(0));
      case 'BASE': {
        const a = n(0);
        const b = n(1);
        if (istFehler(a)) return a;
        if (istFehler(b)) return b;
        return basis(a, b);
      }
      case 'DECIMAL': {
        const b = n(1);
        return istFehler(b) ? b : dezimal(s(0), b);
      }
      default:
        return new Fehlerwert('#NAME?');
    }
  });
}

/** Was die Zelle anzeigen würde – zum Vergleich mit der Werkbank. */
export function anzeige(w: Wert): string | null {
  if (Array.isArray(w)) return null;
  if (istFehler(w)) return null;
  if (typeof w === 'boolean') return null;
  return typeof w === 'number' ? zahlAlsText(w) : w;
}
