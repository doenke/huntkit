#!/usr/bin/env python3
"""Erzeugt die App-Icons als PNG – ohne Bildbibliothek, damit der Build keine
weitere Abhaengigkeit braucht.

Motiv: eine Brailleschrift-Zelle. Erkennbar klein, passt zum Inhalt der App und
laesst sich als Vektor wie als Pixelbild sauber zeichnen.

Aufruf:  python3 tools/make-icons.py
"""

import struct
import zlib

GRUND = (14, 17, 22)
PUNKT = (90, 169, 230)
# Braille-Zelle, 2 Spalten x 3 Zeilen; True = erhabener Punkt (hier: Muster "h")
ZELLE = [(True, False), (True, True), (False, False)]


def png(breite, hoehe, pixel):
    """Minimaler PNG-Schreiber: RGB, 8 Bit, Filtertyp 0 pro Zeile."""
    roh = b"".join(
        b"\x00" + b"".join(bytes(pixel(x, y)) for x in range(breite)) for y in range(hoehe)
    )

    def block(typ, daten):
        return (
            struct.pack(">I", len(daten))
            + typ
            + daten
            + struct.pack(">I", zlib.crc32(typ + daten) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + block(b"IHDR", struct.pack(">IIBBBBB", breite, hoehe, 8, 2, 0, 0, 0))
        + block(b"IDAT", zlib.compress(roh, 9))
        + block(b"IEND", b"")
    )


def zeichne(groesse):
    # Sichere Zone fuer maskierbare Icons: Motiv bleibt in den mittleren 60 %.
    mitte = groesse / 2
    abstand = groesse * 0.17
    radius = groesse * 0.075
    punkte = [
        (mitte + (spalte - 0.5) * abstand, mitte + (zeile - 1) * abstand)
        for zeile, spalten in enumerate(ZELLE)
        for spalte, gesetzt in enumerate(spalten)
        if gesetzt
    ]

    def pixel(x, y):
        for px, py in punkte:
            if (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 <= radius**2:
                return PUNKT
        return GRUND

    return png(groesse, groesse, pixel)


def svg():
    punkte = "".join(
        '<circle cx="%.1f" cy="%.1f" r="7.5" fill="rgb(90,169,230)"/>'
        % (50 + (spalte - 0.5) * 17, 50 + (zeile - 1) * 17)
        for zeile, spalten in enumerate(ZELLE)
        for spalte, gesetzt in enumerate(spalten)
        if gesetzt
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
        '<rect width="100" height="100" rx="22" fill="rgb(14,17,22)"/>' + punkte + "</svg>"
    )


if __name__ == "__main__":
    for groesse in (180, 192, 512):
        with open("public/icon-%d.png" % groesse, "wb") as fh:
            fh.write(zeichne(groesse))
    with open("public/icon.svg", "w", encoding="utf-8") as fh:
        fh.write(svg() + "\n")
    print("Icons erzeugt: icon.svg, icon-180.png, icon-192.png, icon-512.png")
