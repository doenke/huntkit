import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { offlineCache } from './tools/vite-plugin-offline';

export default defineConfig({
  // Relative Pfade: Die gebaute App laeuft unter jeder Domain und in jedem
  // Unterverzeichnis, ohne neu gebaut zu werden.
  base: './',
  plugins: [svelte(), offlineCache()],
  build: {
    target: 'es2022',
    // Grosse Datensaetze (Elemente, spaeter Woerterbuch) als eigene Pakete,
    // damit die App auch ohne sie startet.
    assetsInlineLimit: 2048
  }
});
