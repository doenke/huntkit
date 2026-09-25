<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { codec as findeCodec } from '../codecs/registry';
  import type { OptionWerte } from '../codecs/types';
  import {
    anzeigetafel,
    hoechsteNummer,
    leeresBlatt,
    neueEingabespalte,
    neuePositionsspalte,
    neueWerkzeugspalte,
    neueZeile,
    rechne,
    sortierungOhne,
    spaltenname,
    spaltenzeichen,
    zeigtBild,
    type Blatt,
    type Sortierung,
    type Spalte,
    type SpaltenId
  } from '../lib/werkbank/blatt';
  import { zeichenbar } from '../lib/ui/codeanzeige';
  import { nimmParameter } from '../lib/router';
  import { ausAdresse } from '../lib/werkbank/teilen';
  import { abgleich, aktiveGruppe, ansicht as gruppenansicht, gruppenliste, mitglied } from '../lib/gruppe/gruppen.svelte';
  import { zellschluessel } from '../lib/gruppe/schluessel';
  import {
    amOrtHier,
    anlegen,
    ausLink,
    beobachte,
    darfLoeschen,
    kopierenNach as kopiereNach,
    loeschen,
    offene,
    sammlung,
    umbenennen,
    uebernimmOffene,
    wechseln as oeffneWerkbank
  } from '../lib/werkbank/werkbaenke.svelte';
  import { breitNachText, wachsen } from '../lib/ui/wachsen';
  import {
    feldUmschreiben,
    speichereUmlauteAufloesen,
    umlauteAufloesenGespeichert
  } from '../lib/werkbank/umlautschalter';
  import Avatar from '../ui/Avatar.svelte';
  import Codeanzeige from '../ui/Codeanzeige.svelte';
  import Protokoll from '../ui/Protokoll.svelte';
  import Sortierwahl from '../ui/Sortierwahl.svelte';
  import Spalteneinstellung from '../ui/Spalteneinstellung.svelte';
  import Tafeleingabe from '../ui/Tafeleingabe.svelte';
  import Symbol from '../ui/Symbol.svelte';
  import Tour from '../ui/Tour.svelte';
  import Werkbaenke from '../ui/Werkbaenke.svelte';
  import { merkeTourGesehen, tourGesehen, WERKBANK_TOUR, type Tourschritt } from '../lib/ui/tour';
  import Zellenanalyse from '../ui/Zellenanalyse.svelte';

  /**
   * Die Werkbank als Blatt: Zeilen und Spalten statt eines einzelnen Textes.
   *
   * Erste Spalte eintippen – auf Wunsch mit einer Codetafel, dann sieht man
   * auch Morse als Morse. Jede weitere Spalte ist entweder wieder Eingabe oder
   * ein Werkzeug auf einer früheren Spalte. Sortieren betrifft nur die Anzeige;
   * jede Zeile behält dabei ihre Eingabenummer.
   */

  /** Eine eigene Kopie – nie das gespeicherte Objekt selbst; übernommen wird erst über `uebernimmOffene`. */
  const kopie = (b: Blatt): Blatt => JSON.parse(JSON.stringify(b)) as Blatt;

  /** Die Arbeitskopie der offenen Werkbank. Alles in der Tabelle ändert nur sie. */
  let blatt = $state(kopie(offene().blatt));
  let verwaltungOffen = $state(false);
  let gewaehlt = $state<{ spalte: SpaltenId; zeile: string } | null>(null);
  let einstellung = $state<SpaltenId | null>(null);
  let umlauteAufloesen = $state(umlauteAufloesenGespeichert());

  /*
   * Drei Boxen gibt es: die Verwaltung der Werkbänke, die Einstellung einer
   * Spalte und die Box zur gewählten Zelle. Offen ist immer höchstens eine –
   * wer eine öffnet, schließt die andere. Ein Klick außerhalb schließt sie
   * ganz; was als Teil einer Box oder als ihr Öffner zählt, trägt `data-box`.
   */
  /*
   * Der Fokus allein wählt nur die Zelle; die übrigen Boxen schließt erst der
   * Tipp. Sonst verschwindet eine Box über der Tabelle schon beim Fokus, die
   * Tabelle rutscht nach oben, und der Tipp landet daneben.
   */
  function zeigeZelle(ziel: { spalte: SpaltenId; zeile: string }) {
    gewaehlt = ziel;
    einstellung = null;
    verwaltungOffen = false;
    sortierungOffen = false;
  }

  function zeigeEinstellung(id: SpaltenId | null) {
    einstellung = id;
    if (id === null) return;
    gewaehlt = null;
    verwaltungOffen = false;
    sortierungOffen = false;
  }

  function verwaltungUmschalten() {
    verwaltungOffen = !verwaltungOffen;
    gruppeProtokoll = false;
    if (!verwaltungOffen) return;
    gewaehlt = null;
    einstellung = null;
    sortierungOffen = false;
  }

  /** Die Sortierung ist die vierte Box – über den Knopf in der Leiste. */
  let sortierungOffen = $state(false);

  function sortierungUmschalten() {
    sortierungOffen = !sortierungOffen;
    if (!sortierungOffen) return;
    gewaehlt = null;
    einstellung = null;
    verwaltungOffen = false;
  }

  /** Was der Knopf zeigt: nach welcher Spalte gerade sortiert ist. */
  const sortierText = $derived(
    blatt.sortierung
      ? `${spaltenname(blatt, blatt.sortierung.spalte)} ${blatt.sortierung.richtung === 'auf' ? '↑' : '↓'}`
      : 'Eingabe'
  );

  function alleSchliessen() {
    gewaehlt = null;
    einstellung = null;
    verwaltungOffen = false;
    sortierungOffen = false;
  }
  /*
   * Die Tour durch die Werkbank. Sie startet von selbst, wenn jemand die App
   * zum ersten Mal öffnet und noch nichts in der Werkbank steht; danach über
   * das Menü oder einen Link mit „?tour“ – beides landet hier als Adresse.
   */
  let tourAn = $state(false);

  function starteTour() {
    alleSchliessen();
    tourAn = true;
    merkeTourGesehen();
  }

  function beendeTour() {
    tourAn = false;
    alleSchliessen();
  }

  /** Für jeden Schritt die passende Box – gezeigt wird an der ersten Zeile und Spalte. */
  function tourSchritt(schritt: Tourschritt) {
    const spalte = blatt.spalten[0];
    const zeile = berechnung.zeilen[0]?.zeile;
    if (schritt.oeffne === 'zelle' && spalte && zeile) zeigeZelle({ spalte: spalte.id, zeile: zeile.id });
    else if (schritt.oeffne === 'einstellung' && spalte) zeigeEinstellung(spalte.id);
    else alleSchliessen();
  }

  $effect(() => {
    const vonAdresse = () => {
      if (nimmParameter('tour').tour !== undefined) starteTour();
    };
    vonAdresse();
    addEventListener('hashchange', vonAdresse);
    return () => removeEventListener('hashchange', vonAdresse);
  });

  $effect(() => {
    untrack(() => {
      if (tourAn || tourGesehen() || /[?&]w=/.test(location.hash)) return;
      const leer =
        sammlung.werkbaenke.length === 1 &&
        blatt.zeilen.every((z) => Object.values(z.werte).every((w) => !w?.trim()));
      if (leer) starteTour();
    });
  });


  $effect(() => {
    // Nach den Klicks der Elemente selbst: Die haben ihre Box schon geöffnet
    // oder gewechselt, hier geht es nur noch um Klicks ins Leere.
    const klick = (e: MouseEvent) => {
      // Der Pfad stammt vom Zeitpunkt des Klicks. Ein Knopf, der sich beim
      // Klick selbst ersetzt (etwa „✕“ durch „wirklich löschen“), ist
      // hier schon aus dem Dokument – `closest` fände seine Box nicht mehr.
      if (e.composedPath().some((el) => el instanceof Element && el.hasAttribute('data-box'))) return;
      alleSchliessen();
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alleSchliessen();
    };
    document.addEventListener('click', klick);
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('click', klick);
      document.removeEventListener('keydown', taste);
    };
  });

  const werkbank = $derived(offene());

  // Ein Stand in der Adresse wird eine eigene, neue Werkbank – er überschreibt
  // nie, woran man gerade sitzt. So öffnet eine Übung ihren Lösungsweg, und
  // Links aus der Zeit, als Werkbänke noch per Link geteilt wurden, gehen
  // weiterhin auf. Auch wenn die App schon offen ist und nur die Adresse wechselt.
  $effect(() => {
    const oeffnen = () =>
      void ausAdresse().then((geteilt) => {
        if (geteilt) ausLink(geteilt.blatt, geteilt.name);
      });
    oeffnen();
    addEventListener('hashchange', oeffnen);
    return () => removeEventListener('hashchange', oeffnen);
  });

  // Jede Änderung an der Arbeitskopie geht sofort in die offene Werkbank.
  $effect(() => {
    const stand = JSON.stringify(blatt);
    untrack(() => uebernimmOffene(JSON.parse(stand) as Blatt));
  });

  // Ändert sich die offene Werkbank von außen – anderer Ort, Server, Link –,
  // lädt die Arbeitskopie neu.
  $effect(() => {
    beobachte({
      gewechselt(text) {
        blatt = kopie(offene().blatt);
        gewaehlt = null;
        einstellung = null;
        gruppeProtokoll = false;
        if (text) meldung = text;
      },
      neuerStand() {
        blatt = kopie(offene().blatt);
        if (gewaehlt && !blatt.zeilen.some((z) => z.id === gewaehlt?.zeile)) gewaehlt = null;
        if (gewaehlt && !blatt.spalten.some((s) => s.id === gewaehlt?.spalte)) gewaehlt = null;
        if (einstellung && !blatt.spalten.some((s) => s.id === einstellung)) einstellung = null;
      }
    });
    return () => beobachte(null);
  });

  let gruppeProtokoll = $state(false);
  let zellverlauf = $state(false);

  /** Der Ort: die aktive Gruppe oder, ohne sie, dieses Gerät. Die Liste zeigt nur seine Werkbänke. */
  const ort = $derived(aktiveGruppe());
  const werkbaenkeHier = $derived.by(() => {
    void ort;
    return amOrtHier();
  });

  /** Die Gruppe der offenen Werkbank mit ihrem Verbindungsstand – für das Protokoll. */
  const gruppeHier = $derived.by(() => {
    void gruppenansicht.version;
    const id = werkbank.gruppe;
    if (!id) return null;
    return { id, status: abgleich.status[id] };
  });

  function kopierenNach(gruppe: string | null) {
    meldung = kopiereNach(werkbank.name, kopie(blatt), gruppe);
    verwaltungOffen = false;
  }

  /** Alle anderen Orte: dieses Gerät und die übrigen Gruppen. */
  const kopierziele = $derived([
    ...(ort ? [{ id: null, name: 'Nur auf diesem Gerät' }] : []),
    ...gruppenliste().filter((g) => g.id !== ort)
  ]);

  const berechnung = $derived(rechne(blatt));
  const spalteEinstellung = $derived(blatt.spalten.find((s) => s.id === einstellung));
  const zelle = $derived.by(() => {
    const wahl = gewaehlt;
    if (!wahl) return null;
    const reihe = berechnung.zeilen.find((z) => z.zeile.id === wahl.zeile);
    const spalte = blatt.spalten.find((s) => s.id === wahl.spalte);
    if (!reihe || !spalte) return null;
    return { reihe, spalte, inhalt: reihe.zellen[spalte.id] ?? { text: '', luecken: [] } };
  });

  /** Wer die gewählte Eingabezelle zuletzt geändert hat – nur bei Werkbänken einer Gruppe. */
  const zuletzt = $derived.by(() => {
    void gruppenansicht.version;
    const g = werkbank.gruppe;
    const z = zelle;
    if (!g || !z || z.spalte.art !== 'eingabe') return null;
    const schluessel = zellschluessel(z.reihe.zeile.id, z.spalte.id);
    const eintrag = abgleich.eintrag(g, werkbank.id, schluessel);
    return {
      schluessel,
      eintrag,
      wer: eintrag ? mitglied(g, eintrag.von) : null,
      ausstehend: abgleich.istAusstehend(g, werkbank.id, schluessel)
    };
  });

  $effect(() => {
    // Eine andere Zelle gewählt: Der Verlauf klappt wieder zu.
    void gewaehlt?.zeile;
    void gewaehlt?.spalte;
    zellverlauf = false;
  });

  function kopfname(spalte: Spalte): string {
    if (spalte.titel?.trim()) return spalte.titel.trim();
    if (spalte.art === 'eingabe') return spalte.tafel ? (findeCodec(spalte.tafel)?.name ?? 'Eingabe') : 'Eingabe';
    if (spalte.art === 'position') return 'Platz';
    return findeCodec(spalte.codecId)?.name ?? spalte.codecId;
  }

  function untertitel(spalte: Spalte): string {
    if (spalte.art === 'werkzeug') {
      const richtung = spalte.richtung === 'decode' ? '→' : '←';
      return `${richtung} ${spaltenname(blatt, spalte.quelle)}`;
    }
    if (spalte.art === 'eingabe' && spalte.tafel) return 'Tafel';
    if (spalte.art === 'position') {
      const nach = spalte.nach;
      if (!nach) return 'in der Eingabe';
      const erste = `nach ${spaltenname(blatt, nach.spalte)} ${nach.richtung === 'auf' ? '↑' : '↓'}`;
      return nach.dann
        ? `${erste}, dann ${spaltenname(blatt, nach.dann.spalte)} ${nach.dann.richtung === 'auf' ? '↑' : '↓'}`
        : erste;
    }
    return '';
  }

  /**
   * Zeichenbar ist eine Spalte, wenn ihr Inhalt in einem Code steht, den wir
   * malen können. Werkzeuge rechnen weiterhin mit den Zeichen – die Anzeige
   * ändert nichts am Wert.
   */
  function tafelVon(spalte: Spalte): string | null {
    const id = anzeigetafel(spalte);
    return id && zeichenbar(findeCodec(id)) ? id : null;
  }

  function anzeigeUmschalten(spalte: Spalte) {
    spalte.darstellung = zeigtBild(spalte) ? 'zeichen' : 'grafik';
  }

  function zeileHinzufuegen() {
    blatt.zeilen.push(neueZeile(hoechsteNummer(blatt) + 1));
  }

  function zeileLoeschen(id: string) {
    blatt.zeilen = blatt.zeilen.filter((z) => z.id !== id);
    if (gewaehlt?.zeile === id) gewaehlt = null;
  }

  function spalteHinzufuegen(art: 'eingabe' | 'werkzeug' | 'position') {
    const letzte = blatt.spalten[blatt.spalten.length - 1];
    const neu =
      art === 'eingabe'
        ? neueEingabespalte()
        : art === 'position'
          ? // Zählt zunächst so, wie die Tabelle gerade sortiert ist – das sieht man ja.
            neuePositionsspalte(blatt.sortierung)
          : letzte
            ? neueWerkzeugspalte(letzte.id, 'morse')
            : neueEingabespalte();
    blatt.spalten.push(neu);
    zeigeEinstellung(neu.id);
  }

  /**
   * Eine Spalte fällt weg – alles, was auf sie zeigte, muss mit. Quellen
   * rücken auf die Spalte davor, gebundene Optionen werden wieder fest, und
   * Sortierschritte nach dieser Spalte verschwinden.
   */
  function spalteLoeschen(id: SpaltenId) {
    const stelle = blatt.spalten.findIndex((s) => s.id === id);
    if (stelle < 0) return;
    const ersatz = blatt.spalten[stelle - 1]?.id;
    blatt.spalten = blatt.spalten.filter((s) => s.id !== id);
    for (const spalte of blatt.spalten) {
      // Zählte eine Position nach der gelöschten Spalte, rückt die zweite Stufe
      // nach – oder sie zählt wieder in der Eingabereihenfolge.
      if (spalte.art === 'position') {
        const nach = sortierungOhne(spalte.nach, id);
        if (nach) spalte.nach = nach;
        else delete spalte.nach;
      }
      if (spalte.art !== 'werkzeug') continue;
      if (spalte.quelle === id) spalte.quelle = ersatz ?? blatt.spalten[0]?.id ?? '';
      for (const [optionId, bindung] of Object.entries(spalte.optionen)) {
        if (bindung.art === 'spalte' && bindung.spalte === id) {
          const spec = findeCodec(spalte.codecId)?.optionen?.find((o) => o.id === optionId);
          spalte.optionen[optionId] = { art: 'fest', wert: spec?.standard ?? '' };
        }
      }
    }
    const sortierung = sortierungOhne(blatt.sortierung, id);
    if (sortierung) blatt.sortierung = sortierung;
    else delete blatt.sortierung;
    for (const zeile of blatt.zeilen) delete zeile.werte[id];
    if (einstellung === id) einstellung = null;
    if (gewaehlt?.spalte === id) gewaehlt = null;
  }

  function sortiereAnzeige(neu: Sortierung | undefined) {
    if (neu) blatt.sortierung = neu;
    else delete blatt.sortierung;
  }

  /** Einen Treffer der Untersuchung auf das ganze Blatt anwenden. */
  function alsSpalte(codecId: string, optionen: OptionWerte) {
    const quelle = gewaehlt?.spalte ?? blatt.spalten[blatt.spalten.length - 1]?.id;
    if (!quelle) return;
    const neu = neueWerkzeugspalte(quelle, codecId);
    for (const [id, wert] of Object.entries(optionen)) neu.optionen[id] = { art: 'fest', wert };
    blatt.spalten.push(neu);
  }

  function setzeWert(zeileId: string, spalteId: SpaltenId, wert: string) {
    const zeile = blatt.zeilen.find((z) => z.id === zeileId);
    if (zeile) zeile.werte[spalteId] = wert;
  }

  /** Nur Klartext wird umgeschrieben – in einer Codetafel ist ein Ä ein Zeichen des Codes. */
  function schreibtUm(spalte: Spalte): boolean {
    return umlauteAufloesen && spalte.art === 'eingabe' && !spalte.tafel;
  }

  /** `fertig` beim Verlassen des Felds: Dann wird auch ein noch offenes großes Ü aufgelöst. */
  function getippt(
    feld: HTMLInputElement | HTMLTextAreaElement,
    zeileId: string,
    spalte: Spalte,
    fertig = false
  ) {
    setzeWert(zeileId, spalte.id, schreibtUm(spalte) ? feldUmschreiben(feld, fertig) : feld.value);
  }

  /**
   * Enter springt in derselben Spalte eine Zeile tiefer – in der Reihenfolge,
   * die gerade zu sehen ist – und legt die Zeile an, wenn es keine mehr gibt.
   * Mit Umschalt geht es eine Zeile hoch. Einen Zeilenumbruch in einer Zelle
   * gibt es nicht; eine Liste tippt man so Zeile für Zeile herunter.
   */
  async function naechsteZeile(
    feld: HTMLInputElement | HTMLTextAreaElement,
    zeileId: string,
    spalte: Spalte,
    hoch = false
  ) {
    // Wie beim Verlassen des Felds: Ein offenes Ü am Ende wird jetzt aufgelöst.
    getippt(feld, zeileId, spalte, true);
    const reihen = berechnung.zeilen;
    const stelle = reihen.findIndex((r) => r.zeile.id === zeileId);
    let ziel = reihen[hoch ? stelle - 1 : stelle + 1]?.zeile.id;
    if (!ziel) {
      if (hoch) return;
      const neu = neueZeile(hoechsteNummer(blatt) + 1);
      blatt.zeilen.push(neu);
      ziel = neu.id;
    }
    zeigeZelle({ spalte: spalte.id, zeile: ziel });
    // Aus der Tabelle heraus geht der Fokus in die Zelle darunter; im Feld
    // unter der Tabelle bleibt er, das zeigt jetzt einfach die neue Zeile.
    if (feld instanceof HTMLTextAreaElement) return;
    await tick();
    const naechstes = document.querySelector<HTMLInputElement>(
      `input[data-zelle="${CSS.escape(`${ziel}:${spalte.id}`)}"]`
    );
    naechstes?.focus();
    naechstes?.scrollIntoView({ block: 'nearest' });
  }

  function beiTaste(
    e: KeyboardEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement },
    zeileId: string,
    spalte: Spalte
  ) {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    void naechsteZeile(e.currentTarget, zeileId, spalte, e.shiftKey);
  }

  /**
   * Das Feld unter der Tabelle ist mehrzeilig, damit langer Text umbricht –
   * einen Zeilenumbruch nimmt es trotzdem nicht an. Kommt einer an der Taste
   * vorbei (manche Handytastaturen melden Enter nur als Eingabe), zählt er
   * als Enter; ein eingefügter wird zum Leerzeichen.
   */
  function imFeldGetippt(
    e: Event & { currentTarget: HTMLTextAreaElement },
    zeileId: string,
    spalte: Spalte
  ) {
    const feld = e.currentTarget;
    const art = e instanceof InputEvent ? e.inputType : '';
    if (art === 'insertLineBreak' || art === 'insertParagraph') {
      feld.value = feld.value.replace(/\r?\n/g, '');
      void naechsteZeile(feld, zeileId, spalte);
      return;
    }
    if (/[\r\n]/.test(feld.value)) feld.value = feld.value.replace(/\r?\n/g, ' ');
    getippt(feld, zeileId, spalte);
  }

  function umlauteUmschalten() {
    umlauteAufloesen = !umlauteAufloesen;
    speichereUmlauteAufloesen(umlauteAufloesen);
  }

  let meldung = $state('');
  let meldungsUhr: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!meldung) return;
    clearTimeout(meldungsUhr);
    meldungsUhr = setTimeout(() => (meldung = ''), 5000);
  });

  /** Zu einer anderen Werkbank: Die Arbeitskopie lädt neu, sobald sie offen ist. */
  function wechseln(id: string) {
    oeffneWerkbank(id);
  }

  function neueAnlegen() {
    anlegen();
    verwaltungOffen = false;
  }

  function kopieAnlegen(id: string) {
    const vorlage = sammlung.werkbaenke.find((w) => w.id === id);
    if (!vorlage) return;
    anlegen(`${vorlage.name} (Kopie)`, kopie(id === sammlung.aktiv ? blatt : vorlage.blatt));
  }

  function leeren() {
    blatt = leeresBlatt();
    gewaehlt = null;
    einstellung = null;
    verwaltungOffen = false;
  }

  async function kopieren(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ohne Zwischenablage bleibt Markieren von Hand.
    }
  }
</script>

<div class="kopf">
  <button
    type="button"
    class="titel"
    aria-expanded={verwaltungOffen}
    data-box
    data-tour="werkbank-name"
    onclick={verwaltungUmschalten}
    title="Werkbänke verwalten und wechseln"
  >
    <h2>{werkbank.name}</h2>
    <span class="pfeil" aria-hidden="true">{verwaltungOffen ? '▴' : '▾'}</span>
  </button>
  {#if gruppeHier}
    <!-- Welche Gruppe, steht oben im Kopf; hier geht es um den Verlauf dieser Werkbank. -->
    <button
      type="button"
      class="gruppenmarke"
      aria-expanded={gruppeProtokoll}
      data-box
      onclick={() => (gruppeProtokoll = !gruppeProtokoll)}
      title="Wer hat hier was geändert?"
    >
      Protokoll
      {#if gruppeHier.status?.ausstehend}· {gruppeHier.status.ausstehend} ausstehend{/if}
    </button>
  {/if}
  <div class="leiste">
    <button type="button" data-tour="neue-zeile" onclick={zeileHinzufuegen}>+ Zeile</button>
    <select
      data-tour="neue-spalte"
      aria-label="Spalte hinzufügen"
      value=""
      onchange={(e) => {
        const art = e.currentTarget.value as 'eingabe' | 'werkzeug' | 'position';
        if (art) spalteHinzufuegen(art);
        e.currentTarget.value = '';
      }}
    >
      <option value="">+ Spalte …</option>
      <option value="eingabe">Eingabe</option>
      <option value="werkzeug">Werkzeug auf eine Spalte</option>
      <option value="position">Platz in einer Reihenfolge</option>
    </select>
    <button
      type="button"
      class="sortknopf"
      data-box
      data-tour="sortieren"
      aria-expanded={sortierungOffen}
      onclick={sortierungUmschalten}
      title="Sortieren"
    >
      ↕ {sortierText}
    </button>
  </div>
</div>

{#if meldung}
  <p class="meldung">{meldung}</p>
{/if}

{#if gruppeProtokoll && gruppeHier}
  <section class="gruppenprotokoll" data-box>
    <div class="zeile">
      <strong>Protokoll · {werkbank.name}</strong>
      <button type="button" onclick={() => (gruppeProtokoll = false)}>schließen</button>
    </div>
    {#if gruppeHier.status?.fehler && gruppeHier.status.verbindung !== 'abfrage' && gruppeHier.status.verbindung !== 'live'}
      <p class="hinweis warn">{gruppeHier.status.fehler}</p>
    {/if}
    <Protokoll gruppe={gruppeHier.id} werkbank={werkbank.id} {blatt} />
  </section>
{/if}

{#if sortierungOffen}
  <section class="sortierung" data-box>
    <strong>Sortieren</strong>
    <Sortierwahl {blatt} spalten={blatt.spalten} wert={blatt.sortierung} setzen={sortiereAnzeige} />
  </section>
{/if}

{#if verwaltungOffen}
  <div data-box>
  <Werkbaenke
    werkbaenke={werkbaenkeHier}
    aktiv={sammlung.aktiv}
    {darfLoeschen}
    wechseln={(id) => { wechseln(id); verwaltungOffen = false; }}
    neu={neueAnlegen}
    kopieren={kopieAnlegen}
    entfernen={loeschen}
    {umbenennen}
    {leeren}
    ziele={kopierziele}
    {kopierenNach}
  />
  </div>
{/if}

<div class="tabelle">
  <table>
    <thead>
      <tr>
        <th class="ecke" title="Nummer der Eingabe">#</th>
        {#each blatt.spalten as spalte, i (spalte.id)}
          <th>
            <div class="kopfzelle" data-box data-tour={i === 0 ? 'spaltenkopf' : undefined}>
              <button type="button" class="spaltenkopf" onclick={() => zeigeEinstellung(einstellung === spalte.id ? null : spalte.id)}>
                <span class="buchstabe">{spaltenzeichen(i)}</span>
                <span class="name">
                  {kopfname(spalte)}
                  {#if blatt.sortierung?.spalte === spalte.id}
                    <span class="sortiert" title="Die Tabelle ist nach dieser Spalte sortiert">
                      {blatt.sortierung.richtung === 'auf' ? '↑' : '↓'}
                    </span>
                  {:else if blatt.sortierung?.dann?.spalte === spalte.id}
                    <span class="sortiert zweite" title="Bei Gleichstand wird nach dieser Spalte sortiert">
                      {blatt.sortierung.dann.richtung === 'auf' ? '↑' : '↓'}2
                    </span>
                  {/if}
                </span>
                {#if untertitel(spalte)}<span class="quelle">{untertitel(spalte)}</span>{/if}
              </button>
              {#if tafelVon(spalte)}
                <button
                  type="button"
                  class="umschalter"
                  aria-pressed={zeigtBild(spalte)}
                  title={zeigtBild(spalte) ? 'Anzeige: Bild – auf Zeichen umstellen' : 'Anzeige: Zeichen – auf Bild umstellen'}
                  aria-label={zeigtBild(spalte) ? 'Anzeige auf Zeichen umstellen' : 'Anzeige auf Bild umstellen'}
                  onclick={() => anzeigeUmschalten(spalte)}
                >
                  {zeigtBild(spalte) ? '▦' : 'Aa'}
                </button>
              {/if}
            </div>
          </th>
        {/each}
        <th class="rand"></th>
      </tr>
    </thead>
    <tbody>
      {#each berechnung.zeilen as reihe, zi (reihe.zeile.id)}
        <tr>
          <th class="nr">
            <span class="nummer">{reihe.zeile.nummer}</span>
            {#if reihe.eingabeplatz !== reihe.platz}
              <span class="bewegung" title="Verschiebung gegenüber der Eingabereihenfolge">
                {reihe.eingabeplatz > reihe.platz ? '↑' : '↓'}{Math.abs(reihe.eingabeplatz - reihe.platz)}
              </span>
            {/if}
          </th>
          {#each blatt.spalten as spalte, si (spalte.id)}
            {@const inhalt = reihe.zellen[spalte.id]}
            {@const frisch = werkbank.gruppe ? gruppenansicht.frisch[`${werkbank.id}|${zellschluessel(reihe.zeile.id, spalte.id)}`] : undefined}
            <td
              data-box
              data-tour={zi === 0 && si === 0 ? 'zelle' : undefined}
              class:aktiv={gewaehlt?.spalte === spalte.id && gewaehlt?.zeile === reihe.zeile.id}
              class:fehler={Boolean(inhalt?.fehler)}
              class:frisch={Boolean(frisch)}
            >
              {#if frisch && werkbank.gruppe}
                {@const wer = mitglied(werkbank.gruppe, frisch.von)}
                <span class="wer" title={`gerade geändert von ${wer.name}`}>
                  <Avatar name={wer.name} bild={wer.avatar ?? null} groesse={16} />
                </span>
              {/if}
              {#if zeigtBild(spalte) && tafelVon(spalte) && spalte.art === 'eingabe'}
                <!--
                  Bild und Eingabefeld in derselben Zelle: Das Feld liegt
                  unsichtbar über dem Bild, damit ein Tipp sofort dort landet
                  und die Tastatur aufgeht. Beim Tippen deckt es das Bild zu und
                  zeigt den Code im Klartext; danach steht wieder die Zeichnung
                  da. Umschalten muss man dafür nichts.
                -->
                <div class="bildzelle">
                  <span class="bild">
                    <Codeanzeige codecId={tafelVon(spalte) ?? ''} text={inhalt?.text ?? ''} einzeilig />
                  </span>
                  <input
                    class="mono ueber"
                    value={reihe.zeile.werte[spalte.id] ?? ''}
                    spellcheck="false"
                    autocomplete="off"
                    autocapitalize="off"
                    aria-label={`${spaltenname(blatt, spalte.id)}, Zeile ${reihe.zeile.nummer}`}
                    data-zelle={`${reihe.zeile.id}:${spalte.id}`}
                    enterkeyhint="next"
                    use:breitNachText={reihe.zeile.werte[spalte.id] ?? ''}
                    oninput={(e) => setzeWert(reihe.zeile.id, spalte.id, e.currentTarget.value)}
                    onkeydown={(e) => beiTaste(e, reihe.zeile.id, spalte)}
                    onfocus={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                    onclick={() => zeigeZelle({ spalte: spalte.id, zeile: reihe.zeile.id })}
                  />
                </div>
              {:else if zeigtBild(spalte) && tafelVon(spalte)}
                <!-- Gerechnete Spalten sind nicht tippbar – nur anzeigen. -->
                <button
                  type="button"
                  class="wert bild"
                  onclick={() => zeigeZelle({ spalte: spalte.id, zeile: reihe.zeile.id })}
                >
                  <Codeanzeige codecId={tafelVon(spalte) ?? ''} text={inhalt?.text ?? ''} einzeilig />
                </button>
              {:else if spalte.art === 'eingabe'}
                <input
                  class="mono"
                  value={reihe.zeile.werte[spalte.id] ?? ''}
                  spellcheck="false"
                  autocomplete="off"
                  autocapitalize="off"
                  data-zelle={`${reihe.zeile.id}:${spalte.id}`}
                  enterkeyhint="next"
                  use:breitNachText={reihe.zeile.werte[spalte.id] ?? ''}
                  oninput={(e) => getippt(e.currentTarget, reihe.zeile.id, spalte)}
                  onblur={(e) => getippt(e.currentTarget, reihe.zeile.id, spalte, true)}
                  onkeydown={(e) => beiTaste(e, reihe.zeile.id, spalte)}
                  onfocus={() => (gewaehlt = { spalte: spalte.id, zeile: reihe.zeile.id })}
                  onclick={() => zeigeZelle({ spalte: spalte.id, zeile: reihe.zeile.id })}
                />
              {:else}
                <button
                  type="button"
                  class="wert mono"
                  onclick={() => zeigeZelle({ spalte: spalte.id, zeile: reihe.zeile.id })}
                >
                  {inhalt?.fehler ? '⚠' : inhalt?.text}
                </button>
              {/if}
            </td>
          {/each}
          <td class="rand">
            <button
              type="button"
              class="weg"
              onclick={() => zeileLoeschen(reihe.zeile.id)}
              aria-label={`Zeile ${reihe.zeile.nummer} löschen`}
            >
              ✕
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if berechnung.fehler.length > 0}
  <ul class="fehlerliste">
    {#each berechnung.fehler as text (text)}
      <li>{text}</li>
    {/each}
  </ul>
{/if}

{#if spalteEinstellung}
  <div data-box data-tour="spalteneinstellung">
  <Spalteneinstellung
    {blatt}
    spalte={spalteEinstellung}
    schliessen={() => (einstellung = null)}
    entfernen={() => spalteLoeschen(spalteEinstellung.id)}
  />
  </div>
{/if}


{#if zelle}
  <section class="zelle" data-box data-tour="zellenbox">
    <div class="zeile">
      <strong>
        {spaltenname(blatt, zelle.spalte.id)} · Zeile {zelle.reihe.zeile.nummer}
      </strong>
      <span class="knoepfe">
        <button
          type="button"
          class="symbol"
          onclick={() => kopieren(zelle.inhalt.text)}
          disabled={!zelle.inhalt.text}
          aria-label="kopieren"
          title="kopieren"
        >
          <Symbol name="kopie" />
        </button>
        <button type="button" class="symbol" onclick={() => (gewaehlt = null)} aria-label="schließen" title="schließen">
          <Symbol name="schliessen" />
        </button>
      </span>
    </div>

    {#if zuletzt && werkbank.gruppe}
      <div class="zuletzt">
        {#if zuletzt.ausstehend}
          <span class="hinweis">noch nicht beim Server</span>
        {:else if zuletzt.wer && zuletzt.eintrag}
          <Avatar name={zuletzt.wer.name} bild={zuletzt.wer.avatar ?? null} groesse={18} />
          <span class="hinweis">
            zuletzt {zuletzt.wer.name}, {new Date(zuletzt.eintrag.zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        {/if}
        <button type="button" class="klein" aria-expanded={zellverlauf} onclick={() => (zellverlauf = !zellverlauf)}>
          Verlauf
        </button>
      </div>
      {#if zellverlauf}
        <Protokoll gruppe={werkbank.gruppe} werkbank={werkbank.id} {blatt} schluessel={zuletzt.schluessel} />
      {/if}
    {/if}

    {#if zelle.spalte.art === 'eingabe'}
      <textarea
        class="mono"
        rows="2"
        value={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
        use:wachsen={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
        spellcheck="false"
        autocapitalize="off"
        enterkeyhint="next"
        oninput={(e) => imFeldGetippt(e, zelle.reihe.zeile.id, zelle.spalte)}
        onblur={(e) => getippt(e.currentTarget, zelle.reihe.zeile.id, zelle.spalte, true)}
        onkeydown={(e) => beiTaste(e, zelle.reihe.zeile.id, zelle.spalte)}
      ></textarea>
      {#if !zelle.spalte.tafel}
        <!-- Beim Tippen zu sehen und mit einem Tipp umzustellen; gilt für alle Klartextspalten. -->
        <button
          type="button"
          class="umlaute"
          aria-pressed={umlauteAufloesen}
          title="Umlaute und ß schon beim Tippen umschreiben, wie es die Nachtschicht verlangt"
          onclick={umlauteUmschalten}
        >
          <span class="schalter" aria-hidden="true"></span>
          ä → ae, ß → ss
        </button>
      {/if}
      {#if zelle.spalte.tafel}
        <Tafeleingabe
          codecId={zelle.spalte.tafel}
          wert={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
          setzen={(neu) => setzeWert(zelle.reihe.zeile.id, zelle.spalte.id, neu)}
        />
      {/if}
    {:else}
      <output class="mono ergebnis">{zelle.inhalt.text}</output>
      {#if zelle.inhalt.fehler}
        <p class="hinweis warn">{zelle.inhalt.fehler}</p>
      {:else if zelle.inhalt.luecken.length > 0}
        <p class="hinweis">
          {zelle.inhalt.luecken.length} nicht übersetzbar:
          <span class="mono">{zelle.inhalt.luecken.map((l) => l.zeichen).join(' ')}</span>
        </p>
      {/if}
    {/if}

    <Zellenanalyse text={zelle.inhalt.text} {alsSpalte} />
  </section>
{/if}



{#if tourAn}
  <Tour
    schritte={WERKBANK_TOUR}
    beiSchritt={tourSchritt}
    beenden={beendeTour}
    zumSchluss={{ titel: 'zu den Übungen', aktion: () => { beendeTour(); location.hash = '#/mehr'; } }}
  />
{/if}

<style>
  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  h2 {
    margin: 0;
    font-size: inherit;
    overflow-wrap: anywhere;
    text-align: left;
  }

  /* Der Name der Werkbank ist zugleich der Knopf zur Verwaltung. */
  .titel {
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: none;
    padding: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
    min-height: 44px;
    min-width: 0;
  }

  .pfeil {
    font-size: 0.9rem;
    color: var(--text-leise);
  }

  .meldung {
    margin: 0 0 8px;
    font-size: 0.8rem;
    color: var(--text-leise);
  }

  .meldung {
    color: var(--akzent);
  }

  /* In einer Gruppe steht neben dem Namen der Weg zum Protokoll. */
  .gruppenmarke {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 0.78rem;
    color: var(--text);
  }

  .gruppenprotokoll {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 12px;
    display: grid;
    gap: 8px;
  }

  .gruppenprotokoll {
    max-height: 60vh;
    overflow: auto;
  }

  .zuletzt {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 4px 0 8px;
  }

  .zuletzt .hinweis {
    margin: 0;
  }

  .zuletzt .klein {
    min-height: 30px;
    padding: 0 8px;
    font-size: 0.75rem;
  }

  /* Gerade von jemand anderem geändert: kurz markiert, mit dessen Bild. */
  td.frisch {
    position: relative;
    box-shadow: inset 0 0 0 2px var(--akzent);
    transition: box-shadow 1s;
  }

  td .wer {
    position: absolute;
    top: -6px;
    right: -6px;
    pointer-events: none;
    display: inline-flex;
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--grund);
  }

  /* Nie breiter als der Platz: Dann schrumpft die Spalten-Auswahl, nicht die Knöpfe. */
  .leiste {
    display: flex;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
  }

  .leiste button,
  .leiste select {
    min-height: 38px;
    font-size: 0.8rem;
  }

  .leiste button {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .leiste select {
    flex: 1 1 auto;
    min-width: 0;
  }

  .hinweis {
    color: var(--text-leise);
    font-size: 0.8rem;
  }

  select,
  input,
  textarea {
    font: inherit;
    color: var(--text);
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: 38px;
    padding: 0 8px;
  }

  /* Wächst mit dem Text; zwei Zeilen sind das Mindestmaß. */
  textarea {
    width: 100%;
    padding: 6px 10px;
    line-height: 1.35;
    min-height: 3.4rem;
    resize: none;
    overflow: hidden;
  }

  .mono {
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }

  /* Die Tabelle rollt seitlich; die Nummernspalte bleibt stehen, damit man
     auch nach dem Sortieren weiß, welche Zeile man vor sich hat. */
  .tabelle {
    overflow-x: auto;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
  }

  table {
    border-collapse: collapse;
    width: max-content;
    min-width: 100%;
  }

  th,
  td {
    border-bottom: 1px solid var(--rand);
    border-right: 1px solid var(--rand);
    padding: 0;
    text-align: left;
    vertical-align: middle;
  }

  thead th {
    background: var(--flaeche);
    position: sticky;
    top: 0;
  }

  .ecke,
  .nr {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--flaeche);
    min-width: 3.2rem;
    padding: 4px 6px;
    font-size: 0.75rem;
    color: var(--text-leise);
    font-weight: 500;
  }

  .nummer {
    font-weight: 700;
    color: var(--text);
  }

  .bewegung {
    margin-left: 4px;
    color: var(--akzent);
  }

  .kopfzelle {
    display: flex;
    align-items: stretch;
    gap: 2px;
  }

  .umschalter {
    flex: 0 0 auto;
    align-self: center;
    min-height: 30px;
    min-width: 30px;
    margin-right: 4px;
    padding: 0 4px;
    font-size: 0.7rem;
    background: none;
  }

  .spaltenkopf {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    flex: 1 1 auto;
    min-width: 6.5rem;
    min-height: 44px;
    padding: 4px 8px;
    background: none;
    border: none;
    border-radius: 0;
    text-align: left;
  }

  .buchstabe {
    font-size: 0.65rem;
    color: var(--text-leise);
    letter-spacing: 0.08em;
  }

  .name {
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .quelle {
    font-size: 0.65rem;
    color: var(--text-leise);
  }

  td input,
  td .wert {
    width: 100%;
    min-width: 6.5rem;
    min-height: 40px;
    border: none;
    border-radius: 0;
    background: none;
    font-size: 0.85rem;
    text-align: left;
    padding: 0 8px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Ergebnisse dürfen mehrzeilig sein – ASCII binär steht Zeichen für Zeichen untereinander. */
  /* Eine Zelle wird so breit wie ihr Text, statt ihn im Feld zu rollen –
     die Tabelle rollt ohnehin seitlich. --textbreite setzt breitNachText. */
  td input {
    min-width: max(6.5rem, var(--textbreite, 0px));
  }

  td .wert {
    color: var(--text-leise);
    white-space: pre;
    padding-top: 6px;
    padding-bottom: 6px;
  }

  /* Gezeichnete Zellen brauchen ihre Breite – die Tabelle rollt ohnehin. */
  td .wert.bild {
    color: var(--text);
    white-space: normal;
    width: max-content;
    padding: 4px 8px;
  }

  /*
   * Das Bild gibt der Zelle ihre Breite, das Feld legt sich darüber – und
   * beides füllt die Zelle ganz aus. Sonst bleibt rechts neben einer kurzen
   * Zeichnung ein toter Streifen, in dem ein Tipp ins Leere geht, während
   * dieselbe Stelle im Textmodus das Feld trifft.
   */
  .bildzelle {
    position: relative;
    display: flex;
    align-items: center;
    min-width: max(6.5rem, var(--textbreite, 0px));
    width: 100%;
    min-height: 40px;
  }

  .bildzelle .bild {
    padding: 4px 8px;
  }

  .bildzelle input.ueber {
    position: absolute;
    inset: 0;
    width: 100%;
    min-width: 0;
    padding: 0 8px;
    border: none;
    border-radius: 0;
    background: transparent;
    color: transparent;
    caret-color: transparent;
    font-size: 0.85rem;
  }

  /* Beim Tippen deckt das Feld das Bild zu und zeigt den Code, wie er dasteht. */
  .bildzelle input.ueber:focus {
    background: var(--flaeche);
    color: var(--text);
    caret-color: var(--akzent);
  }


  td.aktiv {
    outline: 2px solid var(--akzent);
    outline-offset: -2px;
  }

  td.fehler .wert {
    color: var(--warn);
  }

  .rand {
    border-right: none;
    min-width: 2.4rem;
  }

  .weg {
    min-height: 36px;
    min-width: 36px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-leise);
  }

  .fehlerliste {
    list-style: none;
    margin: 8px 0 0;
    padding: 8px 10px;
    border: 1px solid var(--warn);
    border-radius: var(--radius);
    color: var(--warn);
    font-size: 0.8rem;
    display: grid;
    gap: 2px;
  }

  section {
    margin-top: 16px;
  }

  section .zeile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .knoepfe {
    display: flex;
    gap: 6px;
  }

  .knoepfe button,
  section .zeile button {
    min-height: 34px;
    font-size: 0.78rem;
  }

  .sortiert {
    color: var(--akzent);
    margin-left: 2px;
  }

  .sortiert.zweite {
    font-size: 0.7rem;
    opacity: 0.8;
  }

  /* Die Sortierung als Box unter der Leiste, wie die Verwaltung. */
  section.sortierung {
    margin: 0 0 12px;
    display: grid;
    gap: 8px;
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
  }

  .sortknopf {
    white-space: nowrap;
  }

  .sortknopf[aria-expanded='true'] {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  /* Kleine Symbol-Knöpfe im Kopf der Zellenbox. */
  .symbol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    min-height: 34px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-leise);
    border-radius: 8px;
  }

  .symbol:hover:not(:disabled) {
    color: var(--text);
    background: var(--flaeche-hoch);
  }

  section.zelle {
    border: 1px solid var(--akzent);
    border-radius: var(--radius);
    padding: 10px 12px;
  }

  /* Klein und leise: ein Schiebeschalter mit Beschriftung, kein großer Knopf. */
  .umlaute {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    margin: 4px 0 8px;
    padding: 0 8px 0 4px;
    border: none;
    background: none;
    color: var(--text-leise);
    font-size: 0.78rem;
  }

  .umlaute[aria-pressed='true'] {
    color: var(--text);
  }

  .schalter {
    position: relative;
    width: 30px;
    height: 18px;
    border-radius: 9px;
    border: 1px solid var(--rand);
    background: var(--flaeche);
    transition: background 0.15s;
  }

  .schalter::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-leise);
    transition: transform 0.15s;
  }

  .umlaute[aria-pressed='true'] .schalter {
    background: var(--akzent);
    border-color: var(--akzent);
  }

  .umlaute[aria-pressed='true'] .schalter::after {
    transform: translateX(12px);
    background: var(--grund);
  }

  .ergebnis {
    display: block;
    padding: 8px 10px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    min-height: 2.4rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .warn {
    color: var(--warn);
  }
</style>
