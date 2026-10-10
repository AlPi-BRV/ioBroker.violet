'use strict';

/*
 * Übersetzung der Datenpunkt- und Kanalnamen (de → en).
 * Namen werden intern auf Deutsch erzeugt und hier in { en, de } umgewandelt.
 * Eigene Namen aus der Konfiguration (z. B. „Gartenlicht“) bleiben unverändert.
 */

const EN = {
    // Kanäle
    Wasserwerte: 'Water values',
    Temperaturen: 'Temperatures',
    Drehzahlstufen: 'Speed levels',
    Dosierung: 'Dosing',
    Relais: 'Relays',
    'Nachspeisung / Füllstand': 'Refill / water level',
    'DMX-Szenen': 'DMX scenes',
    Digitaleingänge: 'Digital inputs',
    'Analog- und Impulseingänge': 'Analog and pulse inputs',
    System: 'System',
    Diagnose: 'Diagnostics',
    'Meldungen der Violet': 'Violet messages',

    // Funktionen / Bezeichnungen
    Filterpumpe: 'Filter pump',
    Chlor: 'Chlorine',
    Elektrolyse: 'Electrolysis',
    'Elektrolyse Umpolung': 'Electrolysis polarity reversal',
    'pH-minus': 'pH minus',
    'pH-plus': 'pH plus',
    Flockung: 'Flocculant',
    Heizung: 'Heating',
    Solar: 'Solar',
    Nachspeisung: 'Refill',
    Rückspülung: 'Backwash',
    Nachspülen: 'Rinse',
    Licht: 'Light',
    'ECO-Modus': 'ECO mode',
    Abdeckung: 'Cover',
    Mehrwegeventil: 'Multiport valve',
    Dosiermodul: 'Dosing module',
    'Relaiserweiterung 1': 'Relay extension 1',
    'Relaiserweiterung 2': 'Relay extension 2',
    Trägerplatine: 'Carrier board',
    'PV-Überschuss': 'PV surplus',

    // Zusätze (nach „ – “)
    'Status (nur Anzeige)': 'Status (display only)',
    aktiv: 'active',
    'Laufzeit heute': 'Runtime today',
    'zuletzt eingeschaltet': 'Last switched on',
    'zuletzt ausgeschaltet': 'Last switched off',
    'dosiert heute': 'Dosed today',
    'Kanister Restmenge': 'Canister remaining',
    Reichweite: 'Remaining range',
    'Sperren/Meldungen': 'Locks/messages',
    'letzter Kanisterwechsel': 'Last canister change',
    Sensorzustand: 'Sensor state',
    Fehlerzähler: 'Fault counter',
    Meldungen: 'Messages',
    Polarität: 'Polarity',
    Nachlaufzeit: 'Post-run time',
    Zustand: 'State',
    Schritt: 'Step',
    Temperatur: 'Temperature',
    Kommunikationsfehler: 'Communication errors',
    'letzte Fahrtrichtung': 'Last direction',
    schalten: 'switch',
    'Drehzahl beim Einschalten': 'Speed when switching on',

    // vollständige Namen
    'pH-Wert': 'pH value',
    'Redox (ORP)': 'Redox (ORP)',
    'Chlor (frei)': 'Chlorine (free)',
    'pH-Wert Minimum': 'pH value minimum',
    'pH-Wert Maximum': 'pH value maximum',
    'Redox Minimum': 'Redox minimum',
    'Redox Maximum': 'Redox maximum',
    'Chlor Minimum': 'Chlorine minimum',
    'Chlor Maximum': 'Chlorine maximum',
    'Aktuelle Drehzahlstufe': 'Current speed level',
    'Umgewälzte Wassermenge heute': 'Circulated water today',
    'Trockenlaufschutz ausgelöst': 'Dry-run protection triggered',
    Überfüllung: 'Overfill',
    'Füllvorgang aktiv': 'Filling active',
    'Mehrwegeventil fährt': 'Multiport valve moving',
    'Verzögerung läuft': 'Delay running',
    'Letzte automatische Rückspülung': 'Last automatic backwash',
    'Letzte manuelle Rückspülung': 'Last manual backwash',
    'Kontakt AUF': 'Contact OPEN',
    'Kontakt ZU': 'Contact CLOSE',
    'Kontakt STOP': 'Contact STOP',
    'PV-Überschuss-Modus': 'PV surplus mode',
    Firmware: 'Firmware',
    'CPU-Temperatur': 'CPU temperature',
    Betriebszeit: 'Uptime',
    'Letzte Fehlernummer': 'Last error number',
    Speicherauslastung: 'Memory usage',
    'Systemlast (Load)': 'System load',
    'Eingang Z1/Z2': 'Input Z1/Z2',
    'Meldung liegt vor': 'Message pending',
    'Anzahl neuer Meldungen': 'Number of new messages',
    'Letzte Meldung': 'Latest message',
    'Zeitpunkt der letzten Meldung': 'Time of latest message',
    'Art der letzten Meldung': 'Type of latest message',
    'Meldungsliste (JSON)': 'Message list (JSON)',
    'Meldungen quittieren': 'Acknowledge messages',
    'Quittiert bis (intern)': 'Acknowledged up to (internal)',

    // feste Belegung der Temperatursensoren
    Wassertemperatur: 'Water temperature',
    Außentemperatur: 'Outside temperature',
    Absorbertemperatur: 'Absorber temperature',
    'Absorber-Rücklauf': 'Absorber return',
    Wärmetauscher: 'Heat exchanger',
    Speichertemperatur: 'Storage temperature',
};

const PATTERNS = [
    [/^Temperatur (\d+)$/, 'Temperature $1'],
    [/^Relais EXT(\d)\.(\d)$/, 'Relay EXT$1.$2'],
    [/^DMX-Szene (\d+)$/, 'DMX scene $1'],
    [/^Digitaleingang (\d+)$/, 'Digital input $1'],
    [/^Eingang (CE\d)$/, 'Input $1'],
    [/^Laufzeit Stufe (\d) heute$/, 'Runtime level $1 today'],
    [/^Stufe (\d)$/, 'Level $1'],
];

function enPart(s) {
    if (EN[s]) return EN[s];
    for (const [re, rep] of PATTERNS) if (re.test(s)) return s.replace(re, rep);
    const mm = s.match(/^(.+) (Minimum|Maximum)$/);
    if (mm) return `${enPart(mm[1])} ${mm[2].toLowerCase()}`;
    return s; // eigener Name → unverändert
}

/** Deutscher Name → { en, de } */
function names(de) {
    if (!de || typeof de !== 'string') return de;
    const en = de
        .split(' – ')
        .map((p) => enPart(p))
        .join(' – ');
    return en === de ? de : { en, de };
}

/** Text in der Systemsprache (de oder en) */
function pick(de, lang) {
    const n = names(de);
    if (typeof n === 'string') return n;
    return lang === 'de' ? n.de : n.en;
}

module.exports = { names, pick, EN };
