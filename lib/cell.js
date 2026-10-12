'use strict';

/*
 * Elektrolysezelle – Werte der Violet richtig deuten (Auskunft PoolDigital, 12.10.2026):
 * Für DOS_2_ELO liefert die Violet dieselben Felder wie für Flüssigchlor, aber mit anderer Bedeutung:
 *  - DOS_2_ELO_DAILY_DOSING_AMOUNT_ML  → Chlor heute in g (nicht ml)
 *  - DOS_2_ELO_TOTAL_CAN_AMOUNT_ML     → Reststunden der Zelle (nicht ml)
 *  - DOS_2_ELO_LAST_CAN_RESET          → letzter Zellenwechsel
 * Die Violet zählt die Zelle also selbst; der Adapter rechnet nur Verschleiß (%) und Warnung aus,
 * wenn in der Konfiguration die Lebensdauer eingetragen ist (gleicher Wert wie in der Violet).
 */

const pos = v => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Einstellungen der Zelle; null = Elektrolyse nicht ausgewählt
 *
 * @param {Record<string, any>} cfg Instanz-Konfiguration
 */
function cellConfig(cfg) {
    if (!cfg.use_dos_elo) {
        return null;
    }
    return {
        lifetime: pos(cfg.elo_lifetime), // Stunden; 0 = kein Verschleiß/keine Warnung
        warn: pos(cfg.elo_warn) || 90, // % der Lebensdauer
    };
}

/**
 * Verschleiß in % aus den Reststunden der Violet
 *
 * @param {object} cc Ergebnis von cellConfig()
 * @param {Record<string, any>} d getReadings-Daten
 * @returns {number|null|undefined} %, null = nicht lesbar, undefined = Feld fehlt
 */
function cellWear(cc, d) {
    const raw = d.DOS_2_ELO_TOTAL_CAN_AMOUNT_ML;
    if (raw === undefined || raw === null) {
        return undefined;
    }
    const rest = parseFloat(raw);
    if (!Number.isFinite(rest) || !cc.lifetime) {
        return null;
    }
    const wear = ((cc.lifetime - Math.max(0, rest)) / cc.lifetime) * 100;
    return Math.round(Math.max(0, wear) * 10) / 10;
}

module.exports = { cellConfig, cellWear };
