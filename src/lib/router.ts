/**
 * Hash-Routing statt History-API: Auf einfachem Webspace gibt es keine
 * Rewrite-Regel, die Deep-Links auf index.html umbiegt. Mit Hash braucht es
 * keine – die App laeuft auch in einem Unterverzeichnis.
 */
export type Seite = 'werkbank' | 'nachschlagen' | 'loesungen' | 'mehr' | 'gruppen';

export const SEITEN: ReadonlyArray<{ id: Seite; titel: string }> = [
  { id: 'werkbank', titel: 'Werkbank' },
  { id: 'nachschlagen', titel: 'Nachschlagen' },
  { id: 'loesungen', titel: 'Kreuzworträtsel' },
  { id: 'mehr', titel: 'Mehr' }
];

const STANDARD: Seite = 'werkbank';

/** Seiten, die im Menü unter den Hauptbereichen stehen. */
const WEITERE: ReadonlyArray<Seite> = ['gruppen'];

export function ausHash(hash: string): Seite {
  // Alles ab ? gehört zu den Parametern – geteilte Links hängen dort den
  // Werkbank-Stand an.
  const name = hash.replace(/^#\/?/, '').split('?')[0]?.split('/')[0];
  // Die Codes stehen seit dem Zusammenlegen unter Nachschlagen – alte Lesezeichen führen dorthin.
  if (name === 'codes') return 'nachschlagen';
  if (WEITERE.includes(name as Seite)) return name as Seite;
  return SEITEN.some((s) => s.id === name) ? (name as Seite) : STANDARD;
}

export function aktuelleSeite(): Seite {
  return ausHash(location.hash);
}

export function geheZu(seite: Seite): void {
  location.hash = `#/${seite}`;
}
