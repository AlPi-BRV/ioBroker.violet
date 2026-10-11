# ioBroker.violet – Arbeitsstand (Übergabe für neue Gespräche)

Stand: 2026-10-11, Version 0.6.3 auf Zweig `dev` (zum Testen), `main` = 0.5.3 (öffentlich)
Repository: https://github.com/AlPi-BRV/ioBroker.violet
Autor: Alexander Pietz <alex@1-5worlds.de>

## Arbeitsweise
- Lieferung als `.tgz` (npm pack), Installation im ioBroker-Admin „Aus Datei“
- Entwicklung auf `dev`; nach `main` erst nach Alex' Test-OK
- Konfiguration wird erzeugt: `python3 tools/i18n_admin.py` (jsonConfig + 11 Sprachen)
- Versionswechsel: io-package.json (version + news in 11 Sprachen), package.json, README-Changelog

## Grundsätze (von Alex festgelegt)
- Adapter liest und schaltet, konfiguriert die Violet NIE (keine Sollwerte, Kalibrierung, Fördermengen, Zeitpläne)
- Dosierung nur lesbar; Abdeckung nicht schaltbar
- Pool-Display nur im Heimnetz, nicht ins Internet

## Aufbau
- main.js – Abfrage, Schalten, Meldungen, Webserver (Port 8099: /, /api/data, /api/set, /api/ack), virtuelle Relais, eingefrorene Wassertemperatur
- lib/datapoints.js – Datenpunkte nach Gruppen (use_*), lib/i18n.js – Namen de/en, lib/volume.js – umgewälzte Wassermenge
- www/index.html – Pool-Display (baut sich aus info.features auf; Demo: ?demo=1&lang=de)

## Offen
- Status-Codes geklärt (offizielle Beschreibung, docs/getReadings-api.txt): 0 Auto aus, 1 Auto an, 2 Auto durch Regel AUS (z. B. Heizung bei Pumpe aus), 3 Auto durch Notfallregel AN, 4 Manuell an, 5 Aus durch Notfallregel, 6 Manuell aus; DMX nur 0/1/4/6; PVSURPLUS 0 aus, 1 an (Digitaleingang), 2 an (HTTP)
- Idee: DOS_x_USE (0/1) zeigt, welche Dosierung konfiguriert ist – könnte den Fragebogen vorbelegen
- Später: manuelle Dosierung, Abdeckung, VIS-Pool-Ansicht, Multihost-Slave, offizielles ioBroker-Repository
- Idee: komplette Display-Konfigurationsseite (Felder frei zuordnen) – Grundstein seit 0.6.0 im Reiter „Display“
