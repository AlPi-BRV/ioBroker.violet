'use strict';

/*
 * Übersetzung der Datenpunkt- und Kanalnamen (de → alle ioBroker-Sprachen).
 * Namen werden intern auf Deutsch erzeugt und hier in { en, de, ru, … } umgewandelt.
 * Eigene Namen aus der Konfiguration (z. B. „Gartenlicht“) bleiben in allen Sprachen unverändert.
 * Die Übersetzungstabellen stehen in names-i18n.json.
 */

const TABLE = require('./names-i18n.json');

/** Sprachen, in die übersetzt wird */
const LANGS = ['en', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];
/** Alle Sprachen im Namensobjekt (ioBroker-Reihenfolge) */
const ALL_LANGS = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

const TERMS = TABLE.terms;
/** Teilnamen mit Nummer o. Ä. (z. B. „Temperatur 10“) */
const PATTERNS = TABLE.patterns.map(p => ({ ...p, re: new RegExp(p.match) }));
/** Zusätze an beliebige, auch eigene Namen (z. B. „… Maximum“); „$“ = übersetzter Grundname */
const SUFFIXES = TABLE.suffixes.map(p => ({ ...p, re: new RegExp(p.match) }));

/** englische Tabelle (de → en), wie bisher exportiert */
const EN = Object.fromEntries(Object.entries(TERMS).map(([de, t]) => [de, t.en]));

/** Teilname in eine Sprache übersetzen; eigene Namen bleiben unverändert */
function part(s, lang) {
    if (TERMS[s]) {
        return TERMS[s][lang];
    }
    for (const p of PATTERNS) {
        if (p.re.test(s)) {
            return s.replace(p.re, p[lang]);
        }
    }
    for (const p of SUFFIXES) {
        const m = s.match(p.re);
        if (m) {
            return p[lang].replace('$', part(m[1], lang));
        }
    }
    return s; // eigener Name → unverändert
}

/** Deutscher Name → { en, de, ru, … } (bzw. String, wenn nichts zu übersetzen ist) */
function names(de) {
    if (!de || typeof de !== 'string') {
        return de;
    }
    const segs = de.split(' – ');
    const out = {};
    let changed = false;
    for (const lang of ALL_LANGS) {
        out[lang] = lang === 'de' ? de : segs.map(p => part(p, lang)).join(' – ');
        if (out[lang] !== de) {
            changed = true;
        }
    }
    return changed ? out : de;
}

/** Text für Pool-Display und Konfiguration (wie diese nur Deutsch oder Englisch) */
function pick(de, lang) {
    const n = names(de);
    if (typeof n === 'string') {
        return n;
    }
    return lang === 'de' ? n.de : n.en;
}

module.exports = { names, pick, EN, LANGS, ALL_LANGS };
