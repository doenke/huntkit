#!/usr/bin/env bash
#
# Laedt das gebaute Verzeichnis auf den Webspace.
#
# Bewusst ein eigenes Skript statt einer fertigen Deploy-Action: Eine Action aus
# dem Marketplace bekaeme die Zugangsdaten zum Webspace zu sehen. Hier ist
# nachlesbar, was passiert.
#
# Erwartete Umgebungsvariablen:
#   DEPLOY_HOST        Servername
#   DEPLOY_USER        Benutzername
#   DEPLOY_PASSWORD    Passwort
#   DEPLOY_PATH        Zielverzeichnis auf dem Server
#   DEPLOY_PORT        optional, sonst der Standardport des Protokolls
#   DEPLOY_PROTOCOL    optional: sftp (Standard), ftps oder ftp
#   DEPLOY_KNOWN_HOSTS optional, nur bei sftp: known_hosts-Zeile(n) des Servers
#
# Aufruf:  tools/deploy.sh [quellverzeichnis]

set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST fehlt}"
: "${DEPLOY_USER:?DEPLOY_USER fehlt}"
: "${DEPLOY_PASSWORD:?DEPLOY_PASSWORD fehlt}"
: "${DEPLOY_PATH:?DEPLOY_PATH fehlt}"

QUELLE="${1:-dist}"
PROTOKOLL="${DEPLOY_PROTOCOL:-sftp}"

[ -d "$QUELLE" ] || { echo "Quellverzeichnis '$QUELLE' gibt es nicht." >&2; exit 1; }
[ -f "$QUELLE/index.html" ] || { echo "In '$QUELLE' liegt keine index.html – Build unvollstaendig?" >&2; exit 1; }

# Jede Zeile ist ein lftp-Befehl; sie werden unten ueber die Standardeingabe
# uebergeben. Nicht ueber "lftp -c": das vertraegt sich nicht mit
# --env-password, weil beides zur selben impliziten open-Anweisung gehoert.
EINSTELLUNGEN="set cmd:fail-exit yes
set net:max-retries 3
set net:timeout 20"

case "$PROTOKOLL" in
  sftp)
    if [ -n "${DEPLOY_KNOWN_HOSTS:-}" ]; then
      # Bewusst eine eigene Datei statt ~/.ssh/known_hosts: Dort koennten
      # bereits Eintraege stehen, und dann wuerde ein Server auch dann
      # akzeptiert, wenn er nicht zu DEPLOY_KNOWN_HOSTS passt – die Pruefung
      # waere wirkungslos, ohne dass es auffaellt.
      KNOWN_HOSTS_DATEI="$(mktemp)"
      trap 'rm -f "$KNOWN_HOSTS_DATEI"' EXIT
      printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$KNOWN_HOSTS_DATEI"
      SSH_OPTIONEN="-o UserKnownHostsFile=$KNOWN_HOSTS_DATEI -o StrictHostKeyChecking=yes"
    else
      # Ohne hinterlegten Hostschluessel wird jeder Serverschluessel akzeptiert.
      # Bei Passwort-Anmeldung heisst das: Das Passwort ginge auch an einen
      # untergeschobenen Server.
      echo "::warning::DEPLOY_KNOWN_HOSTS ist nicht gesetzt – der Hostschluessel wird ungeprueft akzeptiert."
      SSH_OPTIONEN="-o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
    fi
    EINSTELLUNGEN="$EINSTELLUNGEN
set sftp:connect-program \"ssh -a -x $SSH_OPTIONEN\""
    ;;
  ftps)
    EINSTELLUNGEN="$EINSTELLUNGEN
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate true"
    PROTOKOLL="ftp"
    ;;
  ftp)
    echo "::warning::Unverschluesseltes FTP – Passwort und Daten gehen im Klartext ueber die Leitung."
    EINSTELLUNGEN="$EINSTELLUNGEN
set ftp:ssl-force false"
    ;;
  *)
    echo "Unbekanntes Protokoll: $PROTOKOLL (erlaubt: sftp, ftps, ftp)" >&2
    exit 1
    ;;
esac

ZIEL="${PROTOKOLL}://${DEPLOY_HOST}"
[ -n "${DEPLOY_PORT:-}" ] && ZIEL="${ZIEL}:${DEPLOY_PORT}"

echo "Lade '$QUELLE' nach ${DEPLOY_PATH} (${DEPLOY_PROTOCOL:-sftp}) ..."

# Nach der Uebertragung werden Arbeitsverzeichnis und Zielinhalt ausgegeben.
# Grund: Bei manchem Webspace landet man nach der Anmeldung bereits im eigenen
# Heimatverzeichnis. Ein absoluter Pfad wird dann darunter angelegt statt an der
# erwarteten Stelle – die Uebertragung meldet Erfolg, und trotzdem ist am Ziel
# nichts zu sehen. Die beiden Zeilen im Protokoll zeigen sofort, was wirklich
# passiert ist.

# --exclude-glob: Eine config.php, die jemand im api-Ordner abgelegt hat,
# ueberlebt das Spiegeln. Vorgesehen ist sie ohnehin ausserhalb (siehe
# server/config.beispiel.php).
#
# --env-password: Das Passwort steht in der Umgebung, nicht in der
# Kommandozeile – sonst waere es in der Prozessliste sichtbar.
LFTP_PASSWORD="$DEPLOY_PASSWORD" lftp -u "$DEPLOY_USER" --env-password "$ZIEL" <<LFTP
${EINSTELLUNGEN}
mirror --reverse --delete --no-perms --parallel=4 --verbose --exclude-glob api/config*.php '${QUELLE}' '${DEPLOY_PATH}'
echo ---- Arbeitsverzeichnis nach der Anmeldung ----
pwd
echo ---- Was dort liegt ----
cls -l .
echo ---- Inhalt des Zielverzeichnisses ----
cls -l '${DEPLOY_PATH}'
bye
LFTP

echo "Fertig."
