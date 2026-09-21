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
      // Die Version wechselt genau dann, wenn sich Inhalte aendern – damit
      // ersetzt der Service Worker seinen Cache nicht bei jedem Deployment neu.
      const version = createHash('sha256')
        .update(dateien.map((d) => d + readFileSync(join(verzeichnis, d))).join('\n'))
        .digest('hex')
        .slice(0, 12);

      writeFileSync(join(verzeichnis, 'sw.js'), serviceWorker(version, dateien), 'utf8');
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

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
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
