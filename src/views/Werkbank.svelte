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
  } from '../lib/blatt';
  import { zeichenbar } from '../lib/codeanzeige';
  import {
    aktiveWerkbank,
    arbeitsstand,
    entferne,
    freierName,
    ladeSammlung,
    neueWerkbank,
    sichereSammlung,
    speichere,
    uebernimm
  } from '../lib/sammlung';
  import { alsLink, ausAdresse, verschicke } from '../lib/teilen';
  import { rufe, type GruppenDetails } from '../lib/gruppe/api';
  import { abgleich, ansicht as gruppenansicht, empfangeWerkbaenke, mitglied } from '../lib/gruppe/gruppen.svelte';
  import { gleich, zellschluessel, zuSchluesseln } from '../lib/gruppe/schluessel';
  import type { Werkbank as WerkbankEintrag } from '../lib/sammlung';
  import { breitNachText, wachsen } from '../lib/wachsen';
  import {
    feldUmschreiben,
    speichereUmlauteAufloesen,
    umlauteAufloesenGespeichert
  } from '../lib/umlautschalter';
  import Avatar from '../ui/Avatar.svelte';
  import Codeanzeige from '../ui/Codeanzeige.svelte';
  import Gruppen from '../ui/Gruppen.svelte';
  import Protokoll from '../ui/Protokoll.svelte';
  import Textzeile from '../ui/Textzeile.svelte';
  import Sortierwahl from '../ui/Sortierwahl.svelte';
  import Spalteneinstellung from '../ui/Spalteneinstellung.svelte';
  import Tafeleingabe from '../ui/Tafeleingabe.svelte';
  import Werkbaenke from '../ui/Werkbaenke.svelte';
  import Zellenanalyse from '../ui/Zellenanalyse.svelte';

  /**
   * Die Werkbank als Blatt: Zeilen und Spalten statt eines einzelnen Textes.
   *
   * Erste Spalte eintippen – auf Wunsch mit einer Codetafel, dann sieht man
   * auch Morse als Morse. Jede weitere Spalte ist entweder wieder Eingabe oder
   * ein Werkzeug auf einer früheren Spalte. Sortieren betrifft nur die Anzeige;
   * jede Zeile behält dabei ihre Eingabenummer.
   */

  /** Eine eigene Kopie – nie das gespeicherte Objekt selbst, sonst wäre ein Entwurf nicht möglich. */
  const kopie = (b: Blatt): Blatt => JSON.parse(JSON.stringify(b)) as Blatt;

  let sammlung = $state(ladeSammlung());
  /** Die Arbeitskopie der aktiven Werkbank. Alles in der Tabelle ändert nur sie. */
  let blatt = $state(kopie(arbeitsstand(aktiveWerkbank(sammlung))));
  let verwaltungOffen = $state(false);
  let gewaehlt = $state<{ spalte: SpaltenId; zeile: string } | null>(null);
  let einstellung = $state<SpaltenId | null>(null);
  let linkStand = $state('');
  let umlauteAufloesen = $state(umlauteAufloesenGespeichert());

  /*
   * Drei Boxen gibt es: die Verwaltung der Werkbänke, die Einstellung einer
   * Spalte und die Box zur gewählten Zelle. Offen ist immer höchstens eine –
   * wer eine öffnet, schließt die andere. Ein Klick außerhalb schließt sie
   * ganz; was als Teil einer Box oder als ihr Öffner zählt, trägt `data-box`.
   */
  function zeigeZelle(ziel: { spalte: SpaltenId; zeile: string }) {
    gewaehlt = ziel;
    einstellung = null;
    verwaltungOffen = false;
  }

  function zeigeEinstellung(id: SpaltenId | null) {
    einstellung = id;
    if (id === null) return;
    gewaehlt = null;
    verwaltungOffen = false;
  }

  function verwaltungUmschalten() {
    verwaltungOffen = !verwaltungOffen;
    gruppeProtokoll = false;
    if (!verwaltungOffen) return;
    gewaehlt = null;
    einstellung = null;
  }

  function alleSchliessen() {
    gewaehlt = null;
    einstellung = null;
    verwaltungOffen = false;
  }

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

  const werkbank = $derived(aktiveWerkbank(sammlung));

  // Ein geteilter Link wird eine eigene, neue Werkbank – er überschreibt nie,
  // woran man gerade sitzt.
  // Auch wenn die App schon offen ist und nur die Adresse wechselt – etwa weil
  // ein Link im selben Tab angetippt wird.
  $effect(() => {
    const oeffnen = () =>
      void ausAdresse().then((geteilt) => {
        if (!geteilt) return;
        const neu = neueWerkbank(freierName(sammlung, geteilt.name ?? 'Geteilte Werkbank'), geteilt.blatt);
        sammlung.werkbaenke.push(neu);
        wechseln(neu.id);
        meldung = `„${neu.name}“ aus dem Link geöffnet`;
      });
    oeffnen();
    addEventListener('hashchange', oeffnen);
    return () => removeEventListener('hashchange', oeffnen);
  });

  // Jede Änderung an der Arbeitskopie geht in die aktive Werkbank – gespeichert
  // oder als Entwurf, je nach Einstellung. Gehört sie einer Gruppe, geht sie
  // außerdem in den Ausgang zum Server.
  $effect(() => {
    const stand = JSON.stringify(blatt);
    untrack(() => {
      uebernimm(sammlung, JSON.parse(stand) as Blatt);
      const offen = aktiveWerkbank(sammlung);
      if (offen.gruppe) abgleich.lokal(offen.gruppe, offen.id, JSON.parse(stand) as Blatt, offen.name);
    });
  });

  /*
   * Gruppen. Der Abgleich läuft, solange die Werkbank offen ist; was er vom
   * Server hört, landet hier in der passenden Werkbank.
   */
  let gruppeProtokoll = $state(false);
  let zellverlauf = $state(false);
  /** Nach dem Beitreten: die erste Werkbank der Gruppe öffnen, sobald sie ankommt. */
  let oeffneAusGruppe: string | null = null;

  function vomServer(gruppe: string, id: string, stand: { blatt: Blatt; name: string; geloescht: boolean }) {
    const vorhanden = sammlung.werkbaenke.find((w) => w.id === id);
    if (stand.geloescht) {
      if (vorhanden) {
        if (id === sammlung.aktiv) meldung = `„${vorhanden.name}“ wurde in der Gruppe gelöscht`;
        loeschenLokal(id);
      }
      return;
    }
    if (!vorhanden) {
      const neu: WerkbankEintrag = { ...neueWerkbank(stand.name, stand.blatt), id, gruppe };
      sammlung.werkbaenke.push(neu);
      if (oeffneAusGruppe === gruppe) {
        oeffneAusGruppe = null;
        wechseln(id);
      }
      return;
    }
    // Die Sortierung ist je Gerät – sie bleibt, solange es ihre Spalten noch gibt.
    const alt = arbeitsstand(vorhanden);
    const { sortierung } = alt;
    const passt = (id?: string) => !id || stand.blatt.spalten.some((s) => s.id === id);
    const neu: Blatt =
      sortierung && passt(sortierung.spalte) && passt(sortierung.dann?.spalte) ? { ...stand.blatt, sortierung } : stand.blatt;
    const ohneSortierung: Blatt = { spalten: alt.spalten, zeilen: alt.zeilen };
    if (gleich(zuSchluesseln(ohneSortierung), zuSchluesseln(stand.blatt)) && vorhanden.name === stand.name) return;
    vorhanden.name = stand.name;
    vorhanden.blatt = neu;
    delete vorhanden.entwurf;
    vorhanden.gruppe = gruppe;
    vorhanden.geaendert = Date.now();
    if (id !== sammlung.aktiv) return;
    blatt = kopie(neu);
    if (gewaehlt && !blatt.zeilen.some((z) => z.id === gewaehlt?.zeile)) gewaehlt = null;
    if (gewaehlt && !blatt.spalten.some((s) => s.id === gewaehlt?.spalte)) gewaehlt = null;
    if (einstellung && !blatt.spalten.some((s) => s.id === einstellung)) einstellung = null;
  }

  $effect(() => {
    empfangeWerkbaenke(vomServer);
    // Was der Abgleich schon weiß, während die Werkbank zu war. Ohne
    // untrack hinge dieser Effekt an der Sammlung und liefe bei jeder
    // Änderung neu an.
    untrack(() => {
      for (const id of Object.keys(abgleich.speicher.gruppen)) {
        for (const w of abgleich.werkbaenke(id)) vomServer(id, w.id, w);
      }
    });
    abgleich.start();
    const sicht = () => abgleich.setzeSichtbar(document.visibilityState === 'visible');
    const online = () => abgleich.wiederOnline();
    const weg = () => abgleich.sichereJetzt();
    document.addEventListener('visibilitychange', sicht);
    addEventListener('online', online);
    addEventListener('pagehide', weg);
    return () => {
      document.removeEventListener('visibilitychange', sicht);
      removeEventListener('online', online);
      removeEventListener('pagehide', weg);
      abgleich.sichereJetzt();
      abgleich.stopp();
      empfangeWerkbaenke(null);
    };
  });

  $effect(() => {
    abgleich.setzeAktiv(werkbank.gruppe ?? null);
  });

  /** Die Gruppe der offenen Werkbank, wie die Kopfzeile sie zeigt. */
  const gruppeHier = $derived.by(() => {
    void gruppenansicht.version;
    const id = werkbank.gruppe;
    if (!id) return null;
    return {
      id,
      name: abgleich.speicher.gruppen[id]?.name ?? 'Gruppe',
      status: abgleich.status[id],
      admin: abgleich.details(id)?.rolle === 'admin'
    };
  });

  function istAdminVon(gruppe: string | undefined): boolean {
    void gruppenansicht.version;
    return Boolean(gruppe && abgleich.details(gruppe)?.rolle === 'admin');
  }

  function gruppennameVon(gruppe: string | undefined): string | undefined {
    void gruppenansicht.version;
    return gruppe ? (abgleich.speicher.gruppen[gruppe]?.name ?? 'Gruppe') : undefined;
  }

  /** Die offene Werkbank als Kopie in eine Gruppe legen. */
  function inGruppeKopieren(gruppe: string) {
    // Derselbe Name: Die Marke der Gruppe unterscheidet sie ohnehin von der eigenen.
    const neu: WerkbankEintrag = { ...neueWerkbank(werkbank.name, kopie(blatt)), gruppe };
    sammlung.werkbaenke.push(neu);
    abgleich.lokal(gruppe, neu.id, neu.blatt, neu.name);
    wechseln(neu.id);
    verwaltungOffen = false;
    meldung = `„${neu.name}“ liegt jetzt in der Gruppe`;
  }

  function neueInGruppe(gruppe: string) {
    const neu: WerkbankEintrag = { ...neueWerkbank(freierName(sammlung)), gruppe };
    sammlung.werkbaenke.push(neu);
    abgleich.lokal(gruppe, neu.id, neu.blatt, neu.name);
    wechseln(neu.id);
    verwaltungOffen = false;
  }

  /** Eine Gruppe hier vergessen. Ihre Werkbänke bleiben – als eigene. */
  function gruppeVergessen(gruppe: string) {
    for (const w of sammlung.werkbaenke) if (w.gruppe === gruppe) delete w.gruppe;
    abgleich.vergessen(gruppe);
  }

  /*
   * Einladungen und die Rückkehr von der Anmeldung kommen über die Adresse:
   * #/werkbank?einladung=…, ?anmeldung=… oder ?anmeldefehler=…
   */
  let einladung = $state<{ code: string; gruppe: { id: string; name: string }; schonMitglied: boolean } | null>(null);
  let gastname = $state('');
  let beitrittsfehler = $state('');

  async function ausGruppenadresse() {
    const wert = (name: string) => {
      const treffer = location.hash.match(new RegExp(`[?&]${name}=([^&]+)`));
      return treffer ? decodeURIComponent(treffer[1] as string) : null;
    };
    const anmeldung = wert('anmeldung');
    const fehler = wert('anmeldefehler');
    const code = wert('einladung');
    if (!anmeldung && !fehler && !code) return;
    history.replaceState(null, '', location.href.replace(/[?&](anmeldung|anmeldefehler|einladung)=[^&]+/g, ''));
    if (fehler) meldung = `Anmeldung fehlgeschlagen: ${fehler}`;
    if (anmeldung) {
      try {
        await abgleich.anmeldungEinloesen(anmeldung);
        meldung = `Angemeldet als ${abgleich.speicher.konto?.ich.name ?? ''}`;
      } catch (e) {
        meldung = e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen';
      }
    }
    if (code) {
      try {
        const info = await rufe<{ gruppe: { id: string; name: string }; schonMitglied: boolean }>(
          `einladung.php?e=${encodeURIComponent(code)}`,
          { token: abgleich.speicher.konto?.token ?? null }
        );
        einladung = { code, ...info };
        beitrittsfehler = '';
      } catch (e) {
        meldung = e instanceof Error ? e.message : 'Die Einladung ließ sich nicht öffnen';
      }
    }
  }

  $effect(() => {
    const lesen = () => void ausGruppenadresse();
    lesen();
    addEventListener('hashchange', lesen);
    return () => removeEventListener('hashchange', lesen);
  });

  async function beitreten() {
    const offen = einladung;
    if (!offen) return;
    beitrittsfehler = '';
    try {
      const antwort = await rufe<{ token: string | null; gruppe: GruppenDetails }>('einladung.php', {
        token: abgleich.speicher.konto?.token ?? null,
        koerper: { e: offen.code, name: gastname.trim() }
      });
      oeffneAusGruppe = antwort.gruppe.id;
      abgleich.aufnehmen(antwort.gruppe.id, antwort.gruppe.name, antwort.token ?? undefined, antwort.gruppe);
      meldung = `Du bist jetzt in „${antwort.gruppe.name}“`;
      einladung = null;
    } catch (e) {
      beitrittsfehler = e instanceof Error ? e.message : String(e);
    }
  }

  // Und die ganze Sammlung aufs Gerät, sobald sich darin etwas ändert.
  $effect(() => {
    // Über JSON gelesen, damit jede verschachtelte Änderung hier ankommt.
    const stand = JSON.stringify(sammlung);
    untrack(() => sichereSammlung(JSON.parse(stand) as typeof sammlung));
  });

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

  /** Zu einer anderen Werkbank: Ihre Arbeitskopie wird geladen, die Auswahl zurückgesetzt. */
  function wechseln(id: string) {
    sammlung.aktiv = id;
    blatt = kopie(arbeitsstand(aktiveWerkbank(sammlung)));
    gewaehlt = null;
    einstellung = null;
    gruppeProtokoll = false;
  }

  function neueAnlegen() {
    const neu = neueWerkbank(freierName(sammlung));
    sammlung.werkbaenke.push(neu);
    wechseln(neu.id);
    verwaltungOffen = false;
  }

  function kopieAnlegen(id: string) {
    const vorlage = sammlung.werkbaenke.find((w) => w.id === id);
    if (!vorlage) return;
    const stand = id === sammlung.aktiv ? blatt : arbeitsstand(vorlage);
    const neu = neueWerkbank(freierName(sammlung, `${vorlage.name} (Kopie)`), kopie(stand));
    sammlung.werkbaenke.push(neu);
    wechseln(neu.id);
  }

  function loeschenLokal(id: string) {
    const warAktiv = id === sammlung.aktiv;
    entferne(sammlung, id);
    if (warAktiv) wechseln(sammlung.aktiv);
  }

  /** Eine Werkbank einer Gruppe löschen Admins für alle; sonst gibt es den Knopf nicht. */
  function loeschen(id: string) {
    const ziel = sammlung.werkbaenke.find((w) => w.id === id);
    if (ziel?.gruppe) {
      if (!istAdminVon(ziel.gruppe)) return;
      abgleich.loeschen(ziel.gruppe, id);
    }
    loeschenLokal(id);
  }

  function umbenennen(id: string, name: string) {
    const ziel = sammlung.werkbaenke.find((w) => w.id === id);
    if (!ziel) return;
    ziel.name = name;
    if (ziel.gruppe) abgleich.lokal(ziel.gruppe, ziel.id, id === sammlung.aktiv ? blatt : arbeitsstand(ziel), name);
  }

  function automatikUmschalten() {
    sammlung.automatisch = !sammlung.automatisch;
    // Wieder eingeschaltet: Was offen ist, wird jetzt gespeichert.
    if (sammlung.automatisch) uebernimm(sammlung, kopie(blatt));
  }

  function speichern() {
    speichere(werkbank);
  }

  /** Zurück zum gespeicherten Stand. */
  function verwerfen() {
    delete werkbank.entwurf;
    blatt = kopie(werkbank.blatt);
    gewaehlt = null;
    einstellung = null;
  }

  async function verschicken(id: string) {
    const ziel = sammlung.werkbaenke.find((w) => w.id === id);
    if (!ziel) return;
    // Verschickt wird, was man vor sich sieht – bei der offenen die Arbeitskopie.
    const stand = id === sammlung.aktiv ? blatt : arbeitsstand(ziel);
    const link = await alsLink(stand, ziel.name);
    const ergebnis = await verschicke(link, `Werkbank „${ziel.name}“`);
    if (ergebnis === 'kopiert') meldung = `Link zu „${ziel.name}“ kopiert`;
    else if (ergebnis === 'geteilt') meldung = '';
    else if (ergebnis === 'nichts') linkStand = link;
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
    onclick={verwaltungUmschalten}
    title="Werkbänke verwalten und wechseln"
  >
    <h2>{werkbank.name}</h2>
    <span class="pfeil" aria-hidden="true">{verwaltungOffen ? '▴' : '▾'}</span>
  </button>
  {#if gruppeHier}
    <button
      type="button"
      class="gruppenmarke"
      aria-expanded={gruppeProtokoll}
      data-box
      onclick={() => (gruppeProtokoll = !gruppeProtokoll)}
      title="Diese Werkbank gehört einer Gruppe – antippen für das Protokoll"
    >
      <span class="punkt {gruppeHier.status?.verbindung ?? 'start'}" aria-hidden="true"></span>
      {gruppeHier.name}
      {#if gruppeHier.status?.verbindung === 'offline'}· offline{:else if gruppeHier.status?.verbindung === 'live'}· live{:else if gruppeHier.status?.verbindung === 'kein-zugang'}· kein Zugang{/if}
      {#if gruppeHier.status?.ausstehend}· {gruppeHier.status.ausstehend} ausstehend{/if}
    </button>
  {/if}
  <div class="leiste">
    <button type="button" onclick={zeileHinzufuegen}>+ Zeile</button>
    <select
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
  </div>
</div>

{#if werkbank.entwurf}
  <div class="entwurf">
    <span>Ungespeicherte Änderungen</span>
    <button type="button" class="speichern" onclick={speichern}>Speichern</button>
    <button type="button" onclick={verwerfen}>Verwerfen</button>
  </div>
{:else if !sammlung.automatisch}
  <p class="stand">gespeichert</p>
{/if}

{#if meldung}
  <p class="meldung">{meldung}</p>
{/if}

{#if einladung}
  <section class="einladung">
    <strong>Gruppe „{einladung.gruppe.name}“ beitreten</strong>
    {#if einladung.schonMitglied}
      <p class="hinweis">Du bist schon Mitglied.</p>
    {:else if abgleich.speicher.konto}
      <p class="hinweis">Du trittst als {abgleich.speicher.konto.ich.name} bei.</p>
    {:else}
      <Textzeile bind:value={gastname} aria-label="Dein Name" placeholder="Dein Name" enter={() => void beitreten()} />
      <p class="hinweis">Unter diesem Namen sehen dich die anderen im Protokoll.</p>
    {/if}
    {#if beitrittsfehler}<p class="hinweis warn">{beitrittsfehler}</p>{/if}
    <div class="knoepfe">
      <button
        type="button"
        class="speichern"
        disabled={!einladung.schonMitglied && !abgleich.speicher.konto && !gastname.trim()}
        onclick={() => void beitreten()}
      >
        beitreten
      </button>
      <button type="button" onclick={() => (einladung = null)}>abbrechen</button>
    </div>
  </section>
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
{#if linkStand}
  <!-- Ließ sich der Link weder teilen noch kopieren, steht er hier zum Markieren. -->
  <p class="linkstand mono">{linkStand}</p>
{/if}

{#if verwaltungOffen}
  <div data-box>
  <Werkbaenke
    {sammlung}
    gruppenname={gruppennameVon}
    darfLoeschen={(w) => !w.gruppe || istAdminVon(w.gruppe)}
    wechseln={(id) => { wechseln(id); verwaltungOffen = false; }}
    neu={neueAnlegen}
    kopieren={kopieAnlegen}
    entfernen={loeschen}
    {umbenennen}
    verschicken={(id) => void verschicken(id)}
    {automatikUmschalten}
    {leeren}
  />
  <Gruppen
    offene={werkbank}
    {inGruppeKopieren}
    {neueInGruppe}
    {gruppeVergessen}
    melde={(text) => (meldung = text)}
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
            <div class="kopfzelle" data-box>
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
      {#each berechnung.zeilen as reihe (reihe.zeile.id)}
        <tr>
          <th class="nr">
            <span class="nummer">{reihe.zeile.nummer}</span>
            {#if reihe.eingabeplatz !== reihe.platz}
              <span class="bewegung" title="Verschiebung gegenüber der Eingabereihenfolge">
                {reihe.eingabeplatz > reihe.platz ? '↑' : '↓'}{Math.abs(reihe.eingabeplatz - reihe.platz)}
              </span>
            {/if}
          </th>
          {#each blatt.spalten as spalte (spalte.id)}
            {@const inhalt = reihe.zellen[spalte.id]}
            {@const frisch = werkbank.gruppe ? gruppenansicht.frisch[`${werkbank.id}|${zellschluessel(reihe.zeile.id, spalte.id)}`] : undefined}
            <td
              data-box
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
                    onfocus={() => zeigeZelle({ spalte: spalte.id, zeile: reihe.zeile.id })}
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
                  onfocus={() => zeigeZelle({ spalte: spalte.id, zeile: reihe.zeile.id })}
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
  <div data-box>
  <Spalteneinstellung
    {blatt}
    spalte={spalteEinstellung}
    schliessen={() => (einstellung = null)}
    entfernen={() => spalteLoeschen(spalteEinstellung.id)}
  />
  </div>
{/if}

<section class="sortierung">
  <div class="zeile">
    <strong>Sortieren</strong>
  </div>
  <Sortierwahl {blatt} spalten={blatt.spalten} wert={blatt.sortierung} setzen={sortiereAnzeige} />
  <p class="hinweis">
    Sortiert nur die Anzeige – kein Wert ändert sich. Die Nummer links bleibt die der Eingabe,
    der Pfeil daneben zeigt, wie weit eine Zeile gewandert ist. Soll ein Platz in die Rechnung
    eingehen, gibt es die Spalte „Platz in einer Reihenfolge“.
  </p>
</section>

{#if zelle}
  <section class="zelle" data-box>
    <div class="zeile">
      <strong>
        {spaltenname(blatt, zelle.spalte.id)} · Zeile {zelle.reihe.zeile.nummer}
      </strong>
      <span class="knoepfe">
        <button type="button" onclick={() => kopieren(zelle.inhalt.text)} disabled={!zelle.inhalt.text}>
          kopieren
        </button>
        <button type="button" onclick={() => (gewaehlt = null)}>schließen</button>
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
      {#if tafelVon(zelle.spalte)}
        <div class="vorschau">
          <Codeanzeige
            codecId={tafelVon(zelle.spalte) ?? ''}
            text={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
            mitZeichen
          />
        </div>
      {/if}
      {#if zelle.spalte.tafel}
        <Tafeleingabe
          codecId={zelle.spalte.tafel}
          wert={zelle.reihe.zeile.werte[zelle.spalte.id] ?? ''}
          setzen={(neu) => setzeWert(zelle.reihe.zeile.id, zelle.spalte.id, neu)}
        />
      {/if}
    {:else}
      {#if tafelVon(zelle.spalte)}
        <div class="vorschau">
          <Codeanzeige codecId={tafelVon(zelle.spalte) ?? ''} text={zelle.inhalt.text} mitZeichen />
        </div>
      {/if}
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

  .entwurf {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
    color: var(--warn);
    font-size: 0.85rem;
  }

  .entwurf span {
    flex: 1 1 auto;
  }

  .entwurf button {
    min-height: 36px;
    font-size: 0.8rem;
  }

  .entwurf .speichern {
    border-color: var(--akzent);
    color: var(--akzent);
  }

  .stand,
  .meldung {
    margin: 0 0 8px;
    font-size: 0.8rem;
    color: var(--text-leise);
  }

  .meldung {
    color: var(--akzent);
  }

  /* Gehört die Werkbank einer Gruppe, steht das neben dem Namen – mit dem
     Zustand der Verbindung. Antippen öffnet das Protokoll. */
  .gruppenmarke {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 10px;
    border-radius: 999px;
    border-color: var(--akzent);
    font-size: 0.78rem;
    color: var(--text);
  }

  .punkt {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-leise);
  }

  .punkt.live,
  .punkt.abfrage {
    background: #3a9d5d;
  }

  .punkt.offline,
  .punkt.kein-zugang {
    background: var(--warn);
  }

  .einladung,
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

  .leiste {
    display: flex;
    gap: 6px;
  }

  .leiste button,
  .leiste select {
    min-height: 38px;
    font-size: 0.8rem;
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

  .vorschau {
    padding: 6px 8px;
    border: 1px solid var(--rand);
    border-radius: var(--radius);
    background: var(--flaeche);
    margin-bottom: 6px;
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

  .sortierung .hinweis {
    margin: 0;
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

  .linkstand {
    margin-top: 8px;
    font-size: 0.75rem;
    color: var(--text-leise);
    overflow-wrap: anywhere;
  }
</style>
