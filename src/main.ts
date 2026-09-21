import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { gespeichertesThema, setzeThema } from './lib/theme';

setzeThema(gespeichertesThema());

mount(App, { target: document.getElementById('app')! });

// Registriert wird der Service Worker in App.svelte – zusammen mit dem
// Hinweis auf eine neue Fassung, denn beides haengt am selben Ablauf.
