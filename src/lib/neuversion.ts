/**
 * „Neue Version verfügbar.“
 *
 * Der Service Worker liefert zuerst aus dem Cache – das ist der Sinn des
 * Offline-Betriebs, heißt aber auch: Wer die App offen hat, arbeitet nach einem
 * Deployment weiter mit dem alten Stand. Früher schob sich der neue Worker
 * sofort davor und räumte dabei den Cache unter der laufenden Seite weg; jetzt
 * wartet er und meldet sich hier. Der Wechsel ist damit ein bewusster Schritt
 * und nichts, was mitten in einem Rätsel passiert.
 *
 * Die Browser-Schnittstelle steckt hinter schmalen Typen, damit dieser Ablauf
 * prüfbar bleibt – von Hand ist er es kaum: Er braucht zwei Deployments, zwei
 * Worker und den richtigen Augenblick.
 */

export interface Arbeiter {
  state: string;
  postMessage(daten: unknown): void;
  addEventListener(art: 'statechange', hoerer: () => void): void;
}

export interface Registrierung {
  installing: Arbeiter | null;
  waiting: Arbeiter | null;
  addEventListener(art: 'updatefound', hoerer: () => void): void;
  update(): Promise<unknown>;
}

export interface Verwaltung {
  /** Gesetzt, sobald ein Worker die Seite steuert. */
  controller: unknown;
  register(adresse: string): Promise<Registrierung>;
  addEventListener(art: 'controllerchange', hoerer: () => void): void;
}

export interface Versionswache {
  /** Von Hand nachsehen, ob es etwas Neues gibt. */
  pruefe(): void;
  /** Den wartenden Worker übernehmen lassen und neu laden. */
  uebernehmen(): void;
}

export interface Umgebung {
  verwaltung: Verwaltung;
  adresse: string;
  neuladen: () => void;
}

/**
 * Meldet über `melde`, sobald eine neue Fassung bereitliegt.
 *
 * Entscheidend ist `controller`: Ohne ihn ist das hier die erste Installation
 * überhaupt – die ist kein Update, sondern der Normalfall beim ersten Besuch,
 * und darüber will niemand benachrichtigt werden.
 */
export function beobachteVersion(melde: (bereit: boolean) => void, umgebung: Umgebung): Versionswache {
  let registrierung: Registrierung | null = null;
  let uebernahmeLaeuft = false;

  function pruefeArbeiter(arbeiter: Arbeiter | null): void {
    if (!arbeiter) return;
    if (arbeiter.state === 'installed' && umgebung.verwaltung.controller) melde(true);
  }

  void umgebung.verwaltung
    .register(umgebung.adresse)
    .then((gefunden) => {
      registrierung = gefunden;
      // Schon beim Öffnen kann eine Fassung warten – etwa wenn die App
      // zwischendurch in einem anderen Tab aktualisiert wurde.
      pruefeArbeiter(gefunden.waiting);
      gefunden.addEventListener('updatefound', () => {
        const neuer = gefunden.installing;
        if (!neuer) return;
        neuer.addEventListener('statechange', () => pruefeArbeiter(neuer));
      });
    })
    .catch(() => {
      // Ohne Service Worker läuft die App weiter, nur eben nicht offline.
    });

  umgebung.verwaltung.addEventListener('controllerchange', () => {
    // Nur nach dem eigenen Zutun neu laden: Sonst reißt ein Wechsel, den ein
    // anderer Tab ausgelöst hat, die Seite unter den Fingern weg.
    if (!uebernahmeLaeuft) return;
    uebernahmeLaeuft = false;
    umgebung.neuladen();
  });

  return {
    pruefe() {
      void registrierung?.update().catch(() => {});
    },
    uebernehmen() {
      const wartend = registrierung?.waiting;
      if (!wartend) {
        umgebung.neuladen();
        return;
      }
      uebernahmeLaeuft = true;
      wartend.postMessage('uebernehmen');
    }
  };
}

/** Die echte Umgebung – oder nichts, wo es keinen Service Worker gibt. */
export function browserUmgebung(): Umgebung | null {
  if (!('serviceWorker' in navigator)) return null;
  return {
    verwaltung: navigator.serviceWorker as unknown as Verwaltung,
    // Relativ zum Dokument, damit die App auch in einem Unterverzeichnis läuft.
    adresse: new URL('sw.js', location.href).href,
    neuladen: () => location.reload()
  };
}
