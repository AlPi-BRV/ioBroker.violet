<img src="admin/violet.png" alt="Violet" width="96" align="right">

# ioBroker.violet

[![NPM version](https://img.shields.io/npm/v/iobroker.violet.svg)](https://www.npmjs.com/package/iobroker.violet)
[![Downloads](https://img.shields.io/npm/dm/iobroker.violet.svg)](https://www.npmjs.com/package/iobroker.violet)
[![Test and Release](https://github.com/AlPi-BRV/ioBroker.violet/actions/workflows/test-and-release.yml/badge.svg)](https://github.com/AlPi-BRV/ioBroker.violet/actions/workflows/test-and-release.yml)
[![License](https://img.shields.io/github/license/AlPi-BRV/ioBroker.violet)](LICENSE)

Adapter for the **Violet pool controller** by PoolDigital (incl. dosing module and relay extensions).

🇩🇪 **[Deutsche Anleitung](docs/de/README.md)**

## Features

- Reads all values of the Violet cyclically (`http://<IP>/getReadings?ALL`) and maps them to a fixed structure
  (`wasser`, `temperatur`, `pumpe`, `dosierung`, `relais`, `heizung`, `solar`, `rueckspuelung`, `analog`, …)
- **Questionnaire in the configuration**: only the areas you actually use are created as data points
- Own names for temperature sensors, relays, analog inputs and DMX scenes – with live values shown in the configuration, or taken over from the Violet with one click
- **Switching ON / OFF / AUTO** (main switch "Allow switching", disabled by default)
- **Pool display settings** (tab "Display"): optimal ranges for pH, redox and chlorine (values outside in red), assignment of the temperature rows and the large display
- **Virtual relays**: up to 8 ioBroker data points (true/false) of other devices, switchable in the relay view of the pool display
- **Water temperature in the pump piping**: optional frozen value while the pump is off (`temperatur.sensor1_pool`, marked with * in the display)
- **Circulated water volume of the day** in m³, calculated from the runtimes of the Violet and the delivery rate of the pump
- **Violet messages** (warnings, alarms, reminders) as data point `meldungen.aktiv` and as notice in the pool display
- **Pool display** in the style of the classic ProCon.IP display, served directly by the adapter
- Data point names, configuration and pool display in German and English; configuration in 11 languages

## Principles

- The adapter **reads and switches** – it **never configures** the Violet (no set points, calibration, dosing rates, schedules).
- **Dosing** (chlorine, pH, flocculant, electrolysis) is read-only.
- **Cover** is read-only (no documented switching command).

## Switching

With "Allow switching" every selected function gets a data point `schalten`:

| Value | Effect |
|---|---|
| `ON` | manual on |
| `OFF` | manual off |
| `AUTO` | back to the automatic mode of the Violet |

- Switchable: filter pump, heating, solar, light, ECO, refill, backwash, rinse, PV surplus (ON/OFF only), relays EXT1/EXT2, DMX scenes
- `pumpe.drehzahl_soll` (1 = ECO, 2 = Normal, 3 = Boost) – used when switching on, applied immediately while the pump runs manually
- "Duration for manual ON/OFF" in minutes, 0 = permanently
- The data point `schalten` always reflects the actual mode of the Violet
- Command: `GET /setFunctionManually?FUNCTION,ACTION,DURATION,VALUE` – every command and error is logged

### Status codes

| Code | Meaning |
|---|---|
| 0 | Auto – off |
| 1 | Auto – on |
| 2 | Auto – off, blocked by a control rule (e.g. heating while the pump is off) |
| 3 | Auto – on, forced by an emergency rule |
| 4 | Manual on |
| 5 | Off by an emergency rule |
| 6 | Manual off |

Source: interface description of PoolDigital (getReadings, revision 14.07.2024).

## Circulated water volume

In the tab "Pump" you enter the delivery rate of the pump in m³/h – per speed level for speed-controlled pumps.
If the absorber or the heating reduces the flow, enter the lower value there (empty = same as alone; if both run, the lower value applies).

- Data point `pumpe.umwaelzung_heute` (m³), in the pool display behind the runtime: `06h 07m (25.9 m³)`
- Basis: the runtimes per level counted by the Violet itself – an ioBroker restart does not distort the value
- The reduction by absorber / heating is counted by the adapter at each poll; resets at midnight
- Only a calculation – nothing is written to the Violet

## Heat output (absorber / heating)

In the tab "Pump" (section "Heat output") the adapter can calculate how much heat the absorber and the heating bring into the pool:

- Power (kW) = (return − water temperature sensor 1) × flow of the running pump level × 1.163 – the flow comes from the delivery rates above (with absorber / heating: the lower value)
- Sensors: absorber return (in the Violet usually sensor 4) and optionally a heating return sensor
- Position of the heating return sensor: "only behind the heating" or "behind absorber and heating (in series)". In series and both running: heating = total − absorber
- Data points `solar.leistung` / `heizung.leistung` (kW) and `solar.energie_heute` / `heizung.energie_heute` (kWh, resets at midnight); in the pool display in a line below the runtime: `4.2 kW · 11.6 kWh`
- Negative values (absorber cooling) are shown as 0. For long-term statistics use e.g. the adapter sourceanalytics
- "Type of heating" (oil/gas heat exchanger, heat pump, electric) sets the name in the pool display

### Heat pump COP

With "Heat pump" as type of heating, any ioBroker data point with the power consumption can be selected (e.g. a Shelly, unit W or kW).

- `heizung.strom_leistung` (kW) and `heizung.strom_heute` (kWh, standby included)
- `heizung.cop` = heat output ÷ power consumption, only while the heating runs (from 0.1 kW), otherwise empty
- `heizung.cop_heute` = heat energy today ÷ electricity today (from 0.05 kWh)
- In the pool display after the heat energy: the current COP while running, otherwise the COP of today
- The heat output is based on the delivery rate entered – the COP is a good estimate, not a calibrated measurement

## Take over from the Violet

In the tab "Connection" the adapter can read defaults from the Violet: names of temperature sensors, relays, analog/pulse inputs and DMX scenes, the delivery rates of the pump and which functions are installed (dosing, relay extensions, heating, solar).

- "Fill empty fields" only adds what is missing; "Replace all" also overwrites own names and delivery rates
- Functions are only switched on, never off; default names of the Violet ("EXT1-Relais 3", "Szene 9", "---") are skipped
- The values only appear in the form – they apply after "Save"
- User name and password of the Violet must be saved
- On the very first start of a new instance this happens automatically (empty fields only)
- Nothing is written to the Violet; only the values listed are evaluated, the answer of the Violet is not stored

## Electrolysis cell

For electrolysis the Violet uses the same fields as for liquid chlorine, but with a different meaning (information from PoolDigital): the daily amount is chlorine produced in **g**, the "canister" content is the **remaining hours of the cell**, the canister change is the **cell change**.

- Data points under `dosierung.elektrolyse`: `erzeugt_heute` (g), `zelle_reststunden` (h), `zellenwechsel` (date)
- Optional (tab "Functions", visible with electrolysis): enter the cell lifetime in hours – the same value as in the Violet. Then `zelle_verschleiss` (%) and `zelle_warnung` (from the warning threshold) are added
- The cell change is confirmed in the Violet like a canister change – nothing is written to the Violet
- Please report if your values look different – the author's pool uses liquid chlorine

## Violet messages

The adapter reads the messages of the Violet once per minute via `GET /getNotifications?ALL`
(fallback for older firmware: change of `last_error_id`).

| Data point | Meaning |
|---|---|
| `meldungen.aktiv` | `true` if there is a new, not yet acknowledged message – ideal for a signal icon in your visualization |
| `meldungen.anzahl` | number of new messages |
| `meldungen.text`, `.zeit`, `.typ` | latest message |
| `meldungen.liste` | the last 20 messages as JSON |
| `meldungen.quittieren` | button: acknowledge in ioBroker |

Acknowledging only affects ioBroker – messages that must be confirmed on the Violet itself still have to be confirmed there.
In the pool display a new message appears as a blinking yellow dot in the footer; a click opens the Violet in a new window and acknowledges the message in ioBroker.

## Pool display

Served by the adapter itself (built-in web server, no other adapters required):
`http://<ioBroker-IP>:8099/` (port and font in the configuration, tab "Connection").

- Builds itself: only existing functions, connected sensors and configured relays are shown
- Pump row with speed levels (active level in green) and PV indicator (only if PV surplus is used and active)
- Light row with DMX scenes (if used)
- Button "Relays" in the header: shows the switches of the relay extensions instead of the temperatures
- Switches only if "Allow switching" is enabled; the interface only accepts the released `schalten` data points (never dosing)
- Interface: `GET /api/data` (values), `GET /api/set?id=…&value=…` (switching), `GET /api/ack` (acknowledge messages)
- **Use only in your home network** – do not expose it to the internet (no login)
- Preview without adapter: open `www/index.html` locally with `?demo=1` (options: `&lang=en`, `&font=arial`, `&msg=1`, `&ohne=heizung,solar,pv,dmx,relais`)

## Installation

Install the adapter in the ioBroker admin under **Adapters**.

Restart the instance after an update.

## FAQ

**Why can't I switch the dosing?** – Deliberately: wrong dosing can be dangerous for bathers. Dosing is controlled by the Violet only.

**Why are there so few data points?** – Only the areas checked in the tab "Functions" are created. The complete raw data is always available in `info.rawJson`.

**The pool display shows "No data".** – Check that the instance is running and "Provide pool display" is enabled; test `http://<ioBroker-IP>:8099/api/data` in the browser.

## Changelog

<!--
    Placeholder for the next version (at the beginning of the line):
    ### **WORK IN PROGRESS**
-->
### 0.7.0 (2026-10-14)
- Take over from the Violet: names of temperature sensors, relays, analog/pulse inputs and DMX scenes, delivery rates of the pump and installed functions (tab "Connection", buttons "Fill empty fields" / "Replace all"; needs user name and password of the Violet). On the very first start of a new instance this happens automatically. Read only – nothing is written to the Violet, and only the needed values are evaluated
- Own names for DMX scenes (tab "Relays"), used for data points and in the pool display
- Pool display: a flow sensor in m³/h (e.g. pulse input 2) is shown in the pump row below the runtime instead of among the water values
- Heat pump: COP (now and today) and electricity of today from a power data point of your choice (e.g. Shelly); configuration in the tab "Pump" when the type of heating is "Heat pump"
- Pool display: heat output, heat energy and COP in a second line below the runtime (the row no longer shifts)
- Fix: the Violet reports the pump speeds with the normal status codes – a pump switched on manually (code 4) was treated as stopped: no flow for water volume and heat output, water values frozen

### 0.6.11 (2026-10-12)
- Electrolysis: chlorine produced today (g), remaining cell hours and last cell change are now taken directly from the Violet (the canister fields have this meaning for electrolysis – information from PoolDigital); the own operating hours counter, cell output, start value and button "cell replaced" are removed
- Wear in % and warning remain optional (cell lifetime in the configuration)

### 0.6.10 (2026-10-12)
- New: heat output of absorber and heating (kW) and heat energy of today (kWh), calculated from return temperatures and the configured pump flow; return sensor behind heating only or behind absorber and heating in series
- New: electrolysis cell – operating hours counter, remaining hours, wear in %, warning threshold, chlorine produced today (g), button "cell replaced"; canister values are no longer created for electrolysis
- New: type of heating (heat exchanger, heat pump, electric) as name in the pool display
- Fix: status 2 (auto, off by rule) no longer counts as running for the water volume reduction

### 0.6.9 (2026-10-11)
- Maintenance according to the ioBroker repository checker: admin >= 7.6.20, tests with Node.js 22/24/26, translation files in short format (admin/i18n/<lang>.json), dependabot settings

### 0.6.8 (2026-10-11)
- Fix: water values (and pool temperature) stayed frozen for about 2 hours after the pump started – the Violet writes `PUMP_LAST_ON` in local time; the runtime is now calculated against the Violet clock

### 0.6.7 (2026-10-11)
- Code formatted to the ioBroker standard (ESLint/Prettier), no functional changes
- Automatic tests on GitHub (test-and-release workflow), release script prepared

### 0.6.6 (2026-10-11)
- Repository checker: Node.js 22 required, dependencies updated (adapter-core 3.4.3, admin 7.6.17), installation notes adjusted, admin layout on small screens

### 0.6.5 (2026-10-11)
- Repository checker: old news entries removed from io-package.json (max. 7), obsolete `common.main` removed

### 0.6.4 (2026-10-11)
- Pool display: relay view keeps the size of the display (up to 3 relays per cell), lamps aligned
- Configuration: "Virtual relays (other ioBroker devices)"

### 0.6.3 (2026-10-11)
- Pool display: smaller "blocked" text so the switches no longer shift; smaller * in the large display

### 0.6.2 (2026-10-11)
- Water values (pH, redox, chlorine) frozen while the pump is off (option, data point `wasser.eingefroren`), no red marking without flow
- Pool display reloads itself after an adapter update

### 0.6.1 (2026-10-11)
- Status codes corrected according to the official interface description of PoolDigital: 2 = auto, blocked by rule (was shown as manual on), 5 = off by emergency rule

### 0.6.0 (2026-10-11)
- New tab "Display": optimal ranges (values outside in red), temperature rows and large display freely assignable
- Virtual relays (other devices, ON/OFF only) in the relay view of the pool display
- Water temperature (sensor 1) frozen while the pump is off – for sensors in the pump piping
- Electrodes selectable individually (pH, redox, chlorine); chlorine or electrolysis
- Flocculant (dosed today) shown in the pool display
- Author contact updated

Older changes: [CHANGELOG_OLD.md](CHANGELOG_OLD.md)

## Trademarks

Violet and the Violet logo are trademarks of **PoolDigital GmbH & Co. KG**, Kapellenstraße 10a, 86441 Zusmarshausen, Germany – [www.pooldigital.de](https://www.pooldigital.de).
Used with kind permission of PoolDigital. This adapter is an independent community project and not an official product of PoolDigital.

## License

MIT License

Copyright (c) 2026 Alexander Pietz <alex@1-5worlds.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
