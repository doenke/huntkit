<script lang="ts">
  import { gespeichertesThema, setzeThema, THEMEN, type Thema } from '../lib/theme';
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
<div class="themen">
  {#each THEMEN as eintrag (eintrag.id)}
    <button
      type="button"
      aria-pressed={thema === eintrag.id}
      onclick={() => waehle(eintrag.id)}
    >
      <strong>{eintrag.titel}</strong>
      <span>{eintrag.hinweis}</span>
    </button>
  {/each}
</div>

<h2>Über</h2>
<p class="leise">
  huntkit läuft vollständig offline und ohne Server. Einmal geladen, bleibt alles
  auf dem Gerät – auch der Stand der Werkbank und der Lösungswörter.
</p>
<p class="leise">
  Die Zeichen des Fingeralphabets stammen vom Landesverband Bayern der Gehörlosen
  e. V. und stehen unter
  <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noreferrer">
    CC BY-SA 4.0</a>. Alle übrigen Zeichen sind eigene Zeichnungen.
</p>

<style>
  h2 {
    margin-top: 28px;
  }

  h2:first-of-type {
    margin-top: 0;
  }

  .themen {
    display: grid;
    gap: 8px;
    margin-bottom: 24px;
  }

  .themen button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 2px;
    padding: 8px 14px;
    text-align: left;
  }

  .themen button[aria-pressed='true'] {
    border-color: var(--akzent);
  }

  .themen span,
  .leise {
    color: var(--text-leise);
    font-size: 0.9rem;
  }
</style>
