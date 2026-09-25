import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Blatt } from '../werkbank/blatt';
import { wortschluessel, zustandAus } from '../kreuzwort/kreuzwortgruppe';
import type { Abruf, ServerAenderung } from './api';
import { Gruppenabgleich } from './verbindung';

/**
 * Ein nachgebauter Server mit demselben Verhalten wie der PHP-Teil:
 * fortlaufende Nummer je Gruppe, die letzte Änderung gewinnt, Doppeltes zählt einmal.
 */
function nachgebauterServer() {
  let seq = 0;
  const stand = new Map<string, ServerAenderung>();
  const ops = new Map<string, number>();
  let erreichbar = true;
  const mitglieder: Record<string, number> = { anna: 1, bernd: 2 };

  const abruf = (wer: string): Abruf => async (adresse, init) => {
    if (!erreichbar) throw new TypeError('offline');
    const url = new URL(adresse, 'https://x/');
    const json = (daten: unknown, status = 200) =>
      new Response(JSON.stringify(daten), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.pathname.endsWith('konto.php')) return json({ oidc: false, echtzeit: 'polling', ich: null });
    if (url.pathname.endsWith('gruppen.php')) {
      return json({
        id: 'g', name: 'Team', einladung: 'e', rolle: 'mitglied', ich: mitglieder[wer],
        mitglieder: [{ id: 1, name: 'Anna', art: 'gast', rolle: 'gast', avatar: null }, { id: 2, name: 'Bernd', art: 'gast', rolle: 'gast', avatar: null }],
        ehemalige: []
      });
    }
    if (init?.method === 'POST') {
      const koerper = JSON.parse(String(init.body)) as { aenderungen: Array<{ op: string; werkbank: string; schluessel: string; wert: unknown }> };
      const bestaetigt = koerper.aenderungen.map((a) => {
        const bekannt = ops.get(a.op);
        if (bekannt) return { op: a.op, seq: bekannt };
        seq++;
        ops.set(a.op, seq);
        stand.set(`${a.werkbank}|${a.schluessel}`, { werkbank: a.werkbank, schluessel: a.schluessel, wert: a.wert, seq, von: mitglieder[wer] as number, zeit: 0 });
        return { op: a.op, seq };
      });
      return json({ bestaetigt, seq });
    }
    const seit = Number(url.searchParams.get('seit'));
    return json({ seq, weiter: false, aenderungen: [...stand.values()].filter((a) => a.seq > seit).sort((a, b) => a.seq - b.seq) });
  };
  return { abruf, setzeErreichbar: (w: boolean) => (erreichbar = w), stand };
}

function geraet(server: ReturnType<typeof nachgebauterServer>, wer: string) {
  const empfangen = new Map<string, { blatt: Blatt; name: string }>();
  const fremd: ServerAenderung[] = [];
  const a = new Gruppenabgleich(
    { werkbank: (_, w, s) => empfangen.set(w, s), fremd: (_, liste) => fremd.push(...liste), zustand: () => {} },
    server.abruf(wer),
    { gruppen: {} }
  );
  a.start();
  a.aufnehmen('g', 'Team', 'token');
  a.setzeAktiv('g');
  return { a, empfangen, fremd };
}

const BLATT: Blatt = {
  spalten: [{ art: 'eingabe', id: 's' }],
  zeilen: [{ id: 'r1', nummer: 1, werte: { s: '' } }]
};

function mitWert(blatt: Blatt, wert: string): Blatt {
  const neu = structuredClone(blatt);
  (neu.zeilen[0] as { werte: Record<string, string> }).werte.s = wert;
  return neu;
}

describe('Abgleich zweier Geräte', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('eine Zelle von Anna kommt bei Bernd an, samt Absender', async () => {
    const server = nachgebauterServer();
    const anna = geraet(server, 'anna');
    const bernd = geraet(server, 'bernd');
    await vi.advanceTimersByTimeAsync(100);

    anna.a.lokal('g', 'w1', mitWert(BLATT, 'SOS'), 'Station 1');
    await vi.advanceTimersByTimeAsync(3000);

    const bei = bernd.empfangen.get('w1');
    expect(bei?.name).toBe('Station 1');
    expect(bei?.blatt.zeilen[0]?.werte.s).toBe('SOS');
    expect(bernd.fremd.some((f) => f.schluessel === 'z/r1/s' && f.von === 1)).toBe(true);
    expect(bernd.a.eintrag('g', 'w1', 'z/r1/s')?.von).toBe(1);
    // Bei Anna selbst ist es bestätigt und stammt von ihr.
    expect(anna.a.eintrag('g', 'w1', 'z/r1/s')?.von).toBe(1);
    expect(anna.a.status.g?.ausstehend).toBe(0);
    anna.a.stopp();
    bernd.a.stopp();
  });

  it('eigenes Tippen springt nicht zurück, wenn Fremdes ankommt', async () => {
    const server = nachgebauterServer();
    const anna = geraet(server, 'anna');
    const bernd = geraet(server, 'bernd');
    await vi.advanceTimersByTimeAsync(100);
    anna.a.lokal('g', 'w1', BLATT, 'W');
    await vi.advanceTimersByTimeAsync(3000);

    // Bernd ist offline und tippt; Anna schreibt derweil in dieselbe Zelle.
    server.setzeErreichbar(false);
    bernd.a.lokal('g', 'w1', mitWert(BLATT, 'BERND'), 'W');
    server.setzeErreichbar(true);
    anna.a.lokal('g', 'w1', mitWert(BLATT, 'ANNA'), 'W');
    await vi.advanceTimersByTimeAsync(200);
    // Bernds Ansicht zeigt seinen eigenen, noch ausstehenden Wert.
    expect(bernd.a.werkbaenke('g').find((w) => w.id === 'w1')?.blatt.zeilen[0]?.werte.s).toBeDefined();

    await vi.advanceTimersByTimeAsync(40_000);
    // Beide sind durch; es gewinnt, wer später beim Server war – und beide sehen dasselbe.
    const beiAnna = anna.a.werkbaenke('g')[0]?.blatt.zeilen[0]?.werte.s;
    const beiBernd = bernd.a.werkbaenke('g')[0]?.blatt.zeilen[0]?.werte.s;
    expect(beiAnna).toBe(beiBernd);
    expect(server.stand.get('w1|z/r1/s')?.wert).toBe(beiAnna);
    anna.a.stopp();
    bernd.a.stopp();
  });

  it('ohne Netz bleibt der Ausgang und geht später raus', async () => {
    const server = nachgebauterServer();
    server.setzeErreichbar(false);
    const anna = geraet(server, 'anna');
    anna.a.lokal('g', 'w1', mitWert(BLATT, 'OFFLINE'), 'W');
    await vi.advanceTimersByTimeAsync(5000);
    expect(anna.a.status.g?.verbindung).toBe('offline');
    expect(anna.a.status.g?.ausstehend).toBeGreaterThan(0);

    server.setzeErreichbar(true);
    anna.a.wiederOnline();
    await vi.advanceTimersByTimeAsync(3000);
    expect(anna.a.status.g?.ausstehend).toBe(0);
    expect(server.stand.get('w1|z/r1/s')?.wert).toBe('OFFLINE');
    anna.a.stopp();
  });

  it('zehn Tastendrücke vor dem Senden sind eine Änderung', async () => {
    const server = nachgebauterServer();
    const anna = geraet(server, 'anna');
    await vi.advanceTimersByTimeAsync(100);
    anna.a.lokal('g', 'w1', BLATT, 'W');
    await vi.advanceTimersByTimeAsync(3000);
    const vorher = server.stand.size;
    let text = '';
    for (const z of 'HALLOWELT!') {
      text += z;
      anna.a.lokal('g', 'w1', mitWert(BLATT, text), 'W');
    }
    await vi.advanceTimersByTimeAsync(3000);
    expect(server.stand.size).toBe(vorher + 1);
    expect(server.stand.get('w1|z/r1/s')?.seq).toBe(Math.max(...[...server.stand.values()].map((a) => a.seq)));
    anna.a.stopp();
  });
});

describe('Takt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('Tippen während eines Abrufs wird nicht auf den Ruhetakt verschoben', async () => {
    const server = nachgebauterServer();
    let langsam = false;
    let freigeben: () => void = () => {};
    const abruf: Abruf = async (adresse, init) => {
      if (langsam && !init?.method?.startsWith('P') && adresse.includes('abgleich')) {
        await new Promise<void>((r) => (freigeben = r));
      }
      return server.abruf('anna')(adresse, init);
    };
    const a = new Gruppenabgleich({ werkbank: () => {}, zustand: () => {} }, abruf, { gruppen: {} });
    a.start();
    a.aufnehmen('g', 'Team', 'token');
    // Nicht die aktive Gruppe: Ruhetakt 15 s.
    await vi.advanceTimersByTimeAsync(100);
    a.lokal('g', 'w1', BLATT, 'W');
    await vi.advanceTimersByTimeAsync(1000);

    langsam = true;
    await vi.advanceTimersByTimeAsync(15_000); // Ruhetakt: Abruf beginnt und hängt
    a.lokal('g', 'w1', mitWert(BLATT, 'JETZT'), 'W');
    langsam = false;
    freigeben();
    await vi.advanceTimersByTimeAsync(1000);
    expect(server.stand.get('w1|z/r1/s')?.wert).toBe('JETZT');
    a.stopp();
  });
});

describe('Kreuzworträtsel der Gruppe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('kommt bei den anderen an, ohne als Werkbank aufzutauchen', async () => {
    const server = nachgebauterServer();
    const anna = geraet(server, 'anna');
    const bernd = geraet(server, 'bernd');
    await vi.advanceTimersByTimeAsync(100);

    anna.a.kreuzwortSetzen('g', [['laengen', '5, 7'], [wortschluessel('Hund')!, { text: 'Hund', eingetragen: false, zeit: 1 }]]);
    await vi.advanceTimersByTimeAsync(3000);

    const beiBernd = zustandAus(bernd.a.kreuzwort('g'));
    expect(beiBernd.laengenText).toBe('5, 7');
    expect(beiBernd.woerter.map((w) => w.text)).toEqual(['Hund']);
    expect(bernd.a.kreuzwortEintrag('g', 'wort/HUND')?.von).toBe(1);
    expect(bernd.empfangen.size).toBe(0);
    expect(bernd.a.werkbaenke('g')).toEqual([]);
  });

  it('macht aus demselben Wort von zwei Leuten nur eines', async () => {
    const server = nachgebauterServer();
    const anna = geraet(server, 'anna');
    const bernd = geraet(server, 'bernd');
    await vi.advanceTimersByTimeAsync(100);

    // Beide finden es gleichzeitig, bevor einer vom anderen weiß.
    anna.a.kreuzwortSetzen('g', [[wortschluessel('Roter Kater')!, { text: 'Roter Kater', eingetragen: false, zeit: 1 }]]);
    bernd.a.kreuzwortSetzen('g', [[wortschluessel('roterkater')!, { text: 'roterkater', eingetragen: false, zeit: 2 }]]);
    await vi.advanceTimersByTimeAsync(3000);

    for (const g of [anna, bernd]) expect(zustandAus(g.a.kreuzwort('g')).woerter).toHaveLength(1);
  });
});
