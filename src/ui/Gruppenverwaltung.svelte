<script lang="ts">
  import { abgleich } from '../lib/gruppe/gruppen.svelte';
  import { ladeSammlung, sichereSammlung } from '../lib/sammlung';
  import Gruppen from './Gruppen.svelte';

  /**
   * Die Gruppen auf ihrer eigenen Seite: anmelden, Gruppen anlegen, Mitglieder und
   * Einladungen verwalten – ohne erst eine Werkbank aufzumachen. Den Abgleich
   * der Werkbänke übernimmt weiter die Werkbank selbst.
   */
  let meldung = $state('');

  $effect(() => {
    // Konto, Gruppen des Kontos und deren Mitglieder frisch vom Server.
    void abgleich.kontoLaden().then(() => {
      for (const id of Object.keys(abgleich.speicher.gruppen)) void abgleich.detailsLaden(id);
    });
  });

  /**
   * Eine Gruppe hier vergessen. Ihre Werkbänke bleiben als eigene – genau wie
   * in der Werkbank. Die ist gerade nicht offen, also direkt im Speicher.
   */
  function gruppeVergessen(gruppe: string) {
    const sammlung = ladeSammlung();
    for (const w of sammlung.werkbaenke) if (w.gruppe === gruppe) delete w.gruppe;
    sichereSammlung(sammlung);
    abgleich.vergessen(gruppe);
    abgleich.sichereJetzt();
  }
</script>

{#if meldung}<p class="meldung">{meldung}</p>{/if}
<Gruppen {gruppeVergessen} melde={(text) => (meldung = text)} />

<style>
  .meldung {
    margin: 0 0 8px;
    font-size: 0.8rem;
    color: var(--akzent);
  }

  /* Auf der Seite „Gruppen“ steht die Überschrift schon darüber – Trennstrich und Titel fallen weg. */
  :global(.seite-gruppen .gruppen) {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }

  :global(.seite-gruppen .gruppen > .kopf > strong) {
    visibility: hidden;
  }
</style>
