<script lang="ts">
  import { gespeichertesThema, setzeThema, THEMEN, type Thema } from '../lib/theme';

  let thema = $state<Thema>(gespeichertesThema());

  function waehle(neu: Thema) {
    thema = neu;
    setzeThema(neu);
  }
</script>

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
  auf dem Gerät.
</p>

<style>
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
