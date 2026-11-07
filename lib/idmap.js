'use strict';

/*
 * Object IDs up to 0.7.x used German words (e.g. wasser.chlor). Since 0.8.0 all IDs are English.
 * This table maps every old ID segment to its new name ("#" stands for a number) and is used to
 * migrate existing objects on the first start after the update (main.js → migrateIds).
 */
const SEGMENTS = {
    abdeckung: 'cover',
    aktiv: 'active',
    anzahl: 'count',
    chlor: 'chlorine',
    chlor_max: 'chlorine_max',
    chlor_min: 'chlorine_min',
    cop_heute: 'cop_today',
    cpu_temperatur: 'cpu_temperature',
    diagnose: 'diagnostics',
    dosiermodul_fehler: 'dosing_module_errors',
    dosiermodul_temperatur: 'dosing_module_temperature',
    dosierung: 'dosing',
    drehzahl_soll: 'speed_setpoint',
    eingaenge: 'inputs',
    'eingang#': 'input#',
    eingefroren: 'frozen',
    elektrolyse: 'electrolysis',
    elektrolyse_umpolung: 'electrolysis_reversal',
    energie_heute: 'energy_today',
    'erweiterung#_fehler': 'extension#_errors',
    erzeugt_heute: 'produced_today',
    flockung: 'flocculant',
    foerderleistung: 'flow_rate',
    fuellt: 'filling',
    heizung: 'heater',
    'impuls#': 'pulse#',
    kanister_rest: 'canister_remaining',
    kanisterwechsel: 'canister_change',
    kontakt_auf: 'contact_open',
    kontakt_stop: 'contact_stop',
    kontakt_zu: 'contact_close',
    last: 'load',
    laufzeit: 'uptime',
    laufzeit_heute: 'runtime_today',
    leistung: 'power',
    letzte_automatik: 'last_auto',
    letzte_manuell: 'last_manual',
    letzter_fehler: 'last_error',
    letzter_start: 'last_on',
    letztes_ende: 'last_off',
    licht: 'light',
    liste: 'list',
    meldungen: 'messages',
    nachlauf: 'postrun',
    nachspeisung: 'refill',
    nachspuelen: 'rinse',
    polaritaet: 'polarity',
    pumpe: 'pump',
    quittieren: 'acknowledge',
    quittiert: 'acknowledged',
    reichweite: 'range',
    relais: 'relays',
    richtung: 'direction',
    rueckspuelung: 'backwash',
    schalten: 'switch',
    schritt: 'step',
    'sensor#_eingefroren': 'sensor#_frozen',
    speicher: 'memory',
    sperren: 'locks',
    strom_heute: 'electricity_today',
    strom_leistung: 'electrical_power',
    stufe: 'level',
    'stufe#_laufzeit': 'level#_runtime',
    stufen: 'levels',
    'szene#': 'scene#',
    tagesmenge: 'dosed_today',
    temperatur: 'temperatures',
    'temperatur#_fehler': 'temperature#_errors',
    'temperatur#_zustand': 'temperature#_state',
    traeger_fehler: 'carrier_errors',
    traeger_temperatur: 'carrier_temperature',
    trockenlauf: 'dry_run',
    typ: 'type',
    ueberfuellt: 'overfilled',
    ueberschuss: 'surplus',
    umwaelzung_heute: 'circulated_today',
    ventil_faehrt: 'valve_moving',
    ventil_zustand: 'valve_state',
    verzoegerung: 'delay',
    vrelais: 'virtual_relays',
    wasser: 'water',
    zeit: 'time',
    zelle_reststunden: 'cell_remaining_hours',
    zelle_verschleiss: 'cell_wear',
    zelle_warnung: 'cell_warning',
    zellenwechsel: 'cell_change',
    zustand: 'state',
};

/**
 * Translates one ID segment; numbers are kept (stufe2_laufzeit → level2_runtime).
 *
 * @param {string} seg segment of an old object ID
 * @returns {string} English segment (unchanged if not in the table)
 */
function segment(seg) {
    const nums = seg.match(/\d+/g) || [];
    const key = seg.replace(/\d+/g, '#');
    const en = SEGMENTS[key];
    if (en === undefined) {
        return seg;
    }
    let i = 0;
    return en.replace(/#/g, () => nums[i++]);
}

/**
 * Old (German) object ID → new (English) object ID, relative to the adapter namespace.
 *
 * @param {string} id old ID, e.g. "dosierung.chlor.tagesmenge"
 * @returns {string} new ID, e.g. "dosing.chlorine.dosed_today"
 */
function toEnglishId(id) {
    return id.split('.').map(segment).join('.');
}

module.exports = { SEGMENTS, toEnglishId };
