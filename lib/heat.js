'use strict';

/*
 * Wärmeleistung von Absorber (Solar) und Heizung – nur Berechnung, die Violet wird nicht verändert.
 *
 * Leistung (kW) = (Rücklauf − Wassertemperatur) × Durchfluss (m³/h) × 1,163
 * Durchfluss: Fördermenge der laufenden Pumpenstufe aus der Konfiguration (wie die Wassermenge),
 * bei laufendem Absorber bzw. laufender Heizung der kleinere eingetragene Wert.
 * Wassertemperatur: Sensor 1 der Violet (fest belegt).
 *
 * Lage des Heizungs-Rücklauffühlers:
 *  - "heater":   misst nur hinter der Heizung → Heizung = (Rücklauf − Wasser) × …
 *  - "combined": misst hinter Absorber UND Heizung (in Reihe: erst Absorber, dann Heizung)
 *                → laufen beide, ist Heizung = Gesamt − Solar
 * Negative Werte (Absorber kühlt) werden vorerst auf 0 begrenzt.
 * Energie heute (kWh): Leistung über die Zeit aufsummiert, um Mitternacht zurückgesetzt.
 */

const { currentFlow, ACTIVE_CODES } = require('./volume');

const SPECIFIC_HEAT = 1.163; // kWh je m³ Wasser und Kelvin
const MAX_GAP_H = 10 / 60; // längere Lücken (Adapter aus, Violet nicht erreichbar) werden nicht hochgerechnet

const isOn = v => ACTIVE_CODES.includes(parseInt(v, 10));

/** Temperatur eines 1-Wire-Sensors oder null */
function sensorTemp(d, i) {
    if (!i) {
        return null;
    }
    const st = d[`onewire${i}_state`];
    if (st === undefined || st === 'NO_SENSOR_CONFIGURED') {
        return null;
    }
    const n = parseFloat(d[`onewire${i}_value`]);
    return Number.isFinite(n) ? n : null;
}

/**
 * Einstellungen der Wärmeberechnung; null = nicht eingerichtet
 *
 * @param {Record<string, any>} cfg Instanz-Konfiguration
 * @param {object|null} flows Ergebnis von flowConfig()
 */
function heatConfig(cfg, flows) {
    if (!cfg.heat_enabled || !flows || !cfg.use_temp) {
        return null;
    }
    const absorber = cfg.use_solar ? Number(cfg.heat_sensor_absorber) || 0 : 0;
    const ret = cfg.use_heater ? Number(cfg.heat_sensor_return) || 0 : 0;
    if (!absorber && !ret) {
        return null;
    }
    return {
        flows,
        water: 1,
        absorber,
        ret,
        combined: !!(cfg.use_solar && cfg.heat_return_position === 'combined'),
        solar: !!absorber,
        heater: !!ret,
    };
}

const kw = (tRet, tWater, q) => {
    if (tRet === null || tWater === null) {
        return null;
    }
    return Math.max(0, (tRet - tWater) * q * SPECIFIC_HEAT);
};
const r2 = v => Math.round(v * 100) / 100;

class HeatCounter {
    /**
     * @param {object} hc Ergebnis von heatConfig()
     * @param {object} [saved] gespeicherter Zustand { day, solar, heater, ts }
     */
    constructor(hc, saved) {
        this.hc = hc;
        this.day = null;
        this.kwh = { solar: 0, heater: 0 };
        this.last = null; // { ts, solar, heater } letzte Leistung
        if (saved && saved.day === HeatCounter.today()) {
            this.day = saved.day;
            this.kwh.solar = Number(saved.solar) || 0;
            this.kwh.heater = Number(saved.heater) || 0;
        }
    }

    static today(now = new Date()) {
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    state() {
        const r3 = v => Math.round(v * 1000) / 1000;
        return { day: this.day, solar: r3(this.kwh.solar), heater: r3(this.kwh.heater) };
    }

    /**
     * Leistung jetzt in kW; undefined = nicht eingerichtet, null = Fühler fehlt
     *
     * @param {Record<string, any>} d getReadings-Daten
     */
    power(d) {
        const hc = this.hc;
        const solarOn = isOn(d.SOLAR);
        const heaterOn = isOn(d.HEATER);
        const q = currentFlow(hc.flows, d);
        const tw = sensorTemp(d, hc.water);
        const res = { solar: undefined, heater: undefined };

        if (hc.solar) {
            res.solar = solarOn && q > 0 ? kw(sensorTemp(d, hc.absorber), tw, q) : 0;
        }
        if (hc.heater) {
            if (!heaterOn || q <= 0) {
                res.heater = 0;
            } else {
                const total = kw(sensorTemp(d, hc.ret), tw, q);
                if (total === null) {
                    res.heater = null;
                } else if (hc.combined && solarOn) {
                    // Rücklauf misst Absorber + Heizung: Solaranteil abziehen
                    res.heater = typeof res.solar === 'number' ? Math.max(0, total - res.solar) : null;
                } else {
                    res.heater = total;
                }
            }
        }
        return res;
    }

    /**
     * @param {Record<string, any>} d getReadings-Daten
     * @param {Date} [now] Zeitpunkt der Abfrage
     * @returns {{solarKw?: number|null, heaterKw?: number|null, solarKwh?: number, heaterKwh?: number}} Leistung (kW) und Energie heute (kWh)
     */
    update(d, now = new Date()) {
        const day = HeatCounter.today(now);
        if (day !== this.day) {
            this.day = day;
            this.kwh = { solar: 0, heater: 0 };
            this.last = null;
        }
        const p = this.power(d);
        const ts = now.getTime();
        if (this.last) {
            const h = (ts - this.last.ts) / 3600000;
            if (h > 0 && h <= MAX_GAP_H) {
                for (const k of ['solar', 'heater']) {
                    // Mittel aus vorheriger und aktueller Leistung (Trapez)
                    const a = typeof this.last[k] === 'number' ? this.last[k] : null;
                    const b = typeof p[k] === 'number' ? p[k] : null;
                    if (a !== null || b !== null) {
                        this.kwh[k] += (((a ?? b) + (b ?? a)) / 2) * h;
                    }
                }
            }
        }
        this.last = { ts, solar: p.solar, heater: p.heater };

        const out = {};
        if (p.solar !== undefined) {
            out.solarKw = p.solar === null ? null : r2(p.solar);
            out.solarKwh = r2(this.kwh.solar);
        }
        if (p.heater !== undefined) {
            out.heaterKw = p.heater === null ? null : r2(p.heater);
            out.heaterKwh = r2(this.kwh.heater);
        }
        return out;
    }
}

module.exports = { HeatCounter, heatConfig, sensorTemp, SPECIFIC_HEAT };
