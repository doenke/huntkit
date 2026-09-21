/**
 * Ausrüstung für die Nacht: den Bildschirm wachhalten, damit er beim Abtippen
 * nicht ausgeht.
 *
 * Das ist geräteabhängig. Der Grundsatz: erst prüfen, ob das Gerät es kann, und
 * sonst ehrlich sagen, dass es nicht geht – statt einen Schalter anzubieten,
 * der nichts tut. Und es kostet Akku, deshalb schaltet es sich nicht von selbst
 * ein und gibt sich frei, sobald die App in den Hintergrund geht.
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
