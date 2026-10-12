'use strict';

/*
 * Elektrolysezelle: Betriebsstunden, Verschleiß und erzeugtes Chlor – nur Berechnung im Adapter.
 * Die Violet liefert für DOS_2_ELO dieselben Felder wie für Flüssigchlor (Kanister, ml),
 * aber keine Zellenstunden und keine Zellenleistung. Deshalb:
 *  - Betriebsstunden: tägliche Laufzeit der Violet (DOS_2_ELO_RUNTIME) wird aufsummiert und gespeichert
 *  - Zellenleistung (g Chlor/h) und Lebensdauer (h) kommen aus der Konfiguration
 *  - „Zelle gewechselt“ setzt nur den Zähler im Adapter zurück, an der Violet ändert sich nichts
 *  - Startwert (bereits gelaufene Stunden) wird übernommen, sobald er in der Konfiguration geändert wird
 */

const { runtimeSeconds } = require('./volume');

const pos = v => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
};
const r1 = v => Math.round(v * 10) / 10;

/** Einstellungen der Zelle; null = Elektrolyse nicht ausgewählt */
function cellConfig(cfg) {
    if (!cfg.use_dos_elo) {
        return null;
    }
    return {
        output: pos(cfg.elo_output), // g Chlor je Stunde
        lifetime: pos(cfg.elo_lifetime), // Stunden
        warn: pos(cfg.elo_warn) || 90, // % der Lebensdauer
        start: pos(cfg.elo_start_hours), // Stunden
    };
}

class CellCounter {
    /**
     * @param {object} cc Ergebnis von cellConfig()
     * @param {object} [saved] gespeicherter Zustand { sec, rt, start }
     */
    constructor(cc, saved) {
        this.cc = cc;
        this.sec = saved && Number(saved.sec) >= 0 ? Number(saved.sec) : 0;
        this.rt = saved && Number.isFinite(Number(saved.rt)) && saved.rt !== null ? Number(saved.rt) : null;
        this.fresh = !saved;
        // geänderter Startwert in der Konfiguration ersetzt den Zähler
        const appliedStart = saved && saved.start !== undefined ? Number(saved.start) || 0 : 0;
        if (cc.start !== appliedStart) {
            this.sec = cc.start * 3600;
        }
        this.start = cc.start;
    }

    state() {
        return { sec: Math.round(this.sec), rt: this.rt, start: this.start };
    }

    /** Zelle gewechselt: Zähler auf 0 */
    reset() {
        this.sec = 0;
    }

    /**
     * @param {Record<string, any>} d getReadings-Daten
     * @returns {object|undefined} Werte für die Datenpunkte; undefined, wenn die Violet keine Laufzeit liefert
     */
    update(d) {
        const rt = runtimeSeconds(d.DOS_2_ELO_RUNTIME);
        if (rt === null) {
            return undefined;
        }
        if (this.rt === null) {
            // allererster Start: heutige Laufzeit mitzählen (außer der Startwert wurde gerade gesetzt)
            if (this.fresh && !this.cc.start) {
                this.sec += rt;
            }
        } else if (rt >= this.rt) {
            this.sec += rt - this.rt;
        } else {
            // Violet hat die Tageslaufzeit um Mitternacht zurückgesetzt
            this.sec += rt;
        }
        this.rt = rt;
        this.fresh = false;

        const hours = this.sec / 3600;
        const out = { hours: r1(hours) };
        if (this.cc.lifetime) {
            const wear = (hours / this.cc.lifetime) * 100;
            out.rest = r1(Math.max(0, this.cc.lifetime - hours));
            out.wear = r1(wear);
            out.warn = wear >= this.cc.warn;
        }
        if (this.cc.output) {
            out.gramsToday = Math.round((rt / 3600) * this.cc.output);
        }
        return out;
    }
}

module.exports = { CellCounter, cellConfig };
