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

EINSTELLUNGEN="set cmd:fail-exit yes; set net:max-retries 3; set net:timeout 20;"

case "$PROTOKOLL" in
  sftp)
    if [ -n "${DEPLOY_KNOWN_HOSTS:-}" ]; then
      mkdir -p ~/.ssh && chmod 700 ~/.ssh
      printf '%s\n' "$DEPLOY_KNOWN_HOSTS" >> ~/.ssh/known_hosts
      chmod 600 ~/.ssh/known_hosts
      EINSTELLUNGEN="$EINSTELLUNGEN set sftp:auto-confirm no;"
    else
      # Ohne hinterlegten Hostschluessel wird jeder Serverschluessel akzeptiert.
      # Bei Passwort-Anmeldung heisst das: Das Passwort ginge auch an einen
      # untergeschobenen Server.
      echo "::warning::DEPLOY_KNOWN_HOSTS ist nicht gesetzt – der Hostschluessel wird ungeprueft akzeptiert."
      EINSTELLUNGEN="$EINSTELLUNGEN set sftp:auto-confirm yes;"
    fi
    ;;
  ftps)
    EINSTELLUNGEN="$EINSTELLUNGEN set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate true;"
    PROTOKOLL="ftp"
    ;;
  ftp)
    echo "::warning::Unverschluesseltes FTP – Passwort und Daten gehen im Klartext ueber die Leitung."
    EINSTELLUNGEN="$EINSTELLUNGEN set ftp:ssl-force false;"
    ;;
  *)
    echo "Unbekanntes Protokoll: $PROTOKOLL (erlaubt: sftp, ftps, ftp)" >&2
    exit 1
    ;;
esac

PORT_ARG=""
[ -n "${DEPLOY_PORT:-}" ] && PORT_ARG="-p ${DEPLOY_PORT}"

echo "Lade '$QUELLE' nach ${DEPLOY_PATH} (${DEPLOY_PROTOCOL:-sftp}) ..."

# --env-password: Das Passwort steht in der Umgebung, nicht in der
# Kommandozeile – sonst waere es in der Prozessliste sichtbar.
LFTP_PASSWORD="$DEPLOY_PASSWORD" lftp --env-password -c "
  ${EINSTELLUNGEN}
  open -u '${DEPLOY_USER}' ${PORT_ARG} ${PROTOKOLL}://${DEPLOY_HOST};
  mirror --reverse --delete --no-perms --parallel=4 --verbose '${QUELLE}' '${DEPLOY_PATH}';
"

echo "Fertig."
