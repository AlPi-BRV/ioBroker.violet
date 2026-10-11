# Older changes

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
