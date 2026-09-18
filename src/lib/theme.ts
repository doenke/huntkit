export type Thema = 'dark' | 'night' | 'light';

export const THEMEN: ReadonlyArray<{ id: Thema; titel: string; hinweis: string }> = [
  { id: 'dark', titel: 'Dunkel', hinweis: 'Standard' },
  { id: 'night', titel: 'Rotlicht', hinweis: 'erhält die Nachtsicht' },
  { id: 'light', titel: 'Hell', hinweis: 'bei Tageslicht' }
];

const SCHLUESSEL = 'huntkit:thema';

export function gespeichertesThema(): Thema {
  try {
    const wert = localStorage.getItem(SCHLUESSEL);
    if (wert === 'dark' || wert === 'night' || wert === 'light') return wert;
  } catch {
    // Privater Modus oder gesperrter Speicher – dann eben der Standard.
  }
  return 'dark';
}

export function setzeThema(thema: Thema): void {
  document.documentElement.dataset['theme'] = thema;
  try {
    localStorage.setItem(SCHLUESSEL, thema);
  } catch {
    // Nicht speichern zu koennen ist kein Grund, das Thema nicht zu setzen.
  }
}
