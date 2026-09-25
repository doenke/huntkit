import elementeDaten from '../../data/elements.json';
import { periode } from '../lib/periodensystem';
import { ergebnis, text } from './hilfen';
import type { Codec, Luecke, OptionWerte } from './types';
import { nachtschicht, raetselnacht, wikipedia } from './quellen';

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
  nurWerkbank: true,
  quellen: [nachtschicht('Q', 'Periodensystem der Elemente'), raetselnacht('I', 'Periodensystem der Elemente'), wikipedia('Periodensystem (Datei:Periodic_table_(German)_EN.svg)', 'https://de.wikipedia.org/wiki/Datei:Periodic_table_(German)_EN.svg')],
  beschreibung: 'Elementangaben ineinander übersetzen.',
  optionen: [
    { id: 'von', titel: 'von', art: 'auswahl', standard: 'symbol', werte: FELDER },
    { id: 'nach', titel: 'nach', art: 'auswahl', standard: 'ordnungszahl', werte: FELDER }
  ],
  // Nur die Paare, die im Rätsel tatsächlich vorkommen – alle 81 Kombinationen
  // durchzuprobieren brächte vor allem Rauschen.
  erkennungsoptionen: [
    { von: 'symbol', nach: 'ordnungszahl' },
    { von: 'ordnungszahl', nach: 'symbol' },
    { von: 'symbol', nach: 'name' },
    { von: 'name', nach: 'symbol' }
  ],

  passt(eingabe) {
    const stuecke = eingabe.trim().split(/[\s,;]+/).filter((s) => s.length > 0);
    if (stuecke.length === 0) return 0;
    const bekannt = stuecke.filter((stueck) =>
      elementeDaten.some(
        (e) =>
          e.symbol.toLowerCase() === stueck.toLowerCase() ||
          e.name.toLowerCase() === stueck.toLowerCase() ||
          String(e.ordnungszahl) === stueck
      )
    );
    return bekannt.length / stuecke.length;
  },

  encode: (eingabe, optionen) =>
    uebersetze(eingabe, feldAus(optionen, 'von', 'symbol'), feldAus(optionen, 'nach', 'ordnungszahl')),
  decode: (eingabe, optionen) =>
    uebersetze(eingabe, feldAus(optionen, 'nach', 'ordnungszahl'), feldAus(optionen, 'von', 'symbol')),
  // Die Tabelle zeigt genau das eingestellte Paar – wer eine Zelle antippt,
  // hängt denselben Wert an, den auch encode geliefert hätte.
  tabelle(optionen) {
    const von = feldAus(optionen, 'von', 'symbol');
    const nach = feldAus(optionen, 'nach', 'ordnungszahl');
    return elementeDaten
      .map((element) => ({
        zeichen: alsText(element, von),
        darstellung: alsText(element, nach),
        // Perioden als Abschnitte: 118 Elemente auf einmal sind auf dem Handy
        // unlesbar, und die Periode ist die Zeile, in der man ohnehin sucht.
        gruppe: `P${periode(element.ordnungszahl)}`
      }))
      .filter((eintrag) => eintrag.zeichen.length > 0 && eintrag.darstellung.length > 0);
  }
};
