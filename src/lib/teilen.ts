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

/** Was ein Link mitbringt: das Blatt und, wenn es einen hat, den Namen der Werkbank. */
export interface Geteilt {
  blatt: Blatt;
  name?: string;
}

export async function alsFragment(blatt: Blatt, name?: string): Promise<string> {
  // Der Name reist im selben Objekt mit; ältere Stände der App übergehen ihn einfach.
  const daten = new TextEncoder().encode(JSON.stringify(name ? { ...blatt, name } : blatt));
  const gestaucht = await stauchen(daten);
  return gestaucht && gestaucht.length < daten.length
    ? GESTAUCHT + alsBase64(gestaucht)
    : ROH + alsBase64(daten);
}

export async function ausFragment(fragment: string): Promise<Geteilt | null> {
  if (fragment.length < 2) return null;
  try {
    const rest = ausBase64(fragment.slice(1));
    const daten = fragment[0] === GESTAUCHT ? await entstauchen(rest) : rest;
    if (!daten) return null;
    const gelesen = JSON.parse(new TextDecoder().decode(daten)) as unknown;
    if (istBlatt(gelesen)) {
      const name = (gelesen as { name?: unknown }).name;
      return typeof name === 'string' && name.trim()
        ? { blatt: inHeutigerForm(gelesen), name: name.trim() }
        : { blatt: inHeutigerForm(gelesen) };
    }
    // Links aus der Zeit der Schrittkette bleiben lesbar – sie werden zu einem
    // Blatt mit einer Zeile.
    const alt = gelesen as { eingabe?: unknown; schritte?: unknown };
    if (typeof alt.eingabe === 'string' && Array.isArray(alt.schritte)) {
      return { blatt: ausAlterKette({ eingabe: alt.eingabe, schritte: alt.schritte }) };
    }
    return null;
  } catch {
    // Ein beschädigter Link ist kein Grund, die App abstürzen zu lassen.
    return null;
  }
}

/** Vollständiger Link auf einen Stand. */
export async function alsLink(blatt: Blatt, name?: string): Promise<string> {
  const ohneFragment = location.href.split('#')[0];
  return `${ohneFragment}#/werkbank?w=${await alsFragment(blatt, name)}`;
}

/** Liest einen geteilten Stand aus dem Fragment – und räumt es danach weg. */
export async function ausAdresse(): Promise<Geteilt | null> {
  const treffer = location.hash.match(/[?&]w=([^&]+)/);
  if (!treffer) return null;
  const geteilt = await ausFragment(decodeURIComponent(treffer[1] as string));
  // Weg damit, auch wenn er kaputt war: Sonst käme er bei jedem Neuladen wieder.
  history.replaceState(null, '', location.href.replace(/[?&]w=[^&]+/, ''));
  return geteilt;
}

/**
 * Einen Link verschicken. Auf dem Handy öffnet das die Teilen-Auswahl
 * (Messenger, Mail …), sonst landet der Link in der Zwischenablage. Liefert,
 * was passiert ist, damit die Oberfläche es sagen kann.
 */
export async function verschicke(link: string, titel: string): Promise<'geteilt' | 'kopiert' | 'abgebrochen' | 'nichts'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: titel, text: titel, url: link });
      return 'geteilt';
    } catch (fehler) {
      // Abbrechen in der Teilen-Auswahl ist kein Fehler.
      if (fehler instanceof DOMException && fehler.name === 'AbortError') return 'abgebrochen';
    }
  }
  try {
    await navigator.clipboard.writeText(link);
    return 'kopiert';
  } catch {
    return 'nichts';
  }
}
