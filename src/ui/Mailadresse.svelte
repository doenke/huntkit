<script lang="ts">
  /**
   * Die Kontaktadresse – nie am Stück im Quelltext. Adresssammler lesen, was
   * der Server ausliefert, und setzen nichts zusammen; die Teile werden erst
   * beim Anzeigen verbunden. Aufhalten lässt sich damit nicht jeder, aber
   * die einfachen.
   */
  const NAME = 'soenke';
  const HOST = ['soenkejacobs', 'de'].join('.');
  const adresse = `${NAME}@${HOST}`;
</script>

<a href={`mailto:${adresse}`}>{adresse}</a>
