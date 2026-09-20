/**
 * Hash-Routing statt History-API: Auf einfachem Webspace gibt es keine
 * Rewrite-Regel, die Deep-Links auf index.html umbiegt. Mit Hash braucht es
 * keine – die App laeuft auch in einem Unterverzeichnis.
 */
export type Seite = 'werkbank' | 'codes' | 'nachschlagen' | 'mehr';

export const SEITEN: ReadonlyArray<{ id: Seite; titel: string }> = [
  { id: 'werkbank', titel: 'Werkbank' },
  { id: 'codes', titel: 'Codes' },
  { id: 'nachschlagen', titel: 'Nachschlagen' },
  { id: 'mehr', titel: 'Mehr' }
];

const STANDARD: Seite = 'werkbank';

export function ausHash(hash: string): Seite {
  // Alles ab ? gehört zu den Parametern – geteilte Links hängen dort den
  // Werkbank-Stand an.
  const name = hash.replace(/^#\/?/, '').split('?')[0]?.split('/')[0];
  return SEITEN.some((s) => s.id === name) ? (name as Seite) : STANDARD;
}

export function aktuelleSeite(): Seite {
  return ausHash(location.hash);
}

export function geheZu(seite: Seite): void {
  location.hash = `#/${seite}`;
}
