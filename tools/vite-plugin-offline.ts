import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/**
 * Erzeugt nach dem Bauen einen Service Worker, der die komplette App beim
 * Installieren in den Cache legt und danach zuerst aus dem Cache ausliefert.
 *
 * Der Grund, warum das ein eigenes Plugin ist und keine fertige Bibliothek:
 * Offline-Betrieb ist Abnahmekriterium, und die einzige fehleranfaellige Stelle
 * daran ist die Liste der zu cachenden Dateien. Die wird hier aus dem
 * tatsaechlichen Build-Ergebnis erzeugt, kann also nichts vergessen.
 */
export function offlineCache(): Plugin {
  // Das Ausgabeverzeichnis kommt aus der Konfiguration, nicht aus einer
  // Annahme: Ein Build nach woanders (Vorschau, Test) soll denselben Service
  // Worker bekommen und nicht an einem fest verdrahteten „dist“ scheitern.
  let konfiguration: ResolvedConfig | null = null;
  return {
    name: 'huntkit-offline-cache',
    apply: 'build',
    configResolved(gelesen) {
      konfiguration = gelesen;
    },
    closeBundle() {
      const ausgabe = konfiguration?.build.outDir ?? 'dist';
      const wurzel = konfiguration?.root ?? process.cwd();
      const verzeichnis = isAbsolute(ausgabe) ? ausgabe : resolve(wurzel, ausgabe);
      const dateien = sammleDateien(verzeichnis, verzeichnis).sort();
      // Jede Datei traegt ihren Inhalts-Hash in der Adresse. Daran erkennt ein
      // neuer Worker, was er aus dem alten Cache uebernehmen kann, statt es neu
      // zu laden – die Wortlisten allein sind mehrere Megabyte.
      const mitHash = dateien.map((d) => {
        const hash = createHash('sha256').update(readFileSync(join(verzeichnis, d))).digest('hex').slice(0, 12);
        return `${d}?v=${hash}`;
      });
      // Die Version wechselt genau dann, wenn sich Inhalte aendern – damit
      // ersetzt der Service Worker seinen Cache nicht bei jedem Deployment neu.
      const version = createHash('sha256').update(mitHash.join('\n')).digest('hex').slice(0, 12);

      writeFileSync(join(verzeichnis, 'sw.js'), serviceWorker(version, mitHash), 'utf8');
      this.info(`Service Worker: ${dateien.length} Dateien, Version ${version}`);
    }
  };
}

function sammleDateien(wurzel: string, verzeichnis: string): string[] {
  const gefunden: string[] = [];
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) {
      gefunden.push(...sammleDateien(wurzel, pfad));
    } else if (eintrag !== 'sw.js') {
      gefunden.push(relative(wurzel, pfad).split(sep).join(posix.sep));
    }
  }
  return gefunden;
}

function serviceWorker(version: string, dateien: string[]): string {
  return `// Erzeugt beim Bauen – nicht von Hand aendern.
const CACHE = 'huntkit-${version}';
const DATEIEN = ${JSON.stringify(['./', ...dateien], null, 1)};

// Der neue Worker draengelt sich nicht vor: Er legt seinen Cache an und
// wartet. Sonst wuerde mitten im Raetsel der Unterbau unter der laufenden
// Seite ausgetauscht. Uebernommen wird er erst auf Zuruf - oder von selbst,
// sobald die letzte Seite zu ist.
//
// Was sich seit der letzten Version nicht geaendert hat, liegt schon im alten
// Cache – unter derselben Adresse samt Inhalts-Hash. Das wird uebernommen,
// statt es noch einmal herunterzuladen; nur Neues kommt aus dem Netz.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((neu) =>
      Promise.all(
        DATEIEN.map(async (adresse) => {
          const alt = adresse.includes('?v=') ? await caches.match(adresse) : undefined;
          if (alt) return neu.put(adresse, alt);
          const antwort = await fetch(adresse, { cache: 'no-cache' });
          if (!antwort.ok) throw new Error(adresse + ': ' + antwort.status);
          return neu.put(adresse, antwort);
        })
      )
    )
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'uebernehmen') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((treffer) => {
      if (treffer) return treffer;
      return fetch(e.request).catch(() =>
        // Navigationsziele landen bei Hash-Routing immer auf der Startseite.
        e.request.mode === 'navigate' ? caches.match('./') : Promise.reject(new Error('offline'))
      );
    })
  );
});
`;
}
