'use strict';

/*
 * Umgewälzte Wassermenge heute (m³) – nur Berechnung, die Violet wird nicht verändert.
 *
 * Grundlage: Laufzeiten der Violet je Drehzahlstufe (PUMP_RPM_x_RUNTIME, zählt die Violet selbst,
 * übersteht also Neustarts von ioBroker) × Fördermenge „allein“ aus der Konfiguration.
 * Abzug: Läuft der Absorber (Solar) oder die Heizung, fördert die Pumpe weniger. Der Adapter zählt
 * dafür bei jeder Abfrage den Laufzeitzuwachs der aktiven Stufe mit und zieht die Differenz ab.
 * Laufen Absorber und Heizung gleichzeitig, gilt der kleinere Wert (die stärkere Bremse).
 * Pumpe ohne Drehzahlstufen: PUMP_RUNTIME × Fördermenge.
 */

const ACTIVE_CODES = [1, 3, 4];

/** "05h 52m 06s" → Sekunden */
function runtimeSeconds(v) {
    if (v === undefined || v === null) return null;
    const m = String(v).match(/(\d+)\s*h\s*(\d+)\s*m(?:\s*(\d+)\s*s)?/i);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
}

const pos = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Fördermengen aus der Konfiguration; null = Berechnung nicht eingerichtet */
function flowConfig(cfg) {
    if (!cfg.use_pump) return null;
    const stages = cfg.use_pump_rpm ? ['1', '2', '3'] : ['p'];
    const f = {};
    let any = false;
    for (const s of stages) {
        const base = pos(cfg[`flow_${s}`]);
        if (base) any = true;
        f[s] = {
            base,
            solar: cfg.use_solar ? pos(cfg[`flow_${s}_solar`]) || base : base,
            heater: cfg.use_heater ? pos(cfg[`flow_${s}_heater`]) || base : base,
        };
    }
    return any ? { rpm: !!cfg.use_pump_rpm, stages: f } : null;
}

class VolumeCounter {
    /**
     * @param {object} flows Ergebnis von flowConfig()
     * @param {object} [saved] gespeicherter Zustand { day, red, rt }
     */
    constructor(flows, saved) {
        this.flows = flows;
        this.day = null;
        this.red = 0; // Abzug in m³
        this.rt = null; // letzte Laufzeiten je Stufe (s)
        if (saved && saved.day === VolumeCounter.today()) {
            this.day = saved.day;
            this.red = Number(saved.red) || 0;
            this.rt = saved.rt || null;
        }
    }

    static today(now = new Date()) {
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    state() {
        return { day: this.day, red: Math.round(this.red * 10000) / 10000, rt: this.rt };
    }

    /** @returns {number|undefined} m³ heute, undefined wenn die Violet keine Laufzeiten liefert */
    update(data, now = new Date()) {
        const keys = this.flows.rpm
            ? { 1: 'PUMP_RPM_1_RUNTIME', 2: 'PUMP_RPM_2_RUNTIME', 3: 'PUMP_RPM_3_RUNTIME' }
            : { p: 'PUMP_RUNTIME' };
        const rt = {};
        for (const [s, k] of Object.entries(keys)) {
            const sec = runtimeSeconds(data[k]);
            if (sec === null) return undefined;
            rt[s] = sec;
        }

        // neuer Tag: am Datum oder an zurückgesetzten Laufzeiten der Violet erkennbar
        const day = VolumeCounter.today(now);
        const reset = this.rt && Object.keys(rt).some((s) => rt[s] < (this.rt[s] || 0));
        if (day !== this.day || reset) {
            this.red = 0;
            if (day !== this.day) this.rt = null;
            this.day = day;
        }

        // Abzug für Absorber / Heizung auf den Laufzeitzuwachs seit der letzten Abfrage
        const solarOn = ACTIVE_CODES.includes(parseInt(data.SOLAR, 10));
        const heaterOn = ACTIVE_CODES.includes(parseInt(data.HEATER, 10));
        if (this.rt && (solarOn || heaterOn)) {
            for (const s of Object.keys(rt)) {
                const delta = rt[s] - (this.rt[s] || 0);
                if (delta <= 0) continue;
                const f = this.flows.stages[s];
                let eff = f.base;
                if (solarOn) eff = Math.min(eff, f.solar);
                if (heaterOn) eff = Math.min(eff, f.heater);
                this.red += (delta * (f.base - eff)) / 3600;
            }
        }
        this.rt = rt;

        let total = 0;
        for (const s of Object.keys(rt)) total += (rt[s] * this.flows.stages[s].base) / 3600;
        return Math.max(0, Math.round((total - this.red) * 10) / 10);
    }
}

module.exports = { VolumeCounter, flowConfig, runtimeSeconds };
