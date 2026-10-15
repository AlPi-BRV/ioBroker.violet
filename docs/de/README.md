<img src="../../admin/violet.png" alt="Violet" width="96" align="right">

# ioBroker.violet – Anleitung

[![NPM version](https://img.shields.io/npm/v/iobroker.violet.svg)](https://www.npmjs.com/package/iobroker.violet)
[![Downloads](https://img.shields.io/npm/dm/iobroker.violet.svg)](https://www.npmjs.com/package/iobroker.violet)
[![Test and Release](https://github.com/AlPi-BRV/ioBroker.violet/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/AlPi-BRV/ioBroker.violet/actions/workflows/test-and-release.yml)
[![License](https://img.shields.io/github/license/AlPi-BRV/ioBroker.violet)](../../LICENSE)

Adapter für die **Violet-Poolsteuerung** von PoolDigital (inkl. Dosiermodul und Relais-Erweiterungen).

🇬🇧 [English README](../../README.md) · Änderungen: [Changelog](../../README.md#changelog)

## Funktionen

- Liest zyklisch alle Werte der Violet (`http://<IP>/getReadings?ALL`) und übersetzt sie in eine feste Struktur
  (`wasser`, `temperatur`, `pumpe`, `dosierung`, `relais`, `heizung`, `solar`, `rueckspuelung`, `analog` …)
- **Fragebogen in der Konfiguration**: nur genutzte Bereiche werden als Datenpunkte angelegt
- Eigene Namen für Temperatursensoren, Relais, Analogeingänge und DMX-Szenen – mit Live-Werten in der Konfiguration oder mit einem Klick aus der Violet übernommen
- **Schalten EIN / AUS / AUTO** (Hauptschalter „Schalten erlauben“, standardmäßig aus)
- **Einstellungen fürs Pool-Display** (Reiter „Display“): Optimalbereiche für pH, Redox und Chlor (Werte außerhalb rot), Zuordnung der Temperaturzeilen und der großen Anzeige
- **Virtuelle Relais**: bis zu 8 ioBroker-Datenpunkte (true/false) anderer Geräte, schaltbar in der Relais-Ansicht des Pool-Displays
- **Wassertemperatur in der Verrohrung**: optional eingefrorener Wert bei stehender Pumpe (`temperatur.sensor1_pool`, im Display mit * markiert)
- **Umgewälzte Wassermenge des Tages** in m³, berechnet aus den Laufzeiten der Violet und der Fördermenge der Pumpe
- **Wärmeleistung** von Absorber und Heizung, bei Wärmepumpen zusätzlich der **COP**
- **Meldungen der Violet** (Warnungen, Alarme, Erinnerungen) als Datenpunkt `meldungen.aktiv` und als Hinweis im Pool-Display
- **Pool-Display** im Stil der alten ProCon.IP-Anzeige, direkt vom Adapter ausgeliefert
- Datenpunktnamen, Konfiguration und Pool-Display auf Deutsch und Englisch; Konfiguration in 11 Sprachen

## Grundsätze

- Der Adapter **liest und schaltet**, er **konfiguriert nie** die Violet (keine Sollwerte, Kalibrierung, Fördermengen, Zeitpläne).
- **Dosierung** (Chlor, pH, Flockung, Elektrolyse) ist nur lesbar.
- **Abdeckung** ist nur lesbar (kein dokumentierter Schaltbefehl).

## Konfiguration

| Reiter | Inhalt |
|---|---|
| Verbindung | IP, Login, Abfrageintervall, „Schalten erlauben“, Pool-Display (Port, Schriftart), Übernahme aus der Violet |
| Funktionen | Fragebogen: Was ist an der Violet vorhanden? |
| Temperaturen | Sensor 1–6 heißen wie in der Violet (Wassertemperatur, Außentemperatur, Absorbertemperatur, Absorber-Rücklauf, Wärmetauscher, Speichertemperatur), ab Sensor 7 frei – mit aktuellem Messwert |
| Display | Optimalbereiche, Temperaturzeilen, große Anzeige |
| Pumpe | Fördermenge in m³/h (je Drehzahlstufe; mit Absorber / Heizung), Wärmeleistung, Art der Heizung, Stromverbrauch der Wärmepumpe |
| Analog | ADC1 Filterdruck, ADC2 Pegelsonde, ADC3–6, Impuls 1 Messwasser, Impuls 2 Förderleistung – Name, Einheit, Live-Wert |
| Relais | Namen der Relais der Erweiterungen und der DMX-Szenen, virtuelle Relais (Name + Datenpunkt) |

## Übernahme aus der Violet

Im Reiter „Verbindung“ kann der Adapter Vorgaben aus der Violet lesen: Namen der Temperatursensoren, Relais, Analog-/Impulseingänge und DMX-Szenen, die Fördermengen der Pumpe und welche Funktionen verbaut sind (Dosierung, Relais-Erweiterungen, Heizung, Solar).

- „Leere Felder füllen“ ergänzt nur, was fehlt; „Alles ersetzen“ überschreibt auch eigene Namen und Fördermengen
- Funktionen werden nur eingeschaltet, nie ausgeschaltet; Standardnamen der Violet („EXT1-Relais 3“, „Szene 9“, „---“) werden übersprungen
- Die Werte erscheinen nur im Formular – sie gelten erst nach „Speichern“
- Benutzername und Passwort der Violet müssen gespeichert sein
- Beim allerersten Start einer neuen Instanz geschieht das automatisch (nur leere Felder)
- An die Violet wird nichts geschrieben; ausgewertet werden nur die genannten Werte, die Antwort der Violet wird nicht gespeichert

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
- Befehl: `GET /setFunctionManually?FUNKTION,AKTION,DAUER,WERT` – jeder Befehl und jeder Fehler wird protokolliert

### Status-Codes

| Code | Bedeutung |
|---|---|
| 0 | Automatik – aus |
| 1 | Automatik – an |
| 2 | Automatik – durch eine Regel aus (z. B. Heizung bei stehender Pumpe) |
| 3 | Automatik – durch eine Notfallregel an |
| 4 | Manuell an |
| 5 | Aus durch eine Notfallregel |
| 6 | Manuell aus |

Quelle: Schnittstellenbeschreibung von PoolDigital (getReadings, Stand 14.07.2024).

## Umgewälzte Wassermenge

Im Reiter „Pumpe“ trägst du die Fördermenge der Pumpe in m³/h ein – bei Drehzahlpumpen je Stufe.
Bremst der Absorber oder die Heizung den Durchfluss, dort den kleineren Wert eintragen (leer = wie allein; laufen beide, gilt der kleinere Wert).

- Datenpunkt `pumpe.umwaelzung_heute` (m³), im Pool-Display hinter der Laufzeit: `06h 07m (25,9 m³)`
- Grundlage sind die Laufzeiten je Stufe, die die Violet selbst zählt – ein Neustart von ioBroker verfälscht nichts
- Den Abzug für Absorber / Heizung zählt der Adapter bei jeder Abfrage mit; um Mitternacht beginnt alles bei 0
- Ein Durchflusssensor in m³/h (z. B. Impulseingang 2) erscheint im Pool-Display in der Pumpenzeile unter der Laufzeit
- Reine Berechnung – an die Violet wird nichts geschrieben

## Wärmeleistung (Absorber / Heizung)

Im Reiter „Pumpe“ (Abschnitt „Wärmeleistung“) kann der Adapter berechnen, wie viel Wärme Absorber und Heizung in den Pool bringen:

- Leistung (kW) = (Rücklauf − Wassertemperatur Sensor 1) × Durchfluss der laufenden Pumpenstufe × 1,163 – der Durchfluss kommt aus den Fördermengen oben (bei Absorber / Heizung der kleinere Wert)
- Fühler: Absorber-Rücklauf (in der Violet meist Sensor 4) und optional ein Fühler im Heizungs-Rücklauf
- Lage des Heizungs-Rücklauffühlers: „nur hinter der Heizung“ oder „hinter Absorber und Heizung (in Reihe)“. In Reihe und beide an: Heizung = Gesamt − Absorber
- Datenpunkte `solar.leistung` / `heizung.leistung` (kW) und `solar.energie_heute` / `heizung.energie_heute` (kWh, um Mitternacht auf 0); im Pool-Display in einer Zeile unter der Laufzeit: `4,2 kW · 11,6 kWh`
- Negative Werte (Absorber kühlt) werden als 0 angezeigt. Für Langzeitauswertungen z. B. den Adapter sourceanalytics nutzen
- „Art der Heizung“ (Öl/Gas über Wärmetauscher, Wärmepumpe, elektrisch) legt den Namen im Pool-Display fest

### COP der Wärmepumpe

Ist als Art der Heizung „Wärmepumpe“ gewählt, lässt sich ein beliebiger ioBroker-Datenpunkt mit dem Stromverbrauch auswählen (z. B. ein Shelly, Einheit W oder kW).

- `heizung.strom_leistung` (kW) und `heizung.strom_heute` (kWh, inkl. Standby)
- `heizung.cop` = Wärmeleistung ÷ Stromverbrauch, nur während die Heizung läuft (ab 0,1 kW), sonst leer
- `heizung.cop_heute` = Wärmemenge heute ÷ Strom heute (ab 0,05 kWh)
- Im Pool-Display hinter der Wärmemenge: im Betrieb der aktuelle COP, sonst der COP des Tages
- Die Wärmeleistung beruht auf der eingetragenen Fördermenge – der COP ist eine gute Schätzung, keine geeichte Messung

## Elektrolysezelle

Für die Elektrolyse nutzt die Violet dieselben Felder wie für Flüssigchlor, aber mit anderer Bedeutung (Auskunft PoolDigital): Die Tagesmenge ist erzeugtes Chlor in **g**, der „Kanister“-Inhalt sind die **Reststunden der Zelle**, der Kanisterwechsel ist der **Zellenwechsel**.

- Datenpunkte unter `dosierung.elektrolyse`: `erzeugt_heute` (g), `zelle_reststunden` (h), `zellenwechsel` (Datum)
- Optional (Reiter „Funktionen“, sichtbar bei Elektrolyse): Lebensdauer der Zelle in Stunden eintragen – derselbe Wert wie in der Violet. Dann kommen `zelle_verschleiss` (%) und `zelle_warnung` (ab der Warnschwelle) hinzu
- Der Zellenwechsel wird in der Violet wie ein Kanisterwechsel quittiert – an die Violet wird nichts geschrieben
- Bitte melden, wenn die Werte anders aussehen – an der Anlage des Autors läuft Flüssigchlor

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

Wird vom Adapter selbst ausgeliefert (eingebauter Webserver, keine weiteren Adapter nötig):
`http://<ioBroker-IP>:8099/` – Port und Schriftart in der Konfiguration (Reiter „Verbindung“).

- Baut sich selbst auf: nur vorhandene Funktionen, angeschlossene Sensoren und eingerichtete Relais
- Pumpenzeile mit Drehzahlstufen (aktive Stufe grün) und PV-Anzeige (nur wenn PV-Überschuss genutzt wird und aktiv ist)
- Lichtzeile mit DMX-Szenen (falls genutzt)
- Button „Relais“ in der Kopfzeile: zeigt statt der Temperaturen die Schalter der Relais-Erweiterungen (nach 2 Minuten ohne Bedienung zurück)
- Schalter nur, wenn „Schalten erlauben“ aktiv ist; die Schnittstelle nimmt nur die freigegebenen `schalten`-Datenpunkte an (Dosierung nie)
- Schnittstelle: `GET /api/data` (Werte), `GET /api/set?id=…&value=…` (Schalten), `GET /api/ack` (Meldungen quittieren)
- **Nur im Heimnetz verwenden**, nicht ins Internet freigeben (kein Login)
- Vorschau ohne Adapter: `www/index.html` lokal mit `?demo=1` öffnen (Optionen: `&lang=en`, `&font=arial`, `&msg=1`, `&ohne=heizung,solar,pv,dmx,relais`)

## Installation

Den Adapter im ioBroker-Admin unter **Adapter** installieren.

Nach einem Update die Instanz neu starten.

## Häufige Fragen

**Warum kann ich die Dosierung nicht schalten?** – Bewusst: Eine falsche Dosierung kann für Badende gefährlich sein. Die Dosierung steuert ausschließlich die Violet.

**Warum gibt es so wenige Datenpunkte?** – Angelegt wird nur, was im Reiter „Funktionen“ angehakt ist. Die kompletten Rohdaten stehen immer in `info.rawJson`.

**Das Pool-Display zeigt „Keine Daten“.** – Läuft die Instanz und ist „Pool-Display bereitstellen“ aktiviert? Test im Browser: `http://<ioBroker-IP>:8099/api/data`.

## Marken

Violet und das Violet-Logo sind Marken der **PoolDigital GmbH & Co. KG**, Kapellenstraße 10a, 86441 Zusmarshausen – [www.pooldigital.de](https://www.pooldigital.de).
Verwendung mit freundlicher Genehmigung von PoolDigital. Dieser Adapter ist ein unabhängiges Community-Projekt und kein offizielles Produkt von PoolDigital.
