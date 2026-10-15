'use strict';

/*
 * Vorgaben aus der Konfiguration der Violet übernehmen – nur LESEN.
 *
 * Die Antwort der Violet enthält auch Zugangsdaten (WLAN, E-Mail, Tokens …). Deshalb:
 *  - es werden ausschließlich die unten genannten Schlüssel ausgewertet,
 *  - die Antwort wird nie gespeichert, geloggt oder weitergegeben,
 *  - in die Violet wird nichts geschrieben.
 *
 * Übernommen werden: Namen der Temperaturfühler, Relais EXT1/EXT2, Analog-/Impulseingänge und
 * DMX-Szenen, Fördermengen der Pumpe, Lebensdauer der Elektrolysezelle und (nur einschalten)
 * die verbauten Funktionen.
 */

/** Standardnamen der Violet = „kein eigener Name“ */
const PLACEHOLDER = [
    /^-+$/,
    /^EXT\d-Relais \d$/i,
    /^EXT\d-Relay \d$/i,
    /^Eingang \d+$/i,
    /^Input \d+$/i,
    /^Szene \d+$/i,
    /^Scene \d+$/i,
];

const MAX_NAME = 40;

/** Name aus der Violet oder null (leer, Platzhalter, unbrauchbar) */
function cleanName(v) {
    if (typeof v !== 'string') {
        return null;
    }
    const s = v.replace(/[\u0000-\u001f]/g, '').trim();
    if (!s || PLACEHOLDER.some(r => r.test(s))) {
        return null;
    }
    return s.slice(0, MAX_NAME);
}

/** Einheit aus der Violet, vereinheitlicht („Bar“ → „bar“, „% rF“ → „%rF“) oder null */
function cleanUnit(v) {
    if (typeof v !== 'string') {
        return null;
    }
    let u = v.replace(/[\u0000-\u001f]/g, '').trim();
    if (!u || u === '-') {
        return null;
    }
    u = u.replace(/^%\s+/, '%');
    if (/^bar$/i.test(u)) {
        u = 'bar';
    }
    return u.slice(0, 12);
}

/** positive Zahl oder null */
function positive(v) {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
}

const on = v => String(v ?? '').trim() === '1';

/**
 * Vorschläge aus der Violet-Antwort. Liest nur bekannte Schlüssel.
 *
 * @param {Record<string, any>} raw Antwort der Violet
 * @returns {{values: Record<string, any>, flags: Record<string, boolean>}} Namen/Zahlen und verbaute Funktionen
 */
function mapVioletConfig(raw) {
    const values = {};
    const flags = {};
    if (!raw || typeof raw !== 'object') {
        return { values, flags };
    }
    const setName = (key, src) => {
        const n = cleanName(raw[src]);
        if (n) {
            values[key] = n;
        }
    };

    for (let i = 1; i <= 12; i++) {
        setName(`temp${i}_name`, `NAMES_onewire${i}`);
    }
    for (const e of [1, 2]) {
        for (let r = 1; r <= 8; r++) {
            setName(`ext${e}_${r}_name`, `NAMES_EXT${e}_${r}`);
        }
    }
    // Analog-/Impulseingänge: im Adapter bedeutet „hat einen Namen“ = „wird benutzt“.
    // Deshalb nur Eingänge übernehmen, die in der Violet eingeschaltet sind (…_use = 1), mit Einheit.
    const input = (key, nameSrc, useSrc, unitSrc) => {
        if (!on(raw[useSrc])) {
            return;
        }
        setName(`${key}_name`, nameSrc);
        const u = cleanUnit(raw[unitSrc]);
        if (values[`${key}_name`] && u) {
            values[`${key}_unit`] = u;
        }
    };
    for (let i = 1; i <= 6; i++) {
        input(`adc${i}`, `NAMES_adc${i}`, `ANALOG_adc${i}_use`, `ANALOG_adc${i}_units`);
    }
    input('imp1', 'NAMES_impulscount1', 'IMPULS_input1_use', 'IMPULS_input1_units');
    input('imp2', 'NAMES_impulscount2', 'IMPULS_input2_use', 'IMPULS_input2_units');
    for (let s = 1; s <= 12; s++) {
        setName(`dmx${s}_name`, `LIGHT_pattern${s}_name`);
    }

    // Fördermengen (m³/h): Stufen 1–3, Pumpe ohne Stufen
    for (const s of ['1', '2', '3']) {
        const q = positive(raw[`PUMP_capacity_${s}`]);
        if (q) {
            values[`flow_${s}`] = q;
        }
    }
    const qp = positive(raw.PUMP_capacity_0);
    if (qp && !values.flow_1 && !values.flow_2 && !values.flow_3) {
        values.flow_p = qp; // nur bei Pumpe ohne Drehzahlstufen
    }

    // Elektrolysezelle: Lebensdauer nur, wenn Elektrolyse genutzt wird
    if (on(raw.DOSAGE_electrolysis_use)) {
        const h = positive(raw.DOSAGE_electrolysis_cell_lifetime);
        if (h) {
            values.elo_lifetime = Math.round(h);
        }
    }

    // Verbaute Funktionen (werden nur eingeschaltet, nie ausgeschaltet)
    const flag = (key, src) => {
        if (raw[src] !== undefined) {
            flags[key] = on(raw[src]);
        }
    };
    flag('use_dos_cl', 'DOSAGE_chlorine_use');
    flag('use_dos_elo', 'DOSAGE_electrolysis_use');
    flag('use_dos_phm', 'DOSAGE_phminus_use');
    flag('use_dos_php', 'DOSAGE_phplus_use');
    flag('use_dos_floc', 'DOSAGE_floc_use');
    flag('use_chlor_el', 'DOSAGE_cl_electrode_use');
    flag('use_ext1', 'EXTENSION_1_use');
    flag('use_ext2', 'EXTENSION_2_use');
    flag('use_heater', 'HEATER_control_use');
    flag('use_solar', 'SOLAR_control_use');
    return { values, flags };
}

/**
 * Änderungen für die Instanz-Konfiguration
 *
 * @param {Record<string, any>} cfg aktuelle Konfiguration
 * @param {{values: Record<string, any>, flags: Record<string, boolean>}} found Ergebnis von mapVioletConfig()
 * @param {{overwrite?: boolean, flags?: boolean}} [opt] overwrite: auch ausgefüllte; flags: Funktionen an
 * @returns {Record<string, any>} nur die Felder, die sich ändern
 */
function configChanges(cfg, found, opt = {}) {
    const out = {};
    for (const [k, v] of Object.entries(found.values)) {
        const cur = cfg[k];
        const empty = cur === undefined || cur === null || String(cur).trim() === '' || cur === 0;
        if ((empty || opt.overwrite) && cur !== v) {
            out[k] = v;
        }
    }
    if (opt.flags) {
        for (const [k, v] of Object.entries(found.flags)) {
            if (v && cfg[k] !== true) {
                out[k] = true;
            }
        }
        // Chlor und Elektrolyse schließen sich aus
        if (out.use_dos_cl && (cfg.use_dos_elo || out.use_dos_elo)) {
            delete out.use_dos_cl;
        }
        if (out.use_dos_elo && cfg.use_dos_cl) {
            delete out.use_dos_elo;
        }
    }
    return out;
}

/**
 * Konfiguration bei der Violet abfragen (nur GET, Login erforderlich)
 *
 * @param {string} baseUrl z. B. http://10.10.3.50
 * @param {Record<string, string>} headers mit Authorization
 * @param {number} timeout Millisekunden
 * @returns {Promise<Record<string, any>>} Antwort der Violet – nur an mapVioletConfig() weitergeben
 */
async function fetchVioletConfig(baseUrl, headers, timeout) {
    const res = await fetch(`${baseUrl}/getConfig?ALL`, { headers, signal: AbortSignal.timeout(timeout) });
    if (res.status === 401 || res.status === 403) {
        throw new Error('access denied – check user name/password in the configuration');
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
}

module.exports = { mapVioletConfig, configChanges, fetchVioletConfig, cleanName };
