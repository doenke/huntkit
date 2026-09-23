import { describe, expect, it } from 'vitest';
import { leeresBlatt, type Blatt } from './blatt';
import {
  aktiveWerkbank,
  arbeitsstand,
  ausGespeichertem,
  entferne,
  freierName,
  neueWerkbank,
  speichere,
  uebernimm,
  type Sammlung
} from './sammlung';

function sammlungMit(...namen: string[]): Sammlung {
  const werkbaenke = namen.map((name) => neueWerkbank(name));
  return { aktiv: werkbaenke[0]!.id, werkbaenke, automatisch: true };
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
    expect(arbeitsstand(aktiveWerkbank(sammlung))).toEqual(mitWertGleich('A', stand));
  });
});

/** Dasselbe Blatt wie `vorlage`, nur mit anderem Wert – Kennungen bleiben gleich. */
function mitWertGleich(wert: string, vorlage: Blatt): Blatt {
  const kopie = structuredClone(vorlage);
  kopie.zeilen[0]!.werte[kopie.spalten[0]!.id] = wert;
  return kopie;
}

describe('Ohne automatisches Speichern', () => {
  it('sammelt Änderungen als Entwurf, bis gespeichert wird', () => {
    const sammlung = sammlungMit('Eins');
    sammlung.automatisch = false;
    const werkbank = aktiveWerkbank(sammlung);
    const vorher = structuredClone(werkbank.blatt);
    const stand = mitWertGleich('NEU', vorher);

    expect(uebernimm(sammlung, stand)).toBe(true);
    expect(werkbank.blatt).toEqual(vorher);
    expect(werkbank.entwurf).toEqual(stand);
    expect(arbeitsstand(werkbank)).toEqual(stand);

    speichere(werkbank, 5000);
    expect(werkbank.blatt).toEqual(stand);
    expect(werkbank.entwurf).toBeUndefined();
    expect(werkbank.geaendert).toBe(5000);
  });

  it('lässt den Entwurf verschwinden, wenn alles wieder wie gespeichert ist', () => {
    const sammlung = sammlungMit('Eins');
    sammlung.automatisch = false;
    const werkbank = aktiveWerkbank(sammlung);
    const gespeichert = structuredClone(werkbank.blatt);
    uebernimm(sammlung, mitWertGleich('ZWISCHENDURCH', gespeichert));
    expect(werkbank.entwurf).toBeDefined();
    uebernimm(sammlung, structuredClone(gespeichert));
    expect(werkbank.entwurf).toBeUndefined();
  });

  it('übernimmt einen offenen Entwurf, sobald wieder automatisch gespeichert wird', () => {
    const sammlung = sammlungMit('Eins');
    sammlung.automatisch = false;
    const werkbank = aktiveWerkbank(sammlung);
    const stand = mitWertGleich('ENTWURF', werkbank.blatt);
    uebernimm(sammlung, stand);
    sammlung.automatisch = true;
    uebernimm(sammlung, stand);
    expect(werkbank.blatt).toEqual(stand);
    expect(werkbank.entwurf).toBeUndefined();
  });
});

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
    expect(sammlung.automatisch).toBe(true);
  });

  it('übersteht Kaputtes', () => {
    expect(ausGespeichertem({ werkbaenke: 'quatsch' }).werkbaenke).toHaveLength(1);
    expect(ausGespeichertem(null).werkbaenke).toHaveLength(1);
  });

  it('liest einen gespeicherten Stand samt Entwurf und Einstellung zurück', () => {
    const sammlung = sammlungMit('Eins', 'Zwei');
    sammlung.aktiv = sammlung.werkbaenke[1]!.id;
    sammlung.automatisch = false;
    sammlung.werkbaenke[1]!.entwurf = mitWert('OFFEN');
    const gelesen = ausGespeichertem(JSON.parse(JSON.stringify(sammlung)));
    expect(gelesen).toEqual(sammlung);
  });
});
