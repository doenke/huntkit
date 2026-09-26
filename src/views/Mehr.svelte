<script lang="ts">
  import { gespeichertesThema, setzeThema, THEMEN, type Thema } from '../lib/ui/theme';
  import { UEBUNGEN } from '../lib/uebungen';
  import Nachtausruestung from '../ui/Nachtausruestung.svelte';
  import Uebung from '../ui/Uebung.svelte';

  let thema = $state<Thema>(gespeichertesThema());

  function waehle(neu: Thema) {
    thema = neu;
    setzeThema(neu);
  }
</script>

<h2>Übungen</h2>
<p class="leise">
  Kleine Rätsel zum Kennenlernen der Werkzeuge. Gelöst wird mit der Werkbank –
  wer nicht weiterkommt, deckt Tipps auf oder öffnet den Lösungsweg.
</p>
{#each UEBUNGEN as uebung (uebung.id)}
  <Uebung {uebung} />
{/each}

<h2>Für die Nacht</h2>
<Nachtausruestung />

<h2>Darstellung</h2>
<div class="themen" role="group" aria-label="Darstellung">
  {#each THEMEN as eintrag (eintrag.id)}
    <button
      type="button"
      aria-pressed={thema === eintrag.id}
      title={eintrag.hinweis}
      onclick={() => waehle(eintrag.id)}
    >
      {eintrag.titel}
    </button>
  {/each}
</div>

<h2>Über</h2>
<p class="leise">
  huntkit läuft vollständig offline und ohne Server. Einmal geladen, bleibt alles
  auf dem Gerät – auch der Stand der Werkbank und der Lösungswörter. Nur wer einer
  Gruppe beitritt, gleicht deren Werkbänke über den Server ab; alles andere bleibt
  trotzdem auf dem Gerät.
</p>
<p class="leise">
  Die Zeichen des Fingeralphabets stammen vom Landesverband Bayern der Gehörlosen
  e. V. und stehen unter
  <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noreferrer">
    CC BY-SA 4.0</a>. Alle übrigen Zeichen sind eigene Zeichnungen.
</p>
<p class="leise">
  <a href="#/datenschutz">Datenschutz</a> · <a href="#/kontakt">Kontakt</a>
</p>

<style>
  h2 {
    margin-top: 28px;
  }

  h2:first-of-type {
    margin-top: 0;
  }


  /* Ein Umschalter in einer Reihe: drei Knöpfe, die aneinanderstoßen. */
  .themen {
    display: flex;
    margin-bottom: 24px;
  }

  .themen button {
    flex: 1 1 0;
    min-height: 44px;
    padding: 0 8px;
    border-radius: 0;
  }

  .themen button + button {
    margin-left: -1px;
  }

  .themen button:first-child {
    border-radius: var(--radius) 0 0 var(--radius);
  }

  .themen button:last-child {
    border-radius: 0 var(--radius) var(--radius) 0;
  }

  .themen button[aria-pressed='true'] {
    position: relative;
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .leise {
    color: var(--text-leise);
    font-size: 0.9rem;
  }
</style>
