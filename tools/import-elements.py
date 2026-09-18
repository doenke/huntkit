#!/usr/bin/env python3
"""Liest die Periodensystem-Grafik der deutschen Wikipedia aus und erzeugt data/elements.json.

Quelle: https://de.wikipedia.org/wiki/Datei:Periodic_table_(German)_EN.svg

Die Grafik ist eine gezeichnete Tabelle: Jede Elementzelle ist ein <rect> fester Groesse,
die Werte darin sind einzelne <text>-Knoten. Drei der neun Angaben stehen nicht als Text in
der Zelle, sondern stecken in der Darstellung – so, wie es die Legende der Grafik erklaert:

    Fuellfarbe der Zelle    -> Serie (Alkalimetalle, Edelgase, ...)
    Farbe des Symbols       -> Aggregatzustand (schwarz fest, rot gasfoermig, blau fluessig)
    Farbe der Ordnungszahl  -> Radioaktivitaet (gelb = radioaktiv, schwarz = nicht)

Zwei Eigenheiten der Datei sind zu beachten:

  * Jeder Textknoten ist einzeln skaliert (transform="scale(...)"), die tatsaechliche
    Position ergibt sich erst nach Anwendung dieser Skalierung.
  * Lange Elektronenkonfigurationen sind auf zwei Zeilen umbrochen und muessen wieder
    zusammengesetzt werden.

Welche Textknoten zu einer Zelle gehoeren, entscheidet allein ihre Lage – nicht ihre
Schriftgroesse. Roentgenium ist die einzige Zelle, deren Ordnungszahl groesser gesetzt ist
als alle anderen; eine Auswahl ueber die Schriftgroesse verliert genau dieses eine Element.

Aufruf:  python3 tools/import-elements.py <pfad-zur-svg> [ziel.json]
"""

import json
import re
import sys

CELL_W, CELL_H = 52.89, 59.04
SPALTE_RECHTS = 25.0  # ab diesem Abstand vom linken Zellenrand gilt ein Wert als rechtsbuendig

SERIE_NACH_FARBE = {
    "#ffd5d5": "Alkalimetalle",
    "#fff5e8": "Erdalkalimetalle",
    "#ffeded": "Übergangsmetalle",
    "#ffedff": "Lanthanoide",
    "#ffe3f1": "Actinoide",
    "#f1f1f1": "Metalle",
    "#f1f1e3": "Halbmetalle",
    "#e4ffe4": "Nichtmetalle",
    "#ffffe3": "Halogene",
    "#edffff": "Edelgase",
    # Wasserstoff hat in der Grafik einen eigenen, etwas dunkleren Gruenton, den die
    # Legende nicht auffuehrt. Zugeordnet zur farblich naechsten Serie – die einzige
    # Stelle, an der die Datei nicht fuer sich selbst spricht.
    "#dcf0dc": "Nichtmetalle",
}

ZUSTAND_NACH_FARBE = {
    None: "fest",
    "#000000": "fest",
    "#ff0000": "gasförmig",
    "#0000ff": "flüssig",
}

RECT_RE = re.compile(r"<rect\b([^>]*?)/?>")
TEXT_RE = re.compile(
    r'<text\s+x="([-\d.]+)"\s+y="([-\d.]+)"'
    r'(?:\s+transform="scale\(([\d.]+),([\d.]+)\)")?'
    r"([^>]*)>(.*?)</text>",
    re.S,
)


def attr(raw, name):
    m = re.search(name + r'="([^"]*)"', raw)
    return m.group(1) if m else None


def stil(raw, schluessel):
    m = re.search(schluessel + r":\s*([^;\"]+)", raw or "")
    return m.group(1).strip().lower() if m else None


def zahl(text):
    """'1,0079' -> 1.0079; '(227)' -> 227.0; sonst None."""
    if text is None:
        return None
    try:
        return float(text.strip().strip("()[]").replace(",", "."))
    except ValueError:
        return None


def lies_zellen(svg):
    """Alle <rect> in Elementzellengroesse, mit ihrer Fuellfarbe."""
    zellen = []
    for m in RECT_RE.finditer(svg):
        raw = m.group(1)
        breite, hoehe = attr(raw, "width"), attr(raw, "height")
        if breite is None or hoehe is None:
            continue
        if abs(float(breite) - CELL_W) > 0.5 or abs(float(hoehe) - CELL_H) > 0.5:
            continue
        zellen.append(
            {
                "x": float(attr(raw, "x") or 0),
                "y": float(attr(raw, "y") or 0),
                "fuellung": stil(raw, "fill"),
            }
        )
    return zellen


def lies_texte(svg):
    """Alle <text> mit tatsaechlicher Position; die Grafik skaliert jeden Knoten einzeln."""
    texte = []
    for m in TEXT_RE.finditer(svg):
        sx = float(m.group(3)) if m.group(3) else 1.0
        sy = float(m.group(4)) if m.group(4) else 1.0
        inhalt = re.sub(r"<[^>]+>", "", m.group(6)).strip()
        if not inhalt:
            continue
        texte.append(
            {
                "x": float(m.group(1)) * sx,
                "y": float(m.group(2)) * sy,
                "text": inhalt,
                "farbe": stil(m.group(5), "fill"),
            }
        )
    return texte


def zeilen_bilden(texte):
    """Gruppiert die Texte einer Zelle nach gleicher Hoehe zu Zeilen."""
    zeilen = []
    for t in sorted(texte, key=lambda t: (t["y"], t["x"])):
        if zeilen and abs(zeilen[-1][0]["y"] - t["y"]) < 4:
            zeilen[-1].append(t)
        else:
            zeilen.append([t])
    return [sorted(z, key=lambda t: t["x"]) for z in zeilen]


def zelle_auswerten(zelle, texte):
    x0, y0 = zelle["x"], zelle["y"]
    innen = [
        t
        for t in texte
        if x0 - 1 <= t["x"] <= x0 + CELL_W + 1 and y0 - 1 <= t["y"] <= y0 + CELL_H + 4
    ]
    zeilen = zeilen_bilden(innen)
    if len(zeilen) < 4 or len(zeilen[0]) < 2:
        return None  # Legenden-Beispielzelle und sonstige Kaesten
    try:
        ordnungszahl = int(zeilen[0][0]["text"])
    except ValueError:
        return None

    nummer, symbol = zeilen[0][0], zeilen[0][-1]
    links, rechts = [], []
    for zeile in zeilen[1:]:
        for t in zeile:
            (rechts if t["x"] - x0 >= SPALTE_RECHTS else links).append(t)

    return {
        "ordnungszahl": ordnungszahl,
        "symbol": symbol["text"],
        "name": links[0]["text"] if links else None,
        "atomgewicht": zahl(links[1]["text"]) if len(links) > 1 else None,
        # Umbrochene Konfigurationen wieder zusammensetzen, ohne doppelten Trenner.
        "elektronenkonfiguration": "/".join(t["text"].strip("/") for t in links[2:]) or None,
        "elektronegativitaet": zahl(rechts[-1]["text"]) if rechts else None,
        "serie": SERIE_NACH_FARBE.get(zelle["fuellung"]),
        "aggregatzustand": ZUSTAND_NACH_FARBE.get(symbol["farbe"]),
        "radioaktiv": nummer["farbe"] not in (None, "#000000"),
    }


def elemente_aus_svg(pfad):
    with open(pfad, encoding="utf-8") as fh:
        svg = fh.read()
    texte = lies_texte(svg)
    elemente = [e for e in (zelle_auswerten(z, texte) for z in lies_zellen(svg)) if e]
    elemente.sort(key=lambda e: e["ordnungszahl"])
    return elemente


def pruefen(elemente):
    """Minimale Plausibilitaetspruefung – lieber hier scheitern als spaeter im Rätsel."""
    fehler = []
    nummern = [e["ordnungszahl"] for e in elemente]
    if nummern != list(range(1, 119)):
        fehler.append("Ordnungszahlen nicht lückenlos 1–118 (%d Elemente)" % len(elemente))
    if len({e["symbol"] for e in elemente}) != len(elemente):
        fehler.append("Symbole nicht eindeutig")
    if len({e["name"] for e in elemente}) != len(elemente):
        fehler.append("Namen nicht eindeutig")
    for e in elemente:
        fehlend = [
            f
            for f in ("symbol", "name", "atomgewicht", "elektronenkonfiguration", "serie",
                      "aggregatzustand")
            if not e.get(f)
        ]
        if fehlend:
            fehler.append("%s (%d): fehlt %s" % (e["symbol"], e["ordnungszahl"], ", ".join(fehlend)))
    return fehler


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    daten = elemente_aus_svg(sys.argv[1])
    probleme = pruefen(daten)
    if probleme:
        print("Pruefung fehlgeschlagen:", file=sys.stderr)
        for p in probleme:
            print("  -", p, file=sys.stderr)
        sys.exit(1)
    ziel = sys.argv[2] if len(sys.argv) > 2 else "data/elements.json"
    with open(ziel, "w", encoding="utf-8") as fh:
        json.dump(daten, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print("%d Elemente -> %s" % (len(daten), ziel))
