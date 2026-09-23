import { describe, expect, it } from 'vitest';
import { ipa, ipaLaute } from './ipa';

const lies = (text: string) => ipa.decode(text);

describe('IPA-Lautschrift', () => {
  it('kennt alle 38 Laute der Tafel, jeden einmal', () => {
    expect(ipaLaute).toHaveLength(38);
    expect(new Set(ipaLaute.map((l) => l.ipa)).size).toBe(38);
  });

  it('liest eine Umschrift und übergeht Klammern, Betonung und Länge', () => {
    expect(lies('[ˈʃuːlə]').text).toBe('SCHULE');
    expect(lies('/ˈvaldɐ/').text).toBe('WALDER');
    expect(lies('[ʃøːn]').text).toBe('SCHÖN');
  });

  it('liest Affrikaten mit und ohne Bindebogen', () => {
    // Ein langes i ist ein I – dass man es „ie“ schreibt, steht nicht in der Lautschrift.
    expect(lies('t͡siːl').text).toBe('ZIL');
    expect(lies('tsiːl').text).toBe('ZIL');
    expect(lies('ˈt͡ʃʏs').text).toBe('TSCHÜS');
    expect(lies('ˈtʃʏs').text).toBe('TSCHÜS');
  });

  it('macht aus ng, ch und dem Knacklaut, was man schreibt', () => {
    expect(lies('haŋ').text).toBe('HANG');
    expect(lies('ɪç').text).toBe('ICH');
    expect(lies('bax').text).toBe('BACH');
    expect(lies('bəˈʔaxtn̩').luecken.map((l) => l.zeichen)).toEqual(['̩']);
    expect(lies('bəˈʔaxtən').text).toBe('BEACHTEN');
  });

  it('trennt Wörter am Leerraum', () => {
    expect(lies('[ʔɪç] [bɪn]').text).toBe('ICH BIN');
  });

  it('meldet Unbekanntes als Lücke, statt es zu verschlucken', () => {
    const gelesen = lies('θɪŋk');
    expect(gelesen.text).toBe('INGK');
    expect(gelesen.luecken.map((l) => l.zeichen)).toEqual(['θ']);
  });

  it('schreibt grob um – die Richtung, in der es nicht eindeutig geht', () => {
    expect(ipa.encode('Schule').text).toBe('ʃule');
    expect(ipa.encode('Zwölf').text).toBe('t͡svølf');
    expect(ipa.encode('Tschüss').text).toBe('t͡ʃyss');
    expect(ipa.decode(ipa.encode('Hang').text).text).toBe('HANG');
  });

  it('erkennt Lautschrift an ihren eigenen Zeichen', () => {
    expect(ipa.passt!('[ˈʃuːlə]')).toBeGreaterThan(0.5);
    expect(ipa.passt!('SCHULE')).toBe(0);
  });

  it('zeigt auf der Karte Lautwert und Beispiel, getrennt nach Vokalen und Konsonanten', () => {
    const tabelle = ipa.tabelle!();
    const sch = tabelle.find((e) => e.darstellung === 'ʃ');
    expect(sch).toEqual({
      zeichen: 'SCH',
      darstellung: 'ʃ',
      gruppe: 'Konsonanten',
      hinweis: 'stimmloser sch-Laut · schnell'
    });
    expect(new Set(tabelle.map((e) => e.gruppe))).toEqual(new Set(['Vokale', 'Konsonanten']));
  });
});
