/**
 * Ausrüstung für die Nacht: Bildschirm wachhalten und Codes mit der Kamera lesen.
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

export async function kameraStarten(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false
  });
}

export function kameraStoppen(strom: MediaStream | null): void {
  strom?.getTracks().forEach((spur) => spur.stop());
}

// ---------------------------------------------------------------------------
// Codes lesen
// ---------------------------------------------------------------------------

interface Codeleser {
  detect(bild: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
}

interface CodeleserBauplan {
  new (einstellungen?: { formats?: string[] }): Codeleser;
  getSupportedFormats?(): Promise<string[]>;
}

function bauplan(): CodeleserBauplan | undefined {
  return (globalThis as unknown as { BarcodeDetector?: CodeleserBauplan }).BarcodeDetector;
}

/**
 * QR- und Barcodes liest der Browser selbst, wo er es kann. Eine eigene
 * Bibliothek dafür einzubinden wäre die größte Abhängigkeit der App – für eine
 * Funktion, die viele Geräte ohnehin mitbringen.
 */
export function kannCodesLesen(): boolean {
  return bauplan() !== undefined;
}

export function codeleser(): Codeleser | null {
  const Bauplan = bauplan();
  if (!Bauplan) return null;
  try {
    return new Bauplan({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix', 'aztec']
    });
  } catch {
    // Wenn das Gerät diese Formate nicht kennt, tut es die Voreinstellung auch.
    return new Bauplan();
  }
}
