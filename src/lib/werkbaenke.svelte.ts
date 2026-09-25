import { untrack } from 'svelte';
import type { Blatt } from './blatt';
import { abgleich, aktiveGruppe, ansicht, empfangeWerkbaenke, setzeAktiveGruppe } from './gruppe/gruppen.svelte';
import { gleich, zuSchluesseln } from './gruppe/schluessel';
import {
  aktiveWerkbank,
  amOrt,
  entferne,
  freierName,
  ladeSammlung,
  neueWerkbank,
  oeffne,
  sichereSammlung,
  uebernimm,
  werkbankAmOrt,
  type Sammlung,
  type Werkbank
} from './sammlung';

/**
 * Die Werkbänke des Geräts – eine Sammlung für die ganze App, egal welche
 * Seite offen ist. Hier landet, was der Gruppenabgleich vom Server hört,
 * hier wird gespeichert, und hier entscheidet sich, welche Werkbank offen ist.
 *
 * Die Werkbank-Ansicht arbeitet an einer eigenen Arbeitskopie des Blatts.
 * Sie reicht jede Änderung mit `uebernimmOffene` herein und erfährt über
 * `beobachte`, wenn sich die offene Werkbank von hier aus ändert.
 */

export const sammlung: Sammlung = $state(ladeSammlung());

export interface Beobachter {
  /** Eine andere Werkbank ist jetzt offen – mit einer Meldung, wenn es einen Grund zu sagen gibt. */
  gewechselt(meldung?: string): void;
  /** Die offene Werkbank hat vom Server einen neuen Stand. */
  neuerStand(): void;
}

let beobachter: Beobachter | null = null;

export function beobachte(b: Beobachter | null): void {
  beobachter = b;
}

export function offene(): Werkbank {
  return aktiveWerkbank(sammlung);
}

/** Die Werkbänke am Ort: in der aktiven Gruppe oder, ohne sie, auf dem Gerät. */
export function amOrtHier(): Werkbank[] {
  const ort = aktiveGruppe();
  return sammlung.werkbaenke.filter((w) => amOrt(w, ort));
}

function freierNameAm(gruppe: string | null, stamm?: string): string {
  return freierName({ aktiv: '', werkbaenke: sammlung.werkbaenke.filter((w) => amOrt(w, gruppe)) }, stamm);
}

/**
 * Werkbänke, die nur da sind, weil an einem Ort keine lag. Sie gehen erst mit
 * der ersten Änderung an die Gruppe – ein bloßes Umschalten legt dort nichts
 * an. Nach dem Neuladen gilt als Platzhalter, was leer ist und dem Server
 * noch unbekannt.
 */
const platzhalter = new Set<string>();

function istLeer(blatt: Blatt): boolean {
  return blatt.zeilen.every((z) => Object.values(z.werte).every((w) => !w?.trim()));
}

{
  const w = offene();
  if (w.gruppe && istLeer(w.blatt) && !abgleich.werkbaenke(w.gruppe).some((s) => s.id === w.id)) platzhalter.add(w.id);
}

/* ---------- Wechseln ---------- */

export function wechseln(id: string, meldung?: string): void {
  oeffne(sammlung, id);
  beobachter?.gewechselt(meldung);
}

/** Am Ort die zuletzt offene Werkbank öffnen – oder, liegt dort keine, einen Platzhalter. */
function oeffneAmOrt(meldung?: string): void {
  const ort = aktiveGruppe();
  let ziel = werkbankAmOrt(sammlung, ort);
  if (!ziel) {
    ziel = { ...neueWerkbank(freierNameAm(ort)), ...(ort ? { gruppe: ort } : {}) };
    sammlung.werkbaenke.push(ziel);
    if (ort) platzhalter.add(ziel.id);
  }
  wechseln(ziel.id, meldung);
}

/* ---------- Anlegen, kopieren, löschen ---------- */

/** Eine neue Werkbank am Ort – in einer Gruppe sehen die anderen sie gleich. */
export function anlegen(stamm?: string, stand?: Blatt): void {
  const ort = aktiveGruppe();
  const neu: Werkbank = { ...neueWerkbank(freierNameAm(ort, stamm), stand), ...(ort ? { gruppe: ort } : {}) };
  sammlung.werkbaenke.push(neu);
  if (ort) abgleich.lokal(ort, neu.id, neu.blatt, neu.name);
  wechseln(neu.id);
}

/**
 * Eine Werkbank als Kopie an einen anderen Ort legen. Man bleibt, wo man ist.
 * Gibt die Meldung dazu zurück.
 */
export function kopierenNach(name: string, stand: Blatt, gruppe: string | null): string {
  // Derselbe Name, wenn er dort noch frei ist – sonst als Kopie erkennbar.
  const vergeben = sammlung.werkbaenke.some((w) => amOrt(w, gruppe) && w.name === name);
  const neu: Werkbank = {
    ...neueWerkbank(vergeben ? freierNameAm(gruppe, `${name} (Kopie)`) : name, stand),
    ...(gruppe ? { gruppe } : {})
  };
  sammlung.werkbaenke.push(neu);
  if (gruppe) abgleich.lokal(gruppe, neu.id, neu.blatt, neu.name);
  const ziel = gruppe ? `in „${abgleich.speicher.gruppen[gruppe]?.name ?? 'Gruppe'}“` : 'auf diesem Gerät';
  return `Kopie von „${name}“ liegt jetzt ${ziel}`;
}

/** Aus der Liste nehmen. War sie offen, geht die nächste am Ort auf – oder eine neue. */
function entfernen(id: string, meldung?: string): void {
  const warOffen = id === sammlung.aktiv;
  platzhalter.delete(id);
  entferne(sammlung, id);
  if (warOffen) oeffneAmOrt(meldung);
}

/** Eine Werkbank einer Gruppe löschen nur deren Admins – dann für alle. */
export function darfLoeschen(werkbank: Werkbank): boolean {
  void ansicht.version;
  return !werkbank.gruppe || abgleich.details(werkbank.gruppe)?.rolle === 'admin';
}

export function loeschen(id: string): void {
  const ziel = sammlung.werkbaenke.find((w) => w.id === id);
  if (!ziel || !darfLoeschen(ziel)) return;
  if (ziel.gruppe) abgleich.loeschen(ziel.gruppe, id);
  entfernen(id);
}

export function umbenennen(id: string, name: string): void {
  const ziel = sammlung.werkbaenke.find((w) => w.id === id);
  if (!ziel) return;
  ziel.name = name;
  if (ziel.gruppe) abgleich.lokal(ziel.gruppe, ziel.id, ziel.blatt, name);
}

/**
 * Ein Stand aus einem Link wird eine eigene, neue Werkbank. Sie liegt immer
 * auf dem Gerät – eine Übung geht die Gruppe nichts an –, also wird auch dort
 * weitergearbeitet.
 */
export function ausLink(stand: Blatt, name = 'Geteilte Werkbank'): void {
  const warInGruppe = aktiveGruppe() !== null;
  setzeAktiveGruppe(null);
  const neu = neueWerkbank(freierNameAm(null, name), stand);
  sammlung.werkbaenke.push(neu);
  wechseln(neu.id, `„${neu.name}“ aus dem Link geöffnet${warInGruppe ? ' – auf diesem Gerät, nicht in der Gruppe' : ''}`);
}

/** Eine Gruppe ist hier vergessen: Ihre Werkbänke bleiben als eigene. */
export function gruppeAufsGeraet(gruppe: string): void {
  for (const w of sammlung.werkbaenke) if (w.gruppe === gruppe) delete w.gruppe;
}

/* ---------- Arbeitskopie und Server ---------- */

/**
 * Die Arbeitskopie der Ansicht in die offene Werkbank übernehmen. Gehört sie
 * einer Gruppe, geht die Änderung außerdem in den Ausgang zum Server – ein
 * Platzhalter erst mit der ersten Änderung.
 */
export function uebernimmOffene(stand: Blatt): void {
  const geaendert = uebernimm(sammlung, stand);
  const w = offene();
  if (geaendert) platzhalter.delete(w.id);
  if (w.gruppe && !platzhalter.has(w.id)) abgleich.lokal(w.gruppe, w.id, stand, w.name);
}

function vomServer(gruppe: string, id: string, stand: { blatt: Blatt; name: string; geloescht: boolean }): void {
  const vorhanden = sammlung.werkbaenke.find((w) => w.id === id);
  if (stand.geloescht) {
    if (vorhanden) entfernen(id, id === sammlung.aktiv ? `„${vorhanden.name}“ wurde in der Gruppe gelöscht` : undefined);
    return;
  }
  if (!vorhanden) {
    sammlung.werkbaenke.push({ ...neueWerkbank(stand.name, stand.blatt), id, gruppe });
    // Saß man nur am Platzhalter der Gruppe, weicht er der echten Werkbank –
    // etwa gleich nach dem Beitreten, wenn die Werkbänke erst noch ankommen.
    const w = offene();
    if (platzhalter.has(w.id) && w.gruppe === gruppe) {
      platzhalter.delete(w.id);
      entferne(sammlung, w.id);
      wechseln(id);
    }
    return;
  }
  // Die Sortierung ist je Gerät – sie bleibt, solange es ihre Spalten noch gibt.
  const alt = vorhanden.blatt;
  const { sortierung } = alt;
  const passt = (spalte?: string) => !spalte || stand.blatt.spalten.some((s) => s.id === spalte);
  const neu: Blatt =
    sortierung && passt(sortierung.spalte) && passt(sortierung.dann?.spalte) ? { ...stand.blatt, sortierung } : stand.blatt;
  const ohneSortierung: Blatt = { spalten: alt.spalten, zeilen: alt.zeilen };
  if (gleich(zuSchluesseln(ohneSortierung), zuSchluesseln(stand.blatt)) && vorhanden.name === stand.name) return;
  vorhanden.name = stand.name;
  vorhanden.blatt = neu;
  vorhanden.gruppe = gruppe;
  vorhanden.geaendert = Date.now();
  if (id === sammlung.aktiv) beobachter?.neuerStand();
}

// Was der Abgleich schon weiß, dann alles, was er künftig hört.
for (const id of Object.keys(abgleich.speicher.gruppen)) {
  for (const w of abgleich.werkbaenke(id)) vomServer(id, w.id, w);
}
empfangeWerkbaenke(vomServer);

$effect.root(() => {
  // Beim Wechsel des Orts: dort weitermachen, wo man zuletzt war.
  $effect(() => {
    const ort = aktiveGruppe();
    untrack(() => {
      if (!amOrt(offene(), ort)) oeffneAmOrt();
    });
  });

  // Die ganze Sammlung aufs Gerät, sobald sich darin etwas ändert. Über JSON
  // gelesen, damit jede verschachtelte Änderung hier ankommt.
  $effect(() => {
    const stand = JSON.stringify(sammlung);
    untrack(() => sichereSammlung(JSON.parse(stand) as Sammlung));
  });
});
