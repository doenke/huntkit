import { afterEach, describe, expect, it } from 'vitest';
import {
  feldUmschreiben,
  speichereUmlauteAufloesen,
  umlauteAufloesenGespeichert,
  umlauteBeimTippen
} from './umlautschalter';

/** Gerade so viel Eingabefeld, wie das Umschreiben anfasst. */
function feld(wert: string, marke: number | null = wert.length) {
  const f = {
    value: wert,
    selectionStart: marke,
    selectionEnd: marke,
    setSelectionRange(von: number, bis: number) {
      f.selectionStart = von;
      f.selectionEnd = bis;
    }
  };
  return f;
}

type Feld = Parameters<typeof feldUmschreiben>[0];

/** Tippt Zeichen für Zeichen, wie ein Feld es erlebt, und schreibt jedes Mal um. */
function getippt(text: string): string {
  let feldinhalt = '';
  for (const zeichen of text) feldinhalt = umlauteBeimTippen(feldinhalt + zeichen);
  return umlauteBeimTippen(feldinhalt, true);
}

describe('Groß oder klein kommt vom Nachbarn', () => {
  it('schreibt kleine Umlaute sofort um', () => {
    expect(umlauteBeimTippen('Bär')).toBe('Baer');
    expect(umlauteBeimTippen('schön grün')).toBe('schoen gruen');
  });

  it('entscheidet beim ß je Wort, nicht für den ganzen Text', () => {
    expect(getippt('Größe STRAßE')).toBe('Groesse STRASSE');
    expect(getippt('Maß')).toBe('Mass');
    expect(getippt('MAß')).toBe('MASS');
  });

  it('nimmt beim großen Umlaut am Wortanfang den nächsten Buchstaben', () => {
    expect(getippt('Übel')).toBe('Uebel');
    expect(getippt('ÜBEL')).toBe('UEBEL');
    expect(getippt('Ärger und ÄRGER')).toBe('Aerger und AERGER');
  });

  it('wartet mit einem allein stehenden großen Umlaut, bis das Wort weitergeht', () => {
    // Noch offen: Es könnte „Übel“ oder „ÜBEL“ werden.
    expect(umlauteBeimTippen('Ü')).toBe('Ü');
    expect(umlauteBeimTippen('Ü', true)).toBe('UE');
    // Ein Leerzeichen dahinter beendet das Wort.
    expect(umlauteBeimTippen('Ü ')).toBe('UE ');
  });

  it('löst einen großen Umlaut mitten im Großwort gleich auf', () => {
    expect(umlauteBeimTippen('BÄ')).toBe('BAE');
  });

  it('lässt Text ohne Umlaute, Ziffern und Satzzeichen, wie er ist', () => {
    expect(umlauteBeimTippen('A1, b2! .-')).toBe('A1, b2! .-');
  });
});

describe('Umlaute beim Tippen', () => {
  it('schreibt Umlaute und ß um', () => {
    const f = feld('Größe');
    expect(feldUmschreiben(f as unknown as Feld)).toBe('Groesse');
    expect(f.value).toBe('Groesse');
  });

  it('macht in Großschrift aus ß ein SS', () => {
    expect(feldUmschreiben(feld('STRAßE') as unknown as Feld)).toBe('STRASSE');
    expect(feldUmschreiben(feld('ÄRGER') as unknown as Feld)).toBe('AERGER');
  });

  it('löst beim Verlassen des Felds auch ein offenes Ü auf', () => {
    const f = feld('Ü');
    expect(feldUmschreiben(f as unknown as Feld)).toBe('Ü');
    expect(feldUmschreiben(f as unknown as Feld, true)).toBe('UE');
  });

  it('lässt die Schreibmarke hinter dem gerade getippten Umlaut', () => {
    // Mitten im Wort ein ü nachgetragen: „Mll“ → „Müll“, Marke stand hinter dem ü.
    const f = feld('Müll', 2);
    feldUmschreiben(f as unknown as Feld);
    expect(f.value).toBe('Muell');
    expect(f.selectionStart).toBe(3);
    expect(f.selectionEnd).toBe(3);
  });

  it('fasst ein Feld ohne Umlaut nicht an', () => {
    const f = feld('Nachtschicht', 3);
    expect(feldUmschreiben(f as unknown as Feld)).toBe('Nachtschicht');
    // Marke unverändert – ein Setzen hätte auf dem Handy die Auswahl zerstört.
    expect(f.selectionStart).toBe(3);
  });
});

describe('Die Einstellung', () => {
  const vorher = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  afterEach(() => {
    if (vorher) Object.defineProperty(globalThis, 'localStorage', vorher);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  function speicher() {
    const inhalt = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => inhalt.get(k) ?? null,
        setItem: (k: string, v: string) => void inhalt.set(k, v)
      }
    });
  }

  it('ist ohne gespeicherte Wahl eingeschaltet', () => {
    speicher();
    expect(umlauteAufloesenGespeichert()).toBe(true);
  });

  it('merkt sich das Ausschalten und das Wiedereinschalten', () => {
    speicher();
    speichereUmlauteAufloesen(false);
    expect(umlauteAufloesenGespeichert()).toBe(false);
    speichereUmlauteAufloesen(true);
    expect(umlauteAufloesenGespeichert()).toBe(true);
  });

  it('bleibt eingeschaltet, wenn es keinen Speicher gibt', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('gesperrt');
      }
    });
    expect(umlauteAufloesenGespeichert()).toBe(true);
    expect(() => speichereUmlauteAufloesen(false)).not.toThrow();
  });
});
