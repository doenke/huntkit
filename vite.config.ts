import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { offlineCache } from './tools/vite-plugin-offline';
import { serverDateien } from './tools/vite-plugin-server';

export default defineConfig({
  // Relative Pfade: Die gebaute App laeuft unter jeder Domain und in jedem
  // Unterverzeichnis, ohne neu gebaut zu werden.
  base: './',
  plugins: [svelte(), serverDateien(), offlineCache()],
  // Zum Entwickeln mit Gruppen: `php -S localhost:8080 -t server` daneben starten.
  server: {
    proxy: { '/api': 'http://localhost:8080' }
  },
  build: {
    target: 'es2022',
    // Grosse Datensaetze (Elemente, spaeter Woerterbuch) als eigene Pakete,
    // damit die App auch ohne sie startet.
    assetsInlineLimit: 2048
  }
});
