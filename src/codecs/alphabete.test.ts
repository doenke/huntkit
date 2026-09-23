import { describe, expect, it } from 'vitest';
import { griechisch, kyrillisch } from './alphabete';

describe('Griechisch', () => {
  it('liest Buchstaben in beiden Schreibungen samt Nebenformen', () => {
    expect(griechisch.decode('ΘΕΟΣ').text).toBe('THEOS');
    expect(griechisch.decode('θεος').text).toBe('THEOS');
    expect(griechisch.decode('ϑεoϲ'.replace('o', 'ο').replace('ϲ', 'ς')).text).toBe('THEOS');
  });

  it('schreibt mit der längsten passenden Umschrift', () => {
    expect(griechisch.encode('Theos').text).toBe('ΘΕΟΣ');
    expect(griechisch.encode('Psyche').text).toBe('ΨΥΧΕ');
  });

  it('liest und schreibt Namen und Nummern', () => {
    expect(griechisch.decode('alpha tau omega', { code: 'namen' }).text).toBe('ATO');
    expect(griechisch.decode('MU NU / JOTA', { code: 'namen' }).text).toBe('MN I');
    expect(griechisch.encode('Pi', { code: 'namen' }).text).toBe('PI IOTA');
    expect(griechisch.decode('1 20 24', { code: 'nummern' }).text).toBe('AYO');
  });

  it('meldet Buchstaben, die es nicht gibt', () => {
    expect(griechisch.encode('JA').luecken).toEqual([{ position: 0, zeichen: 'J' }]);
  });
});

describe('Kyrillisch', () => {
  it('liest wie das Heft', () => {
    expect(kyrillisch.decode('ЖУК').text).toBe('ŽUK');
    expect(kyrillisch.decode('борщ').text).toBe('BORŠČ');
    expect(kyrillisch.decode('Москва').text).toBe('MOSKVA');
  });

  it('liest und schreibt deutsch nach Duden', () => {
    expect(kyrillisch.decode('Хрущёв', { umschrift: 'deutsch' }).text).toBe('CHRUSCHTSCHJOW');
    expect(kyrillisch.encode('Schtschi', { umschrift: 'deutsch' }).text).toBe('ЩИ');
    expect(kyrillisch.encode('Moskwa', { umschrift: 'deutsch' }).text).toBe('МОСКВА');
  });

  it('schreibt mit Hatschek wie das Heft', () => {
    expect(kyrillisch.encode('žuk').text).toBe('ЖУК');
    expect(kyrillisch.encode('Jaŝ'.replace('ŝ', 'š')).text).toBe('ЯШ');
  });
});
