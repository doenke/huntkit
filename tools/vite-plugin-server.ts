import { cpSync, existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

/**
 * Legt den PHP-Teil für Gruppen (`server/api`) mit ins Build – als `api/`
 * neben die App. So landet er mit demselben Deployment auf dem Webspace.
 *
 * Die App funktioniert ohne ihn genauso; er wird nur gebraucht, wenn jemand
 * einer Gruppe beitritt. Der Service Worker lässt `api/` deshalb aus dem
 * Cache heraus (siehe vite-plugin-offline.ts).
 */
export function serverDateien(): Plugin {
  let konfiguration: ResolvedConfig | null = null;
  return {
    name: 'huntkit-server-dateien',
    apply: 'build',
    configResolved(gelesen) {
      konfiguration = gelesen;
    },
    writeBundle() {
      const wurzel = konfiguration?.root ?? process.cwd();
      const ausgabe = konfiguration?.build.outDir ?? 'dist';
      const ziel = join(isAbsolute(ausgabe) ? ausgabe : resolve(wurzel, ausgabe), 'api');
      const quelle = resolve(wurzel, 'server/api');
      if (!existsSync(quelle)) return;
      // Eine lokal abgelegte config.php gehört nie ins Build.
      cpSync(quelle, ziel, { recursive: true, filter: (pfad) => !/[\\/]config[^\\/]*\.php$/.test(pfad) });
    }
  };
}
