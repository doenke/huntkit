import { describe, expect, it } from 'vitest';
import { HANDY_DEUTSCH, PC_DEUTSCH, reihenbreite } from './tastaturen';

const zeichen = (reihen: typeof PC_DEUTSCH.reihen) =>
  reihen.flat().filter((t) => !t.steuer);

describe('PC-Tastatur, deutsch', () => {
  it('ist in jeder Reihe gleich breit, wie eine echte Tastatur', () => {
    for (const reihe of PC_DEUTSCH.reihen) expect(reihenbreite(reihe)).toBe(15);
  });

  it('hat das ganze Alphabet mit Umlauten in QWERTZ-Lage', () => {
    const reihen = PC_DEUTSCH.reihen.map((r) => r.filter((t) => /^[A-ZÄÖÜ]$/.test(t.basis)).map((t) => t.basis).join(''));
    expect(reihen.slice(1, 4)).toEqual(['QWERTZUIOPÜ', 'ASDFGHJKLÖÄ', 'YXCVBNM']);
  });

  it('liegt auf der Umschaltebene wie jede deutsche Tastatur', () => {
    const umschalt = Object.fromEntries(zeichen(PC_DEUTSCH.reihen).map((t) => [t.basis, t.umschalt]));
    expect([...'1234567890'].map((z) => umschalt[z]).join('')).toBe('!"§$%&/()=');
    expect(umschalt['ß']).toBe('?');
    expect(umschalt[',']).toBe(';');
    expect(umschalt['-']).toBe('_');
    expect(umschalt['#']).toBe("'");
  });

  it('kennt die AltGr-Zeichen, die überall gleich liegen', () => {
    const altgr = zeichen(PC_DEUTSCH.reihen).filter((t) => t.altgr).map((t) => `${t.basis}${t.altgr}`);
    expect(altgr.sort()).toEqual(
      ['2²', '3³', '7{', '8[', '9]', '0}', 'ß\\', 'Q@', 'E€', '+~', '<|', 'Mµ'].sort()
    );
  });
});

describe('Handy-Tastatur, deutsch', () => {
  it('legt die Ziffern auf die obere Buchstabenreihe', () => {
    const oben = HANDY_DEUTSCH.reihen[0]!;
    expect(oben.map((t) => t.basis).join('')).toBe('QWERTZUIOP');
    expect(oben.map((t) => t.lang).join('')).toBe('1234567890');
  });

  it('hat die Sonderzeichen hinter den mittleren und unteren Tasten', () => {
    const lang = Object.fromEntries(zeichen(HANDY_DEUTSCH.reihen).map((t) => [t.basis, t.lang]));
    expect([...'ASDFGHJKL'].map((b) => lang[b]).join('')).toBe('@#$_&-+()');
    expect([...'YXCVBNM'].map((b) => lang[b]).join('')).toBe('*"\':;!?');
  });

  it('ist in jeder Reihe gleich breit', () => {
    for (const reihe of HANDY_DEUTSCH.reihen) expect(reihenbreite(reihe)).toBe(10);
  });
});
