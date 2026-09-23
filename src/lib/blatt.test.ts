import { describe, expect, it } from 'vitest';
import {
  anzeigetafel,
  ausAlterKette,
  begleiteTafel,
  leeresBlatt,
  neueEingabespalte,
  neuePositionsspalte,
  neueWerkzeugspalte,
  neueZeile,
  rechne,
  spaltenzeichen,
  zeigtBild,
  type Blatt,
  type SpaltenId
} from './blatt';

/** Ein Blatt mit einer gefüllten Eingabespalte – der Anfang jeder Arbeit. */
function blattMit(texte: string[]): { blatt: Blatt; a: SpaltenId } {
  const a = neueEingabespalte();
  const zeilen = texte.map((text, i) => {
    const zeile = neueZeile(i + 1);
    zeile.werte[a.id] = text;
    return zeile;
  });
  return { blatt: { spalten: [a], zeilen, sortierungen: [] }, a: a.id };
}

function spalte(blatt: Blatt, id: SpaltenId, ordnung?: number): string[] {
  return rechne(blatt, ordnung).zeilen.map((z) => z.zellen[id]?.text ?? '');
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
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'text' });
    const nachher = rechne(blatt);
    expect(nachher.zeilen.map((z) => z.zellen[a]?.text)).toEqual(['ANKER', 'BLUME', 'CAESAR']);
    expect([...nachher.zeilen.map((z) => z.zellen[a]?.text)].sort()).toEqual([...vorher].sort());
  });

  it('behält die Eingabenummer, damit man die Zeile wiederfindet', () => {
    const { blatt, a } = blattMit(['CAESAR', 'ANKER', 'BLUME']);
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'text' });
    const zeilen = rechne(blatt).zeilen;
    expect(zeilen.map((z) => z.zeile.nummer)).toEqual([2, 3, 1]);
    // Platz jetzt und Platz davor – daraus wird die Verschiebung in der Anzeige.
    expect(zeilen.map((z) => `${z.vorher}->${z.platz}`)).toEqual(['2->1', '3->2', '1->3']);
  });

  it('sortiert nach Zahl, nach Länge und absteigend', () => {
    const { blatt, a } = blattMit(['9', '11', '2']);
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'zahl' });
    expect(spalte(blatt, a)).toEqual(['2', '9', '11']);
    blatt.sortierungen[0] = { id: 's1', spalte: a, richtung: 'ab', art: 'zahl' };
    expect(spalte(blatt, a)).toEqual(['11', '9', '2']);
    blatt.sortierungen[0] = { id: 's1', spalte: a, richtung: 'auf', art: 'text' };
    expect(spalte(blatt, a)).toEqual(['11', '2', '9']);
    blatt.sortierungen[0] = { id: 's1', spalte: a, richtung: 'auf', art: 'laenge' };
    expect(spalte(blatt, a)).toEqual(['9', '2', '11']);
  });

  it('stellt Leeres immer hinten an, in beide Richtungen', () => {
    const { blatt, a } = blattMit(['B', '', 'A']);
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'text' });
    expect(spalte(blatt, a)).toEqual(['A', 'B', '']);
    blatt.sortierungen[0] = { id: 's1', spalte: a, richtung: 'ab', art: 'text' };
    expect(spalte(blatt, a)).toEqual(['B', 'A', '']);
  });

  it('ist stabil: bei Gleichstand bleibt die vorherige Reihenfolge', () => {
    const { blatt, a } = blattMit(['GLEICH', 'GLEICH', 'GLEICH']);
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'text' });
    expect(rechne(blatt).zeilen.map((z) => z.zeile.nummer)).toEqual([1, 2, 3]);
  });

  it('zeigt auf Wunsch eine frühere Ordnung', () => {
    const { blatt, a } = blattMit(['C', 'A', 'B']);
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'text' });
    expect(spalte(blatt, a, 0)).toEqual(['C', 'A', 'B']);
    expect(spalte(blatt, a, 1)).toEqual(['A', 'B', 'C']);
  });
});

describe('Positionsspalte', () => {
  it('liefert den Platz in einer bestimmten Ordnung', () => {
    const { blatt, a } = blattMit(['C', 'A', 'B']);
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'text' });
    const p0 = neuePositionsspalte(0);
    const p1 = neuePositionsspalte(1);
    blatt.spalten.push(p0, p1);
    const zeilen = rechne(blatt).zeilen;
    // Angezeigt wird nach S1: A, B, C. In der Eingabe standen sie als C, A, B.
    expect(zeilen.map((z) => z.zellen[p1.id]?.text)).toEqual(['1', '2', '3']);
    expect(zeilen.map((z) => z.zellen[p0.id]?.text)).toEqual(['2', '3', '1']);
  });

  it('trägt den Platz als Option in ein Werkzeug – der ganze Sinn der Übung', () => {
    // Erst nach Spalte A sortieren, dann je Zeile den n-ten Buchstaben ziehen,
    // wobei n der Platz nach dieser Sortierung ist.
    const { blatt, a } = blattMit(['CAESAR', 'ANKER', 'BLUME']);
    blatt.sortierungen.push({ id: 's1', spalte: a, richtung: 'auf', art: 'text' });
    const platz = neuePositionsspalte(1);
    blatt.spalten.push(platz);
    const heraus = neueWerkzeugspalte(a, 'jedes-n');
    heraus.optionen['n'] = { art: 'fest', wert: 99 };
    heraus.optionen['versatz'] = { art: 'spalte', spalte: platz.id };
    blatt.spalten.push(heraus);
    // ANKER Platz 1 -> A, BLUME Platz 2 -> L, CAESAR Platz 3 -> E: „ALE“.
    expect(spalte(blatt, heraus.id)).toEqual(['A', 'L', 'E']);
  });

  it('meldet einen Ringbezug, statt sich aufzuhängen', () => {
    const { blatt, a } = blattMit(['B', 'A']);
    const platz = neuePositionsspalte(1);
    blatt.spalten.push(platz);
    // Schritt 1 sortiert nach einer Spalte, die ihrerseits Schritt 1 braucht.
    blatt.sortierungen.push({ id: 's1', spalte: platz.id, richtung: 'auf', art: 'zahl' });
    const ergebnis = rechne(blatt);
    expect(ergebnis.fehler.join(' ')).toContain('Sortierschritt 1');
    expect(ergebnis.zeilen).toHaveLength(2);
    expect(spalte(blatt, a)).toEqual(['B', 'A']);
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
    return { blatt: { spalten: [a], zeilen: [neueZeile(1)], sortierungen: [] } as Blatt, a };
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
    const platz = neuePositionsspalte(0);
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
