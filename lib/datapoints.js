'use strict';

const { flowConfig } = require('./volume');
const { heatConfig } = require('./heat');
const { cellConfig, cellWear } = require('./cell');

/*
 * Zuordnung der Violet-Schlüssel zu einer festen ioBroker-Struktur.
 * Jeder Eintrag gehört zu einer oder mehreren Gruppen (groups), die in der
 * Instanz-Konfiguration als Häkchen (use_<gruppe>) ein- und ausgeschaltet werden.
 */

// Funktionsstatus der Violet (Pumpe, Relais, Dosierung, Heizung …) – laut Schnittstellenbeschreibung PoolDigital (14.07.2024)
// Nur Anzeige! Geschaltet wird über den Datenpunkt „schalten“ (AUTO / ON / OFF).
// Texte in der Systemsprache (common.states kann nur einfache Texte enthalten)
let LANG = 'de';
const STATUS_TXT = {
    de: [
        'Automatik – aus',
        'Automatik – an',
        'Automatik – aus (durch Regel gesperrt)',
        'Automatik – an (Notfallregel)',
        'Manuell an',
        'Aus (Notfallregel)',
        'Manuell aus',
    ],
    en: [
        'Auto – off',
        'Auto – on',
        'Auto – off (blocked by rule)',
        'Auto – on (emergency rule)',
        'Manual on',
        'Off (emergency rule)',
        'Manual off',
    ],
};
const L = () => (LANG === 'de' ? 'de' : 'en');
const statusStates = () => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(k => [k, `${STATUS_TXT[L()][k]} (${k})`]));
const STATUS = statusStates();
function setLang(lang) {
    LANG = String(lang || 'de').toLowerCase();
}
const ACTIVE_CODES = [1, 3, 4];

// ---- Umwandler -----------------------------------------------------------
const has = (d, k) => d[k] !== undefined && d[k] !== null;
const num = k => d => {
    if (!has(d, k)) {
        return undefined;
    }
    const n = parseFloat(d[k]);
    return Number.isFinite(n) ? n : null;
};
const str = k => d => (has(d, k) ? (typeof d[k] === 'string' ? d[k] : JSON.stringify(d[k])) : undefined);
const ts = k => d => {
    if (!has(d, k)) {
        return undefined;
    }
    const n = parseFloat(d[k]);
    if (!Number.isFinite(n) || n <= 0) {
        return null;
    }
    return Math.round(n > 1e12 ? n : n * 1000); // Violet liefert teils Sekunden, teils Millisekunden
};
const flag = k => d => {
    if (!has(d, k)) {
        return undefined;
    }
    const v = String(d[k]).trim().toUpperCase();
    return ['1', 'YES', 'ON', 'TRUE', 'ACTIVE'].includes(v);
};
const active = k => d => {
    if (!has(d, k)) {
        return undefined;
    }
    return ACTIVE_CODES.includes(parseInt(d[k], 10));
};

// ---- Bausteine -----------------------------------------------------------
function dp(id, name, get, groups, extra = {}) {
    return { id, name, get, groups: [].concat(groups), type: 'string', role: 'text', ...extra };
}
const nDp = (id, name, k, groups, unit, role = 'value') => dp(id, name, num(k), groups, { type: 'number', role, unit });
const sDp = (id, name, k, groups) => dp(id, name, str(k), groups);
const tDp = (id, name, k, groups) => dp(id, name, ts(k), groups, { type: 'number', role: 'date' });
const bDp = (id, name, k, groups, role = 'indicator') => dp(id, name, flag(k), groups, { type: 'boolean', role });

/** Status + aktiv (+ Laufzeit/Zeitstempel bei „Details“) für eine schaltbare Funktion */
function func(base, label, key, groups, opts = {}) {
    const g = [].concat(groups);
    const list = [
        dp(`${base}.status`, `${label} – Status (nur Anzeige)`, num(key), g, {
            type: 'number',
            role: 'value',
            states: statusStates(),
        }),
        dp(`${base}.aktiv`, `${label} – aktiv`, active(key), g, { type: 'boolean', role: 'indicator.working' }),
    ];
    const runtimeGroups = opts.runtimeAlways ? g : g.concat('details');
    list.push(sDp(`${base}.laufzeit_heute`, `${label} – Laufzeit heute`, `${key}_RUNTIME`, runtimeGroups));
    list.push(tDp(`${base}.letzter_start`, `${label} – zuletzt eingeschaltet`, `${key}_LAST_ON`, g.concat('details')));
    list.push(tDp(`${base}.letztes_ende`, `${label} – zuletzt ausgeschaltet`, `${key}_LAST_OFF`, g.concat('details')));
    return list;
}

function dosing(base, label, key, group) {
    return [
        ...func(base, label, key, group, { runtimeAlways: true }),
        nDp(`${base}.tagesmenge`, `${label} – dosiert heute`, `${key}_DAILY_DOSING_AMOUNT_ML`, group, 'ml'),
        nDp(`${base}.kanister_rest`, `${label} – Kanister Restmenge`, `${key}_TOTAL_CAN_AMOUNT_ML`, group, 'ml'),
        sDp(`${base}.reichweite`, `${label} – Reichweite`, `${key}_REMAINING_RANGE`, group),
        sDp(`${base}.sperren`, `${label} – Sperren/Meldungen`, `${key}_STATE`, group),
        tDp(`${base}.kanisterwechsel`, `${label} – letzter Kanisterwechsel`, `${key}_LAST_CAN_RESET`, group),
    ];
}

// ---- feste Belegung der Temperatursensoren in der Violet ----------------------
const FIXED_TEMPS = [
    'Wassertemperatur',
    'Außentemperatur',
    'Absorbertemperatur',
    'Absorber-Rücklauf',
    'Wärmetauscher',
    'Speichertemperatur',
];
function tempName(cfg, i) {
    return String(cfg[`temp${i}_name`] || '').trim() || FIXED_TEMPS[i - 1] || `Temperatur ${i}`;
}

// ---- Kanal-Namen ----------------------------------------------------------
const CHANNELS = {
    wasser: 'Wasserwerte',
    temperatur: 'Temperaturen',
    pumpe: 'Filterpumpe',
    'pumpe.stufen': 'Drehzahlstufen',
    dosierung: 'Dosierung',
    'dosierung.chlor': 'Chlor',
    'dosierung.elektrolyse': 'Elektrolyse',
    'dosierung.elektrolyse_umpolung': 'Elektrolyse Umpolung',
    'dosierung.ph_minus': 'pH-minus',
    'dosierung.ph_plus': 'pH-plus',
    'dosierung.flockung': 'Flockung',
    relais: 'Relais',
    heizung: 'Heizung',
    solar: 'Solar',
    nachspeisung: 'Nachspeisung / Füllstand',
    rueckspuelung: 'Rückspülung',
    'rueckspuelung.nachspuelen': 'Nachspülen',
    licht: 'Licht',
    abdeckung: 'Abdeckung',
    eco: 'ECO-Modus',
    pv: 'PV-Überschuss',
    dmx: 'DMX-Szenen',
    meldungen: 'Meldungen der Violet',
    eingaenge: 'Digitaleingänge',
    analog: 'Analog- und Impulseingänge',
    system: 'System',
    diagnose: 'Diagnose',
};

// ---- Gesamtliste ----------------------------------------------------------
/** Name einer DMX-Szene: eigener Name mit Nummer oder „DMX-Szene n“ */
function dmxLabel(cfg, s) {
    const own = String(cfg[`dmx${s}_name`] || '').trim();
    return own ? `${own} (DMX ${s})` : `DMX-Szene ${s}`;
}

function buildDefinitions(cfg) {
    const defs = [];
    const add = (...items) => defs.push(...items.flat());

    // Wasserwerte
    add(
        nDp('wasser.ph', 'pH-Wert', 'pH_value', ['water', 'ph']),
        nDp('wasser.redox', 'Redox (ORP)', 'orp_value', ['water', 'redox'], 'mV'),
        nDp('wasser.chlor', 'Chlor (frei)', 'pot_value', ['water', 'chlor_el'], 'mg/l'),
        {
            ...bDp('wasser.eingefroren', 'Wasserwerte eingefroren (Pumpe aus)', '__WATER_FROZEN', 'water'),
            when: () => !!cfg.water_freeze,
        },
        nDp('wasser.ph_min', 'pH-Wert Minimum', 'pH_value_min', ['water', 'ph', 'minmax']),
        nDp('wasser.ph_max', 'pH-Wert Maximum', 'pH_value_max', ['water', 'ph', 'minmax']),
        nDp('wasser.redox_min', 'Redox Minimum', 'orp_value_min', ['water', 'redox', 'minmax'], 'mV'),
        nDp('wasser.redox_max', 'Redox Maximum', 'orp_value_max', ['water', 'redox', 'minmax'], 'mV'),
        nDp('wasser.chlor_min', 'Chlor Minimum', 'pot_value_min', ['water', 'chlor_el', 'minmax'], 'mg/l'),
        nDp('wasser.chlor_max', 'Chlor Maximum', 'pot_value_max', ['water', 'chlor_el', 'minmax'], 'mg/l'),
    );

    // Temperaturen (nur angeschlossene Sensoren); Sensor 1–6 sind in der Violet fest belegt
    for (let i = 1; i <= 12; i++) {
        const name = tempName(cfg, i);
        const configured = d => has(d, `onewire${i}_state`) && d[`onewire${i}_state`] !== 'NO_SENSOR_CONFIGURED';
        add(
            {
                ...nDp(`temperatur.sensor${i}`, name, `onewire${i}_value`, 'temp', '°C', 'value.temperature'),
                when: configured,
            },
            {
                ...nDp(
                    `temperatur.sensor${i}_min`,
                    `${name} Minimum`,
                    `onewire${i}_value_min`,
                    ['temp', 'minmax'],
                    '°C',
                    'value.temperature.min',
                ),
                when: configured,
            },
            {
                ...nDp(
                    `temperatur.sensor${i}_max`,
                    `${name} Maximum`,
                    `onewire${i}_value_max`,
                    ['temp', 'minmax'],
                    '°C',
                    'value.temperature.max',
                ),
                when: configured,
            },
            {
                ...sDp(`diagnose.temperatur${i}_zustand`, `${name} – Sensorzustand`, `onewire${i}_state`, [
                    'temp',
                    'diag',
                ]),
                when: configured,
            },
            {
                ...nDp(`diagnose.temperatur${i}_fehler`, `${name} – Fehlerzähler`, `onewire${i}_faultcount`, [
                    'temp',
                    'diag',
                ]),
                when: configured,
            },
        );
    }

    // Wassertemperatur bei Fühler in der Verrohrung: bei stehender Pumpe eingefroren (berechnet in main.js)
    if (cfg.temp1_pump_only) {
        add(
            nDp(
                'temperatur.sensor1_pool',
                `${tempName(cfg, 1)} (Pool)`,
                '__T1_POOL',
                'temp',
                '°C',
                'value.temperature',
            ),
            bDp('temperatur.sensor1_eingefroren', `${tempName(cfg, 1)} eingefroren (Pumpe aus)`, '__T1_FROZEN', 'temp'),
        );
    }

    // Filterpumpe
    add(
        func('pumpe', 'Filterpumpe', 'PUMP', 'pump', { runtimeAlways: true }),
        sDp('pumpe.meldungen', 'Filterpumpe – Meldungen', 'PUMPSTATE', 'pump'),
    );
    add(
        dp(
            'pumpe.stufe',
            'Aktuelle Drehzahlstufe',
            d => {
                if (!has(d, 'PUMP_RPM_0')) {
                    return undefined;
                }
                for (let s = 0; s <= 3; s++) {
                    if (ACTIVE_CODES.includes(parseInt(d[`PUMP_RPM_${s}`], 10))) {
                        return s;
                    }
                }
                return null;
            },
            ['pump', 'pump_rpm'],
            {
                type: 'number',
                role: 'value',
                states:
                    L() === 'de'
                        ? { 0: 'Stufe 0', 1: 'Stufe 1 (ECO)', 2: 'Stufe 2 (Normal)', 3: 'Stufe 3 (Boost)' }
                        : { 0: 'Level 0', 1: 'Level 1 (ECO)', 2: 'Level 2 (Normal)', 3: 'Level 3 (Boost)' },
            },
        ),
    );
    for (let s = 0; s <= 3; s++) {
        add(
            sDp(`pumpe.stufen.stufe${s}_laufzeit`, `Laufzeit Stufe ${s} heute`, `PUMP_RPM_${s}_RUNTIME`, [
                'pump',
                'pump_rpm',
            ]),
        );
    }
    // berechnet vom Adapter (lib/volume.js), nur wenn Fördermengen eingetragen sind
    if (flowConfig(cfg)) {
        add(nDp('pumpe.umwaelzung_heute', 'Umgewälzte Wassermenge heute', '__VOLUME_TODAY', 'pump', 'm³'));
    }

    // Dosierung
    add(
        dosing('dosierung.chlor', 'Chlor', 'DOS_1_CL', 'dos_cl'),
        // Elektrolyse: Kanister-Felder der Violet bedeuten hier g und Zellenstunden (lib/cell.js)
        func('dosierung.elektrolyse', 'Elektrolyse', 'DOS_2_ELO', 'dos_elo', { runtimeAlways: true }),
        sDp('dosierung.elektrolyse.sperren', 'Elektrolyse – Sperren/Meldungen', 'DOS_2_ELO_STATE', 'dos_elo'),
        nDp('dosierung.elektrolyse.polaritaet', 'Elektrolyse – Polarität', 'DOS_2_CURRENT_POLARITY', 'dos_elo'),
        func('dosierung.elektrolyse_umpolung', 'Elektrolyse Umpolung', 'DOS_3_ELO_REV', 'dos_elo'),
        dosing('dosierung.ph_minus', 'pH-minus', 'DOS_4_PHM', 'dos_phm'),
        dosing('dosierung.ph_plus', 'pH-plus', 'DOS_5_PHP', 'dos_php'),
        dosing('dosierung.flockung', 'Flockung', 'DOS_6_FLOC', 'dos_floc'),
    );

    const cell = cellConfig(cfg);
    if (cell) {
        const e = 'dosierung.elektrolyse';
        const elo = (id, name, key, unit) => nDp(`${e}.${id}`, `Elektrolyse – ${name}`, key, 'dos_elo', unit);
        add(
            elo('erzeugt_heute', 'Chlor erzeugt heute', 'DOS_2_ELO_DAILY_DOSING_AMOUNT_ML', 'g'),
            elo('zelle_reststunden', 'Zelle Reststunden', 'DOS_2_ELO_TOTAL_CAN_AMOUNT_ML', 'h'),
            tDp(`${e}.zellenwechsel`, 'Elektrolyse – letzter Zellenwechsel', 'DOS_2_ELO_LAST_CAN_RESET', 'dos_elo'),
        );
        if (cell.lifetime) {
            add(
                dp(`${e}.zelle_verschleiss`, 'Elektrolyse – Zelle Verschleiß', d => cellWear(cell, d), 'dos_elo', {
                    type: 'number',
                    role: 'value',
                    unit: '%',
                }),
                dp(
                    `${e}.zelle_warnung`,
                    'Elektrolyse – Zelle bald tauschen',
                    d => {
                        const w = cellWear(cell, d);
                        return typeof w === 'number' ? w >= cell.warn : w;
                    },
                    'dos_elo',
                    { type: 'boolean', role: 'indicator.maintenance' },
                ),
            );
        }
    }

    // Wärmeleistung Absorber / Heizung (lib/heat.js)
    const heat = heatConfig(cfg, flowConfig(cfg));
    const heatDps = (base, label, group, k) => [
        nDp(`${base}.leistung`, `${label} – Wärmeleistung`, `__HEAT_${k}_KW`, group, 'kW', 'value.power'),
        nDp(`${base}.energie_heute`, `${label} – Wärmemenge heute`, `__HEAT_${k}_KWH`, group, 'kWh', 'value.energy'),
    ];
    if (heat && heat.solar) {
        add(heatDps('solar', 'Solar', 'solar', 'SOLAR'));
    }
    if (heat && heat.heater) {
        add(heatDps('heizung', 'Heizung', 'heater', 'HEATER'));
    }
    if (heat && heat.elec) {
        add([
            nDp('heizung.strom_leistung', 'Heizung – Stromaufnahme', '__HP_ELEC_KW', 'heater', 'kW', 'value.power'),
            nDp('heizung.strom_heute', 'Heizung – Strom heute', '__HP_ELEC_KWH', 'heater', 'kWh', 'value.energy'),
            // null = Heizung aus bzw. noch kein Strom heute (nicht den letzten Wert stehen lassen)
            dp('heizung.cop', 'Heizung – COP', d => (typeof d.__HP_COP === 'number' ? d.__HP_COP : null), 'heater', {
                type: 'number',
                role: 'value',
            }),
            dp(
                'heizung.cop_heute',
                'Heizung – COP heute',
                d => (typeof d.__HP_COP_TODAY === 'number' ? d.__HP_COP_TODAY : null),
                'heater',
                { type: 'number', role: 'value' },
            ),
        ]);
    }

    // Relais-Erweiterungen
    for (const ext of [1, 2]) {
        for (let r = 1; r <= 8; r++) {
            const own = String(cfg[`ext${ext}_${r}_name`] || '').trim();
            const label = own ? `${own} (EXT${ext}.${r})` : `Relais EXT${ext}.${r}`;
            add(func(`relais.ext${ext}_${r}`, label, `EXT${ext}_${r}`, `ext${ext}`));
        }
    }

    // Weitere Funktionen
    add(
        func('heizung', 'Heizung', 'HEATER', 'heater'),
        sDp('heizung.meldungen', 'Heizung – Meldungen', 'HEATERSTATE', 'heater'),
        sDp('heizung.nachlauf', 'Heizung – Nachlaufzeit', 'HEATER_POSTRUN_TIME', 'heater'),

        func('solar', 'Solar', 'SOLAR', 'solar'),
        sDp('solar.meldungen', 'Solar – Meldungen', 'SOLARSTATE', 'solar'),

        func('nachspeisung', 'Nachspeisung', 'REFILL', 'refill'),
        sDp('nachspeisung.zustand', 'Nachspeisung – Zustand', 'REFILL_STATE', 'refill'),
        bDp(
            'nachspeisung.trockenlauf',
            'Trockenlaufschutz ausgelöst',
            'OVERFLOW_DRYRUN_STATE',
            'refill',
            'indicator.alarm',
        ),
        bDp('nachspeisung.ueberfuellt', 'Überfüllung', 'OVERFLOW_OVERFILL_STATE', 'refill', 'indicator.alarm'),
        bDp('nachspeisung.fuellt', 'Füllvorgang aktiv', 'OVERFLOW_REFILL_STATE', 'refill'),

        func('rueckspuelung', 'Rückspülung', 'BACKWASH', 'backwash'),
        sDp('rueckspuelung.zustand', 'Rückspülung – Zustand', 'BACKWASH_STATE', 'backwash'),
        nDp('rueckspuelung.schritt', 'Rückspülung – Schritt', 'BACKWASH_STEP', 'backwash'),
        sDp('rueckspuelung.ventil_zustand', 'Mehrwegeventil – Zustand', 'BACKWASH_OMNI_STATE', 'backwash'),
        bDp('rueckspuelung.ventil_faehrt', 'Mehrwegeventil fährt', 'BACKWASH_OMNI_MOVING', 'backwash'),
        bDp('rueckspuelung.verzoegerung', 'Verzögerung läuft', 'BACKWASH_DELAY_RUNNING', 'backwash'),
        tDp('rueckspuelung.letzte_automatik', 'Letzte automatische Rückspülung', 'BACKWASH_LAST_AUTO_RUN', 'backwash'),
        tDp('rueckspuelung.letzte_manuell', 'Letzte manuelle Rückspülung', 'BACKWASH_LAST_MANUAL_RUN', 'backwash'),
        func('rueckspuelung.nachspuelen', 'Nachspülen', 'BACKWASHRINSE', 'backwash'),

        func('licht', 'Licht', 'LIGHT', 'light'),

        sDp('abdeckung.zustand', 'Abdeckung – Zustand', 'COVER_STATE', 'cover'),
        sDp('abdeckung.richtung', 'Abdeckung – letzte Fahrtrichtung', 'LAST_MOVING_DIRECTION', 'cover'),
        sDp('abdeckung.kontakt_auf', 'Kontakt AUF', 'OPEN_CONTACT', 'cover'),
        sDp('abdeckung.kontakt_zu', 'Kontakt ZU', 'CLOSE_CONTACT', 'cover'),
        sDp('abdeckung.kontakt_stop', 'Kontakt STOP', 'STOP_CONTACT', 'cover'),

        func('eco', 'ECO-Modus', 'ECO', 'eco'),

        nDp('pv.ueberschuss', 'PV-Überschuss-Modus', 'PVSURPLUS', 'pv'),
    );

    for (let s = 1; s <= 12; s++) {
        add(func(`dmx.szene${s}`, dmxLabel(cfg, s), `DMX_SCENE${s}`, 'dmx'));
    }

    for (let i = 1; i <= 12; i++) {
        add(bDp(`eingaenge.eingang${i}`, `Digitaleingang ${i}`, `INPUT${i}`, 'inputs'));
    }
    for (let i = 1; i <= 4; i++) {
        add(bDp(`eingaenge.ce${i}`, `Eingang CE${i}`, `INPUT_CE${i}`, 'inputs'));
    }
    add(bDp('eingaenge.z1z2', 'Eingang Z1/Z2', 'INPUTz1z2', 'inputs'));

    // Analog-/Impulseingänge: nur benannte Eingänge werden angelegt
    const analogRole = unit => {
        const u = unit.toLowerCase();
        if (u === 'bar' || u === 'mbar' || u === 'hpa') {
            return 'value.pressure';
        }
        if (u.includes('%') && u.includes('rf')) {
            return 'value.humidity';
        }
        if (u.includes('°c')) {
            return 'value.temperature';
        }
        if (u.includes('/s') || u.includes('/h') || u.includes('/min')) {
            return 'value.flow';
        }
        if (u === 'v' || u === 'mv') {
            return 'value.voltage';
        }
        if (u === 'ma' || u === 'a') {
            return 'value.current';
        }
        return 'value';
    };
    // feste Belegung der Violet; Standard-Einheit greift, wenn in der Config keine eingetragen ist
    const analogInputs = [
        { cfg: 'adc1', id: 'analog.adc1', key: 'ADC1_value', unit: 'bar' }, // Filterdrucksensor
        { cfg: 'adc2', id: 'analog.adc2', key: 'ADC2_value', unit: '' }, // Pegelsonde
        { cfg: 'adc3', id: 'analog.adc3', key: 'ADC3_value', unit: '' }, // 4–20 mA
        { cfg: 'adc4', id: 'analog.adc4', key: 'ADC4_value', unit: '' }, // 4–20 mA
        { cfg: 'adc5', id: 'analog.adc5', key: 'ADC5_value', unit: '' }, // 0–10 V
        { cfg: 'adc6', id: 'analog.adc6', key: 'ADC6_value', unit: '' },
        { cfg: 'imp1', id: 'analog.impuls1', key: 'IMP1_value', unit: 'cm/s' }, // Messwasserüberwachung
        { cfg: 'imp2', id: 'analog.impuls2', key: 'IMP2_value', unit: 'm³/h' }, // Förderleistung
    ];
    for (const a of analogInputs) {
        const name = String(cfg[`${a.cfg}_name`] || '').trim();
        if (!name) {
            continue;
        }
        const unit = String(cfg[`${a.cfg}_unit`] || '').trim() || a.unit;
        add(nDp(a.id, name, a.key, 'analog', unit || undefined, analogRole(unit)));
    }

    // System
    add(
        sDp('system.firmware', 'Firmware', 'SW_VERSION', 'system'),
        nDp('system.cpu_temperatur', 'CPU-Temperatur', 'CPU_TEMP', 'system', '°C', 'value.temperature'),
        sDp('system.laufzeit', 'Betriebszeit', 'CPU_UPTIME', 'system'),
        nDp('system.letzter_fehler', 'Letzte Fehlernummer', 'last_error_id', 'system'),
        nDp('system.speicher', 'Speicherauslastung', 'MEMORY_USED', 'system', '%'),
        nDp('system.last', 'Systemlast (Load)', 'LOAD_AVG', 'system'),
        nDp(
            'diagnose.dosiermodul_temperatur',
            'Dosiermodul – Temperatur',
            'SYSTEM_dosagemodule_cpu_temperature',
            ['system', 'diag'],
            '°C',
            'value.temperature',
        ),
        nDp(
            'diagnose.dosiermodul_fehler',
            'Dosiermodul – Kommunikationsfehler',
            'SYSTEM_dosagemodule_alive_faultcount',
            ['system', 'diag'],
        ),
        nDp(
            'diagnose.erweiterung1_fehler',
            'Relaiserweiterung 1 – Kommunikationsfehler',
            'SYSTEM_ext1module_alive_faultcount',
            ['system', 'diag'],
        ),
        nDp(
            'diagnose.erweiterung2_fehler',
            'Relaiserweiterung 2 – Kommunikationsfehler',
            'SYSTEM_ext2module_alive_faultcount',
            ['system', 'diag'],
        ),
        nDp(
            'diagnose.traeger_temperatur',
            'Trägerplatine – Temperatur',
            'CPU_TEMP_CARRIER',
            ['system', 'diag'],
            '°C',
            'value.temperature',
        ),
        nDp('diagnose.traeger_fehler', 'Trägerplatine – Kommunikationsfehler', 'SYSTEM_carrier_alive_faultcount', [
            'system',
            'diag',
        ]),
    );

    return defs.filter(d => d.groups.every(g => cfg[`use_${g}`] === true));
}

/*
 * Meldungen der Violet (Warnungen, Alarme, Erinnerungen) – werden vom Adapter selbst geschrieben,
 * nicht aus getReadings gelesen. „quittieren“ wirkt nur in ioBroker, nicht auf der Violet.
 */
function messageDefinitions(cfg) {
    if (cfg.use_messages === false) {
        return [];
    }
    return [
        { id: 'meldungen.aktiv', name: 'Meldung liegt vor', type: 'boolean', role: 'indicator.alarm' },
        { id: 'meldungen.anzahl', name: 'Anzahl neuer Meldungen', type: 'number', role: 'value' },
        { id: 'meldungen.text', name: 'Letzte Meldung', type: 'string', role: 'text' },
        { id: 'meldungen.zeit', name: 'Zeitpunkt der letzten Meldung', type: 'string', role: 'text' },
        { id: 'meldungen.typ', name: 'Art der letzten Meldung', type: 'string', role: 'text' },
        { id: 'meldungen.liste', name: 'Meldungsliste (JSON)', type: 'string', role: 'json' },
        {
            id: 'meldungen.quittieren',
            name: 'Meldungen quittieren',
            type: 'boolean',
            role: 'button',
            write: true,
            read: false,
        },
        { id: 'meldungen.quittiert', name: 'Quittiert bis (intern)', type: 'string', role: 'text' },
    ];
}

module.exports = {
    dmxLabel,
    buildDefinitions,
    messageDefinitions,
    CHANNELS,
    STATUS,
    tempName,
    FIXED_TEMPS,
    setLang,
};

/*
 * Schaltbare Funktionen (nur wenn „Schalten erlauben“ aktiv ist).
 * Befehl an die Violet: GET /setFunctionManually?FUNKTION,AKTION,DAUER,WERT
 * Bewusst NICHT enthalten: Dosierung, Abdeckung, Konfiguration jeglicher Art.
 */
const MODE_STATES = () =>
    L() === 'de' ? { AUTO: 'Automatik', ON: 'Ein', OFF: 'Aus' } : { AUTO: 'Auto', ON: 'On', OFF: 'Off' };

function buildControls(cfg) {
    const list = [];
    const add = (base, label, func, group, extra = {}) =>
        list.push({
            id: `${base}.schalten`,
            name: `${label} – schalten`,
            func,
            base,
            statusKey: func,
            groups: [].concat(group),
            ...extra,
        });

    add('pumpe', 'Filterpumpe', 'PUMP', 'pump');
    add('heizung', 'Heizung', 'HEATER', 'heater');
    add('solar', 'Solar', 'SOLAR', 'solar');
    add('licht', 'Licht', 'LIGHT', 'light');
    add('eco', 'ECO-Modus', 'ECO', 'eco');
    add('nachspeisung', 'Nachspeisung', 'REFILL', 'refill');
    add('rueckspuelung', 'Rückspülung', 'BACKWASH', 'backwash');
    add('rueckspuelung.nachspuelen', 'Nachspülen', 'BACKWASHRINSE', 'backwash');
    add('pv', 'PV-Überschuss', 'PVSURPLUS', 'pv', { onOffOnly: true });
    for (const ext of [1, 2]) {
        for (let r = 1; r <= 8; r++) {
            const own = String(cfg[`ext${ext}_${r}_name`] || '').trim();
            add(
                `relais.ext${ext}_${r}`,
                own ? `${own} (EXT${ext}.${r})` : `Relais EXT${ext}.${r}`,
                `EXT${ext}_${r}`,
                `ext${ext}`,
            );
        }
    }
    for (let s = 1; s <= 12; s++) {
        add(`dmx.szene${s}`, dmxLabel(cfg, s), `DMX_SCENE${s}`, 'dmx');
    }

    return list
        .filter(c => c.groups.every(g => cfg[`use_${g}`] === true))
        .map(c => ({
            ...c,
            type: 'string',
            role: 'level.mode',
            write: true,
            states: c.onOffOnly ? (({ AUTO, ...rest }) => rest)(MODE_STATES()) : MODE_STATES(),
        }));
}

/** Violet-Statuscode → aktueller Modus (für die Rückmeldung im Datenpunkt „schalten“) */
function modeFromStatus(value, onOffOnly) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) {
        return null;
    }
    if (onOffOnly) {
        return n > 0 ? 'ON' : 'OFF';
    }
    if (n === 4) {
        return 'ON';
    }
    if (n === 6) {
        return 'OFF';
    }
    return 'AUTO';
}

module.exports.buildControls = buildControls;
module.exports.modeFromStatus = modeFromStatus;
