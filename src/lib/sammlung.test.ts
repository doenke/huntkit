import { describe, expect, it } from 'vitest';
import { leeresBlatt, type Blatt } from './blatt';
import {
  aktiveWerkbank,
  amOrt,
  ausGespeichertem,
  entferne,
  freierName,
  neueWerkbank,
  oeffne,
  uebernimm,
  werkbankAmOrt,
  type Sammlung
} from './sammlung';

function sammlungMit(...namen: string[]): Sammlung {
  const werkbaenke = namen.map((name) => neueWerkbank(name));
  return { aktiv: werkbaenke[0]!.id, werkbaenke };
}

/** Ein Blatt mit einem Wert in der ersten Zelle – genug, um Stände zu unterscheiden. */
function mitWert(wert: string): Blatt {
  const blatt = leeresBlatt();
  blatt.zeilen[0]!.werte[blatt.spalten[0]!.id] = wert;
  return blatt;
}

describe('Automatisch speichern', () => {
  it('schreibt jede Änderung sofort in die aktive Werkbank', () => {
    const sammlung = sammlungMit('Eins', 'Zwei');
    const stand = mitWert('HALLO');
    expect(uebernimm(sammlung, stand, 1000)).toBe(true);
    expect(aktiveWerkbank(sammlung).blatt).toEqual(stand);
    expect(aktiveWerkbank(sammlung).geaendert).toBe(1000);
    // Die andere Werkbank bleibt unberührt.
    expect(sammlung.werkbaenke[1]!.blatt).not.toEqual(stand);
  });

  it('meldet nichts, wenn sich nichts geändert hat', () => {
    const sammlung = sammlungMit('Eins');
    const stand = mitWert('X');
    uebernimm(sammlung, stand, 1000);
    expect(uebernimm(sammlung, structuredClone(stand), 2000)).toBe(false);
    expect(aktiveWerkbank(sammlung).geaendert).toBe(1000);
  });

  it('entkoppelt den gespeicherten Stand von der Arbeitskopie', () => {
    const sammlung = sammlungMit('Eins');
    const stand = mitWert('A');
    uebernimm(sammlung, stand);
    stand.zeilen[0]!.werte[stand.spalten[0]!.id] = 'B';
    expect(aktiveWerkbank(sammlung).blatt).toEqual(mitWertGleich('A', stand));
  });
});

/** Dasselbe Blatt wie `vorlage`, nur mit anderem Wert – Kennungen bleiben gleich. */
function mitWertGleich(wert: string, vorlage: Blatt): Blatt {
  const kopie = structuredClone(vorlage);
  kopie.zeilen[0]!.werte[kopie.spalten[0]!.id] = wert;
  return kopie;
}

describe('Verwaltung', () => {
  it('vergibt freie Namen', () => {
    const sammlung = sammlungMit('Werkbank 1', 'Werkbank 2');
    expect(freierName(sammlung)).toBe('Werkbank 3');
    expect(freierName(sammlung, 'Station am Hafen')).toBe('Station am Hafen');
    sammlung.werkbaenke.push(neueWerkbank('Station am Hafen'));
    expect(freierName(sammlung, 'Station am Hafen')).toBe('Station am Hafen 4');
  });

  it('wechselt beim Löschen der aktiven zur nächsten', () => {
    const sammlung = sammlungMit('Eins', 'Zwei', 'Drei');
    const [eins, zwei] = sammlung.werkbaenke;
    sammlung.aktiv = zwei!.id;
    entferne(sammlung, zwei!.id);
    expect(sammlung.werkbaenke.map((w) => w.name)).toEqual(['Eins', 'Drei']);
    expect(aktiveWerkbank(sammlung).name).toBe('Drei');
    entferne(sammlung, eins!.id);
    expect(aktiveWerkbank(sammlung).name).toBe('Drei');
  });

  it('lässt nie gar keine Werkbank übrig', () => {
    const sammlung = sammlungMit('Einzige');
    entferne(sammlung, sammlung.werkbaenke[0]!.id);
    expect(sammlung.werkbaenke).toHaveLength(1);
    expect(sammlung.aktiv).toBe(sammlung.werkbaenke[0]!.id);
  });
});

describe('Laden', () => {
  it('macht aus dem einen Blatt von früher die erste Werkbank', () => {
    const alt = mitWert('VON FRÜHER');
    const sammlung = ausGespeichertem(null, alt);
    expect(sammlung.werkbaenke).toHaveLength(1);
    expect(sammlung.werkbaenke[0]!.name).toBe('Werkbank 1');
    expect(sammlung.werkbaenke[0]!.blatt).toEqual(alt);
  });

  it('übersteht Kaputtes', () => {
    expect(ausGespeichertem({ werkbaenke: 'quatsch' }).werkbaenke).toHaveLength(1);
    expect(ausGespeichertem(null).werkbaenke).toHaveLength(1);
  });

  it('liest einen gespeicherten Stand zurück', () => {
    const sammlung = sammlungMit('Eins', 'Zwei');
    sammlung.aktiv = sammlung.werkbaenke[1]!.id;
    sammlung.werkbaenke[1]!.blatt = mitWert('ZWEI');
    const gelesen = ausGespeichertem(JSON.parse(JSON.stringify(sammlung)));
    expect(gelesen).toEqual(sammlung);
  });

  it('macht einen Entwurf von früher zum Stand der Werkbank', () => {
    // Als sich automatisches Speichern noch abschalten ließ, lag ungespeicherte
    // Arbeit als Entwurf neben dem Stand. Sie ist das Neueste und geht nicht verloren.
    const sammlung = sammlungMit('Eins');
    const alt = { ...JSON.parse(JSON.stringify(sammlung)), automatisch: false };
    const entwurf = mitWert('OFFEN');
    alt.werkbaenke[0].entwurf = entwurf;
    const gelesen = ausGespeichertem(alt);
    expect(gelesen.werkbaenke[0]!.blatt).toEqual(entwurf);
    expect(gelesen.werkbaenke[0]).not.toHaveProperty('entwurf');
    expect(gelesen).not.toHaveProperty('automatisch');
  });
});

describe('Orte: dieses Gerät und Gruppen', () => {
  function gemischt(): Sammlung {
    const sammlung = sammlungMit('Lokal alt', 'Lokal neu', 'Gruppe A', 'Gruppe B');
    const [alt, neu, a, b] = sammlung.werkbaenke;
    alt!.geaendert = 1;
    neu!.geaendert = 2;
    a!.gruppe = 'g1';
    a!.geaendert = 3;
    b!.gruppe = 'g1';
    b!.geaendert = 4;
    return sammlung;
  }

  it('ordnet Werkbänke ihrem Ort zu', () => {
    const [lokal, , inGruppe] = gemischt().werkbaenke;
    expect(amOrt(lokal!, null)).toBe(true);
    expect(amOrt(lokal!, 'g1')).toBe(false);
    expect(amOrt(inGruppe!, 'g1')).toBe(true);
    expect(amOrt(inGruppe!, null)).toBe(false);
  });

  it('öffnet am Ort ohne Merker die zuletzt geänderte', () => {
    const sammlung = gemischt();
    expect(werkbankAmOrt(sammlung, null)?.name).toBe('Lokal neu');
    expect(werkbankAmOrt(sammlung, 'g1')?.name).toBe('Gruppe B');
    expect(werkbankAmOrt(sammlung, 'g2')).toBeUndefined();
  });

  it('merkt sich je Ort die zuletzt offene', () => {
    const sammlung = gemischt();
    oeffne(sammlung, sammlung.werkbaenke[0]!.id);
    oeffne(sammlung, sammlung.werkbaenke[2]!.id);
    expect(aktiveWerkbank(sammlung).name).toBe('Gruppe A');
    expect(werkbankAmOrt(sammlung, null)?.name).toBe('Lokal alt');
    expect(werkbankAmOrt(sammlung, 'g1')?.name).toBe('Gruppe A');
  });

  it('behält die Merker beim Speichern, verwirft kaputte', () => {
    const sammlung = gemischt();
    oeffne(sammlung, sammlung.werkbaenke[2]!.id);
    const roh = JSON.parse(JSON.stringify(sammlung));
    roh.zuletzt.kaputt = 7;
    const gelesen = ausGespeichertem(roh);
    expect(gelesen.zuletzt).toEqual({ g1: sammlung.werkbaenke[2]!.id });
  });
});
