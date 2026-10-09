<img src="admin/violet.png" alt="Violet" width="96" align="right">

# ioBroker.violet

Adapter für die **Violet-Poolsteuerung** von PoolDigital (inkl. Dosiermodul und Relais-Erweiterung).

## Funktionen

- Liest zyklisch alle Werte der Violet (`http://<IP>/getReadings?ALL`) und übersetzt sie in eine feste Struktur
  (`wasser`, `temperatur`, `pumpe`, `dosierung`, `relais`, `heizung`, `solar`, `rueckspuelung`, `analog` …)
- **Fragebogen in der Konfiguration**: nur genutzte Bereiche werden angelegt
- Eigene Namen für Temperatursensoren, Relais und Analogeingänge, mit Live-Werten in der Konfiguration
- **Schalten EIN / AUS / AUTO** (Hauptschalter „Schalten erlauben“, standardmäßig aus)
- **Pool-Display** im Stil der alten ProCon.IP-Anzeige, direkt vom Adapter ausgeliefert

## Grundsätze

- Der Adapter **liest und schaltet**, er **konfiguriert nie** die Violet (keine Sollwerte, Kalibrierung, Fördermengen, Zeitpläne).
- **Dosierung** (Chlor, pH, Flockung, Elektrolyse) ist nur lesbar.
- **Abdeckung** ist nur lesbar (kein dokumentierter Schaltbefehl).

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
- Der Datenpunkt `schalten` zeigt immer den tatsächlichen Modus der Violet (Rückmeldung)
- Befehl: `GET /setFunctionManually?FUNKTION,AKTION,DAUER,WERT` – jeder Befehl und Fehler wird im Log protokolliert

### Statuscodes (mit Violet-Dashboard abgeglichen)

| Code | Bedeutung |
|---|---|
| 0 | Automatik – aus |
| 1 / 3 | Automatik – an |
| 2 / 4 | Manuell an |
| 5 | Automatik – wartet |
| 6 | Manuell aus |

## Pool-Display

Im Stil der alten ProCon.IP-Anzeige – der Adapter liefert es **selbst** aus (eingebauter Webserver, keine weiteren Adapter nötig):
`http://<ioBroker-IP>:8099/` (Port in der Konfiguration, Reiter „Verbindung“).

- Baut sich selbst auf: nur vorhandene Funktionen, angeschlossene Sensoren und benannte Relais
- Schalter nur, wenn „Schalten erlauben“ aktiv ist; die Schnittstelle akzeptiert nur die freigegebenen `schalten`-Datenpunkte (Dosierung nie)
- Schnittstelle: `GET /api/data` (Werte), `GET /api/set?id=…&value=…` (Schalten)
- **Nur im Heimnetz verwenden**, nicht ins Internet freigeben (kein Login)
- Vorschau ohne Adapter: Datei `www/index.html` lokal öffnen mit `?demo=1` (optional `&ohne=heizung,solar`)

## Installation

**Im ioBroker-Admin** (empfohlen): Adapter → oben das GitHub-Symbol („Benutzerdefiniert installieren“)

- **Aus Datei:** die `.tgz`-Datei auswählen → „Installieren“ (Haken „Instanz erstellen“ beim ersten Mal)
- **Von GitHub:** sobald das Repository öffentlich ist, `https://github.com/AlPi-BRV/ioBroker.violet` angeben

Nach einem Update die Instanz neu starten.

**Alternativ über die Shell:**

```bash
cd /opt/iobroker
sudo -u iobroker npm install /tmp/iobroker.violet-<version>.tgz
iobroker upload violet
iobroker add violet        # nur beim allerersten Mal
```

## Changelog

### 0.4.2 (2026-10-09)
- „Pool-Dashboard“ heißt jetzt „Pool-Display“
- README: Installation über den Admin (Aus Datei / Von GitHub), Funktionsübersicht ohne Versionsnummer

### 0.4.1 (2026-10-09)
- Offizielles Violet-Logo (mit Genehmigung von PoolDigital) als Adapter-Icon, im Dashboard und als Favicon

### 0.4.0 (2026-10-09)
- Eingebauter Webserver für das Pool-Display (Standard-Port 8099) – simple-api nicht mehr nötig
- Schalten über das Dashboard nur für freigegebene Datenpunkte

### 0.3.5 (2026-10-09)
- Temperatursensoren 1–6 heißen automatisch wie in der Violet (Wassertemperatur, Außentemperatur, Absorbertemperatur, Absorber-Rücklauf, Wärmetauscher, Speichertemperatur); ab Sensor 7 frei

### 0.3.4 (2026-10-09)
- Dashboard: Zeitlimit beim Abruf, klare Meldung, wenn die simple-api nicht antwortet oder der Adapter keine Werte liefert

### 0.3.3 (2026-10-09)
- Dashboard baut sich anhand der aktiven Funktionen selbst auf (`info.features`): fehlende Heizung/Absorber/Sensoren werden ausgeblendet, benannte Relais erscheinen automatisch

### 0.3.2 (2026-10-09)
- Pool-Display im Adapter enthalten (`/violet/index.html`), Link in der Instanzübersicht

### 0.3.1 (2026-10-09)
- Status-Texte eindeutig (mit Code), Status als „nur Anzeige“ gekennzeichnet – geschaltet wird über `schalten`

### 0.3.0 (2026-10-09)
- Schalten EIN/AUS/AUTO für Pumpe (inkl. Drehzahl), Relais, Heizung, Solar, Licht, ECO, Nachspeisung, Rückspülung, PV-Überschuss, DMX
- Hauptschalter „Schalten erlauben“ und Schaltdauer in der Konfiguration
- Dosierung und Abdeckung bewusst nicht schaltbar

### 0.2.4 (2026-10-09)
- Analogeingänge mit fester Violet-Belegung beschriftet (ADC1 Filterdruck, ADC2 Pegelsonde, Impuls 1 Messwasser, Impuls 2 Förderleistung)
- Standard-Einheiten bar / cm/s / m³/h, wenn keine eingetragen ist

### 0.2.3 (2026-10-09)
- Analog- und Impulseingänge mit eigenem Namen, Einheit und Live-Wert (Reiter „Analog“); nur benannte Eingänge werden angelegt

### 0.2.2 (2026-10-09)
- Aktueller Messwert neben jedem Temperatursensor in der Konfiguration

### 0.2.1 (2026-10-09)
- Kompaktere Konfigurationsoberfläche (mehrspaltig, Hilfen als Tooltip)

### 0.2.0 (2026-10-09)
- Feste Datenpunkt-Struktur mit deutschen Namen und Einheiten
- Fragebogen in der Konfiguration statt Muster-Filter
- Namen für Temperatursensoren und Relais

### 0.1.0 (2026-10-09)
- Erste Testversion: alle Werte lesen

## Marken

Violet und das Violet-Logo sind Marken von PoolDigital. Verwendung mit freundlicher Genehmigung von PoolDigital.
Dieser Adapter ist ein unabhängiges Community-Projekt und kein offizielles Produkt von PoolDigital.

## License

MIT License – Copyright (c) 2026 Line Systems
