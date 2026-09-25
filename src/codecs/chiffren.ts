import { ALPHABET, anteil, ergebnis, ohneUmlaute, text, zahl } from './hilfen';
import type { Codec, Glyph, Luecke, OptionWerte } from './types';
import { raetselnacht, wikipedia } from './quellen';

/**
 * Klassische Chiffren, die in Rätseln immer wieder auftauchen.
 *
 * Alle arbeiten auf A–Z; alles andere bleibt stehen oder wird gemeldet, je
 * nachdem, ob es die Chiffre stört.
 */

function nurAZ(eingabe: string): string {
  // Umlaute zuerst auflösen, sonst fielen sie hier stillschweigend heraus und
  // aus „GRÜSSE“ würde „GRSSE“.
  return ohneUmlaute(eingabe).toUpperCase().replace(/[^A-Z]/g, '');
}

// --------------------------------------------------------------------------

export const atbash: Codec = {
  id: 'atbash',
  name: 'Atbash',
  beschreibung: 'Alphabet umgedreht: A wird Z, B wird Y.',
  encode: (eingabe) =>
    ergebnis(
      [...ohneUmlaute(eingabe)]
        .map((zeichen) => {
          const gross = zeichen.toUpperCase();
          const i = ALPHABET.indexOf(gross);
          if (i < 0) return zeichen;
          const neu = ALPHABET[25 - i] as string;
          return zeichen === gross ? neu : neu.toLowerCase();
        })
        .join('')
    ),
  // Atbash ist seine eigene Umkehrung.
  decode: (eingabe) => atbash.encode(eingabe),
  tabelle: () => [...ALPHABET].map((b, i) => ({ zeichen: b, darstellung: ALPHABET[25 - i] as string })),
  passt: (eingabe) => anteil(eingabe, /[A-Za-z]/) * 0.25
};

// --------------------------------------------------------------------------

function vigenere(eingabe: string, schluessel: string, richtung: 1 | -1) {
  const key = nurAZ(schluessel);
  if (key.length === 0) return ergebnis(eingabe);
  let stelle = 0;
  const heraus = [...ohneUmlaute(eingabe)]
    .map((zeichen) => {
      const gross = zeichen.toUpperCase();
      const i = ALPHABET.indexOf(gross);
      if (i < 0) return zeichen;
      const versatz = ALPHABET.indexOf(key[stelle % key.length] as string);
      stelle++;
      const neu = ALPHABET[(i + richtung * versatz + 26) % 26] as string;
      return zeichen === gross ? neu : neu.toLowerCase();
    })
    .join('');
  return ergebnis(heraus);
}

export const vigenereCodec: Codec = {
  id: 'vigenere',
  name: 'Vigenère',
  quellen: [raetselnacht('K', 'Mono- und Polyalphabetische Verschlüsselungen'), wikipedia('Vigenère-Chiffre', 'https://de.wikipedia.org/wiki/Vigen%C3%A8re-Chiffre')],
  beschreibung: 'Caesar mit wechselnder Verschiebung – der Schlüssel gibt sie vor.',
  optionen: [
    { id: 'schluessel', titel: 'Schlüssel', art: 'text', standard: '', platzhalter: 'NACHT' }
  ],
  encode: (eingabe, optionen) => vigenere(eingabe, text(optionen, 'schluessel', ''), 1),
  decode: (eingabe, optionen) => vigenere(eingabe, text(optionen, 'schluessel', ''), -1)
};

// --------------------------------------------------------------------------

/** Baconsche Schrift: fünf Zeichen je Buchstabe, A und B. */
function baconAlphabet(vierundzwanzig: boolean): Array<[string, string]> {
  if (!vierundzwanzig) {
    return [...ALPHABET].map((b, i) => [b, i.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B')]);
  }
  // Klassisch teilen sich I/J und U/V ein Zeichen.
  const gruppen = ['A','B','C','D','E','F','G','H','IJ','K','L','M','N','O','P','Q','R','S','T','UV','W','X','Y','Z'];
  const eintraege: Array<[string, string]> = [];
  gruppen.forEach((gruppe, i) => {
    const muster = i.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B');
    for (const buchstabe of gruppe) eintraege.push([buchstabe, muster]);
  });
  return eintraege;
}

function baconTabelle(optionen: OptionWerte | undefined) {
  return baconAlphabet(text(optionen, 'variante', '26') === '24');
}

export const bacon: Codec = {
  id: 'bacon',
  name: 'Bacon',
  beschreibung: 'Fünf A und B je Buchstabe. Klassisch teilen sich I/J und U/V ein Zeichen.',
  optionen: [
    {
      id: 'variante',
      titel: 'Variante',
      art: 'auswahl',
      standard: '26',
      werte: [
        { wert: '26', titel: '26 Buchstaben' },
        { wert: '24', titel: '24, I=J und U=V' }
      ]
    }
  ],
  encode(eingabe, optionen) {
    const hin = new Map(baconTabelle(optionen));
    const luecken: Luecke[] = [];
    const teile: string[] = [];
    [...nurAZ(eingabe)].forEach((zeichen, i) => {
      const muster = hin.get(zeichen);
      if (muster === undefined) luecken.push({ position: i, zeichen });
      else teile.push(muster);
    });
    return ergebnis(teile.join(' '), luecken);
  },
  decode(eingabe, optionen) {
    const zurueck = new Map<string, string>();
    for (const [buchstabe, muster] of baconTabelle(optionen)) {
      if (!zurueck.has(muster)) zurueck.set(muster, buchstabe);
    }
    // Gruppen zu je fünf Zeichen, egal ob mit Leerzeichen getrennt oder nicht.
    const fluss = eingabe.toUpperCase().replace(/[^AB01]/g, '').replace(/0/g, 'A').replace(/1/g, 'B');
    const luecken: Luecke[] = [];
    const heraus: string[] = [];
    for (let i = 0; i + 5 <= fluss.length; i += 5) {
      const stueck = fluss.slice(i, i + 5);
      const buchstabe = zurueck.get(stueck);
      if (buchstabe === undefined) luecken.push({ position: i, zeichen: stueck });
      else heraus.push(buchstabe);
    }
    return ergebnis(heraus.join(''), luecken);
  },
  tabelle: (optionen) =>
    baconTabelle(optionen).map(([zeichen, darstellung]) => ({ zeichen, darstellung })),
  passt: (eingabe) => {
    const sauber = eingabe.toUpperCase().replace(/[^A-Z01]/g, '');
    if (sauber.length < 5) return 0;
    const nurAB = [...sauber].filter((z) => 'AB01'.includes(z)).length / sauber.length;
    return nurAB === 1 && sauber.length % 5 === 0 ? 1 : nurAB * 0.5;
  }
};

// --------------------------------------------------------------------------

/** Polybios: 5×5-Quadrat, I und J teilen sich ein Feld. */
const POLYBIOS = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

export const polybios: Codec = {
  id: 'polybios',
  name: 'Polybios',
  beschreibung: 'Fünf mal fünf Felder, Zeile und Spalte als Ziffernpaar. I und J teilen ein Feld.',
  encode(eingabe) {
    const luecken: Luecke[] = [];
    const teile: string[] = [];
    [...nurAZ(eingabe).replace(/J/g, 'I')].forEach((zeichen, i) => {
      const stelle = POLYBIOS.indexOf(zeichen);
      if (stelle < 0) luecken.push({ position: i, zeichen });
      else teile.push(`${Math.floor(stelle / 5) + 1}${(stelle % 5) + 1}`);
    });
    return ergebnis(teile.join(' '), luecken);
  },
  decode(eingabe) {
    const ziffern = eingabe.replace(/[^1-5]/g, '');
    const luecken: Luecke[] = [];
    const heraus: string[] = [];
    for (let i = 0; i + 2 <= ziffern.length; i += 2) {
      const zeile = Number(ziffern[i]) - 1;
      const spalte = Number(ziffern[i + 1]) - 1;
      const buchstabe = POLYBIOS[zeile * 5 + spalte];
      if (buchstabe === undefined) luecken.push({ position: i, zeichen: ziffern.slice(i, i + 2) });
      else heraus.push(buchstabe);
    }
    return ergebnis(heraus.join(''), luecken);
  },
  tabelle: () =>
    [...POLYBIOS].map((zeichen, i) => ({
      zeichen: zeichen === 'I' ? 'I/J' : zeichen,
      darstellung: `${Math.floor(i / 5) + 1}${(i % 5) + 1}`
    })),
  passt: (eingabe) => {
    const sauber = eingabe.replace(/\s/g, '');
    if (sauber.length < 4 || sauber.length % 2 !== 0) return 0;
    return [...sauber].every((z) => '12345'.includes(z)) ? 1 : 0;
  }
};

// --------------------------------------------------------------------------

/** Zaunmuster: der Text läuft im Zickzack über mehrere Zeilen. */
export function zaunFolge(laenge: number, zeilen: number): number[] {
  const z = Math.max(2, zeilen);
  const folge: number[] = [];
  let zeile = 0;
  let richtung = 1;
  for (let i = 0; i < laenge; i++) {
    folge.push(zeile);
    if (zeile === 0) richtung = 1;
    else if (zeile === z - 1) richtung = -1;
    zeile += richtung;
  }
  return folge;
}

export const zaun: Codec = {
  id: 'zaun',
  name: 'Zaunmuster',
  beschreibung: 'Rail Fence: der Text läuft im Zickzack über mehrere Zeilen.',
  optionen: [{ id: 'zeilen', titel: 'Zeilen', art: 'zahl', min: 2, max: 12, standard: 3 }],
  encode(eingabe, optionen) {
    const zeichen = [...eingabe];
    const folge = zaunFolge(zeichen.length, zahl(optionen, 'zeilen', 3));
    const zeilen = Math.max(2, zahl(optionen, 'zeilen', 3));
    const eimer: string[][] = Array.from({ length: zeilen }, () => []);
    zeichen.forEach((z, i) => eimer[folge[i] as number]?.push(z));
    return ergebnis(eimer.flat().join(''));
  },
  decode(eingabe, optionen) {
    const zeichen = [...eingabe];
    const folge = zaunFolge(zeichen.length, zahl(optionen, 'zeilen', 3));
    const zeilen = Math.max(2, zahl(optionen, 'zeilen', 3));
    const heraus = new Array<string>(zeichen.length);
    let stelle = 0;
    for (let z = 0; z < zeilen; z++) {
      folge.forEach((zeile, i) => {
        if (zeile === z) heraus[i] = zeichen[stelle++] as string;
      });
    }
    return ergebnis(heraus.join(''));
  }
};

// --------------------------------------------------------------------------

const TASTEN: ReadonlyArray<readonly [string, string]> = [
  ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'],
  ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ']
];

/**
 * Das ganze Tastenfeld nach ITU-T E.161, wie es auf jedem Tastentelefon steht:
 * drei Spalten, vier Reihen, die Buchstaben unter der Ziffer. Selbst
 * gezeichnet wie alle anderen Bilder – in der Textfarbe, damit es auch im
 * Rotlicht lesbar bleibt.
 */
function tastenfeld(): Glyph {
  const felder: ReadonlyArray<readonly [string, string]> = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', ''], ['#', '']
  ];
  const breite = 68;
  const hoehe = 56;
  const abstand = 8;
  const inhalt = felder
    .map(([ziffer, buchstaben], i) => {
      const x = 2 + (i % 3) * (breite + abstand);
      const y = 2 + Math.floor(i / 3) * (hoehe + abstand);
      const mitte = x + breite / 2;
      // Ohne Buchstaben rückt die Ziffer in die Mitte der Taste.
      const zifferY = y + (buchstaben ? 27 : 36);
      return (
        `<rect x="${x}" y="${y}" width="${breite}" height="${hoehe}" rx="10" fill="none" stroke="currentColor" stroke-width="2"/>` +
        `<text x="${mitte}" y="${zifferY}" text-anchor="middle" font-size="22" font-weight="600" fill="currentColor">${ziffer}</text>` +
        (buchstaben
          ? `<text x="${mitte}" y="${y + 46}" text-anchor="middle" font-size="13" letter-spacing="1" fill="currentColor" opacity="0.75">${buchstaben}</text>`
          : '')
      );
    })
    .join('');
  return {
    viewBox: `0 0 ${3 * breite + 2 * abstand + 4} ${4 * hoehe + 3 * abstand + 4}`,
    inhalt
  };
}

/** Die Taste zu einem Buchstaben und wie oft man sie klassisch drückt. */
function tasteFuer(zeichen: string): { ziffer: string; druecke: number } | null {
  const taste = TASTEN.find(([, buchstaben]) => buchstaben.includes(zeichen));
  return taste ? { ziffer: taste[0], druecke: taste[1].indexOf(zeichen) + 1 } : null;
}

export const handytasten: Codec = {
  id: 'handytasten',
  name: 'Handytastatur',
  quellen: [{ titel: 'ITU-T E.161: Anordnung von Ziffern und Buchstaben auf Telefontastaturen', url: 'https://www.itu.int/rec/T-REC-E.161' }, wikipedia('Text on 9 keys', 'https://de.wikipedia.org/wiki/Text_on_9_keys')],
  beschreibung: 'Alte Handytasten: klassisch ist A 2, B 22, C 222. Mit T9 drückt man jede Taste nur einmal – dann ist 2 A, B oder C.',
  uebersicht: { titel: 'Tastenfeld nach ITU-T E.161', bild: tastenfeld() },
  optionen: [
    {
      id: 'verfahren',
      titel: 'Tippen',
      art: 'auswahl',
      werte: [
        { wert: 'klassisch', titel: 'klassisch (mehrfach drücken)' },
        { wert: 't9', titel: 'T9 (einmal drücken)' }
      ],
      standard: 'klassisch'
    }
  ],
  encode(eingabe, optionen) {
    const luecken: Luecke[] = [];
    if (text(optionen, 'verfahren', 'klassisch') === 't9') {
      // Eine Ziffernfolge je Wort, sonst verschwimmen die Wortgrenzen.
      const woerter = eingabe
        .split(/\s+/)
        .map((wort) => nurAZ(wort))
        .filter((wort) => wort.length > 0)
        .map((wort) => [...wort].map((zeichen) => tasteFuer(zeichen)?.ziffer ?? '').join(''));
      return ergebnis(woerter.join(' '), luecken);
    }
    const teile: string[] = [];
    [...nurAZ(eingabe)].forEach((zeichen, i) => {
      const taste = tasteFuer(zeichen);
      if (!taste) luecken.push({ position: i, zeichen });
      else teile.push(taste.ziffer.repeat(taste.druecke));
    });
    return ergebnis(teile.join(' '), luecken);
  },
  decode(eingabe, optionen) {
    const luecken: Luecke[] = [];
    const gruppen = eingabe
      .trim()
      .split(/[^2-9]+/)
      .filter((s) => s.length > 0);
    if (text(optionen, 'verfahren', 'klassisch') === 't9') {
      // Ohne Wörterbuch bleibt T9 mehrdeutig: Jede Ziffer wird zur Auswahl
      // ihrer Buchstaben. In dieser Schreibweise versteht auch die
      // Wortmustersuche das Ergebnis.
      const woerter = gruppen.map((gruppe) =>
        [...gruppe].map((ziffer) => `[${TASTEN.find(([z]) => z === ziffer)?.[1] ?? ''}]`).join('')
      );
      return ergebnis(woerter.join(' '), luecken);
    }
    const heraus = gruppen.map((gruppe, i) => {
      const taste = TASTEN.find(([ziffer]) => ziffer === gruppe[0]);
      const buchstabe = taste?.[1][gruppe.length - 1];
      if (!taste || buchstabe === undefined || new Set(gruppe).size !== 1) {
        luecken.push({ position: i, zeichen: gruppe });
        return '';
      }
      return buchstabe;
    });
    return ergebnis(heraus.join(''), luecken);
  },
  tabelle: (optionen) =>
    TASTEN.flatMap(([ziffer, buchstaben]) =>
      [...buchstaben].map((zeichen, i) => ({
        zeichen,
        darstellung: text(optionen, 'verfahren', 'klassisch') === 't9' ? ziffer : ziffer.repeat(i + 1)
      }))
    ),
  zeichne(gesucht, optionen) {
    const zeichen = gesucht.toUpperCase();
    const taste = TASTEN.find(([, buchstaben]) => buchstaben.includes(zeichen));
    if (!taste) return null;
    const [ziffer, buchstaben] = taste;
    // Mit T9 drückt man jede Taste einmal – dann gibt es auch nichts zu zählen.
    const druecke = text(optionen, 'verfahren', 'klassisch') === 't9' ? 0 : buchstaben.indexOf(zeichen) + 1;
    // Die Taste, wie sie auf dem Gerät aussah: Ziffer groß, Buchstaben klein,
    // darunter so viele Punkte wie Tastendrücke.
    const punkte = Array.from({ length: druecke }, (_, i) =>
      `<circle cx="${34 + (i - (druecke - 1) / 2) * 13}" cy="76" r="4" fill="currentColor"/>`
    ).join('');
    return {
      viewBox: '0 0 68 92',
      inhalt:
        `<rect x="2" y="2" width="64" height="60" rx="10" fill="none" stroke="currentColor" stroke-width="2.5"/>` +
        `<text x="34" y="30" text-anchor="middle" font-size="22" font-weight="600" fill="currentColor">${ziffer}</text>` +
        `<text x="34" y="50" text-anchor="middle" font-size="13" fill="currentColor" opacity="0.75">${buchstaben}</text>` +
        punkte
    };
  },
  passt: (eingabe) => {
    const gruppen = eingabe.trim().split(/[^2-9]+/).filter((s) => s.length > 0);
    if (gruppen.length === 0) return 0;
    return gruppen.filter((g) => new Set(g).size === 1).length / gruppen.length;
  }
};
