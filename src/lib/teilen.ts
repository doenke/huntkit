import { ausAlterKette, inHeutigerForm, istBlatt, type Blatt } from './blatt';

/**
 * Werkbank-Zustand als Link.
 *
 * Alles steckt im Fragment hinter dem Doppelkreuz – das schickt der Browser
 * nie an einen Server. Damit ist Teilen im Team möglich, ohne dass die App ein
 * Backend bekäme.
 */

function alsBase64(daten: Uint8Array): string {
  let roh = '';
  for (const b of daten) roh += String.fromCharCode(b);
  return btoa(roh).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ausBase64(text: string): Uint8Array {
  const roh = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...roh].map((z) => z.charCodeAt(0)));
}

async function stauchen(daten: Uint8Array): Promise<Uint8Array | null> {
  const Presse = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream;
  if (!Presse) return null;
  const strom = new Blob([daten as BlobPart]).stream().pipeThrough(new Presse('deflate-raw'));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

async function entstauchen(daten: Uint8Array): Promise<Uint8Array | null> {
  const Presse = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!Presse) return null;
  try {
    const strom = new Blob([daten as BlobPart]).stream().pipeThrough(new Presse('deflate-raw'));
    return new Uint8Array(await new Response(strom).arrayBuffer());
  } catch {
    return null;
  }
}

/** Kennzeichnet das Verfahren, damit ältere Links lesbar bleiben. */
const ROH = 'r';
const GESTAUCHT = 'z';

export async function alsFragment(blatt: Blatt): Promise<string> {
  const daten = new TextEncoder().encode(JSON.stringify(blatt));
  const gestaucht = await stauchen(daten);
  return gestaucht && gestaucht.length < daten.length
    ? GESTAUCHT + alsBase64(gestaucht)
    : ROH + alsBase64(daten);
}

export async function ausFragment(fragment: string): Promise<Blatt | null> {
  if (fragment.length < 2) return null;
  try {
    const rest = ausBase64(fragment.slice(1));
    const daten = fragment[0] === GESTAUCHT ? await entstauchen(rest) : rest;
    if (!daten) return null;
    const gelesen = JSON.parse(new TextDecoder().decode(daten)) as unknown;
    if (istBlatt(gelesen)) {
      return inHeutigerForm(gelesen);
    }
    // Links aus der Zeit der Schrittkette bleiben lesbar – sie werden zu einem
    // Blatt mit einer Zeile.
    const alt = gelesen as { eingabe?: unknown; schritte?: unknown };
    if (typeof alt.eingabe === 'string' && Array.isArray(alt.schritte)) {
      return ausAlterKette({ eingabe: alt.eingabe, schritte: alt.schritte });
    }
    return null;
  } catch {
    // Ein beschädigter Link ist kein Grund, die App abstürzen zu lassen.
    return null;
  }
}

/** Vollständiger Link auf den aktuellen Stand. */
export async function alsLink(blatt: Blatt): Promise<string> {
  const ohneFragment = location.href.split('#')[0];
  return `${ohneFragment}#/werkbank?w=${await alsFragment(blatt)}`;
}

/** Liest einen geteilten Stand aus dem Fragment – und räumt es danach weg. */
export async function ausAdresse(): Promise<Blatt | null> {
  const treffer = location.hash.match(/[?&]w=([^&]+)/);
  if (!treffer) return null;
  const blatt = await ausFragment(decodeURIComponent(treffer[1] as string));
  if (blatt) history.replaceState(null, '', location.href.replace(/[?&]w=[^&]+/, ''));
  return blatt;
}
