/**
 * Ausrüstung für die Nacht: Bildschirm wachhalten, Kamera als Lupe, Licht an.
 *
 * Alles hier ist optional und geräteabhängig. Der Grundsatz: erst prüfen, ob das
 * Gerät es kann, und sonst ehrlich sagen, dass es nicht geht – statt einen
 * Schalter anzubieten, der nichts tut.
 *
 * Und alles hier kostet Akku. Deshalb wird nichts von selbst eingeschaltet, und
 * der Bildschirmwächter gibt sich frei, sobald die App in den Hintergrund geht.
 */

interface Wachposten {
  release(): Promise<void>;
  addEventListener(art: 'release', hoerer: () => void): void;
}

interface Bildschirmsperre {
  request(art: 'screen'): Promise<Wachposten>;
}

/** Fähigkeiten und Einstellungen, die die Typdefinitionen noch nicht kennen. */
interface ErweiterteFaehigkeiten extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
}

type ErweiterteVorgabe = MediaTrackConstraints & {
  advanced?: Array<{ torch?: boolean; zoom?: number }>;
};

function sperre(): Bildschirmsperre | undefined {
  return (navigator as unknown as { wakeLock?: Bildschirmsperre }).wakeLock;
}

export function kannWachhalten(): boolean {
  return sperre() !== undefined;
}

export class Bildschirmwaechter {
  #posten: Wachposten | null = null;
  #gewollt = false;

  get aktiv(): boolean {
    return this.#posten !== null;
  }

  async an(): Promise<boolean> {
    this.#gewollt = true;
    return this.#anfordern();
  }

  async aus(): Promise<void> {
    this.#gewollt = false;
    await this.#posten?.release().catch(() => undefined);
    this.#posten = null;
  }

  /**
   * Beim Zurückkehren in den Vordergrund neu anfordern: Der Browser gibt die
   * Sperre beim Wegschalten von selbst frei.
   */
  async beiSichtbarkeit(): Promise<void> {
    if (this.#gewollt && document.visibilityState === 'visible' && !this.#posten) {
      await this.#anfordern();
    }
  }

  async #anfordern(): Promise<boolean> {
    try {
      const posten = await sperre()?.request('screen');
      if (!posten) return false;
      posten.addEventListener('release', () => (this.#posten = null));
      this.#posten = posten;
      return true;
    } catch {
      return false;
    }
  }
}

export interface Kamerastand {
  strom: MediaStream;
  kannLeuchten: boolean;
  zoom: { min: number; max: number; step: number } | null;
}

export async function kameraStarten(): Promise<Kamerastand> {
  const strom = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false
  });
  const spur = strom.getVideoTracks()[0];
  const faehig = (spur?.getCapabilities?.() ?? {}) as ErweiterteFaehigkeiten;
  return {
    strom,
    kannLeuchten: faehig.torch === true,
    zoom: faehig.zoom ?? null
  };
}

export function kameraStoppen(strom: MediaStream | null): void {
  strom?.getTracks().forEach((spur) => spur.stop());
}

export async function leuchten(strom: MediaStream | null, an: boolean): Promise<boolean> {
  const spur = strom?.getVideoTracks()[0];
  if (!spur) return false;
  try {
    await spur.applyConstraints({ advanced: [{ torch: an }] } as ErweiterteVorgabe);
    return true;
  } catch {
    return false;
  }
}

export async function zoomen(strom: MediaStream | null, wert: number): Promise<void> {
  const spur = strom?.getVideoTracks()[0];
  if (!spur) return;
  try {
    await spur.applyConstraints({ advanced: [{ zoom: wert }] } as ErweiterteVorgabe);
  } catch {
    // Geräte ohne optischen Zoom ignorieren das; die Lupe vergrößert dann per Bild.
  }
}
