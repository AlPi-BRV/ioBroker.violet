'use strict';

/*
 * ioBroker.violet – adapter for the Violet pool controller (PoolDigital)
 * - fixed data point structure, selection via questionnaire in the configuration
 * - switching ON/OFF/AUTO only with the main switch – never configuration, never dosing
 * - built-in web server for the pool display
 * - Violet messages (warnings, alarms, reminders) with acknowledgement in ioBroker
 */

const utils = require('@iobroker/adapter-core');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { buildDefinitions, buildControls, messageDefinitions, modeFromStatus, tempName, setLang, CHANNELS } = require('./lib/datapoints');
const { VolumeCounter, flowConfig } = require('./lib/volume');
const { names, pick } = require('./lib/i18n');

const NOTIFY_INTERVAL = 60 * 1000; // Meldungen höchstens einmal pro Minute abfragen

const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Läuft die Filterpumpe? Bei Drehzahlpumpen über die Stufen, sonst über den Status */
function pumpRunning(d) {
    if (d.PUMP_RPM_0 !== undefined) return [1, 2, 3].some((s) => parseInt(d[`PUMP_RPM_${s}`], 10) === 1);
    return [1, 3, 4].includes(parseInt(d.PUMP, 10));
}

class Violet extends utils.Adapter {
    constructor(options = {}) {
        super({ ...options, name: 'violet' });

        this.pollTimer = null;
        this.defs = [];
        this.msgDefs = [];
        this.controls = [];
        this.prepared = new Set(); // in diesem Lauf bereits angelegte/aktualisierte Objekte
        this.failCount = 0;
        this.cmdQueue = Promise.resolve(); // Schaltbefehle nacheinander senden
        this.cache = {}; // aktuelle Werte für das Pool-Display
        this.server = null;
        this.lastData = null;
        this.lang = 'de';
        this.msg = { supported: null, lastPoll: 0, acked: '', entries: [], active: false, count: 0 };

        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
    }

    t(de, en) {
        return this.lang === 'de' ? de : en;
    }

    async onReady() {
        await this.setStateAsync('info.connection', false, true);

        // Systemsprache für Statustexte, Display und Konfigurationshinweise
        try {
            const sys = await this.getForeignObjectAsync('system.config');
            this.lang = (sys && sys.common && sys.common.language) || 'de';
        } catch {
            this.lang = 'de';
        }
        setLang(this.lang);

        const host = (this.config.host || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        if (!host) {
            this.log.error('No IP address of the Violet configured – please enter it in the instance settings.');
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

        // fehlende Einstellungen (z. B. nach einem Update) mit Standardwerten auffüllen
        // ab 0.6.0: Wasserwerte je Elektrode statt eines Häkchens „Wasserwerte“
        if (this.config.use_ph === undefined && this.config.use_water !== undefined) {
            const w = !!this.config.use_water;
            this.config.use_ph = w;
            this.config.use_redox = w;
            this.config.use_chlor_el = w;
        }
        const defaults = require('./io-package.json').native;
        for (const [k, v] of Object.entries(defaults)) {
            if (this.config[k] === undefined) this.config[k] = v;
        }

        this.config.use_water = !!(this.config.use_ph || this.config.use_redox || this.config.use_chlor_el);
        this.defs = buildDefinitions(this.config);
        const flows = flowConfig(this.config);
        if (flows) {
            let saved = null;
            try {
                const st = await this.getStateAsync('info.volumeState');
                saved = st && st.val ? JSON.parse(st.val) : null;
            } catch {
                saved = null;
            }
            this.volume = new VolumeCounter(flows, saved);
        }
        this.msgDefs = messageDefinitions(this.config);
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
        this.log.info(`${this.defs.length} possible data points according to the configuration`);
        this.log.info(
            this.controls.length
                ? `Switching from ioBroker is ENABLED (${this.controls.length} switchable data points)`
                : 'Switching from ioBroker is disabled – read-only mode',
        );

        await this.cleanup();

        for (const c of this.controls) await this.prepareObject(c);
        for (const m of this.msgDefs) await this.prepareObject(m);
        if (this.controls.some((c) => c.speed)) {
            const cur = await this.getStateAsync('pumpe.drehzahl_soll');
            if (!cur || cur.val === null) await this.setStateAsync('pumpe.drehzahl_soll', 2, true);
            this.cache['pumpe.drehzahl_soll'] = cur && cur.val !== null ? cur.val : 2;
        }
        if (this.controls.length) {
            this.subscribeStates('*.schalten');
            this.subscribeStates('pumpe.drehzahl_soll');
        }
        if (this.msgDefs.length) {
            const acked = await this.getStateAsync('meldungen.quittiert');
            this.msg.acked = (acked && acked.val) || '';
            this.subscribeStates('meldungen.quittieren');
        }

        // Wassertemperatur bei Fühler in der Verrohrung: letzter plausibler Wert
        if (this.config.temp1_pump_only && this.config.use_temp) {
            const st = await this.getStateAsync('temperatur.sensor1_pool');
            this.t1 = { value: st && typeof st.val === 'number' ? st.val : null };
        }

        // virtuelle Relais: fremde Datenpunkte (true/false), nur EIN/AUS
        this.vrel = [];
        if (this.config.use_vrel) {
            for (let n = 1; n <= 8; n++) {
                const oid = String(this.config[`vrel${n}_oid`] || '').trim();
                if (!oid) continue;
                const name = String(this.config[`vrel${n}_name`] || '').trim() || `${this.t('Virtuelles Relais', 'Virtual relay')} ${n}`;
                this.vrel.push({ id: `vrelais.${n}`, n, name, oid });
                try {
                    const st = await this.getForeignStateAsync(oid);
                    this.cache[`vrelais.${n}`] = !!(st && st.val);
                } catch {
                    this.cache[`vrelais.${n}`] = false;
                }
                this.subscribeForeignStates(oid);
            }
            if (this.vrel.length) this.log.info(`${this.vrel.length} virtual relays configured`);
        }

        if (this.config.web_enabled) this.startWebServer();

        this.log.info(`Polling ${this.baseUrl} every ${this.interval / 1000} s`);
        await this.poll();
    }

    /** Entfernt alles, was laut Konfiguration nicht mehr gebraucht wird */
    async cleanup() {
        const wanted = new Set([...this.defs, ...this.controls, ...this.msgDefs].map((d) => d.id));
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
        if (removed) this.log.info(`${removed} data points no longer needed were removed`);
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
                throw new Error(`Response is not valid JSON: ${text.substring(0, 120)}`);
            }

            this.lastData = data;
            await this.processData(data);
            await this.setStateChangedAsync('info.rawJson', text, true);
            await this.setStateAsync('info.lastUpdate', Date.now(), true);
            await this.setStateChangedAsync('info.connection', true, true);

            if (this.failCount > 0) {
                this.log.info('Connection to the Violet restored');
            }
            this.failCount = 0;

            if (this.msgDefs.length) await this.pollMessages(data);
        } catch (err) {
            this.failCount++;
            const msg = err.name === 'TimeoutError' ? `timeout after ${this.timeout / 1000} s` : err.message;
            if (this.failCount === 1 || this.failCount % 30 === 0) {
                this.log.warn(`Request to ${this.baseUrl} failed (${this.failCount}x): ${msg}`);
            }
            await this.setStateChangedAsync('info.connection', false, true);
        }

        this.polling = false;
        if (this.pollTimer) this.clearTimeout(this.pollTimer);
        this.pollTimer = this.setTimeout(() => this.poll(), this.interval);
    }

    async processData(data) {
        if (this.t1) {
            // läuft die Pumpe seit mindestens 3 Minuten, ist der Messwert realistisch
            const raw = parseFloat(data.onewire1_value);
            const running = pumpRunning(data);
            const lastOn = parseFloat(data.PUMP_LAST_ON);
            const since = lastOn > 0 ? (lastOn > 1e12 ? lastOn : lastOn * 1000) : this.t1.since || Date.now();
            if (running && !this.t1.since) this.t1.since = since;
            if (!running) this.t1.since = 0;
            const settled = running && Date.now() - this.t1.since >= 3 * 60 * 1000;
            if (Number.isFinite(raw) && (settled || this.t1.value === null)) this.t1.value = Math.round(raw * 100) / 100;
            if (this.t1.value !== null) {
                data.__T1_POOL = this.t1.value;
                data.__T1_FROZEN = !settled;
            }
        }
        if (this.volume) {
            const v = this.volume.update(data);
            if (v !== undefined) {
                data.__VOLUME_TODAY = v;
                await this.setStateChangedAsync('info.volumeState', JSON.stringify(this.volume.state()), true);
            }
        }
        for (const def of this.defs) {
            if (def.when && !def.when(data)) continue;
            let value;
            try {
                value = def.get(data);
            } catch (e) {
                this.log.debug(`Value for ${def.id} not readable: ${e.message}`);
                continue;
            }
            if (value === undefined) continue; // Schlüssel liefert diese Violet nicht

            if (!this.prepared.has(def.id)) {
                await this.prepareObject(def);
            }
            await this.setStateChangedAsync(def.id, value, true);
            this.cache[def.id] = value;
        }

        // Rückmeldung: aktuellen Modus in die Schalt-Datenpunkte spiegeln
        for (const c of this.controls) {
            if (!c.func) continue;
            const mode = modeFromStatus(data[c.statusKey], c.onOffOnly);
            if (mode) {
                await this.setStateChangedAsync(c.id, mode, true);
                this.cache[c.id] = mode;
            }
        }

        await this.updateFeatures(data);
    }

    /* ------------------------------------------------------------------
     * Meldungen der Violet
     *   1. Wahl: GET /getNotifications?ALL  (Warnungen, Alarme, Erinnerungen)
     *   Rückfall: Änderung von last_error_id aus getReadings
     *   „Quittieren“ wirkt nur in ioBroker – die Violet selbst wird nicht verändert.
     * ------------------------------------------------------------------ */
    async pollMessages(data) {
        const now = Date.now();
        if (this.msg.lastPoll && now - this.msg.lastPoll < NOTIFY_INTERVAL) return;
        this.msg.lastPoll = now;

        let entries = null;
        if (this.msg.supported !== false) {
            try {
                const res = await fetch(`${this.baseUrl}/getNotifications?ALL`, {
                    headers: this.headers,
                    signal: AbortSignal.timeout(this.timeout),
                });
                if (res.ok) {
                    entries = this.parseNotifications(JSON.parse(await res.text()));
                    if (this.msg.supported === null) this.log.info('Violet messages are read via getNotifications');
                    this.msg.supported = true;
                } else if (res.status === 404 || res.status === 400) {
                    this.msg.supported = false;
                    this.log.info('getNotifications is not supported by this Violet – using last_error_id instead');
                }
            } catch (e) {
                this.log.debug(`getNotifications failed: ${e.message}`);
            }
        }
        if (!entries) {
            const id = data && data.last_error_id;
            entries = id !== undefined && id !== null && String(id) !== '0'
                ? [{ sig: `E${id}`, date: '', time: '', type: 'ERROR', text: this.t(`Fehlernummer ${id}`, `Error number ${id}`) }]
                : [];
        }
        this.msg.entries = entries;

        const newest = entries[0];
        if (!this.msg.acked && newest) {
            // erster Start: vorhandene (alte) Meldungen nicht als neu melden
            this.msg.acked = newest.sig;
            await this.setStateAsync('meldungen.quittiert', newest.sig, true);
        }
        let count = 0;
        if (newest && newest.sig !== this.msg.acked) {
            const idx = entries.findIndex((e) => e.sig === this.msg.acked);
            count = idx === -1 ? Math.min(entries.length, 99) : idx;
        }
        await this.writeMessageStates(count);
    }

    parseNotifications(json) {
        if (!json || typeof json !== 'object') return [];
        const list = Object.entries(json)
            .filter(([, v]) => v && typeof v === 'object' && (v.TEXT || v.text))
            .map(([k, v]) => {
                const date = String(v.DATE || v.date || '');
                const time = String(v.TIME || v.time || '');
                const text = String(v.TEXT || v.text || '').trim();
                const type = String(v.TYPE || v.type || '').toUpperCase();
                let ts = 0;
                const m = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/) || null;
                const iso = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : date;
                const parsed = Date.parse(`${iso}T${time || '00:00:00'}`);
                if (Number.isFinite(parsed)) ts = parsed;
                return { key: Number(k) || 0, ts, date, time, type, text, sig: `${date} ${time}|${text}` };
            });
        list.sort((a, b) => b.ts - a.ts || b.key - a.key);
        return list.slice(0, 50);
    }

    async writeMessageStates(count) {
        const newest = this.msg.entries[0];
        this.msg.active = count > 0;
        this.msg.count = count;
        const vals = {
            'meldungen.aktiv': count > 0,
            'meldungen.anzahl': count,
            'meldungen.text': newest ? newest.text : '',
            'meldungen.zeit': newest ? `${newest.date} ${newest.time}`.trim() : '',
            'meldungen.typ': newest ? newest.type : '',
            'meldungen.liste': JSON.stringify(this.msg.entries.slice(0, 20).map(({ date, time, type, text }) => ({ date, time, type, text }))),
        };
        for (const [id, v] of Object.entries(vals)) {
            await this.setStateChangedAsync(id, v, true);
            this.cache[id] = v;
        }
        if (this.features) {
            this.features.messages = this.messageInfo();
        }
    }

    messageInfo() {
        const n = this.msg.entries[0];
        return this.msgDefs.length
            ? { enabled: true, active: this.msg.active, count: this.msg.count, text: n ? n.text : '', time: n ? `${n.date} ${n.time}`.trim() : '', type: n ? n.type : '' }
            : { enabled: false };
    }

    async acknowledgeMessages(source) {
        const newest = this.msg.entries[0];
        if (!newest) return;
        this.msg.acked = newest.sig;
        await this.setStateAsync('meldungen.quittiert', newest.sig, true);
        await this.writeMessageStates(0);
        this.log.info(`Violet messages acknowledged in ioBroker (${source})`);
    }

    /** Beschreibt für das Pool-Display, was an dieser Anlage aktiv ist (Datenpunkt info.features) */
    async updateFeatures(data) {
        const c = this.config;
        const features = {
            lang: this.lang,
            font: c.display_font || 'verdana',
            violetUrl: this.baseUrl,
            switching: this.controls.length > 0,
            pumpRpm: !!(c.use_pump && c.use_pump_rpm),
            volume: !!this.volume,
            t1Pool: !!this.t1,
            ranges: {
                ph: [num(c.range_ph_min), num(c.range_ph_max)],
                redox: [num(c.range_redox_min), num(c.range_redox_max)],
                chlor: [num(c.range_cl_min), num(c.range_cl_max)],
            },
            rows: [1, 2, 3, 4].map((n) => ({ sensor: Number(c[`disp_row${n}`]) || 0, sub: Number(c[`disp_row${n}_sub`]) || 0 })).filter((r) => r.sensor || r.sub),
            hero: [Number(c.disp_hero_left) || 0, Number(c.disp_hero_right) || 0],
            vrelays: (this.vrel || []).map((v) => ({ id: v.id, name: v.name })),
            pv: !!c.use_pv,
            dmx: !!c.use_dmx,
            temps: [],
            relays: [],
            analog: this.defs
                .filter((d) => d.id.startsWith('analog.'))
                .map((d) => ({ id: d.id, name: pick(d.name, this.lang), unit: d.unit || '' })),
            messages: this.messageInfo(),
        };
        if (c.use_temp) {
            for (let i = 1; i <= 12; i++) {
                const st = data[`onewire${i}_state`];
                if (st !== undefined && st !== 'NO_SENSOR_CONFIGURED') features.temps.push({ n: i, name: pick(tempName(c, i), this.lang) });
            }
        }
        for (const e of [1, 2]) {
            if (!c[`use_ext${e}`]) continue;
            for (let r = 1; r <= 8; r++) {
                const own = String(c[`ext${e}_${r}_name`] || '').trim();
                features.relays.push({ id: `relais.ext${e}_${r}`, name: own || `EXT${e}.${r}`, named: !!own });
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
                common: { name: names(CHANNELS[ch] || this.channelName(ch)) },
                native: {},
            });
            this.prepared.add(ch);
        }

        const common = {
            name: names(def.name),
            type: def.type,
            role: def.role,
            read: def.read !== false,
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
        const d = ch.match(/^dmx\.szene(\d+)$/);
        if (d) return `DMX-Szene ${d[1]}`;
        return ch.split('.').pop();
    }

    /** Anfragen aus der Konfigurationsseite (z. B. aktuelle Temperatur neben dem Namensfeld) */
    onMessage(obj) {
        if (!obj || !obj.callback) return;
        let reply = '';
        if (obj.command === 'getTemp') {
            const i = parseInt(obj.message && obj.message.sensor, 10);
            reply = this.describeSensor(i);
        } else if (obj.command === 'getSensorList') {
            reply = this.sensorList();
        } else if (obj.command === 'getAnalog') {
            reply = this.describeAnalog(obj.message && obj.message.key);
        }
        this.sendTo(obj.from, obj.command, reply, obj.callback);
    }

    /** Auswahlliste der Temperaturfühler für den Reiter „Display“ (Name + aktueller Wert) */
    sensorList() {
        const d = this.lastData || {};
        const list = [{ label: this.t('– leer / automatisch –', '– empty / automatic –'), value: 0 }];
        for (let i = 1; i <= 12; i++) {
            const st = d[`onewire${i}_state`];
            if (this.lastData && (st === undefined || st === 'NO_SENSOR_CONFIGURED')) continue;
            const v = parseFloat(d[`onewire${i}_value`]);
            const val = Number.isFinite(v) ? `  (${v.toLocaleString(this.lang === 'de' ? 'de-DE' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} °C)` : '';
            list.push({ label: `${i}: ${pick(tempName(this.config, i), this.lang)}${val}`, value: i });
        }
        return list;
    }

    describeSensor(i) {
        const d = this.lastData;
        if (!d) return this.t('⏳ noch keine Daten – IP gespeichert und Instanz gestartet?', '⏳ no data yet – IP saved and instance started?');
        const state = d[`onewire${i}_state`];
        if (state === undefined) return this.t('– nicht vorhanden', '– not available');
        if (state === 'NO_SENSOR_CONFIGURED') return this.t('– nicht angeschlossen', '– not connected');
        const loc = this.lang === 'de' ? 'de-DE' : 'en-GB';
        const fmt = (v) => {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '?';
        };
        let text = `🌡 ${fmt(d[`onewire${i}_value`])} °C   (${this.t('heute', 'today')} ${fmt(d[`onewire${i}_value_min`])} – ${fmt(d[`onewire${i}_value_max`])})`;
        if (state !== 'OK') text += `   ⚠ ${state}`;
        return text;
    }

    describeAnalog(key) {
        const d = this.lastData;
        if (!d) return this.t('⏳ noch keine Daten', '⏳ no data yet');
        if (!key || d[key] === undefined) return this.t('– nicht vorhanden', '– not available');
        const n = parseFloat(d[key]);
        const now = this.t('aktuell', 'current');
        if (!Number.isFinite(n)) return `${now}: ${d[key]}`;
        return `${now}: ${n.toLocaleString(this.lang === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 2 })}`;
    }

    /** Schaltwunsch aus ioBroker (ack=false) */
    async onStateChange(fullId, state) {
        if (!state) return;
        if (!fullId.startsWith(`${this.namespace}.`)) {
            // Rückmeldung eines virtuellen Relais (fremder Datenpunkt)
            for (const v of this.vrel || []) if (v.oid === fullId) this.cache[v.id] = !!state.val;
            return;
        }
        if (state.ack) return;
        const id = fullId.substring(this.namespace.length + 1);

        if (id === 'meldungen.quittieren') {
            if (state.val) await this.acknowledgeMessages('data point');
            await this.setStateAsync(id, false, true);
            return;
        }

        const c = this.controls.find((x) => x.id === id);
        if (!c) return;

        if (c.speed) {
            const speed = parseInt(state.val, 10);
            if (![1, 2, 3].includes(speed)) {
                this.log.warn(`Invalid speed ${state.val} – allowed: 1 (ECO), 2 (Normal), 3 (Boost)`);
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
            this.log.warn(`${id}: invalid value "${state.val}" – allowed: ${allowed.join(', ')}`);
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
        this.log.info(`Switching command to Violet: ${cmd}`);
        try {
            const res = await fetch(`${this.baseUrl}/setFunctionManually?${cmd}`, {
                headers: this.headers,
                signal: AbortSignal.timeout(this.timeout),
            });
            const text = (await res.text()).trim();
            if (res.status === 401) throw new Error('access denied – check user name/password in the configuration');
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            const first = text.split(/\r?\n/)[0].trim().toUpperCase();
            if (first !== 'OK') throw new Error(`Violet answered: ${text.replace(/\s+/g, ' ').substring(0, 200)}`);
            this.log.debug(`Violet answer: ${text.replace(/\s+/g, ' ')}`);
            await this.setStateAsync(id, action, true);
        } catch (err) {
            const msg = err.name === 'TimeoutError' ? 'timeout' : err.message;
            this.log.warn(`Switching command ${cmd} failed: ${msg}`);
        }
        // Zustand kurz danach neu einlesen, damit Status/Rückmeldung stimmen
        if (this.pollTimer) this.clearTimeout(this.pollTimer);
        this.pollTimer = this.setTimeout(() => this.poll(), 1500);
    }

    /* ------------------------------------------------------------------
     * Eingebauter Webserver für das Pool-Display
     *   GET /            → Pool-Display (www/index.html)
     *   GET /api/data    → aktuelle Werte + Funktionen
     *   GET /api/set?id=…&value=…  → nur freigegebene Schalt-Datenpunkte
     *   GET /api/ack     → Meldungen in ioBroker quittieren
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
                    if (this.features) this.features.messages = this.messageInfo();
                    return send(200, { ok: !!this.lastData, connected: this.failCount === 0 && !!this.lastData, features: this.features || null, values: this.cache, ts: Date.now() });
                }
                if (url.pathname === '/api/ack') {
                    if (!this.msgDefs.length) return send(403, { ok: false, error: 'messages disabled' });
                    await this.acknowledgeMessages(`pool display ${req.socket.remoteAddress}`);
                    return send(200, { ok: true });
                }
                if (url.pathname === '/api/set') {
                    const id = url.searchParams.get('id') || '';
                    const value = url.searchParams.get('value');
                    const v = (this.vrel || []).find((x) => x.id === id);
                    if (v) {
                        if (!this.config.allow_switching) return send(403, { ok: false, error: 'switching disabled' });
                        const on = String(value).toUpperCase() === 'ON';
                        this.log.info(`Pool display (${req.socket.remoteAddress}): virtual relay ${v.name} (${v.oid}) = ${on}`);
                        await this.setForeignStateAsync(v.oid, on, false);
                        this.cache[v.id] = on;
                        return send(200, { ok: true });
                    }
                    const c = this.controls.find((x) => x.id === id);
                    if (!c) return send(403, { ok: false, error: 'This data point is not switchable (switching enabled?)' });
                    this.log.info(`Pool display (${req.socket.remoteAddress}): ${id} = ${value}`);
                    await this.onStateChange(`${this.namespace}.${id}`, { val: c.speed ? Number(value) : value, ack: false });
                    return send(200, { ok: true });
                }
                send(404, { ok: false, error: 'not found' });
            } catch (e) {
                send(500, { ok: false, error: e.message });
            }
        });
        this.server.on('error', (e) => this.log.error(`Pool display could not be started on port ${port}: ${e.message}`));
        this.server.listen(port, () => this.log.info(`Pool display available at http://<ioBroker-IP>:${port}/`));
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
