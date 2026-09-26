<script lang="ts">
  import Mailadresse from '../ui/Mailadresse.svelte';
  import Textseite from '../ui/Textseite.svelte';
</script>

<Textseite unter="Wer hinter huntkit steckt.">
  <div class="merk">
    <p>
      huntkit ist ein privates Projekt, kein Gewerbe. Es gibt nichts zu kaufen, nichts zu
      abonnieren und niemanden, der davon lebt.
    </p>
  </div>

  <h2>Verantwortlich</h2>
  <p>
    Sönke Jacobs<br />
    <Mailadresse />
  </p>

  <h2>Fehler und Wünsche</h2>
  <p>
    Der Quelltext liegt offen unter
    <a href="https://github.com/doenke/huntkit" rel="noopener noreferrer" target="_blank">github.com/doenke/huntkit</a>.
    Dort sind Fehlermeldungen am besten aufgehoben – am liebsten mit dem Rätsel oder der
    Werkbank, an der es hakt.
  </p>

  <h2>Zur Nutzung</h2>
  <p>
    Diese Installation ist für den eigenen Kreis gedacht. Eine Zusage, dass sie erreichbar
    bleibt, ist damit nicht verbunden: Sie läuft, solange sie läuft. Einmal geladen, arbeitet
    die App ohnehin ohne Netz weiter.
  </p>
  <p>
    huntkit ist ein Werkzeug zum Rätseln und hat mit den Veranstaltern der Dortmunder
    Nachtschicht, der RätselNacht oder des MIT Mystery Hunt nichts zu tun. Welche Lösung
    gilt, entscheiden immer die Veranstalter.
  </p>

  <p class="fuss">
    <a href="#/datenschutz">Datenschutz</a> ·
    <a href="#/werkbank">zur Werkbank</a>
  </p>
</Textseite>
