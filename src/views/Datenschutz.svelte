<script lang="ts">
  import Mailadresse from '../ui/Mailadresse.svelte';
  import Textseite from '../ui/Textseite.svelte';
</script>

<Textseite unter="Was huntkit speichert – und was nicht.">
  <div class="merk">
    <p>
      <strong>Kurz gesagt:</strong> kein Tracking, keine Werbung, keine Analyse, keine fremden
      Server. huntkit rechnet vollständig in deinem Browser, und was du dort eintippst, bleibt
      auf deinem Gerät. Nur wer einer <strong>Gruppe</strong> beitritt, schickt die Werkbänke
      und das Kreuzworträtsel dieser Gruppe an den Server – dafür ist sie da.
    </p>
  </div>

  <h2>Verantwortlich</h2>
  <p>
    Sönke Jacobs<br />
    <Mailadresse />
  </p>

  <h2>Was auf deinem Gerät gespeichert wird</h2>
  <p>
    huntkit legt seinen Stand im lokalen Speicher des Browsers ab (<em>localStorage</em>). Das
    ist kein Cookie: Diese Werte werden bei keinem Abruf mitgeschickt, sie bleiben im Browser.
    Gespeichert werden:
  </p>
  <ul>
    <li>deine Werkbänke mit allem, was darin steht,</li>
    <li>das Kreuzworträtsel mit Längen und gefundenen Wörtern,</li>
    <li>welche Übungen du gelöst hast,</li>
    <li>Einstellungen: Darstellung, Umlaute, Ziel beim Kopieren in eine Tabelle, ob die Tour schon gelaufen ist,</li>
    <li>wenn du Gruppen nutzt: deine Gruppen, ihr zuletzt abgeglichener Stand, noch nicht gesendete Änderungen und dein Zugangsschlüssel.</li>
  </ul>
  <p>
    Alles davon dient allein dazu, dass die App beim nächsten Start dort weitermacht, wo du
    aufgehört hast. Eine Einwilligung ist dafür nicht nötig, weil die Speicherung für die von
    dir aufgerufene Funktion erforderlich ist (§ 25 Abs. 2 Nr. 2 TDDDG). Du wirst alles los,
    indem du in deinem Browser die Websitedaten für diese Adresse löschst.
  </p>
  <p>
    Zusätzlich legt der <em>Service Worker</em> die Dateien der App im Browsercache ab, samt
    Wörterbüchern und Bildern. Nur deshalb funktioniert sie ohne Netz. Das sind Programmdateien,
    keine Angaben über dich.
  </p>

  <h2>Gerätefunktionen</h2>
  <p>
    „Bildschirm wach halten“ bittet den Browser, das Display nicht abzuschalten – mehr nicht.
    In die Zwischenablage schreibt huntkit nur, wenn du auf „kopieren“ tippst; gelesen wird sie
    nie. Auf Kamera, Mikrofon, Standort, Kontakte oder Dateien greift huntkit nicht zu.
  </p>

  <h2>Gruppen</h2>
  <p>
    Gruppen sind freiwillig. Wer einer beitritt, gleicht ihre Werkbänke und ihr
    Kreuzworträtsel über den Server ab, auf dem auch die App liegt. Dort gespeichert werden:
  </p>
  <ul>
    <li>der Inhalt der Werkbänke und des Kreuzworträtsels der Gruppe,</li>
    <li>ein Protokoll, wer was wann geändert hat – so sieht die Gruppe, von wem ein Eintrag stammt,</li>
    <li>die Mitglieder mit Anzeigenamen und Rolle; Gäste nur mit dem Namen, den sie beim Beitritt angeben,</li>
    <li>Zugangsschlüssel für angemeldete Geräte.</li>
  </ul>
  <p>
    Wer sich <strong>anmeldet</strong>, statt als Gast beizutreten, wird dazu an den
    eingerichteten Anmeldedienst weitergeleitet; dort gelten dessen Bestimmungen. huntkit
    bekommt von ihm Name, E-Mail-Adresse, Profilbild und die Zugehörigkeit zu der Gruppe, die
    Gruppen anlegen darf. Das Profilbild wird auf den Server kopiert, damit die App es nicht
    bei jedem Anzeigen beim Anmeldedienst abrufen muss.
  </p>
  <p>
    Rechtsgrundlage ist die Bereitstellung der Gruppe, der du beitrittst (Art. 6 Abs. 1 lit. b
    DSGVO). Die Daten bleiben, solange die Gruppe besteht. Verlässt du sie oder wirst entfernt,
    bleiben deine früheren Einträge mit deinem Namen im Protokoll der Gruppe stehen – sonst
    stimmte es nicht mehr. Soll etwas gelöscht werden, genügt eine Nachricht an die Adresse
    oben. Ein technisches Fehlerprotokoll schreibt der Server nur, wenn es zur Fehlersuche
    eingeschaltet ist; Zugangsschlüssel werden darin geschwärzt.
  </p>

  <h2>Keine Dritten im Spiel</h2>
  <p>
    Die App lädt ausschließlich ihre eigenen Dateien von derselben Adresse: kein Analysedienst,
    kein Werbenetz, keine Schriftart von einem fremden Server, kein eingebettetes Video.
    Verweise auf andere Seiten – Quellen wie Wikipedia oder eine Karte bei OpenStreetMap –
    öffnen sich erst, wenn du sie antippst; ab dann gelten die Bestimmungen der jeweiligen
    Seite.
  </p>

  <h2>Abruf der Seite</h2>
  <p>
    Die App liegt auf einem angemieteten Webspace. Wie bei jedem Abruf im Netz überträgt dein
    Browser dabei technisch notwendige Angaben an den Server – IP-Adresse, Zeitpunkt,
    angeforderte Datei, Browserkennung. Der Anbieter protokolliert solche Zugriffe in seinen
    Serverprotokollen, um den Betrieb sicherzustellen und Störungen nachzugehen.
    Rechtsgrundlage ist das berechtigte Interesse am störungsfreien Betrieb (Art. 6 Abs. 1
    lit. f DSGVO). Diese Protokolle werden nicht ausgewertet, nicht mit anderen Daten
    zusammengeführt und nicht für Statistiken benutzt.
  </p>

  <h2>Deine Rechte</h2>
  <p>
    Nach der DSGVO hast du das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
    Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dafür an die oben genannte
    Adresse. Was die App auf deinem Gerät speichert, liegt ohnehin bei dir: Du löschst es in
    deinem Browser, ohne Umweg über mich.
  </p>
  <p>
    Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, etwa bei der
    für deinen Wohnsitz zuständigen.
  </p>

  <h2>Änderungen</h2>
  <p>Ändert sich an der App etwas, das hier steht, ändert sich diese Seite mit.</p>

  <p class="fuss">
    Stand: September 2026 ·
    <a href="#/kontakt">Kontakt</a> ·
    <a href="#/werkbank">zur Werkbank</a>
  </p>
</Textseite>
