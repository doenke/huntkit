import { codec as findeCodec } from '../../codecs/registry';
import { ausSpalteMoeglich, type Richtung } from '../../codecs/types';
import { rechne as rechneBlatt, spaltenname, type Blatt, type Positionsspalte, type Werkzeugspalte } from './blatt';
import {
  alsText,
  anzeige,
  f,
  op,
  rechne,
  RECHENWEISEN,
  text,
  verkette,
  wahr,
  zahl,
  zelle,
  type Ausdruck,
  type Einzelwert,
  type Ziel
} from './formel';

/**
 * Die Werkbank für Excel und Google Sheets – als Text für die
 * Zwischenablage, eine Zeile je Zeile, Tabs dazwischen. Beim Einfügen in A1
 * steht oben der Kopf, darunter die Zeilen in der Reihenfolge ihrer Eingabe.
 *
 * Werkzeugspalten werden, wo es geht, zu Formeln: „Länge“ wird LÄNGE, Caesar
 * eine Formel über die Zeichen der Quellzelle. Was sich nicht als Formel
 * schreiben lässt – Morse, Braille, alle Codes, alle Eingaben –, kommt als
 * fester Text. Jede Formel wird vorher nachgerechnet und nur genommen, wenn
 * sie genau das ergibt, was die Werkbank zeigt.
 *
 * Die Formeln brauchen Excel 2021 oder 365 (SEQUENZ, TEXTVERKETTEN) oder
 * Google Sheets.
 */

export interface Tabellenexport {
  /** Für die Zwischenablage. */
  text: string;
  zeilen: number;
  spalten: number;
  formeln: number;
  festeTexte: number;
}

/** Eine Option für die Formel: als Ausdruck und mit ihrem Wert in dieser Zeile. */
interface Option {
  a: Ausdruck;
  w: string | number;
  gebunden: boolean;
}

type Formelbauer = (x: Ausdruck, o: Record<string, Option>, richtung: Richtung) => Ausdruck | null;

const HOECHSTLAENGE = 8000;

export function tabelleFuerZwischenablage(blatt: Blatt, ziel: Ziel): Tabellenexport {
  const berechnung = rechneBlatt(blatt);
  // In der Reihenfolge der Eingabe: Die Positionsformeln entscheiden
  // Gleichstände über die Zeilen darüber, genau wie die Werkbank.
  const reihen = [...berechnung.zeilen].sort((a, b) => a.zeile.nummer - b.zeile.nummer);
  const spalten = blatt.spalten;
  const spalteNr = new Map(spalten.map((s, i) => [s.id, i]));

  /** Was die Werkbank in der Zelle zeigt; Zeile 0 ist der Kopf. */
  const soll = (s: number, z: number): string => {
    const spalte = spalten[s];
    const reihe = reihen[z - 1];
    if (!spalte || !reihe) return '';
    const zelleHier = reihe.zellen[spalte.id];
    return zelleHier && !zelleHier.fehler ? zelleHier.text : '';
  };

  /** Je Zelle: was hineinkommt und welchen Wert sie in jeder Rechenweise hätte. */
  type Inhalt = { roh: string; werte: Einzelwert[]; formel: boolean };
  const inhalt = new Map<string, Inhalt>();
  const inArbeit = new Set<string>();
  const fest = (t: string): Inhalt => {
    const e = festerInhalt(t, ziel);
    return { roh: e.roh, werte: RECHENWEISEN.map(() => e.wert), formel: false };
  };

  function entscheide(s: number, z: number): Inhalt {
    const schluessel = `${s}|${z}`;
    const fertig = inhalt.get(schluessel);
    if (fertig) return fertig;
    const sollText = z === 0 ? spaltenname(blatt, spalten[s]?.id ?? '') : soll(s, z);
    // Ein Ring kann es nicht geben – die Werkbank lässt keinen zu. Sicher ist sicher.
    if (inArbeit.has(schluessel)) return fest(sollText);
    inArbeit.add(schluessel);
    let ergebnis: Inhalt | null = null;
    const spalte = spalten[s];
    if (z > 0 && spalte && spalte.art !== 'eingabe') {
      const formel =
        spalte.art === 'werkzeug' ? werkzeugformel(spalte, s, z) : positionsformel(spalte, s, z);
      if (formel) {
        const roh = alsText(formel, ziel);
        const werte = RECHENWEISEN.map((weise, i) =>
          rechne(formel, (sp, ze) => entscheide(sp, ze).werte[i] as Einzelwert, weise)
        );
        const stimmt = werte.every((w) => !Array.isArray(w) && anzeige(w) === sollText);
        if (roh.length <= HOECHSTLAENGE && stimmt) ergebnis = { roh, werte: werte as Einzelwert[], formel: true };
      }
    }
    inArbeit.delete(schluessel);
    const heraus = ergebnis ?? fest(sollText);
    inhalt.set(schluessel, heraus);
    return heraus;
  }

  function werkzeugformel(spalte: Werkzeugspalte, s: number, z: number): Ausdruck | null {
    const gewaehlt = findeCodec(spalte.codecId);
    const bauer = FORMELN[spalte.codecId];
    const quelle = spalteNr.get(spalte.quelle);
    if (!gewaehlt || !bauer || quelle === undefined) return null;
    const x = zelle(quelle, z);
    const optionen: Record<string, Option> = {};
    const warten: Ausdruck[] = [];
    for (const spec of gewaehlt.optionen ?? []) {
      const bindung = spalte.optionen[spec.id] ?? { art: 'fest' as const, wert: spec.standard };
      if (bindung.art === 'fest' || !ausSpalteMoeglich(spec)) {
        const w = bindung.art === 'fest' ? bindung.wert : spec.standard;
        optionen[spec.id] = { a: typeof w === 'number' ? zahl(w) : text(w), w, gebunden: false };
        continue;
      }
      const nr = spalteNr.get(bindung.spalte);
      if (nr === undefined) return null;
      const roh = soll(nr, z).trim();
      const bezug = zelle(nr, z);
      // Wie die Werkbank: Der Wert kommt ohne Leerzeichen am Rand, und eine
      // leere Optionszelle lässt die Zelle leer.
      warten.push(op('=', f('TRIM', bezug), text('')));
      optionen[spec.id] = {
        // Eine Zahl als Text („03“) wäre für Vergleiche größer als jede Zahl – also ausdrücklich rechnen.
        a: spec.art === 'zahl' ? op('*', bezug, zahl(1)) : f('TRIM', bezug),
        w: spec.art === 'zahl' ? Number(roh) : roh,
        gebunden: true
      };
    }
    const kern = bauer(x, optionen, spalte.richtung);
    if (!kern) return null;
    // Leere Quelle, leere Zelle – wie in der Werkbank.
    const bedingungen = [op('=', x, text('')), ...warten];
    return bedingungen.reduceRight<Ausdruck>((innen, b) => f('IF', b, text(''), innen), kern);
  }

  function positionsformel(spalte: Positionsspalte, s: number, z: number): Ausdruck | null {
    const nach = spalte.nach;
    // Nur nach Zahlen, in einer Stufe: Das zählt ZÄHLENWENN in beiden Programmen gleich.
    if (!nach || nach.dann || nach.art !== 'zahl') return null;
    const b = spalteNr.get(nach.spalte);
    if (b === undefined || b === s) return null;
    const bezug = zelle(b, z);
    const alle: Ausdruck = { t: 'bereich', spalte: b, von: 1, bis: reihen.length, festesEnde: true };
    const bisHier: Ausdruck = { t: 'bereich', spalte: b, von: 1, bis: z };
    return f(
      'IF',
      op('=', bezug, text('')),
      text(''),
      op(
        '+',
        f('COUNTIF', alle, op('&', text(nach.richtung === 'auf' ? '<' : '>'), bezug)),
        f('COUNTIF', bisHier, bezug)
      )
    );
  }

  const zeilen: string[] = [];
  let formeln = 0;
  let festeTexte = 0;
  for (let z = 0; z <= reihen.length; z++) {
    const felder: string[] = [];
    for (let s = 0; s < spalten.length; s++) {
      const e = entscheide(s, z);
      if (z > 0 && e.roh !== '') {
        if (e.formel) formeln++;
        else festeTexte++;
      }
      felder.push(e.roh);
    }
    zeilen.push(felder.join('\t'));
  }

  return { text: zeilen.join('\n'), zeilen: reihen.length, spalten: spalten.length, formeln, festeTexte };
}

/**
 * Fester Text so, dass ihn beide Programme genau so stehen lassen. Ganze
 * Zahlen und schlichte Wörter dürfen, wie sie sind; alles andere käme
 * verändert an – „0101“ als 101, „-.-“ als Formel, „1.2“ als Datum. Das wird
 * zur Formel ="…", die nichts rechnet, sondern nur den Text hinschreibt.
 */
export function festerInhalt(roh: string, ziel: Ziel): { roh: string; wert: Einzelwert; formel: boolean } {
  const t = roh.replace(/[\t\r\n]+/g, ' ');
  if (t === '') return { roh: '', wert: '', formel: false };
  if (/^(0|-?[1-9]\d{0,14})$/.test(t)) return { roh: t, wert: Number(t), formel: false };
  if (/^\p{L}+( \p{L}+)*$/u.test(t) && !/^(true|false|wahr|falsch)$/i.test(t)) {
    return { roh: t, wert: t, formel: false };
  }
  return { roh: alsText(text(t), ziel), wert: t, formel: false };
}

/* ---------- Bausteine der Formeln ---------- */

/** Die Zeichen eines Texts als Liste: TEIL(x; SEQUENZ(LÄNGE(x)); 1). */
const zeichenVon = (x: Ausdruck) => f('MID', x, f('SEQUENCE', f('LEN', x)), zahl(1));

/**
 * 1, wenn Buchstabe: Groß- und Kleinform unterscheiden sich – oder es ist das
 * ß, das je nach Programm keine Großform hat. Über „> 0“, damit das ß nicht
 * doppelt zählt, wo es doch eine hat.
 */
const istBuchstabe = (c: Ausdruck) =>
  op(
    '*',
    op('>', op('+', op('-', zahl(1), f('EXACT', f('UPPER', c), f('LOWER', c))), op('=', f('UNICODE', c), zahl(223))), zahl(0)),
    zahl(1)
  );

const istZiffer = (c: Ausdruck) =>
  op('*', op('>=', f('UNICODE', c), zahl(48)), op('<=', f('UNICODE', c), zahl(57)));

const istBuchstabeOderZiffer = (c: Ausdruck) => op('+', istBuchstabe(c), istZiffer(c));

/** Der Text, den die Extraktionshelfer zählen: alles oder nur Buchstaben und Ziffern. */
function grundlage(x: Ausdruck, o: Record<string, Option>): Ausdruck {
  if (o.grundlage?.w === 'zeichen') return x;
  const c = zeichenVon(x);
  return f('TEXTJOIN', text(''), wahr(true), f('IF', op('>', istBuchstabeOderZiffer(c), zahl(0)), c, text('')));
}

const zusammen = (liste: Ausdruck) => f('TEXTJOIN', text(''), wahr(false), liste);

/** Umlaute auflösen wie die Werkbank: ß wird in reinem Großtext zu SS, sonst zu ss. */
function ohneUmlaute(x: Ausdruck): Ausdruck {
  const ohneSz = f('SUBSTITUTE', x, text('ß'), text(''));
  let u = f(
    'IF',
    f('EXACT', ohneSz, f('UPPER', ohneSz)),
    f('SUBSTITUTE', x, text('ß'), text('SS')),
    f('SUBSTITUTE', x, text('ß'), text('ss'))
  );
  for (const [umlaut, ersatz] of [['Ä', 'AE'], ['Ö', 'OE'], ['Ü', 'UE'], ['ä', 'ae'], ['ö', 'oe'], ['ü', 'ue']] as const) {
    u = f('SUBSTITUTE', u, text(umlaut), text(ersatz));
  }
  return u;
}

/** Jeder Buchstabe A–Z wird zu neu(code), die Schreibung bleibt; alles andere steht still. */
function buchstabenweise(x: Ausdruck, neu: (code: Ausdruck) => Ausdruck): Ausdruck {
  const u = ohneUmlaute(x);
  const c = zeichenVon(u);
  const code = f('UNICODE', f('UPPER', c));
  const az = op('*', op('>=', code, zahl(65)), op('<=', code, zahl(90)));
  const ersetzt = neu(code);
  return zusammen(f('IF', az, f('IF', f('EXACT', c, f('UPPER', c)), ersetzt, f('LOWER', ersetzt)), c));
}

/* ---------- Formeln je Werkzeug ---------- */

const FORMELN: Record<string, Formelbauer> = {
  laenge(x, o) {
    const c = zeichenVon(x);
    switch (o.was?.w) {
      case 'zeichen':
        return f('LEN', x);
      case 'ohne-leer':
        return f('LEN', f('SUBSTITUTE', x, text(' '), text('')));
      case 'woerter': {
        const t = f('TRIM', x);
        return f(
          'IF',
          op('=', t, text('')),
          zahl(0),
          op('+', op('-', f('LEN', t), f('LEN', f('SUBSTITUTE', t, text(' '), text('')))), zahl(1))
        );
      }
      case 'ziffern':
        return f('SUMPRODUCT', istZiffer(c));
      case 'buchstaben-ziffern':
        return f('SUMPRODUCT', istBuchstabeOderZiffer(c));
      case 'sonderzeichen':
        return f('SUMPRODUCT', op('*', op('=', istBuchstabeOderZiffer(c), zahl(0)), op('<>', c, text(' '))));
      default:
        return f('SUMPRODUCT', istBuchstabe(c));
    }
  },

  zaehlen(x, o) {
    const suche = o.suche;
    if (!suche || (!suche.gebunden && suche.w === '')) return null;
    const egal = o.schreibung?.w !== 'genau';
    const heuhaufen = egal ? f('LOWER', x) : x;
    const vorkommen = (nadel: Ausdruck) =>
      op('-', f('LEN', heuhaufen), f('LEN', f('SUBSTITUTE', heuhaufen, nadel, text(''))));
    if (o.art?.w === 'jedes') {
      if (suche.gebunden) return null;
      const zeichen = [...new Set(egal ? String(suche.w).toLowerCase() : String(suche.w))];
      return zeichen.map((z) => vorkommen(text(z))).reduce((a, b) => op('+', a, b));
    }
    const nadel = egal ? f('LOWER', suche.a) : suche.a;
    return op('/', vorkommen(nadel), f('LEN', nadel));
  },

  stellen(x, o) {
    const liste = o.liste;
    if (!liste || liste.gebunden) return null;
    const stellen = String(liste.w)
      .split(/[^\d-]+/)
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (stellen.length === 0) return null;
    const g = grundlage(x, o);
    return verkette(
      ...stellen.map((p) =>
        f('IFERROR', f('MID', g, p < 0 ? op('+', f('LEN', g), zahl(p + 1)) : zahl(p), zahl(1)), text(''))
      )
    );
  },

  'jedes-n'(x, o) {
    if (o.bereich?.w === 'wort') return null;
    const n = o.n;
    if (!n) return null;
    const g = grundlage(x, o);
    const vonHinten = (m: Ausdruck) => op('+', op('+', f('LEN', g), zahl(1)), m);
    if (o.modus?.w === 'einmal') {
      if (n.gebunden) {
        return f(
          'IFERROR',
          f('IF', op('<', n.a, zahl(0)), f('MID', g, vonHinten(n.a), zahl(1)), f('MID', g, n.a, zahl(1))),
          text('')
        );
      }
      const k = Number(n.w) || 1;
      return f('IFERROR', f('MID', g, k < 0 ? vonHinten(zahl(k)) : zahl(k), zahl(1)), text(''));
    }
    if (n.gebunden || o.versatz?.gebunden) return null;
    const k = Number(n.w) || 1;
    const m = Math.abs(k);
    const start = Math.max(1, Number(o.versatz?.w ?? 1));
    // Wie viele Buchstaben herauskommen – ab `start`, in Schritten von m.
    const anzahl = op('+', f('INT', op('/', op('-', f('LEN', g), zahl(start)), zahl(m))), zahl(1));
    // Von hinten: dieselben Stellen, von vorn gelesen – die erste ist die hinterste Treffer.
    const erste =
      k > 0
        ? zahl(start)
        : op('-', op('+', op('-', f('LEN', g), zahl(start)), zahl(1)), op('*', op('-', anzahl, zahl(1)), zahl(m)));
    return f(
      'IFERROR',
      f('TEXTJOIN', text(''), wahr(true), f('MID', g, f('SEQUENCE', anzahl, zahl(1), erste, zahl(m)), zahl(1))),
      text('')
    );
  },

  ersetzen(x, o) {
    const von = o.von?.a ?? text('');
    const nach = o.nach?.a ?? text('');
    const c = zeichenVon(x);
    if (o.schreibung?.w === 'genau') {
      return zusammen(f('IFERROR', f('MID', nach, f('FIND', c, von), zahl(1)), c));
    }
    const r = f('MID', nach, f('FIND', f('LOWER', c), f('LOWER', von)), zahl(1));
    const inSchreibung = f(
      'IF',
      op('-', zahl(1), f('EXACT', c, f('LOWER', c))),
      f('UPPER', r),
      f('IF', op('-', zahl(1), f('EXACT', c, f('UPPER', c))), f('LOWER', r), r)
    );
    return zusammen(f('IFERROR', inSchreibung, c));
  },

  caesar(x, o, richtung) {
    const k = o.verschiebung?.a ?? zahl(3);
    // Nie ein negatives Argument für REST: Programme runden dort verschieden.
    // REST(k; 26) liegt zwischen −25 und 25, +26 macht jede Summe positiv.
    const rest = f('MOD', k, zahl(26));
    const schritt = richtung === 'decode' ? op('-', zahl(26), rest) : op('+', rest, zahl(26));
    return buchstabenweise(x, (code) =>
      f('UNICHAR', op('+', f('MOD', op('+', op('-', code, zahl(65)), schritt), zahl(26)), zahl(65)))
    );
  },

  atbash(x) {
    return buchstabenweise(x, (code) => f('UNICHAR', op('-', zahl(155), code)));
  },

  abc123(x, _o, richtung) {
    if (richtung === 'decode') return null;
    const c = zeichenVon(x);
    const code = f('UNICODE', f('UPPER', c));
    const az = op('*', op('>=', code, zahl(65)), op('<=', code, zahl(90)));
    return f(
      'TEXTJOIN',
      text(' '),
      wahr(true),
      f('IF', op('=', c, text(' ')), text('/'), f('IF', az, op('-', code, zahl(64)), text('')))
    );
  },

  roemisch(x, _o, richtung) {
    return richtung === 'encode' ? f('ROMAN', x) : f('ARABIC', x);
  },

  basen(x, o, richtung) {
    const von = o.von?.a ?? zahl(16);
    const nach = o.nach?.a ?? zahl(10);
    // GROSS davor: Nicht jedes Programm liest „ff“ als Hexadezimalzahl.
    const zahlText = f('UPPER', x);
    return richtung === 'encode'
      ? f('BASE', f('DECIMAL', zahlText, von), nach)
      : f('BASE', f('DECIMAL', zahlText, nach), von);
  }
};

/** Welche Werkzeuge eine Formel bekommen können – für die Anzeige. */
export const WERKZEUGE_MIT_FORMEL = Object.keys(FORMELN);
