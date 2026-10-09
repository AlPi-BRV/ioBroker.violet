'use strict';

/*
 * ioBroker.violet – Adapter für die Violet-Poolsteuerung (PoolDigital)
 * Feste Datenpunkt-Struktur, Auswahl über Fragebogen in der Konfiguration.
 * Ab 0.3.0: Schalten (EIN/AUS/AUTO) – nur mit Hauptschalter, nie Konfiguration, nie Dosierung.
 */

const utils = require('@iobroker/adapter-core');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { buildDefinitions, buildControls, modeFromStatus, tempName, CHANNELS } = require('./lib/datapoints');

class Violet extends utils.Adapter {
    constructor(options = {}) {
        super({ ...options, name: 'violet' });

        this.pollTimer = null;
        this.defs = [];
        this.prepared = new Set(); // in diesem Lauf bereits angelegte/aktualisierte Objekte
        this.failCount = 0;

        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.controls = [];
        this.cmdQueue = Promise.resolve(); // Schaltbefehle nacheinander senden
        this.cache = {}; // aktuelle Werte für das Dashboard
        this.server = null;
        this.lastData = null;
    }

    async onReady() {
        await this.setStateAsync('info.connection', false, true);

        const host = (this.config.host || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        if (!host) {
            this.log.error('Keine IP-Adresse der Violet eingetragen – bitte in der Instanz-Konfiguration ergänzen.');
            return;
        }

        this.baseUrl = `http://${host}`;
        this.interval = Math.max(5, Math.min(3600, Number(this.config.interval) || 10)) * 1000;
        this.timeout = Math.max(2, Math.min(60, Number(this.config.timeout) || 5)) * 1000;

        this.headers = {};
        if (this.config.username) {
            const token = Buffer.from(`${this.config.username}:${this.config.password || ''}`).toString('base64');
            this.headers.Authorization = `Basic ${token}`;
        }

        // fehlende Einstellungen (z. B. nach Update von 0.1.0) mit Standardwerten auffüllen
        const defaults = require('./io-package.json').native;
        for (const [k, v] of Object.entries(defaults)) {
            if (this.config[k] === undefined) this.config[k] = v;
        }

        this.defs = buildDefinitions(this.config);
        this.controls = this.config.allow_switching ? buildControls(this.config) : [];
        if (this.config.use_pump && this.config.use_pump_rpm && this.config.allow_switching) {
            this.controls.push({
                id: 'pumpe.drehzahl_soll',
                name: 'Filterpumpe – Drehzahl beim Einschalten',
                type: 'number',
                role: 'level',
                write: true,
                states: { 1: 'ECO', 2: 'Normal', 3: 'Boost' },
                min: 1,
                max: 3,
                speed: true,
            });
        }
        this.switchDuration = Math.max(0, Number(this.config.switch_duration) || 0) * 60;
        this.log.info(`${this.defs.length} mögliche Datenpunkte laut Auswahl in der Konfiguration`);
        this.log.info(
            this.controls.length
                ? `Schalten aus ioBroker ist ERLAUBT (${this.controls.length} schaltbare Datenpunkte)`
                : 'Schalten aus ioBroker ist deaktiviert – reiner Lesebetrieb',
        );

        await this.cleanup();

        for (const c of this.controls) await this.prepareObject(c);
        if (this.controls.some((c) => c.speed)) {
            const cur = await this.getStateAsync('pumpe.drehzahl_soll');
            if (!cur || cur.val === null) await this.setStateAsync('pumpe.drehzahl_soll', 2, true);
            this.cache['pumpe.drehzahl_soll'] = cur && cur.val !== null ? cur.val : 2;
        }
        if (this.controls.length) {
            this.subscribeStates('*.schalten');
            this.subscribeStates('pumpe.drehzahl_soll');
        }

        if (this.config.web_enabled) this.startWebServer();

        this.log.info(`Starte Abfrage von ${this.baseUrl} alle ${this.interval / 1000} s`);
        await this.poll();
    }

    /** Entfernt alles, was laut Konfiguration nicht mehr gebraucht wird (inkl. readings.* aus 0.1.0) */
    async cleanup() {
        const wanted = new Set([...this.defs, ...this.controls].map((d) => d.id));
        const wantedChannels = new Set();
        for (const id of wanted) {
            const parts = id.split('.');
            for (let i = 1; i < parts.length; i++) wantedChannels.add(parts.slice(0, i).join('.'));
        }

        const objs = await this.getAdapterObjectsAsync();
        let removed = 0;
        for (const fullId of Object.keys(objs)) {
            const id = fullId.substring(this.namespace.length + 1);
            if (!id || id === 'info' || id.startsWith('info.')) continue;
            const type = objs[fullId].type;
            if (type === 'state' && !wanted.has(id)) {
                await this.delObjectAsync(id);
                removed++;
            } else if ((type === 'channel' || type === 'folder' || type === 'device') && !wantedChannels.has(id)) {
                await this.delObjectAsync(id);
            }
        }
        if (removed) this.log.info(`${removed} nicht mehr benötigte Datenpunkte entfernt`);
    }

    async poll() {
        if (this.polling) return;
        this.polling = true;
        try {
            const res = await fetch(`${this.baseUrl}/getReadings?ALL`, {
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`Antwort ist kein gültiges JSON: ${text.substring(0, 120)}`);
            }

            this.lastData = data;
            await this.processData(data);
            await this.setStateChangedAsync('info.rawJson', text, true);
            await this.setStateAsync('info.lastUpdate', Date.now(), true);
            await this.setStateChangedAsync('info.connection', true, true);

            if (this.failCount > 0) {
                this.log.info('Verbindung zur Violet wiederhergestellt');
            }
            this.failCount = 0;
        } catch (err) {
            this.failCount++;
            const msg = err.name === 'TimeoutError' ? `Zeitüberschreitung nach ${this.timeout / 1000} s` : err.message;
            if (this.failCount === 1 || this.failCount % 30 === 0) {
                this.log.warn(`Abruf von ${this.baseUrl} fehlgeschlagen (${this.failCount}x): ${msg}`);
            }
            await this.setStateChangedAsync('info.connection', false, true);
        }

        this.polling = false;
        if (this.pollTimer) this.clearTimeout(this.pollTimer);
        this.pollTimer = this.setTimeout(() => this.poll(), this.interval);
    }

    async processData(data) {
        for (const def of this.defs) {
            if (def.when && !def.when(data)) continue;
            let value;
            try {
                value = def.get(data);
            } catch (e) {
                this.log.debug(`Wert für ${def.id} nicht lesbar: ${e.message}`);
                continue;
            }
            if (value === undefined) continue; // Schlüssel liefert diese Violet nicht

            if (!this.prepared.has(def.id)) {
                await this.prepareObject(def);
            }
            await this.setStateChangedAsync(def.id, value, true);
            this.cache[def.id] = value;
        }

        await this.updateFeatures(data);

        // Rückmeldung: aktuellen Modus in die Schalt-Datenpunkte spiegeln
        for (const c of this.controls) {
            if (!c.func) continue;
            const mode = modeFromStatus(data[c.statusKey], c.onOffOnly);
            if (mode) {
                await this.setStateChangedAsync(c.id, mode, true);
                this.cache[c.id] = mode;
            }
        }
    }

    /** Beschreibt für das Dashboard, was an dieser Anlage aktiv ist (Datenpunkt info.features) */
    async updateFeatures(data) {
        const c = this.config;
        const name = (k, fallback) => String(c[k] || '').trim() || fallback;
        const features = {
            switching: this.controls.length > 0,
            pumpRpm: !!(c.use_pump && c.use_pump_rpm),
            temps: [],
            relays: [],
            analog: this.defs.filter((d) => d.id.startsWith('analog.')).map((d) => ({ id: d.id, name: d.name, unit: d.unit || '' })),
        };
        if (c.use_temp) {
            for (let i = 1; i <= 12; i++) {
                const st = data[`onewire${i}_state`];
                if (st !== undefined && st !== 'NO_SENSOR_CONFIGURED') features.temps.push({ n: i, name: tempName(c, i) });
            }
        }
        for (const e of [1, 2]) {
            if (!c[`use_ext${e}`]) continue;
            for (let r = 1; r <= 8; r++) {
                const own = String(c[`ext${e}_${r}_name`] || '').trim();
                if (own) features.relays.push({ id: `relais.ext${e}_${r}`, name: own });
            }
        }
        this.features = features;
        await this.setStateChangedAsync('info.features', JSON.stringify(features), true);
    }

    /** Legt Kanäle und Datenpunkt an bzw. aktualisiert Name/Einheit (z. B. nach Umbenennen in der Config) */
    async prepareObject(def) {
        const parts = def.id.split('.');
        for (let i = 1; i < parts.length; i++) {
            const ch = parts.slice(0, i).join('.');
            if (this.prepared.has(ch)) continue;
            await this.extendObjectAsync(ch, {
                type: 'channel',
                common: { name: CHANNELS[ch] || this.channelName(ch) },
                native: {},
            });
            this.prepared.add(ch);
        }

        const common = {
            name: def.name,
            type: def.type,
            role: def.role,
            read: true,
            write: def.write === true,
        };
        if (def.min !== undefined) common.min = def.min;
        if (def.max !== undefined) common.max = def.max;
        if (def.unit) common.unit = def.unit;
        if (def.states) common.states = def.states;

        await this.extendObjectAsync(def.id, { type: 'state', common, native: {} });
        this.prepared.add(def.id);
    }

    /** Kanalname für Relais/Unterordner, die nicht in der festen Liste stehen */
    channelName(ch) {
        const m = ch.match(/^relais\.ext(\d)_(\d)$/);
        if (m) {
            const own = String(this.config[`ext${m[1]}_${m[2]}_name`] || '').trim();
            return own ? `${own} (EXT${m[1]}.${m[2]})` : `Relais EXT${m[1]}.${m[2]}`;
        }
        return ch.split('.').pop();
    }

    /** Anfragen aus der Konfigurationsseite (z. B. aktuelle Temperatur neben dem Namensfeld) */
    onMessage(obj) {
        if (!obj || !obj.callback) return;
        let reply = '';
        if (obj.command === 'getTemp') {
            const i = parseInt(obj.message && obj.message.sensor, 10);
            reply = this.describeSensor(i);
        } else if (obj.command === 'getAnalog') {
            reply = this.describeAnalog(obj.message && obj.message.key);
        }
        this.sendTo(obj.from, obj.command, reply, obj.callback);
    }

    describeSensor(i) {
        const d = this.lastData;
        if (!d) return '⏳ noch keine Daten – IP gespeichert und Instanz gestartet?';
        const state = d[`onewire${i}_state`];
        if (state === undefined) return '– nicht vorhanden';
        if (state === 'NO_SENSOR_CONFIGURED') return '– nicht angeschlossen';
        const fmt = (v) => {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '?';
        };
        let text = `🌡 ${fmt(d[`onewire${i}_value`])} °C   (heute ${fmt(d[`onewire${i}_value_min`])} – ${fmt(d[`onewire${i}_value_max`])})`;
        if (state !== 'OK') text += `   ⚠ ${state}`;
        return text;
    }

    describeAnalog(key) {
        const d = this.lastData;
        if (!d) return '⏳ noch keine Daten';
        if (!key || d[key] === undefined) return '– nicht vorhanden';
        const n = parseFloat(d[key]);
        if (!Number.isFinite(n)) return `aktuell: ${d[key]}`;
        return `aktuell: ${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })}`;
    }

    /** Schaltwunsch aus ioBroker (ack=false) */
    async onStateChange(fullId, state) {
        if (!state || state.ack) return;
        const id = fullId.substring(this.namespace.length + 1);
        const c = this.controls.find((x) => x.id === id);
        if (!c) return;

        if (c.speed) {
            const speed = parseInt(state.val, 10);
            if (![1, 2, 3].includes(speed)) {
                this.log.warn(`Ungültige Drehzahl ${state.val} – erlaubt sind 1 (ECO), 2 (Normal), 3 (Boost)`);
                return;
            }
            await this.setStateAsync(id, speed, true);
            this.cache[id] = speed;
            // läuft die Pumpe gerade manuell, neue Drehzahl sofort übernehmen
            const mode = modeFromStatus(this.lastData && this.lastData.PUMP);
            if (mode === 'ON') await this.queueCommand('PUMP', 'ON', this.switchDuration, speed, 'pumpe.schalten');
            return;
        }

        const action = String(state.val).trim().toUpperCase();
        const allowed = c.onOffOnly ? ['ON', 'OFF'] : ['ON', 'OFF', 'AUTO'];
        if (!allowed.includes(action)) {
            this.log.warn(`${c.name}: ungültiger Wert „${state.val}“ – erlaubt: ${allowed.join(', ')}`);
            return;
        }

        let value = 0;
        if (c.func === 'PUMP' && action === 'ON' && this.config.use_pump_rpm) {
            const s = await this.getStateAsync('pumpe.drehzahl_soll');
            value = s && [1, 2, 3].includes(s.val) ? s.val : 2;
        }
        const duration = action === 'AUTO' ? 0 : this.switchDuration;
        await this.queueCommand(c.func, action, duration, value, id);
    }

    queueCommand(func, action, duration, value, id) {
        this.cmdQueue = this.cmdQueue.then(() => this.sendCommand(func, action, duration, value, id)).catch(() => {});
        return this.cmdQueue;
    }

    async sendCommand(func, action, duration, value, id) {
        const cmd = `${func},${action},${duration},${value}`;
        this.log.info(`Schaltbefehl an Violet: ${cmd}`);
        try {
            const res = await fetch(`${this.baseUrl}/setFunctionManually?${cmd}`, {
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout),
            });
            const text = (await res.text()).trim();
            if (res.status === 401) throw new Error('Zugriff verweigert – Benutzername/Passwort in der Konfiguration prüfen');
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            const first = text.split(/\r?\n/)[0].trim().toUpperCase();
            if (first !== 'OK') throw new Error(`Violet meldet: ${text.replace(/\s+/g, ' ').substring(0, 200)}`);
            this.log.debug(`Antwort der Violet: ${text.replace(/\s+/g, ' ')}`);
            await this.setStateAsync(id, action, true);
        } catch (err) {
            const msg = err.name === 'TimeoutError' ? 'Zeitüberschreitung' : err.message;
            this.log.warn(`Schaltbefehl ${cmd} fehlgeschlagen: ${msg}`);
        }
        // Zustand kurz danach neu einlesen, damit Status/Rückmeldung stimmen
        if (this.pollTimer) this.clearTimeout(this.pollTimer);
        this.pollTimer = this.setTimeout(() => this.poll(), 1500);
    }

    /* ------------------------------------------------------------------
     * Eingebauter Webserver für das Pool-Dashboard
     *   GET /            → Dashboard (www/index.html)
     *   GET /api/data    → aktuelle Werte + Funktionen
     *   GET /api/set?id=…&value=…  → nur freigegebene Schalt-Datenpunkte
     * ------------------------------------------------------------------ */
    startWebServer() {
        const port = Number(this.config.port) || 8099;
        const page = path.join(__dirname, 'www', 'index.html');
        this.server = http.createServer(async (req, res) => {
            const url = new URL(req.url, 'http://x');
            const send = (code, body, type = 'application/json; charset=utf-8') => {
                res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
                res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
            };
            try {
                if (url.pathname === '/' || url.pathname === '/index.html') {
                    return send(200, fs.readFileSync(page), 'text/html; charset=utf-8');
                }
                if (url.pathname === '/api/data') {
                    return send(200, { ok: !!this.lastData, connected: this.failCount === 0 && !!this.lastData, features: this.features || null, values: this.cache, ts: Date.now() });
                }
                if (url.pathname === '/api/set') {
                    const id = url.searchParams.get('id') || '';
                    const value = url.searchParams.get('value');
                    const c = this.controls.find((x) => x.id === id);
                    if (!c) return send(403, { ok: false, error: 'Dieser Datenpunkt ist nicht schaltbar (Schalten erlauben?)' });
                    this.log.info(`Dashboard (${req.socket.remoteAddress}): ${id} = ${value}`);
                    await this.onStateChange(`${this.namespace}.${id}`, { val: c.speed ? Number(value) : value, ack: false });
                    return send(200, { ok: true });
                }
                send(404, { ok: false, error: 'nicht gefunden' });
            } catch (e) {
                send(500, { ok: false, error: e.message });
            }
        });
        this.server.on('error', (e) => this.log.error(`Dashboard-Server auf Port ${port} nicht gestartet: ${e.message}`));
        this.server.listen(port, () => this.log.info(`Pool-Dashboard erreichbar unter http://<ioBroker-IP>:${port}/`));
    }

    onUnload(callback) {
        try {
            if (this.server) this.server.close();
            if (this.pollTimer) this.clearTimeout(this.pollTimer);
            this.setState('info.connection', false, true);
        } finally {
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new Violet(options);
} else {
    new Violet();
}
