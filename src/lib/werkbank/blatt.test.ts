import { describe, expect, it } from 'vitest';
import {
  anzeigetafel,
  ausAlterKette,
  begleiteTafel,
  inHeutigerForm,
  leeresBlatt,
  neueEingabespalte,
  neuePositionsspalte,
  neueWerkzeugspalte,
  neueZeile,
  rechne,
  sortierungOhne,
  spaltenzeichen,
  zeigtBild,
  type Blatt,
  wechsleTafel,
  type SpaltenId,
  type Werkzeugspalte
} from './blatt';

/** Ein Blatt mit einer gefüllten Eingabespalte – der Anfang jeder Arbeit. */
function blattMit(texte: string[]): { blatt: Blatt; a: SpaltenId } {
  const a = neueEingabespalte();
  const zeilen = texte.map((text, i) => {
    const zeile = neueZeile(i + 1);
    zeile.werte[a.id] = text;
    return zeile;
  });
  return { blatt: { spalten: [a], zeilen }, a: a.id };
}

function spalte(blatt: Blatt, id: SpaltenId): string[] {
  return rechne(blatt).zeilen.map((z) => z.zellen[id]?.text ?? '');
}

describe('Spaltenzeichen', () => {
  it('zählt wie eine Tabelle', () => {
    expect([0, 1, 25, 26, 27].map(spaltenzeichen)).toEqual(['A', 'B', 'Z', 'AA', 'AB']);
  });
});

describe('Spalten rechnen', () => {
  it('gibt in einer Eingabespalte zurück, was eingetippt wurde', () => {
    const { blatt, a } = blattMit(['... --- ...', '-- .-']);
    expect(spalte(blatt, a)).toEqual(['... --- ...', '-- .-']);
  });

  it('wendet ein Werkzeug auf eine frühere Spalte an', () => {
    const { blatt, a } = blattMit(['... --- ...', '-- .-']);
    const b = neueWerkzeugspalte(a, 'morse');
    blatt.spalten.push(b);
    expect(spalte(blatt, b.id)).toEqual(['SOS', 'MA']);
  });

  it('lässt leere Zellen leer, statt einen Fehler zu erfinden', () => {
    const { blatt, a } = blattMit(['... --- ...', '']);
    const b = neueWerkzeugspalte(a, 'morse');
    blatt.spalten.push(b);
    expect(spalte(blatt, b.id)).toEqual(['SOS', '']);
    expect(rechne(blatt).fehler).toEqual([]);
  });

  it('meldet ein fehlendes Werkzeug, statt still nichts zu tun', () => {
    const { blatt, a } = blattMit(['X']);
    const b = neueWerkzeugspalte(a, 'morse');
    b.codecId = 'gibtsnicht';
    blatt.spalten.push(b);
    expect(rechne(blatt).fehler).toEqual(['B: Werkzeug fehlt']);
  });
});

describe('Optionen aus einer Spalte', () => {
  it('nimmt die Zahl je Zeile aus einer anderen Spalte', () => {
    const { blatt, a } = blattMit(['ABCDEFGH', 'ABCDEFGH']);
    const b = neueEingabespalte();
    blatt.spalten.push(b);
    blatt.zeilen[0]!.werte[b.id] = '2';
    blatt.zeilen[1]!.werte[b.id] = '3';
    const c = neueWerkzeugspalte(a, 'jedes-n');
    c.optionen['n'] = { art: 'spalte', spalte: b.id };
    c.optionen['versatz'] = { art: 'fest', wert: 1 };
    blatt.spalten.push(c);
    // Jeden zweiten ab 1: ACEG. Jeden dritten ab 1: ADG.
    expect(spalte(blatt, c.id)).toEqual(['ACEG', 'ADG']);
  });

  it('wartet still, solange die Optionsspalte leer ist', () => {
    const { blatt, a } = blattMit(['ABCDEFGH']);
    const b = neueEingabespalte();
    blatt.spalten.push(b);
    const c = neueWerkzeugspalte(a, 'jedes-n');
    c.optionen['n'] = { art: 'spalte', spalte: b.id };
    blatt.spalten.push(c);
    expect(spalte(blatt, c.id)).toEqual(['']);
    expect(rechne(blatt).fehler).toEqual([]);
  });

  it('sagt es, wenn in der Optionsspalte keine Zahl steht', () => {
    const { blatt, a } = blattMit(['ABCDEFGH']);
    const b = neueEingabespalte();
    blatt.spalten.push(b);
    blatt.zeilen[0]!.werte[b.id] = 'drei';
    const c = neueWerkzeugspalte(a, 'jedes-n');
    c.optionen['n'] = { art: 'spalte', spalte: b.id };
    blatt.spalten.push(c);
    expect(rechne(blatt).fehler[0]).toContain('ist keine Zahl');
  });
});

describe('Sortieren', () => {
  it('ändert die Reihenfolge, aber keinen Wert', () => {
    const { blatt, a } = blattMit(['CAESAR', 'ANKER', 'BLUME']);
    const vorher = rechne(blatt).zeilen.map((z) => z.zellen[a]?.text);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'text' };
    const nachher = rechne(blatt);
    expect(nachher.zeilen.map((z) => z.zellen[a]?.text)).toEqual(['ANKER', 'BLUME', 'CAESAR']);
    expect([...nachher.zeilen.map((z) => z.zellen[a]?.text)].sort()).toEqual([...vorher].sort());
  });

  it('behält die Eingabenummer, damit man die Zeile wiederfindet', () => {
    const { blatt, a } = blattMit(['CAESAR', 'ANKER', 'BLUME']);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'text' };
    const zeilen = rechne(blatt).zeilen;
    expect(zeilen.map((z) => z.zeile.nummer)).toEqual([2, 3, 1]);
    // Platz in der Eingabe und jetzt – daraus wird die Verschiebung in der Anzeige.
    expect(zeilen.map((z) => `${z.eingabeplatz}->${z.platz}`)).toEqual(['2->1', '3->2', '1->3']);
  });

  it('sortiert nach Zahl, nach Länge und absteigend', () => {
    const { blatt, a } = blattMit(['9', '11', '2']);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'zahl' };
    expect(spalte(blatt, a)).toEqual(['2', '9', '11']);
    blatt.sortierung = { spalte: a, richtung: 'ab', art: 'zahl' };
    expect(spalte(blatt, a)).toEqual(['11', '9', '2']);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'text' };
    expect(spalte(blatt, a)).toEqual(['11', '2', '9']);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'laenge' };
    expect(spalte(blatt, a)).toEqual(['9', '2', '11']);
  });

  it('stellt Leeres immer hinten an, in beide Richtungen', () => {
    const { blatt, a } = blattMit(['B', '', 'A']);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'text' };
    expect(spalte(blatt, a)).toEqual(['A', 'B', '']);
    blatt.sortierung = { spalte: a, richtung: 'ab', art: 'text' };
    expect(spalte(blatt, a)).toEqual(['B', 'A', '']);
  });

  it('ist stabil: bei Gleichstand bleibt die Eingabereihenfolge', () => {
    const { blatt, a } = blattMit(['GLEICH', 'GLEICH', 'GLEICH']);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'text' };
    expect(rechne(blatt).zeilen.map((z) => z.zeile.nummer)).toEqual([1, 2, 3]);
  });

  it('zeigt ohne Sortierung – oder nach einer gelöschten Spalte – die Eingabereihenfolge', () => {
    const { blatt, a } = blattMit(['C', 'A', 'B']);
    expect(spalte(blatt, a)).toEqual(['C', 'A', 'B']);
    blatt.sortierung = { spalte: 'gibt-es-nicht', richtung: 'auf', art: 'text' };
    expect(spalte(blatt, a)).toEqual(['C', 'A', 'B']);
  });
});

describe('Positionsspalte', () => {
  it('liefert den Platz in der Eingabe oder nach einer Spalte – unabhängig von der Anzeige', () => {
    const { blatt, a } = blattMit(['C', 'A', 'B']);
    const eingabe = neuePositionsspalte();
    const alphabetisch = neuePositionsspalte({ spalte: a, richtung: 'auf', art: 'text' });
    blatt.spalten.push(eingabe, alphabetisch);
    expect(spalte(blatt, eingabe.id)).toEqual(['1', '2', '3']);
    expect(spalte(blatt, alphabetisch.id)).toEqual(['3', '1', '2']);
    // Die Anzeige umzusortieren ändert keinen Platz, nur wo die Zeilen stehen.
    blatt.sortierung = { spalte: a, richtung: 'ab', art: 'text' };
    const zeilen = rechne(blatt).zeilen;
    expect(zeilen.map((z) => z.zellen[a]?.text)).toEqual(['C', 'B', 'A']);
    expect(zeilen.map((z) => z.zellen[alphabetisch.id]?.text)).toEqual(['3', '2', '1']);
    expect(zeilen.map((z) => z.zellen[eingabe.id]?.text)).toEqual(['1', '3', '2']);
  });

  it('trägt den Platz als Option in ein Werkzeug – der ganze Sinn der Übung', () => {
    // Je Zeile den n-ten Buchstaben ziehen, wobei n der Platz nach Spalte A ist.
    const { blatt, a } = blattMit(['CAESAR', 'ANKER', 'BLUME']);
    const platz = neuePositionsspalte({ spalte: a, richtung: 'auf', art: 'text' });
    blatt.spalten.push(platz);
    const heraus = neueWerkzeugspalte(a, 'jedes-n');
    heraus.optionen['n'] = { art: 'fest', wert: 99 };
    heraus.optionen['versatz'] = { art: 'spalte', spalte: platz.id };
    blatt.spalten.push(heraus);
    // CAESAR Platz 3 -> E, ANKER Platz 1 -> A, BLUME Platz 2 -> L.
    expect(spalte(blatt, heraus.id)).toEqual(['E', 'A', 'L']);
    // Nach dem Ergebnis sortiert angezeigt: A, E, L.
    blatt.sortierung = { spalte: heraus.id, richtung: 'auf', art: 'text' };
    expect(spalte(blatt, heraus.id)).toEqual(['A', 'E', 'L']);
  });
});

describe('Alte Werkbank übernehmen', () => {
  it('macht aus Text und Schrittkette ein Blatt mit einer Zeile', () => {
    const blatt = ausAlterKette({
      eingabe: '... --- ...',
      schritte: [{ codecId: 'morse', richtung: 'decode', optionen: {}, aktiv: true }]
    });
    expect(blatt.zeilen).toHaveLength(1);
    expect(blatt.spalten).toHaveLength(2);
    const letzte = blatt.spalten[1]!;
    expect(rechne(blatt).zeilen[0]?.zellen[letzte.id]?.text).toBe('SOS');
  });

  it('zieht „Aus jedem Wort“ nach „Jeden n-ten“ um', () => {
    const a = neueEingabespalte();
    const alt: Werkzeugspalte = {
      art: 'werkzeug', id: 'x', quelle: a.id, codecId: 'aus-woertern', richtung: 'encode',
      optionen: { stelle: { art: 'fest', wert: -1 } }
    };
    const zeile = neueZeile(1);
    zeile.werte[a.id] = 'alle drei nun';
    const blatt = inHeutigerForm({ spalten: [a, alt], zeilen: [zeile] });
    const neu = blatt.spalten[1] as Werkzeugspalte;
    expect(neu.codecId).toBe('jedes-n');
    expect(rechne(blatt).zeilen[0]?.zellen.x?.text).toBe('ein');
  });

  it('macht Einstellungen aus einer Spalte wieder fest', () => {
    const a = neueEingabespalte();
    const b = neueEingabespalte();
    const alt: Werkzeugspalte = {
      art: 'werkzeug', id: 'x', quelle: a.id, codecId: 'zaehlen', richtung: 'encode',
      optionen: {
        suche: { art: 'spalte', spalte: b.id },
        schreibung: { art: 'spalte', spalte: b.id }
      }
    };
    const zeile = neueZeile(1);
    zeile.werte[a.id] = 'Anna';
    zeile.werte[b.id] = 'a';
    const blatt = inHeutigerForm({ spalten: [a, b, alt], zeilen: [zeile] });
    const neu = blatt.spalten[2] as Werkzeugspalte;
    // Das Suchzeichen sind Daten und bleiben an der Spalte, die Schreibung ist Einstellung.
    expect(neu.optionen.suche).toEqual({ art: 'spalte', spalte: b.id });
    expect(neu.optionen.schreibung).toEqual({ art: 'fest', wert: 'egal' });
    expect(rechne(blatt).zeilen[0]?.zellen.x?.text).toBe('2');
  });

  it('übergeht abgeschaltete Schritte', () => {
    const blatt = ausAlterKette({
      eingabe: 'SOS',
      schritte: [{ codecId: 'morse', richtung: 'encode', optionen: {}, aktiv: false }]
    });
    expect(blatt.spalten).toHaveLength(1);
  });
});

describe('Anzeige der Spalten', () => {
  it('zeigt ohne ausdrückliche Wahl das Bild', () => {
    // Ein Code steht auf dem Zettel als Bild; die Zeichenfolge ist nur die
    // Krücke fürs Tippen. Deshalb ist das Bild der Standard.
    const spalte = neueEingabespalte('morse');
    expect(zeigtBild(spalte)).toBe(true);
  });

  it('respektiert die Wahl in beide Richtungen', () => {
    const spalte = neueEingabespalte('morse');
    spalte.darstellung = 'zeichen';
    expect(zeigtBild(spalte)).toBe(false);
    spalte.darstellung = 'grafik';
    expect(zeigtBild(spalte)).toBe(true);
  });

  it('nennt die Tafel nur, wo der Inhalt wirklich im Code steht', () => {
    expect(anzeigetafel(neueEingabespalte('morse'))).toBe('morse');
    expect(anzeigetafel(neueEingabespalte())).toBeNull();
    const werkzeug = neueWerkzeugspalte('a', 'morse');
    // Entschlüsselt kommt Klartext heraus – der hat kein Bild.
    werkzeug.richtung = 'decode';
    expect(anzeigetafel(werkzeug)).toBeNull();
    werkzeug.richtung = 'encode';
    expect(anzeigetafel(werkzeug)).toBe('morse');
  });
});

describe('Begleitspalte zur Codetafel', () => {
  function blattMitEingabe() {
    const a = neueEingabespalte();
    return { blatt: { spalten: [a], zeilen: [neueZeile(1)] } as Blatt, a };
  }

  it('legt neben einer Tafelspalte die Entschlüsselung an', () => {
    const { blatt, a } = blattMitEingabe();
    a.tafel = 'morse';
    const begleiter = begleiteTafel(blatt, a);
    expect(begleiter).not.toBeNull();
    expect(blatt.spalten).toHaveLength(2);
    expect(blatt.spalten[1]).toBe(begleiter);
    expect(begleiter!.quelle).toBe(a.id);
    expect(begleiter!.codecId).toBe('morse');
    expect(begleiter!.richtung).toBe('decode');
  });

  it('setzt sie direkt daneben, nicht ans Ende', () => {
    const { blatt, a } = blattMitEingabe();
    const hinten = neueEingabespalte();
    blatt.spalten.push(hinten);
    a.tafel = 'morse';
    begleiteTafel(blatt, a);
    expect(blatt.spalten.map((s) => s.art)).toEqual(['eingabe', 'werkzeug', 'eingabe']);
    expect(blatt.spalten[2]).toBe(hinten);
  });

  it('stellt eine vorhandene Begleitspalte um, statt eine zweite anzulegen', () => {
    const { blatt, a } = blattMitEingabe();
    a.tafel = 'morse';
    const erste = begleiteTafel(blatt, a);
    a.tafel = 'braille';
    const zweite = begleiteTafel(blatt, a);
    expect(zweite).toBe(erste);
    expect(blatt.spalten).toHaveLength(2);
    expect(erste!.codecId).toBe('braille');
  });

  it('lässt eine von Hand angelegte Nachbarspalte in Ruhe', () => {
    // Sie zeigt auf dieselbe Quelle und entschlüsselt auch – trotzdem gehört
    // sie der Person und darf nicht zu Morse umgeschrieben werden.
    const { blatt, a } = blattMitEingabe();
    const fremd = neueWerkzeugspalte(a.id, 'caesar');
    blatt.spalten.push(fremd);
    a.tafel = 'morse';
    begleiteTafel(blatt, a);
    expect(blatt.spalten).toHaveLength(3);
    expect(blatt.spalten[1]?.art).toBe('werkzeug');
    expect(blatt.spalten[2]).toBe(fremd);
    expect(fremd.codecId).toBe('caesar');
  });

  it('legt für Klartext und reine Nachschlagecodes nichts an', () => {
    const { blatt, a } = blattMitEingabe();
    expect(begleiteTafel(blatt, a)).toBeNull();
    // Aus dem Fingeralphabet rechnet niemand etwas zurück.
    a.tafel = 'fingeralphabet';
    expect(begleiteTafel(blatt, a)).toBeNull();
    expect(blatt.spalten).toHaveLength(1);
  });

  it('rechnet danach sofort durch', () => {
    const { blatt, a } = blattMitEingabe();
    blatt.zeilen[0]!.werte[a.id] = '... --- ...';
    a.tafel = 'morse';
    const begleiter = begleiteTafel(blatt, a)!;
    expect(rechne(blatt).zeilen[0]?.zellen[begleiter.id]?.text).toBe('SOS');
  });
});

describe('Positionsspalte nach einer Spalte', () => {
  function blattMit(werte: string[]) {
    const blatt = leeresBlatt();
    const eingabe = blatt.spalten[0]!;
    blatt.zeilen = werte.map((wert, i) => ({ ...neueZeile(i + 1), werte: { [eingabe.id]: wert } }));
    const platz = neuePositionsspalte();
    blatt.spalten.push(platz);
    return { blatt, eingabe, platz };
  }
  const plaetze = (blatt: Blatt, spalteId: string) =>
    rechne(blatt).zeilen.map((z) => z.zellen[spalteId]?.text);

  it('zählt den Platz nach einer Spalte, ohne die Anzeige umzusortieren', () => {
    const { blatt, eingabe, platz } = blattMit(['CHARLIE', 'ALPHA', 'BRAVO']);
    platz.nach = { spalte: eingabe.id, art: 'text', richtung: 'auf' };
    const berechnung = rechne(blatt);
    // Die Tabelle bleibt in Eingabereihenfolge …
    expect(berechnung.zeilen.map((z) => z.zeile.nummer)).toEqual([1, 2, 3]);
    // … die Spalte sagt, wo jede Zeile alphabetisch stünde.
    expect(plaetze(blatt, platz.id)).toEqual(['3', '1', '2']);
  });

  it('kennt Sortierart und Richtung', () => {
    const { blatt, eingabe, platz } = blattMit(['10', '9', '100']);
    platz.nach = { spalte: eingabe.id, art: 'zahl', richtung: 'auf' };
    expect(plaetze(blatt, platz.id)).toEqual(['2', '1', '3']);
    platz.nach = { spalte: eingabe.id, art: 'zahl', richtung: 'ab' };
    expect(plaetze(blatt, platz.id)).toEqual(['2', '3', '1']);
    platz.nach = { spalte: eingabe.id, art: 'laenge', richtung: 'auf' };
    expect(plaetze(blatt, platz.id)).toEqual(['2', '1', '3']);
  });

  it('lässt bei Gleichstand die Eingabereihenfolge entscheiden', () => {
    const { blatt, eingabe, platz } = blattMit(['B', 'A', 'B', 'A']);
    platz.nach = { spalte: eingabe.id, art: 'text', richtung: 'auf' };
    expect(plaetze(blatt, platz.id)).toEqual(['3', '1', '4', '2']);
  });

  it('meldet einen Ring, statt sich aufzuhängen', () => {
    const { blatt, platz } = blattMit(['X', 'Y']);
    // Eine Werkzeugspalte auf der Position – und die Position zählt nach ihr.
    const werkzeug = neueWerkzeugspalte(platz.id, 'laenge');
    blatt.spalten.push(werkzeug);
    platz.nach = { spalte: werkzeug.id, art: 'zahl', richtung: 'auf' };
    const berechnung = rechne(blatt);
    expect(berechnung.zeilen[0]?.zellen[platz.id]?.fehler).toContain('Ringbezug');
  });
});

describe('Ältere Blätter', () => {
  it('werden aus Sortierschritten in die heutige Form gebracht', () => {
    const { blatt, a } = blattMit(['C', 'A', 'B']);
    const alt = {
      ...blatt,
      spalten: [
        ...blatt.spalten,
        { art: 'position', id: 'p0', ordnung: 0 },
        { art: 'position', id: 'p1', ordnung: 1 }
      ],
      sortierungen: [{ id: 's1', spalte: a, richtung: 'ab', art: 'text' }]
    } as unknown as Blatt;
    const neu = inHeutigerForm(alt);
    // Die Anzeige sortiert wie der letzte Schritt …
    expect(neu.sortierung).toEqual({ spalte: a, richtung: 'ab', art: 'text' });
    expect('sortierungen' in neu).toBe(false);
    // … „Platz in der Eingabe“ bleibt, „Platz nach Schritt 1“ zählt nach dessen Spalte.
    expect(neu.spalten[1]).toEqual({ art: 'position', id: 'p0' });
    expect(neu.spalten[2]).toEqual({
      art: 'position',
      id: 'p1',
      nach: { spalte: a, richtung: 'ab', art: 'text' }
    });
    // Angezeigt absteigend (C, B, A) – und nach genau dieser Sortierung gezählt.
    expect(spalte(neu, 'p1')).toEqual(['1', '2', '3']);
  });

  it('lassen ein heutiges Blatt, wie es ist', () => {
    const { blatt, a } = blattMit(['X']);
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'zahl' };
    expect(inHeutigerForm(blatt)).toEqual(blatt);
  });
});

describe('Zweite Sortierspalte bei Gleichstand', () => {
  /** Zwei Eingabespalten: Nachname und Vorname. */
  function namen() {
    const { blatt, a } = blattMit(['MEIER', 'ADAM', 'MEIER', 'ADAM']);
    const b = neueEingabespalte();
    blatt.spalten.push(b);
    ['PAUL', 'ZOE', 'ANNA', 'BEN'].forEach((vorname, i) => (blatt.zeilen[i]!.werte[b.id] = vorname));
    return { blatt, a, b: b.id };
  }

  it('entscheidet in der Anzeige, wo die erste Spalte gleich ist', () => {
    const { blatt, a, b } = namen();
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'text' };
    // Ohne zweite Stufe bleibt bei Gleichstand die Eingabereihenfolge.
    expect(rechne(blatt).zeilen.map((z) => z.zeile.nummer)).toEqual([2, 4, 1, 3]);
    blatt.sortierung.dann = { spalte: b, richtung: 'auf', art: 'text' };
    expect(rechne(blatt).zeilen.map((z) => z.zeile.nummer)).toEqual([4, 2, 3, 1]);
    blatt.sortierung.dann = { spalte: b, richtung: 'ab', art: 'text' };
    expect(rechne(blatt).zeilen.map((z) => z.zeile.nummer)).toEqual([2, 4, 1, 3]);
  });

  it('gilt genauso für eine Positionsspalte', () => {
    const { blatt, a, b } = namen();
    const platz = neuePositionsspalte({
      spalte: a,
      richtung: 'auf',
      art: 'text',
      dann: { spalte: b, richtung: 'auf', art: 'text' }
    });
    blatt.spalten.push(platz);
    // MEIER PAUL, ADAM ZOE, MEIER ANNA, ADAM BEN → 4, 2, 3, 1
    expect(spalte(blatt, platz.id)).toEqual(['4', '2', '3', '1']);
  });

  it('übergeht eine zweite Stufe, deren Spalte es nicht mehr gibt', () => {
    const { blatt, a } = namen();
    blatt.sortierung = { spalte: a, richtung: 'auf', art: 'text', dann: { spalte: 'weg', richtung: 'auf', art: 'text' } };
    expect(rechne(blatt).zeilen.map((z) => z.zeile.nummer)).toEqual([2, 4, 1, 3]);
  });

  it('meldet einen Ring auch über die zweite Stufe', () => {
    const { blatt, a } = namen();
    const platz = neuePositionsspalte();
    blatt.spalten.push(platz);
    const werkzeug = neueWerkzeugspalte(platz.id, 'laenge');
    blatt.spalten.push(werkzeug);
    platz.nach = { spalte: a, richtung: 'auf', art: 'text', dann: { spalte: werkzeug.id, richtung: 'auf', art: 'zahl' } };
    expect(rechne(blatt).zeilen[0]?.zellen[platz.id]?.fehler).toContain('Ringbezug');
  });
});

describe('Sortierung ohne eine gelöschte Spalte', () => {
  const erste = { spalte: 'a', richtung: 'auf', art: 'text' } as const;
  const zweite = { spalte: 'b', richtung: 'ab', art: 'zahl' } as const;

  it('lässt die erste Stufe, wenn die zweite wegfällt', () => {
    expect(sortierungOhne({ ...erste, dann: zweite }, 'b')).toEqual(erste);
  });

  it('rückt die zweite Stufe nach, wenn die erste wegfällt', () => {
    expect(sortierungOhne({ ...erste, dann: zweite }, 'a')).toEqual(zweite);
  });

  it('sortiert gar nicht mehr, wenn nichts übrig bleibt', () => {
    expect(sortierungOhne(erste, 'a')).toBeUndefined();
    expect(sortierungOhne(undefined, 'a')).toBeUndefined();
  });

  it('lässt eine Sortierung ohne diese Spalte, wie sie ist', () => {
    expect(sortierungOhne({ ...erste, dann: zweite }, 'c')).toEqual({ ...erste, dann: zweite });
  });
});

describe('Tafel wechseln', () => {
  function spalteMit(...texte: string[]) {
    const spalte = neueEingabespalte();
    const blatt: Blatt = {
      spalten: [spalte],
      zeilen: texte.map((text, i) => {
        const zeile = neueZeile(i + 1);
        zeile.werte[spalte.id] = text;
        return zeile;
      })
    };
    return { blatt, spalte, werte: () => blatt.zeilen.map((z) => z.werte[spalte.id]) };
  }

  it('wandelt Klartext in die neue Tafel um und legt die Entschlüsselung daneben', () => {
    const { blatt, spalte, werte } = spalteMit('SOS', 'HALLO');
    expect(wechsleTafel(blatt, spalte, 'braille')).toBe(0);
    expect(werte()).toEqual(['⠎⠕⠎', '⠓⠁⠇⠇⠕']);
    const daneben = blatt.spalten[1];
    expect(daneben?.art === 'werkzeug' && daneben.codecId).toBe('braille');
    expect(rechne(blatt).zeilen.map((z) => z.zellen[daneben?.id ?? '']?.text)).toEqual(['SOS', 'HALLO']);
  });

  it('wandelt von Code zu Code und zurück zu Klartext', () => {
    const { blatt, spalte, werte } = spalteMit('SOS');
    wechsleTafel(blatt, spalte, 'morse');
    expect(werte()).toEqual(['... --- ...']);
    wechsleTafel(blatt, spalte, 'braille');
    expect(werte()).toEqual(['⠎⠕⠎']);
    wechsleTafel(blatt, spalte, undefined);
    expect(werte()).toEqual(['SOS']);
    expect(spalte.tafel).toBeUndefined();
    // Die Entschlüsselung daneben hat nichts mehr zu tun und ist weg.
    expect(blatt.spalten).toHaveLength(1);
  });

  it('lässt die Entschlüsselung stehen, wenn etwas auf ihr aufbaut', () => {
    const { blatt, spalte } = spalteMit('SOS');
    wechsleTafel(blatt, spalte, 'morse');
    const daneben = blatt.spalten[1]!;
    blatt.spalten.push(neueWerkzeugspalte(daneben.id, 'caesar'));
    wechsleTafel(blatt, spalte, undefined);
    expect(blatt.spalten).toHaveLength(3);
  });

  it('lässt Zellen stehen, die sich nicht vollständig umwandeln lassen', () => {
    const { blatt, spalte, werte } = spalteMit('SOS', 'A€B', '');
    expect(wechsleTafel(blatt, spalte, 'morse')).toBe(1);
    expect(werte()).toEqual(['... --- ...', 'A€B', '']);
  });
});
