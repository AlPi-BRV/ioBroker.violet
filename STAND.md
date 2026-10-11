# ioBroker.violet – Arbeitsstand (Übergabe für neue Gespräche)

Stand: 2026-10-11, Version 0.6.9 auf Zweig `dev` (zum Testen), `main` = 0.6.8 (öffentlich, npm über GitHub-Tag)
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

## Offen
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
- Idee: komplette Display-Konfigurationsseite (Felder frei zuordnen) – Grundstein seit 0.6.0 im Reiter „Display“
