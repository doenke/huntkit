import { describe, expect, it } from 'vitest';
import { beobachteVersion, type Arbeiter, type Registrierung, type Umgebung } from './neuversion';

/** Ein Worker, dessen Zustand sich im Test von Hand weiterschalten lässt. */
function arbeiter(state = 'installing') {
  const hoerer: Array<() => void> = [];
  const nachrichten: unknown[] = [];
  return {
    state,
    nachrichten,
    postMessage: (daten: unknown) => nachrichten.push(daten),
    addEventListener: (_art: 'statechange', f: () => void) => hoerer.push(f),
    wechsleZu(neu: string) {
      this.state = neu;
      for (const f of hoerer) f();
    }
  };
}

function umgebung(controller: unknown, registrierung: Partial<Registrierung> = {}) {
  const updatefound: Array<() => void> = [];
  const controllerchange: Array<() => void> = [];
  let geladen = 0;
  let geprueft = 0;
  const reg: Registrierung = {
    installing: null,
    waiting: null,
    addEventListener: (_art: 'updatefound', f: () => void) => updatefound.push(f),
    update: () => {
      geprueft += 1;
      return Promise.resolve();
    },
    ...registrierung
  };
  const welt: Umgebung = {
    verwaltung: {
      controller,
      register: () => Promise.resolve(reg),
      addEventListener: (_art: 'controllerchange', f: () => void) => controllerchange.push(f)
    },
    adresse: 'sw.js',
    neuladen: () => (geladen += 1)
  };
  return {
    welt,
    reg,
    loeseUpdateAus: () => updatefound.forEach((f) => f()),
    wechsleController: () => controllerchange.forEach((f) => f()),
    ladungen: () => geladen,
    pruefungen: () => geprueft
  };
}

/** Die Registrierung wird über ein Promise geliefert – einmal durchatmen. */
const gleich = () => new Promise((f) => setTimeout(f, 0));

describe('Neue Version erkennen', () => {
  it('meldet nichts bei der ersten Installation', async () => {
    // Ohne Controller ist das der erste Besuch: Da ist nichts „neu“.
    const welt = umgebung(null);
    const neu = arbeiter();
    welt.reg.installing = neu as unknown as Arbeiter;
    let bereit = false;
    beobachteVersion((b) => (bereit = b), welt.welt);
    await gleich();
    welt.loeseUpdateAus();
    neu.wechsleZu('installed');
    expect(bereit).toBe(false);
  });

  it('meldet eine Fassung, die während des Arbeitens fertig wird', async () => {
    const welt = umgebung({});
    const neu = arbeiter();
    welt.reg.installing = neu as unknown as Arbeiter;
    let bereit = false;
    beobachteVersion((b) => (bereit = b), welt.welt);
    await gleich();
    welt.loeseUpdateAus();
    expect(bereit).toBe(false);
    neu.wechsleZu('installed');
    expect(bereit).toBe(true);
  });

  it('meldet eine Fassung, die schon beim Öffnen wartet', async () => {
    const wartend = arbeiter('installed');
    const welt = umgebung({}, { waiting: wartend as unknown as Arbeiter });
    let bereit = false;
    beobachteVersion((b) => (bereit = b), welt.welt);
    await gleich();
    expect(bereit).toBe(true);
  });
});

describe('Übernehmen', () => {
  it('bittet den wartenden Worker vorzutreten und lädt dann neu', async () => {
    const wartend = arbeiter('installed');
    const welt = umgebung({}, { waiting: wartend as unknown as Arbeiter });
    const wache = beobachteVersion(() => {}, welt.welt);
    await gleich();
    wache.uebernehmen();
    expect(wartend.nachrichten).toEqual(['uebernehmen']);
    expect(welt.ladungen()).toBe(0);
    // Erst wenn der neue Worker das Ruder hat, wird geladen.
    welt.wechsleController();
    expect(welt.ladungen()).toBe(1);
  });

  it('lädt nicht neu, wenn der Wechsel von woanders kam', async () => {
    // Ein zweiter Tab darf die laufende Arbeit hier nicht wegreißen.
    const welt = umgebung({}, { waiting: arbeiter('installed') as unknown as Arbeiter });
    beobachteVersion(() => {}, welt.welt);
    await gleich();
    welt.wechsleController();
    expect(welt.ladungen()).toBe(0);
  });

  it('lädt einfach neu, wenn gar nichts wartet', async () => {
    const welt = umgebung({});
    const wache = beobachteVersion(() => {}, welt.welt);
    await gleich();
    wache.uebernehmen();
    expect(welt.ladungen()).toBe(1);
  });

  it('kann von Hand nachsehen lassen', async () => {
    const welt = umgebung({});
    const wache = beobachteVersion(() => {}, welt.welt);
    await gleich();
    wache.pruefe();
    expect(welt.pruefungen()).toBe(1);
  });
});
