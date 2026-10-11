<img src="admin/violet.png" alt="Violet" width="96" align="right">

# ioBroker.violet

Adapter for the **Violet pool controller** by PoolDigital (incl. dosing module and relay extensions).

🇩🇪 [Deutsche Anleitung](docs/de/README.md)

## Features

- Reads all values of the Violet cyclically (`http://<IP>/getReadings?ALL`) and maps them to a fixed structure
  (`wasser`, `temperatur`, `pumpe`, `dosierung`, `relais`, `heizung`, `solar`, `rueckspuelung`, `analog`, …)
- **Questionnaire in the configuration**: only the areas you actually use are created as data points
- Own names for temperature sensors, relays and analog inputs – with live values shown in the configuration
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

Test versions are provided as a `.tgz` file: Adapters → "Install from custom URL" → "From file" → select the file → "Install".

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

### 0.5.3 (2026-10-10)
- Pool display: runtimes without "today" so the line no longer wraps

### 0.5.2 (2026-10-10)
- Circulated water volume of the day: new tab "Pump" (delivery rate per level, with absorber / heating), data point `pumpe.umwaelzung_heute`, shown in the pool display
- Pool display: humidity label and value stacked under filter pressure

### 0.5.1 (2026-10-10)
- Pool display: colons of temperatures and water values aligned, more space between label and value

### 0.5.0 (2026-10-10)
- Pool display: larger font and more line spacing, selectable font (Verdana, Arial, system font)
- Pool display: speed levels in the pump row (active level green), PV indicator, light row with DMX scenes
- Pool display: relay view via button in the header, footer shows "Violet firmware", logo removed
- Violet messages: data points `meldungen.*`, blinking notice in the pool display, click opens the Violet
- Data point names in German and English, status texts in the system language
- Configuration translated into 11 languages, English README, log messages in English
- DMX scenes now as channels with `status`/`aktiv`/`schalten`

### 0.4.2 (2026-10-09)
- "Pool dashboard" renamed to "pool display"; README updated

### 0.4.1 (2026-10-09)
- Official Violet logo (with permission of PoolDigital)

### 0.4.0 (2026-10-09)
- Built-in web server for the pool display (port 8099)

### 0.3.0 (2026-10-09)
- Switching ON/OFF/AUTO (main switch in the configuration; dosing and cover not switchable)

### 0.2.0 (2026-10-09)
- Fixed data point structure, questionnaire in the configuration, names for sensors and relays

### 0.1.0 (2026-10-09)
- First test version

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
