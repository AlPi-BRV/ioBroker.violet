<img src="../../admin/violet.png" alt="Violet" width="96" align="right">

# ioBroker.violet – Anleitung

Adapter für die **Violet-Poolsteuerung** von PoolDigital (inkl. Dosiermodul und Relais-Erweiterungen).

🇬🇧 [English README](../../README.md)

## Funktionen

- Liest zyklisch alle Werte der Violet (`http://<IP>/getReadings?ALL`) und übersetzt sie in eine feste Struktur
  (`wasser`, `temperatur`, `pumpe`, `dosierung`, `relais`, `heizung`, `solar`, `rueckspuelung`, `analog` …)
- **Fragebogen in der Konfiguration**: nur genutzte Bereiche werden als Datenpunkte angelegt
- Eigene Namen für Temperatursensoren, Relais und Analogeingänge – mit Live-Werten in der Konfiguration
- **Schalten EIN / AUS / AUTO** (Hauptschalter „Schalten erlauben“, standardmäßig aus)
- **Umgewälzte Wassermenge des Tages** in m³, berechnet aus den Laufzeiten der Violet und der Fördermenge der Pumpe
- **Meldungen der Violet** (Warnungen, Alarme, Erinnerungen) als Datenpunkt `meldungen.aktiv` und als Hinweis im Pool-Display
- **Pool-Display** im Stil der alten ProCon.IP-Anzeige, direkt vom Adapter ausgeliefert

## Grundsätze

- Der Adapter **liest und schaltet**, er **konfiguriert nie** die Violet (keine Sollwerte, Kalibrierung, Fördermengen, Zeitpläne).
- **Dosierung** (Chlor, pH, Flockung, Elektrolyse) ist nur lesbar.
- **Abdeckung** ist nur lesbar (kein dokumentierter Schaltbefehl).

## Konfiguration

| Reiter | Inhalt |
|---|---|
| Verbindung | IP, Login, Abfrageintervall, „Schalten erlauben“, Pool-Display (Port, Schriftart) |
| Funktionen | Fragebogen: Was ist an der Violet vorhanden? |
| Temperaturen | Sensor 1–6 heißen wie in der Violet (Wassertemperatur, Außentemperatur, Absorbertemperatur, Absorber-Rücklauf, Wärmetauscher, Speichertemperatur), ab Sensor 7 frei – mit aktuellem Messwert |
| Pumpe | Fördermenge in m³/h (je Drehzahlstufe; mit Absorber / Heizung) für die umgewälzte Wassermenge |
| Analog | ADC1 Filterdruck, ADC2 Pegelsonde, ADC3–6, Impuls 1 Messwasser, Impuls 2 Förderleistung – Name, Einheit, Live-Wert |
| Relais | Namen der Relais der Erweiterungen |

## Schalten

Mit „Schalten erlauben“ bekommt jede gewählte Funktion einen Datenpunkt `schalten`:

| Wert | Wirkung |
|---|---|
| `ON` | manuell Ein |
| `OFF` | manuell Aus |
| `AUTO` | zurück in die Automatik der Violet |

- Schaltbar: Filterpumpe, Heizung, Solar, Licht, ECO, Nachspeisung, Rückspülung, Nachspülen, PV-Überschuss (nur ON/OFF), Relais EXT1/EXT2, DMX-Szenen
- `pumpe.drehzahl_soll` (1 = ECO, 2 = Normal, 3 = Boost) – wird beim Einschalten verwendet, bei laufender Pumpe sofort übernommen
- „Dauer bei manuell EIN/AUS“ in Minuten, 0 = dauerhaft
- Der Datenpunkt `schalten` zeigt immer den tatsächlichen Modus der Violet

## Umgewälzte Wassermenge

Im Reiter „Pumpe“ trägst du die Fördermenge der Pumpe in m³/h ein – bei Drehzahlpumpen je Stufe.
Bremst der Absorber oder die Heizung den Durchfluss, dort den kleineren Wert eintragen (leer = wie allein; laufen beide, gilt der kleinere Wert).

- Datenpunkt `pumpe.umwaelzung_heute` (m³), im Pool-Display hinter der Laufzeit: `heute 06h 07m (25,9 m³)`
- Grundlage sind die Laufzeiten je Stufe, die die Violet selbst zählt – ein Neustart von ioBroker verfälscht nichts
- Den Abzug für Absorber / Heizung zählt der Adapter bei jeder Abfrage mit; um Mitternacht beginnt alles bei 0
- Reine Berechnung – an die Violet wird nichts geschrieben

## Meldungen der Violet

Der Adapter liest die Meldungen einmal pro Minute über `GET /getNotifications?ALL`
(Rückfall bei älterer Firmware: Änderung von `last_error_id`).

| Datenpunkt | Bedeutung |
|---|---|
| `meldungen.aktiv` | `true`, wenn eine neue, noch nicht quittierte Meldung vorliegt – ideal für ein Signalbild in der Visualisierung |
| `meldungen.anzahl` | Anzahl neuer Meldungen |
| `meldungen.text`, `.zeit`, `.typ` | letzte Meldung |
| `meldungen.liste` | die letzten 20 Meldungen als JSON |
| `meldungen.quittieren` | Taster: in ioBroker quittieren |

Das Quittieren wirkt nur in ioBroker – Meldungen, die auf der Violet bestätigt werden müssen, werden weiterhin dort bestätigt.
Im Pool-Display erscheint eine neue Meldung als blinkender gelber Punkt in der Fußzeile; ein Klick öffnet die Violet in einem neuen Fenster und quittiert die Meldung in ioBroker.

## Pool-Display

`http://<ioBroker-IP>:8099/` – Port und Schriftart in der Konfiguration (Reiter „Verbindung“).

- Baut sich selbst auf: nur vorhandene Funktionen, angeschlossene Sensoren und eingerichtete Relais
- Pumpenzeile mit Drehzahlstufen (aktive Stufe grün) und PV-Anzeige (nur wenn PV-Überschuss genutzt wird und aktiv ist)
- Lichtzeile mit DMX-Szenen (falls genutzt)
- Button „Relais“ in der Kopfzeile: zeigt statt der Temperaturen die Schalter der Relais-Erweiterungen (nach 2 Minuten ohne Bedienung zurück)
- Schalter nur, wenn „Schalten erlauben“ aktiv ist; Dosierung nie
- **Nur im Heimnetz verwenden**, nicht ins Internet freigeben (kein Login)

## Installation

**Im ioBroker-Admin** (empfohlen): Adapter → GitHub-Symbol („Benutzerdefiniert installieren“)

- **Von GitHub:** `https://github.com/AlPi-BRV/ioBroker.violet`
- **Aus Datei:** die `.tgz`-Datei auswählen → „Installieren“

Nach einem Update die Instanz neu starten.

## Häufige Fragen

**Warum kann ich die Dosierung nicht schalten?** – Bewusst: Eine falsche Dosierung kann für Badende gefährlich sein. Die Dosierung steuert ausschließlich die Violet.

**Warum gibt es so wenige Datenpunkte?** – Angelegt wird nur, was im Reiter „Funktionen“ angehakt ist. Die kompletten Rohdaten stehen immer in `info.rawJson`.

**Das Pool-Display zeigt „Keine Daten“.** – Läuft die Instanz und ist „Pool-Display bereitstellen“ aktiviert? Test im Browser: `http://<ioBroker-IP>:8099/api/data`.

## Marken

Violet und das Violet-Logo sind Marken der **PoolDigital GmbH & Co. KG**, Kapellenstraße 10a, 86441 Zusmarshausen – [www.pooldigital.de](https://www.pooldigital.de).
Verwendung mit freundlicher Genehmigung von PoolDigital. Dieser Adapter ist ein unabhängiges Community-Projekt und kein offizielles Produkt von PoolDigital.
