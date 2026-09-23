import { anteil, ergebnis } from './hilfen';
import { raetselnacht, wikipedia } from './quellen';
import type { Codec, Luecke, TabellenEintrag } from './types';

/**
 * Ländercodes nach ISO 3166-1 (zwei Buchstaben), mit den deutschen Namen wie
 * im Infoheft der RätselNacht 5 (Anhang N). Steht ein Gebiet unter der
 * Verwaltung eines anderen Staats, nennt das dritte Feld dessen Code.
 *
 * Verschlüsseln heißt: Aus einer Reihe von Ländern werden ihre Codes –
 * „Deutschland, Norwegen“ ergibt DE NO. Die Namen dürfen durch Komma, Zeilen
 * oder bloße Leerzeichen getrennt sein; erkannt wird jeweils der längste
 * passende Name, ohne Rücksicht auf Groß- und Kleinschreibung, Umlaute oder
 * Akzente.
 */
const LAENDER: ReadonlyArray<readonly [code: string, name: string, gehoertZu?: string]> = [
  ['AD', 'Andorra'],
  ['AE', 'Vereinigte Arabische Emirate'],
  ['AF', 'Afghanistan'],
  ['AG', 'Antigua und Barbuda'],
  ['AI', 'Anguilla', 'GB'],
  ['AL', 'Albanien'],
  ['AM', 'Armenien'],
  ['AO', 'Angola'],
  ['AQ', 'Antarktis'],
  ['AR', 'Argentinien'],
  ['AS', 'Amerikanisch-Samoa', 'US'],
  ['AT', 'Österreich'],
  ['AU', 'Australien'],
  ['AW', 'Aruba', 'NL'],
  ['AX', 'Ålandinseln', 'FI'],
  ['AZ', 'Aserbaidschan'],
  ['BA', 'Bosnien und Herzegowina'],
  ['BB', 'Barbados'],
  ['BD', 'Bangladesch'],
  ['BE', 'Belgien'],
  ['BF', 'Burkina Faso'],
  ['BG', 'Bulgarien'],
  ['BH', 'Bahrain'],
  ['BI', 'Burundi'],
  ['BJ', 'Benin'],
  ['BL', 'Saint-Barthélemy', 'FR'],
  ['BM', 'Bermuda', 'GB'],
  ['BN', 'Brunei'],
  ['BO', 'Bolivien'],
  ['BQ', 'Bonaire, Sint Eustatius & Saba', 'NL'],
  ['BR', 'Brasilien'],
  ['BS', 'Bahamas'],
  ['BT', 'Bhutan'],
  ['BV', 'Bouvetinsel', 'NO'],
  ['BW', 'Botswana'],
  ['BY', 'Belarus'],
  ['BZ', 'Belize'],
  ['CA', 'Kanada'],
  ['CC', 'Kokosinseln', 'AU'],
  ['CD', 'Demokratische Republik Kongo'],
  ['CF', 'Zentralafrikanische Republik'],
  ['CG', 'Republik Kongo'],
  ['CH', 'Schweiz'],
  ['CI', 'Elfenbeinküste'],
  ['CK', 'Cookinseln'],
  ['CL', 'Chile'],
  ['CM', 'Kamerun'],
  ['CN', 'China'],
  ['CO', 'Kolumbien'],
  ['CR', 'Costa Rica'],
  ['CU', 'Kuba'],
  ['CV', 'Kap Verde'],
  ['CW', 'Curaçao', 'NL'],
  ['CX', 'Weihnachtsinsel', 'AU'],
  ['CY', 'Zypern'],
  ['CZ', 'Tschechien'],
  ['DE', 'Deutschland'],
  ['DJ', 'Dschibuti'],
  ['DK', 'Dänemark'],
  ['DM', 'Dominica'],
  ['DO', 'Dominikanische Republik'],
  ['DZ', 'Algerien'],
  ['EC', 'Ecuador'],
  ['EE', 'Estland'],
  ['EG', 'Ägypten'],
  ['EH', 'Westsahara'],
  ['ER', 'Eritrea'],
  ['ES', 'Spanien'],
  ['ET', 'Äthiopien'],
  ['FI', 'Finnland'],
  ['FJ', 'Fidschi'],
  ['FK', 'Falklandinseln', 'GB'],
  ['FM', 'Mikronesien'],
  ['FO', 'Färöer', 'DK'],
  ['FR', 'Frankreich'],
  ['GA', 'Gabun'],
  ['GB', 'Vereinigtes Königreich'],
  ['GD', 'Grenada'],
  ['GE', 'Georgien'],
  ['GF', 'Französisch-Guayana', 'FR'],
  ['GG', 'Guernsey', 'GB'],
  ['GH', 'Ghana'],
  ['GI', 'Gibraltar', 'GB'],
  ['GL', 'Grönland', 'DK'],
  ['GM', 'Gambia'],
  ['GN', 'Guinea'],
  ['GP', 'Guadeloupe', 'FR'],
  ['GQ', 'Äquatorialguinea'],
  ['GR', 'Griechenland'],
  ['GS', 'Südgeorgien&Südl.Sandwichins.', 'GB'],
  ['GT', 'Guatemala'],
  ['GU', 'Guam', 'US'],
  ['GW', 'Guinea-Bissau'],
  ['GY', 'Guyana'],
  ['HK', 'Hongkong', 'CN'],
  ['HM', 'Heard und McDonaldinseln', 'AU'],
  ['HN', 'Honduras'],
  ['HR', 'Kroatien'],
  ['HT', 'Haiti'],
  ['HU', 'Ungarn'],
  ['ID', 'Indonesien'],
  ['IE', 'Irland'],
  ['IL', 'Israel'],
  ['IM', 'Isle of Man', 'GB'],
  ['IN', 'Indien'],
  ['IO', 'Brit. Territorium im Ind. Ozean', 'GB'],
  ['IQ', 'Irak'],
  ['IR', 'Iran'],
  ['IS', 'Island'],
  ['IT', 'Italien'],
  ['JE', 'Jersey', 'GB'],
  ['JM', 'Jamaika'],
  ['JO', 'Jordanien'],
  ['JP', 'Japan'],
  ['KE', 'Kenia'],
  ['KG', 'Kirgisistan'],
  ['KH', 'Kambodscha'],
  ['KI', 'Kiribati'],
  ['KM', 'Komoren'],
  ['KN', 'St. Kitts und Nevis'],
  ['KP', 'Nordkorea'],
  ['KR', 'Südkorea'],
  ['KW', 'Kuwait'],
  ['KY', 'Kaimaninseln', 'GB'],
  ['KZ', 'Kasachstan'],
  ['LA', 'Laos'],
  ['LB', 'Libanon'],
  ['LC', 'St. Lucia'],
  ['LI', 'Liechtenstein'],
  ['LK', 'Sri Lanka'],
  ['LR', 'Liberia'],
  ['LS', 'Lesotho'],
  ['LT', 'Litauen'],
  ['LU', 'Luxemburg'],
  ['LV', 'Lettland'],
  ['LY', 'Libyen'],
  ['MA', 'Marokko'],
  ['MC', 'Monaco'],
  ['MD', 'Moldawien'],
  ['ME', 'Montenegro'],
  ['MF', 'Saint-Martin', 'FR'],
  ['MG', 'Madagaskar'],
  ['MH', 'Marshallinseln'],
  ['MK', 'Nordmazedonien'],
  ['ML', 'Mali'],
  ['MM', 'Myanmar'],
  ['MN', 'Mongolei'],
  ['MO', 'Macao', 'CN'],
  ['MP', 'Nördliche Marianen', 'US'],
  ['MQ', 'Martinique', 'FR'],
  ['MR', 'Mauretanien'],
  ['MS', 'Montserrat', 'GB'],
  ['MT', 'Malta'],
  ['MU', 'Mauritius'],
  ['MV', 'Malediven'],
  ['MW', 'Malawi'],
  ['MX', 'Mexiko'],
  ['MY', 'Malaysia'],
  ['MZ', 'Mosambik'],
  ['NA', 'Namibia'],
  ['NC', 'Neukaledonien', 'FR'],
  ['NE', 'Niger'],
  ['NF', 'Norfolkinsel', 'AU'],
  ['NG', 'Nigeria'],
  ['NI', 'Nicaragua'],
  ['NL', 'Niederlande'],
  ['NO', 'Norwegen'],
  ['NP', 'Nepal'],
  ['NR', 'Naoeru'],
  ['NU', 'Niue'],
  ['NZ', 'Neuseeland'],
  ['OM', 'Oman'],
  ['PA', 'Panama'],
  ['PE', 'Peru'],
  ['PF', 'Französisch-Polynesien', 'FR'],
  ['PG', 'Papua-Neuguinea'],
  ['PH', 'Philippinen'],
  ['PK', 'Pakistan'],
  ['PL', 'Polen'],
  ['PM', 'Saint-Pierre und Miquelon', 'FR'],
  ['PN', 'Pitcairninseln', 'GB'],
  ['PR', 'Puerto Rico', 'US'],
  ['PS', 'Palästina'],
  ['PT', 'Portugal'],
  ['PW', 'Palau'],
  ['PY', 'Paraguay'],
  ['QA', 'Katar'],
  ['RE', 'Réunion', 'FR'],
  ['RO', 'Rumänien'],
  ['RS', 'Serbien'],
  ['RU', 'Russland'],
  ['RW', 'Ruanda'],
  ['SA', 'Saudi-Arabien'],
  ['SB', 'Salomonen'],
  ['SC', 'Seychellen'],
  ['SD', 'Sudan'],
  ['SE', 'Schweden'],
  ['SG', 'Singapur'],
  ['SH', 'St.Helena,Ascension&Tristan da Cunha', 'GB'],
  ['SI', 'Slowenien'],
  ['SJ', 'Spitzbergen und Jan Mayen', 'NO'],
  ['SK', 'Slowakei'],
  ['SL', 'Sierra Leone'],
  ['SM', 'San Marino'],
  ['SN', 'Senegal'],
  ['SO', 'Somalia'],
  ['SR', 'Suriname'],
  ['SS', 'Südsudan'],
  ['ST', 'São Tomé und Príncipe'],
  ['SV', 'El Salvador'],
  ['SX', 'Sint Maarten', 'NL'],
  ['SY', 'Syrien'],
  ['SZ', 'Eswatini'],
  ['TC', 'Turks- und Caicosinseln', 'GB'],
  ['TD', 'Tschad'],
  ['TF', 'Franz.Süd-&Antarktisgebiete', 'FR'],
  ['TG', 'Togo'],
  ['TH', 'Thailand'],
  ['TJ', 'Tadschikistan'],
  ['TK', 'Tokelau', 'NZ'],
  ['TL', 'Osttimor'],
  ['TM', 'Turkmenistan'],
  ['TN', 'Tunesien'],
  ['TO', 'Tonga'],
  ['TR', 'Türkei'],
  ['TT', 'Trinidad und Tobago'],
  ['TV', 'Tuvalu'],
  ['TW', 'Taiwan'],
  ['TZ', 'Tansania'],
  ['UA', 'Ukraine'],
  ['UG', 'Uganda'],
  ['UM', 'U.S. Minor Outlying Islands', 'US'],
  ['US', 'Vereinigte Staaten'],
  ['UY', 'Uruguay'],
  ['UZ', 'Usbekistan'],
  ['VA', 'Vatikanstadt'],
  ['VC', 'St. Vincent und die Grenadinen'],
  ['VE', 'Venezuela'],
  ['VG', 'Britische Jungferninseln', 'GB'],
  ['VI', 'U.S. Jungferninseln', 'US'],
  ['VN', 'Vietnam'],
  ['VU', 'Vanuatu'],
  ['WF', 'Wallis und Futuna', 'FR'],
  ['WS', 'Samoa'],
  ['YE', 'Jemen'],
  ['YT', 'Mayotte', 'FR'],
  ['ZA', 'Südafrika'],
  ['ZM', 'Sambia'],
  ['ZW', 'Simbabwe']
];

/**
 * Schreibweisen, die man eher tippt als die im Heft – dort sind lange Namen
 * abgekürzt, und manches Land heißt im Alltag anders.
 */
const NEBENNAMEN: ReadonlyArray<readonly [code: string, name: string]> = [
  ['US', 'USA'],
  ['US', 'Vereinigte Staaten von Amerika'],
  ['GB', 'Großbritannien'],
  ['BY', 'Weißrussland'],
  ['CZ', 'Tschechische Republik'],
  ['NL', 'Holland'],
  ['NR', 'Nauru'],
  ['MD', 'Moldau'],
  ['MD', 'Republik Moldau'],
  ['CI', 'Côte d’Ivoire'],
  ['VA', 'Vatikan'],
  ['SZ', 'Swasiland'],
  ['MK', 'Mazedonien'],
  ['MM', 'Birma'],
  ['MM', 'Burma'],
  ['TL', 'Timor-Leste'],
  ['GS', 'Südgeorgien und die Südlichen Sandwichinseln'],
  ['IO', 'Britisches Territorium im Indischen Ozean'],
  ['TF', 'Französische Süd- und Antarktisgebiete'],
  ['SH', 'St. Helena'],
  ['UM', 'United States Minor Outlying Islands'],
  ['VI', 'Amerikanische Jungferninseln']
];

/**
 * Vergleichsschlüssel für Namen: klein, Umlaute aufgelöst, Akzente und alles
 * außer Buchstaben weg, Saint und Sankt wie St.
 */
function schluessel(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\b(saint|sankt)\b/g, 'st')
    .replace(/[^a-z]/g, '');
}

const NACH_NAME = new Map<string, string>();
for (const [code, name] of [...LAENDER, ...NEBENNAMEN]) {
  const s = schluessel(name);
  if (!NACH_NAME.has(s)) NACH_NAME.set(s, code);
}
const NACH_CODE = new Map(LAENDER.map(([code, name]) => [code, name]));

/** Kein Name ist länger als acht Wörter. */
const MEISTE_WOERTER = 8;

function codesAus(eingabe: string) {
  const luecken: Luecke[] = [];
  const woerter = [...eingabe.matchAll(/[^\s,;]+/g)];
  const codes: string[] = [];
  let i = 0;
  while (i < woerter.length) {
    let gefunden = 0;
    for (let n = Math.min(MEISTE_WOERTER, woerter.length - i); n > 0; n--) {
      const code = NACH_NAME.get(schluessel(woerter.slice(i, i + n).map((w) => w[0]).join(' ')));
      if (code) {
        codes.push(code);
        gefunden = n;
        break;
      }
    }
    if (gefunden === 0) {
      const wort = woerter[i] as RegExpExecArray;
      luecken.push({ position: wort.index, zeichen: wort[0] });
      gefunden = 1;
    }
    i += gefunden;
  }
  return ergebnis(codes.join(' '), luecken);
}

/** Codes getrennt oder am Stück: DENO wird DE NO. */
function codeStuecke(eingabe: string): string[] {
  return eingabe
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((s) => s.length > 0)
    .flatMap((s) => (s.length > 2 && s.length % 2 === 0 ? (s.match(/.{2}/g) ?? []) : [s]));
}

function namenAus(eingabe: string) {
  const luecken: Luecke[] = [];
  const namen: string[] = [];
  codeStuecke(eingabe).forEach((code, position) => {
    const name = NACH_CODE.get(code);
    if (name) namen.push(name);
    else luecken.push({ position, zeichen: code });
  });
  return ergebnis(namen.join(', '), luecken);
}

function gruppe(code: string): string {
  const erster = code[0] ?? 'A';
  if (erster <= 'F') return 'A–F';
  if (erster <= 'L') return 'G–L';
  if (erster <= 'R') return 'M–R';
  return 'S–Z';
}

export const laendercodes: Codec = {
  id: 'laendercodes',
  name: 'Ländercodes',
  quellen: [
    raetselnacht('N', 'Ländercodes (ISO-3166-1)'),
    wikipedia('ISO-3166-1-Kodierliste', 'https://de.wikipedia.org/wiki/ISO-3166-1-Kodierliste'),
    { titel: 'ISO 3166 – Country Codes', url: 'https://www.iso.org/iso-3166-country-codes.html' }
  ],
  beschreibung:
    'Länder zu ihren Codes nach ISO 3166-1 und zurück: Deutschland, Norwegen ergibt DE NO. Codes dürfen auch am Stück stehen (DENO).',
  encode: (eingabe) => codesAus(eingabe),
  decode: (eingabe) => namenAus(eingabe),
  tabelle: (): ReadonlyArray<TabellenEintrag> =>
    // Abhängige Gebiete wie im Heft: der Code des Staats in Klammern dahinter.
    LAENDER.map(([code, name, gehoertZu]) => ({
      zeichen: gehoertZu ? `${name} [${gehoertZu}]` : name,
      darstellung: code,
      gruppe: gruppe(code)
    })),
  passt(eingabe) {
    // Fast jedes Buchstabenpaar ist irgendein Land – nur klar getrennte
    // Zweiergruppen sind ein Hinweis.
    if (!/^\s*[A-Za-z]{2}(\s+[A-Za-z]{2})+\s*$/.test(eingabe)) return 0;
    const stuecke = codeStuecke(eingabe);
    const bekannt = stuecke.filter((s) => NACH_CODE.has(s)).length / stuecke.length;
    return bekannt * 0.5 * anteil(eingabe, /[A-Za-z]/);
  }
};
