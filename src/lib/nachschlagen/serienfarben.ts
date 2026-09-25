/** Serie zu CSS-Variable – die Farbtöne stehen in app.css, je Thema anders. */
const NACH_SERIE: Record<string, string> = {
  Alkalimetalle: 'alkalimetalle',
  Erdalkalimetalle: 'erdalkalimetalle',
  'Übergangsmetalle': 'uebergangsmetalle',
  Lanthanoide: 'lanthanoide',
  Actinoide: 'actinoide',
  Metalle: 'metalle',
  Halbmetalle: 'halbmetalle',
  Nichtmetalle: 'nichtmetalle',
  Halogene: 'halogene',
  Edelgase: 'edelgase'
};

export function serienfarbe(serie: string | null): string {
  const name = serie ? NACH_SERIE[serie] : undefined;
  return name ? `var(--serie-${name})` : 'var(--flaeche-hoch)';
}

export const SERIEN = Object.keys(NACH_SERIE);

/** Farben der Markierungsebenen – kräftig, damit sie sich vom Untergrund lösen. */
export const EBENENFARBEN = ['#5aa9e6', '#e6b45a', '#7ed957', '#e0607e'] as const;
