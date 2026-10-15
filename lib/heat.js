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
 *
 * Wärmepumpe (Art der Heizung = heatpump) mit Strommessung (fremder Datenpunkt, z. B. Shelly):
 *  - Stromaufnahme in kW und Strom heute in kWh (immer aufsummiert, auch Standby)
 *  - COP jetzt = Wärmeleistung Heizung ÷ Stromaufnahme (nur bei laufender Heizung)
 *  - COP heute = Wärmemenge Heizung heute ÷ Strom heute
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
    const oid = String(cfg.hp_power_oid || '').trim();
    const elec = !!(ret && cfg.heater_type === 'heatpump' && oid);
    return {
        flows,
        water: 1,
        elec,
        elecOid: elec ? oid : '',
        elecFactor: cfg.hp_power_unit === 'kW' ? 1 : 0.001,
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
const r1 = v => Math.round(v * 10) / 10;
const MIN_ELEC_KW = 0.1; // darunter läuft der Verdichter nicht → kein COP jetzt
const MIN_ELEC_KWH = 0.05; // darunter ist der COP heute nicht aussagekräftig

class HeatCounter {
    /**
     * @param {object} hc Ergebnis von heatConfig()
     * @param {object} [saved] gespeicherter Zustand { day, solar, heater, elec }
     */
    constructor(hc, saved) {
        this.hc = hc;
        this.day = null;
        this.kwh = { solar: 0, heater: 0, elec: 0 };
        this.last = null; // { ts, solar, heater, elec } letzte Leistung
        if (saved && saved.day === HeatCounter.today()) {
            this.day = saved.day;
            this.kwh.solar = Number(saved.solar) || 0;
            this.kwh.heater = Number(saved.heater) || 0;
            this.kwh.elec = Number(saved.elec) || 0;
        }
    }

    static today(now = new Date()) {
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    state() {
        const r3 = v => Math.round(v * 1000) / 1000;
        const st = { day: this.day, solar: r3(this.kwh.solar), heater: r3(this.kwh.heater) };
        if (this.hc.elec) {
            st.elec = r3(this.kwh.elec);
        }
        return st;
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
     * @param {number|null} [elecKw] Stromaufnahme der Wärmepumpe in kW (null = unbekannt)
     * @returns {Record<string, number|null|undefined>} Leistung (kW), Energie heute (kWh), COP
     */
    update(d, now = new Date(), elecKw = null) {
        const day = HeatCounter.today(now);
        if (day !== this.day) {
            this.day = day;
            this.kwh = { solar: 0, heater: 0, elec: 0 };
            this.last = null;
        }
        const p = this.power(d);
        if (this.hc.elec) {
            p.elec = typeof elecKw === 'number' && Number.isFinite(elecKw) ? Math.max(0, elecKw) : null;
        }
        const ts = now.getTime();
        if (this.last) {
            const h = (ts - this.last.ts) / 3600000;
            if (h > 0 && h <= MAX_GAP_H) {
                for (const k of ['solar', 'heater', 'elec']) {
                    // Mittel aus vorheriger und aktueller Leistung (Trapez)
                    const a = typeof this.last[k] === 'number' ? this.last[k] : null;
                    const b = typeof p[k] === 'number' ? p[k] : null;
                    if (a !== null || b !== null) {
                        this.kwh[k] += (((a ?? b) + (b ?? a)) / 2) * h;
                    }
                }
            }
        }
        this.last = { ts, solar: p.solar, heater: p.heater, elec: p.elec };

        const out = {};
        if (p.solar !== undefined) {
            out.solarKw = p.solar === null ? null : r2(p.solar);
            out.solarKwh = r2(this.kwh.solar);
        }
        if (p.heater !== undefined) {
            out.heaterKw = p.heater === null ? null : r2(p.heater);
            out.heaterKwh = r2(this.kwh.heater);
        }
        if (this.hc.elec) {
            out.elecKw = p.elec === null ? null : r2(p.elec);
            out.elecKwh = r2(this.kwh.elec);
            const running = isOn(d.HEATER) && typeof p.heater === 'number' && p.heater > 0;
            out.copNow = running && p.elec !== null && p.elec >= MIN_ELEC_KW ? r1(p.heater / p.elec) : null;
            out.copToday = this.kwh.elec >= MIN_ELEC_KWH ? r1(this.kwh.heater / this.kwh.elec) : null;
        }
        return out;
    }
}

module.exports = { HeatCounter, heatConfig, sensorTemp, SPECIFIC_HEAT };
