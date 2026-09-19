import elementeDaten from '../../data/elements.json';
import { ergebnis, text } from './hilfen';
import type { Codec, Luecke, OptionWerte } from './types';

/**
 * Das Periodensystem als Schlüssel: Jedes Attributpaar ist eine mögliche
 * Übersetzung. Statt dreißig Einzelwerkzeugen ein Codec mit zwei Einstellungen –
 * damit ist auch jede Kombination abgedeckt, an die wir jetzt nicht denken.
 *
 * Datenherkunft: data/QUELLE.md
 */

type Element = (typeof elementeDaten)[number];
type Feld = keyof Element;

const FELDER: ReadonlyArray<{ wert: Feld; titel: string }> = [
  { wert: 'symbol', titel: 'Symbol' },
  { wert: 'name', titel: 'Name' },
  { wert: 'ordnungszahl', titel: 'Ordnungszahl' },
  { wert: 'atomgewicht', titel: 'Atomgewicht' },
  { wert: 'elektronenkonfiguration', titel: 'Elektronenkonfiguration' },
  { wert: 'elektronegativitaet', titel: 'Elektronegativität' },
  { wert: 'serie', titel: 'Serie' },
  { wert: 'aggregatzustand', titel: 'Aggregatzustand' },
  { wert: 'radioaktiv', titel: 'radioaktiv' }
];

function alsText(element: Element, feld: Feld): string {
  const wert = element[feld];
  if (wert === null) return '';
  if (typeof wert === 'boolean') return wert ? 'ja' : 'nein';
  return String(wert);
}

function feldAus(optionen: OptionWerte | undefined, id: string, standard: Feld): Feld {
  const gewaehlt = text(optionen, id, standard);
  return FELDER.some((f) => f.wert === gewaehlt) ? (gewaehlt as Feld) : standard;
}

function uebersetze(eingabe: string, von: Feld, nach: Feld) {
  const luecken: Luecke[] = [];
  let position = 0;
  const teile = eingabe
    .trim()
    .split(/[\s,;]+/)
    .filter((s) => s.length > 0)
    .map((stueck) => {
      // Bei nicht eindeutigen Feldern (Serie, Aggregatzustand) gewinnt das
      // Element mit der kleinsten Ordnungszahl – die Daten sind so sortiert.
      const treffer = elementeDaten.find(
        (element) => alsText(element, von).toLowerCase() === stueck.toLowerCase()
      );
      position += stueck.length + 1;
      if (!treffer) {
        luecken.push({ position, zeichen: stueck });
        return '';
      }
      return alsText(treffer, nach);
    })
    .filter((s) => s.length > 0);
  return ergebnis(teile.join(' '), luecken);
}

export const elemente: Codec = {
  id: 'elemente',
  name: 'Periodensystem',
  beschreibung: 'Elementangaben ineinander übersetzen, z.B. Symbol zu Ordnungszahl.',
  optionen: [
    { id: 'von', titel: 'von', art: 'auswahl', standard: 'symbol', werte: FELDER },
    { id: 'nach', titel: 'nach', art: 'auswahl', standard: 'ordnungszahl', werte: FELDER }
  ],
  encode: (eingabe, optionen) =>
    uebersetze(eingabe, feldAus(optionen, 'von', 'symbol'), feldAus(optionen, 'nach', 'ordnungszahl')),
  decode: (eingabe, optionen) =>
    uebersetze(eingabe, feldAus(optionen, 'nach', 'ordnungszahl'), feldAus(optionen, 'von', 'symbol')),
  tabelle: () =>
    elementeDaten.map((element) => ({
      zeichen: element.symbol,
      darstellung: `${element.ordnungszahl} · ${element.name}`
    }))
};
