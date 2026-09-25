<script lang="ts">
  /**
   * Kleine Strich-Symbole für Knöpfe, selbst gezeichnet in der Textfarbe –
   * damit sie auch im Rotlicht-Design lesbar sind und nichts nachgeladen wird.
   */
  type Name = 'stift' | 'kopie' | 'papierkorb' | 'radierer' | 'gruppe';
  let { name, groesse = 18 }: { name: Name; groesse?: number } = $props();

  const PFADE: Record<Name, string> = {
    stift: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3zM14 7l3 3',
    kopie: 'M9 9h10v11H9zM15 9V5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3',
    papierkorb: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
    radierer: 'M15 4l5 5-9 9H7l-3-3 11-11zM9 9l6 6M11 20h9',
    gruppe: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 11a2.5 2.5 0 1 0 0-5M17 15c2.5.3 4 1.8 4 4.5'
  };
</script>

<svg
  width={groesse}
  height={groesse}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PFADE[name]} />
</svg>
