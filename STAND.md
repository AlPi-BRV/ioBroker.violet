# ioBroker.violet – Arbeitsstand (Übergabe für neue Gespräche)

Stand: 2026-10-12, Version 0.6.11 auf `dev` (wartet auf Alex' Test), `main` = 0.6.10 (auf npm, Release v0.6.10)
Repository: https://github.com/AlPi-BRV/ioBroker.violet
Autor: Alexander Pietz <alex@1-5worlds.de>

## Arbeitsweise
- Veröffentlichung (seit 0.6.8, funktioniert): Claude bringt die Version nach main → Alex legt auf GitHub ein Release an (releases/new, Tag vX.Y.Z auf main, Titel „Release vX.Y.Z“) → Workflow test-and-release veröffentlicht per Trusted Publishing auf npm (Claude kann keine Tags pushen; npm-Seite zeigt neue Version mit kurzer Verzögerung)
- Lieferung als `.tgz` (npm pack), Installation im ioBroker-Admin „Aus Datei“
- Entwicklung auf `dev`; nach `main` erst nach Alex' Test-OK
- Konfiguration wird erzeugt: `python3 tools/i18n_admin.py` (jsonConfig + 11 Sprachen)
- Versionswechsel: io-package.json (version + news in 11 Sprachen), package.json, README-Changelog

## Wissen
- Violet: *_LAST_ON/*_LAST_OFF sind Ortszeit als Unix-Epoch (nicht echtes UTC) → Laufzeit immer gegen die Violet-Uhr (Felder date + time) rechnen (0.6.8)

## Grundsätze (von Alex festgelegt)
- Adapter liest und schaltet, konfiguriert die Violet NIE (keine Sollwerte, Kalibrierung, Fördermengen, Zeitpläne)
- Dosierung nur lesbar; Abdeckung nicht schaltbar
- Pool-Display nur im Heimnetz, nicht ins Internet

## Aufbau
- main.js – Abfrage, Schalten, Meldungen, Webserver (Port 8099: /, /api/data, /api/set, /api/ack), virtuelle Relais, eingefrorene Wassertemperatur
- lib/datapoints.js – Datenpunkte nach Gruppen (use_*), lib/i18n.js – Namen de/en, lib/volume.js – umgewälzte Wassermenge
- www/index.html – Pool-Display (baut sich aus info.features auf; Demo: ?demo=1&lang=de)

## 0.6.10 (dev, 2026-10-12) – Wärmeleistung + Elektrolysezelle
- lib/heat.js: kW = (Rücklauf − Wasser Sensor 1) × Durchfluss × 1,163; Durchfluss = currentFlow() aus lib/volume.js (Stufe, bei Solar/Heizung kleinerer Wert); kWh heute per Trapez, Lücken > 10 min nicht hochgerechnet; Zustand info.heatState
- Config Reiter „Pumpe“: heat_enabled, heat_sensor_absorber (Std. 4), heat_sensor_return, heat_return_position heater|combined (Alex: combined, in Reihe → Heizung = Gesamt − Solar), heater_type exchanger|heatpump|electric (Name im Display)
- Datenpunkte solar./heizung.leistung (kW), .energie_heute (kWh); negative Leistung vorerst 0
- lib/cell.js: Violet liefert für DOS_2_ELO nur dieselben Felder wie Chlor (keine Zellenstunden/-leistung) → Adapter zählt DOS_2_ELO_RUNTIME auf; info.cellState {sec, rt, start}; Startwert ersetzt Zähler, sobald in der Config geändert
- Config Reiter „Funktionen“ (bei Elektrolyse): elo_output g/h, elo_lifetime h (Std. 5000, typ. 3000–6000), elo_warn %, elo_start_hours
- Datenpunkte dosierung.elektrolyse.zelle_stunden/_reststunden/_verschleiss/_warnung/erzeugt_heute, Taster zelle_gewechselt; Kanister-Datenpunkte für ELO entfallen
- Fix: Status 2 (durch Regel AUS) zählt bei der Wassermenge nicht mehr als laufend
- Pool-Display: „(4,2 kW · 11,6 kWh)“ hinter Laufzeit von Absorber/Heizung; ELO-Zeile „ELO: 52 g heute · Zelle 93 % ⚠“; Demo ?demo=1&elo=1&wp=1
- Offen: zweiter Wärmeerzeuger (Alex plant 2027 Wärmepumpe → Absorber + WP + Ölheizung; Erkennung klärt Alex mit PoolDigital), negative Solarleistung später, Frage an PoolDigital nach interner Zellenzählung (Firmware-Wunsch)

## 0.6.11 (dev, 2026-10-12) – Elektrolyse aus Violet-Werten
- Auskunft PoolDigital: bei DOS_2_ELO bedeuten die Kanister-Felder: DAILY_DOSING_AMOUNT_ML = g Chlor heute, TOTAL_CAN_AMOUNT_ML = Reststunden der Zelle, LAST_CAN_RESET = Zellenwechsel (in der Violet quittiert)
- Eigener Zähler aus 0.6.10 entfernt (lib/cell.js nur noch cellConfig + cellWear), ebenso elo_output, elo_start_hours, Taster zelle_gewechselt, info.cellState
- Datenpunkte: erzeugt_heute (g), zelle_reststunden (h), zellenwechsel; optional mit elo_lifetime (Std. 0, gleicher Wert wie in der Violet): zelle_verschleiss (%), zelle_warnung (elo_warn %)
- Nicht an Alex' Anlage prüfbar (Flüssigchlor) – Rückmeldung von Elektrolyse-Testern abwarten

## Offen
- Repository-PR (latest): Alex möchte damit WARTEN, bis sich Tester gemeldet haben und erste Bugs gefunden sind (2026-10-12). mcm1957 (ioBroker-Team) hat in Issue #4 positiv kommentiert und wartet auf den PR – kein Zeitdruck
- README: Badges (npm-Version, Downloads, Tests, Lizenz); Badges „installiert“/„stable“ (iobroker.live/badges/violet-installed.svg, -stable.svg) erst nach Aufnahme ins Repository ergänzen
- ioBroker-Bot (Issue #4, prüft main nach npm-Veröffentlichung) – in 0.6.9 umgesetzt: mocha raus, admin 7.6.20, news nur npm-Versionen, Deploy Node 24, Tests Node 22/24/26, testing-action-check@v2, README ohne „custom URL“, dependabot cooldown/ignore @types/node major/cron/limit 15, CHANGELOG_OLD.md, i18n Kurzformat. Nicht umgesetzt: S8913 Automerge für Dependabot. Issue #4 schließt der Bot selbst, wenn behoben
- package-lock.json nach Änderungen an package.json: einmaligen Workflow update-lock.yml (Git-Historie, Commit dfbaa70^) pushen – Lock IMMER komplett neu erzeugen (rm package-lock.json), sonst landet mocha verschachtelt und test:package scheitert mit Exit 127; [skip ci] verhindert ALLE Workflows, also nicht verwenden
- Checker-Lauf 0.6.5 (repochecker 5.22.10, GitHub Action) – in 0.6.6 behoben: E0029 Node>=22, E0036 testing 6.3, E1057 admin 7.6.17, E6012/E6013 README-Installation, E9006 .commitinfo, W0034 adapter-core 3.4.3, W5508 xs=12, S8901 dependabot
- 0.6.7: ESLint/Prettier (@iobroker/eslint-config, Code formatiert, lint 0 Fehler), package-lock.json, release-script (.releaseconfig.json), adapter-dev, @types/node, tsconfig, .vscode/settings.json, test-and-release.yml (Tests Linux/Windows/macOS, Node 22+24: alles grün; Deploy nur bei Tag v*)
  - npm install hängt in der Claude-Umgebung → Änderungen an Abhängigkeiten über einmaligen GitHub-Workflow (Commit zurück auf dev); Ergebnisse von Läufen per öffentlicher API: api.github.com/repos/AlPi-BRV/ioBroker.violet/commits/<sha>/check-runs
  - Noch offen (nur Hinweise): i18n-Kurzformat (S5601), CHANGELOG_OLD.md (W6020)
  - Branch-Schutz für main NICHT aktivieren (Claude pusht direkt nach main nach Test-OK)
- 2026-10-11: 0.6.7 auf npm veröffentlicht (von Hand auf berry5; Trick: npm login/publish --browser=false, Links auf dem PC öffnen; npm verlangt 2FA per Security Key/Windows Hello), bluefox als Owner eingeladen
- npm-Plan (Alex, 2026-10-11: Adapter reif für Tester, bleibt 0.x): 1) 2FA im npm-Konto alpi-brv 2) Erstveröffentlichung 0.6.7 von Hand auf berry5 (npm pack github:AlPi-BRV/ioBroker.violet#main, npm publish) 3) npm owner add bluefox iobroker.violet 4) Trusted Publisher auf npmjs.com (AlPi-BRV/ioBroker.violet, test-and-release.yml) 5) danach Releases per release-script + Tag 6) PR an ioBroker.repositories (latest) + Forum-Testthread
- Alex: E8001 About-Text + E8002 Topics im GitHub-Repo erledigt (2026-10-11, ggf. später ergänzen); E2000 npm-Veröffentlichung (npm-Konto alpi-brv vorhanden; 2FA aktivieren; Veröffentlichung später per GitHub Actions / Trusted Publishing statt Token)
- Status-Codes geklärt (offizielle Beschreibung, docs/getReadings-api.txt): 0 Auto aus, 1 Auto an, 2 Auto durch Regel AUS (z. B. Heizung bei Pumpe aus), 3 Auto durch Notfallregel AN, 4 Manuell an, 5 Aus durch Notfallregel, 6 Manuell aus; DMX nur 0/1/4/6; PVSURPLUS 0 aus, 1 an (Digitaleingang), 2 an (HTTP)
- Idee: DOS_x_USE (0/1) zeigt, welche Dosierung konfiguriert ist – könnte den Fragebogen vorbelegen
- Repository-Aufnahme (latest), Checkliste nach github.com/ioBroker/ioBroker.repositories:
  - erledigt: Name/Titel/Typ/Autoren/Lizenz, englische README mit Changelog + Herstellerlink, jsonConfig, info.connection, port, Rollen, adapter.setTimeout, Compact-Modus
  - auf dev, noch ungeprüft: devDependencies (@iobroker/testing, mocha), test/package.js + test/integration.js, Node >= 20
  - offen: GitHub Actions (test-and-release), ESLint (@iobroker/eslint-config), Release-Script (@alcalzone/release-script), Passwort verschlüsseln (encryptedNative/protectedNative), Topics im GitHub-Repo (Alex), npm-Veröffentlichung + bluefox als Owner (Alex' npm-Konto), später Forum-Testthread für stable
  - Adapter-Checker: adapter-check.iobroker.in ist VERALTET (alte Version, Codes 3-stellig, lädt repo.iobroker.live → E999). Stattdessen GitHub Action „Repository checker“ (.github/workflows/repochecker.yml, läuft bei Push auf dev/main, aktueller @iobroker/repochecker, Codes 4-stellig). Früher: auf main E031 (keine devDependencies) – auf dev behoben
  - Checker-Lauf auf dev (0.6.4): W132 (zu viele news) und W184 (common.main) in 0.6.5 behoben; E250 (nicht auf npm) und W401 (nicht in latest) erwartet; E999 = Checker konnte repo.iobroker.live/sources-dist-latest.json nicht laden (404, Serverproblem) und brach in M400 ab → spätere Prüfungen (README, Code, Workflows) noch nicht gelaufen, erneut prüfen
  - news in io-package.json: höchstens 7 Einträge behalten (vollständige Historie im README-Changelog)
  - Hinweis: npm-Registry ist aus der Claude-Umgebung zeitweise nicht erreichbar – Tests ggf. nur über GitHub Actions prüfbar
- Später: manuelle Dosierung, Abdeckung, VIS-Pool-Ansicht, Multihost-Slave, offizielles ioBroker-Repository
- Idee (Alex): Display-Schrift mit kleinerem Komma suchen
- Idee (Alex): Versionsnummer des Adapters in der Fußzeile des Pool-Displays
- Plan (2026-10-12): Anleitung als docs/-Ordner im Repo (kein GitHub-Wiki, damit versioniert mit dem Code; über io-package „docs“ im Admin verlinkbar), je de/en: 1) Installation/Erststart 2) Konfiguration Reiter für Reiter mit Screenshots 3) Datenpunkte als Tabelle 4) Pool-Display 5) Berechnungen (Wassermenge, Wärmeleistung, Zelle, eingefrorene Werte) 6) Schalten/Grundsätze 7) FAQ/Fehlersuche; README danach kurz + Links. Alex liefert Screenshots. Zeitpunkt: vor dem PR ins ioBroker-Repository
- 0.6.10 von Alex getestet (2026-10-12): Wärmeleistung funktioniert (Heizung 5 min ≈ 9 kW → 0,7 kWh), Display passt
- Idee: komplette Display-Konfigurationsseite (Felder frei zuordnen) – Grundstein seit 0.6.0 im Reiter „Display“
