import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { gespeichertesThema, setzeThema } from './lib/theme';

setzeThema(gespeichertesThema());

mount(App, { target: document.getElementById('app')! });

// Service Worker relativ zum Dokument registrieren, damit die App auch in
// einem Unterverzeichnis funktioniert.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', location.href)).catch(() => {
      // Ohne Service Worker laeuft die App weiter, nur eben nicht offline.
    });
  });
}
