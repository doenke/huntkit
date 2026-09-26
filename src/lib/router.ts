/**
 * Hash-Routing statt History-API: Auf einfachem Webspace gibt es keine
 * Rewrite-Regel, die Deep-Links auf index.html umbiegt. Mit Hash braucht es
 * keine – die App laeuft auch in einem Unterverzeichnis.
 */
export type Seite = 'werkbank' | 'nachschlagen' | 'loesungen' | 'mehr' | 'gruppen' | 'datenschutz' | 'kontakt';

export const SEITEN: ReadonlyArray<{ id: Seite; titel: string }> = [
  { id: 'werkbank', titel: 'Werkbank' },
  { id: 'nachschlagen', titel: 'Nachschlagen' },
  { id: 'loesungen', titel: 'Kreuzworträtsel' },
  { id: 'mehr', titel: 'Mehr' }
];

const STANDARD: Seite = 'werkbank';

/** Seiten, die im Menü unter den Hauptbereichen stehen. */
const WEITERE: ReadonlyArray<Seite> = ['gruppen', 'datenschutz', 'kontakt'];

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

/**
 * Ein Parameter hinter dem ? im Hash: `#/gruppen?anmeldung=…`. Ein bloßer
 * Schalter wie `?tour` ergibt `''`, ein fehlender `null`.
 */
export function parameter(name: string, hash = location.hash): string | null {
  const treffer = hash.match(new RegExp(`[?&]${name}(?:=([^&]*))?(?:&|$)`));
  if (!treffer) return null;
  return treffer[1] === undefined ? '' : decodeURIComponent(treffer[1]);
}

/** Der Hash ohne diese Parameter. */
export function ohneParameter(namen: ReadonlyArray<string>, hash = location.hash): string {
  const [pfad = '', rest] = hash.split('?');
  if (rest === undefined) return hash;
  const bleibt = rest.split('&').filter((teil) => teil && !namen.includes(teil.split('=')[0] ?? ''));
  return bleibt.length > 0 ? `${pfad}?${bleibt.join('&')}` : pfad;
}

/**
 * Parameter lesen und aus der Adresse nehmen – sie sind einmalig, etwa ein
 * Einladungscode. Ein Neuladen soll sie nicht noch einmal auslösen.
 */
export function nimmParameter<T extends string>(...namen: T[]): Partial<Record<T, string>> {
  const werte: Partial<Record<T, string>> = {};
  for (const name of namen) {
    const wert = parameter(name);
    if (wert !== null) werte[name] = wert;
  }
  if (Object.keys(werte).length > 0) {
    history.replaceState(null, '', `${location.href.split('#')[0]}${ohneParameter(namen)}`);
  }
  return werte;
}

/**
 * Adressen von früher, die heute woanders hingehören. Einladungslinks zeigten
 * einmal auf die Werkbank; heute nimmt die Seite „Gruppen“ sie an.
 */
export function umleitung(hash: string): string | null {
  const einladung = parameter('einladung', hash);
  if (einladung !== null && ausHash(hash) !== 'gruppen') return `#/gruppen?einladung=${encodeURIComponent(einladung)}`;
  return null;
}
