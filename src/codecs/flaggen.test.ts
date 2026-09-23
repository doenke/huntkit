import { describe, expect, it } from 'vitest';
import { flaggen } from './flaggen';

describe('Flaggenalphabet', () => {
  it('zeichnet Buchstaben, Zahlenwimpel und Sonderwimpel', () => {
    for (const e of flaggen.tabelle?.() ?? []) expect(flaggen.zeichne?.(e.zeichen), e.zeichen).toBeTruthy();
    expect(flaggen.tabelle?.()).toHaveLength(26 + 10 + 5);
  });

  it('löst Ersatzwimpel innerhalb eines Worts auf', () => {
    expect(flaggen.decode('NO②N').text).toBe('NOON');
    expect(flaggen.decode('AB① XYZ③').text).toBe('ABA XYZZ');
  });

  it('gibt jeder Zeichnung einen eigenen Zuschnitt', () => {
    const a = flaggen.zeichne?.('A')?.inhalt ?? '';
    const b = flaggen.zeichne?.('A')?.inhalt ?? '';
    expect(a).not.toBe(b);
  });
});
