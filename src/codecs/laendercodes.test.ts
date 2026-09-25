import { describe, expect, it } from 'vitest';
import { farben } from './farben';
import { laendercodes } from './laendercodes';

describe('Ländercodes', () => {
  it('kennt alle Codes des Hefts genau einmal', () => {
    const codes = (laendercodes.tabelle?.() ?? []).map((e) => e.darstellung);
    expect(codes).toHaveLength(249);
    expect(new Set(codes).size).toBe(249);
  });

  it('macht aus Ländern Codes, getrennt oder nicht', () => {
    expect(laendercodes.encode('Deutschland, Norwegen').text).toBe('DE NO');
    expect(laendercodes.encode('deutschland norwegen österreich').text).toBe('DE NO AT');
    expect(laendercodes.encode('Bosnien und Herzegowina\nSão Tomé und Príncipe').text).toBe('BA ST');
    expect(laendercodes.encode('Saint Lucia, Sankt Kitts und Nevis, USA').text).toBe('LC KN US');
  });

  it('meldet Unbekanntes', () => {
    expect(laendercodes.encode('Deutschland Atlantis').luecken).toEqual([{ position: 12, zeichen: 'Atlantis' }]);
  });

  it('liest Codes, auch am Stück', () => {
    expect(laendercodes.decode('de no').text).toBe('Deutschland, Norwegen');
    expect(laendercodes.decode('DENO').text).toBe('Deutschland, Norwegen');
  });
});

describe('HTML-Farben', () => {
  it('stehen alle auf einer Seite, nach Wert sortiert', () => {
    const tabelle = farben.tabelle!();
    expect(tabelle.every((e) => e.gruppe === undefined)).toBe(true);
    expect(tabelle[0]?.zeichen).toBe('Black');
    expect(tabelle.at(-1)?.zeichen).toBe('White');
    const werte = tabelle.map((e) => e.darstellung);
    expect(werte).toEqual([...werte].sort());
  });

  it('liest Werte in jeder Schreibweise', () => {
    expect(farben.decode('#FF7F50 ff7f50 #0ff #FFFFFF').text).toBe('Coral Coral Aqua White');
  });

  it('schreibt Namen, auch in anderer Schreibweise', () => {
    expect(farben.encode('coral, DarkSlateGrey fuchsia').text).toBe('#FF7F50 #2F4F4F #FF00FF');
  });

  it('zeichnet auch Werte ohne Namen', () => {
    expect(farben.zeichneCode?.('#123456')?.inhalt).toContain('#123456');
  });
});
