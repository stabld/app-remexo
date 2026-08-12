// Aktuální model. Seznam dostupných modelů: https://generativelanguage.googleapis.com/v1beta/models?key=TVUJ_KLIC
const MODEL = 'gemini-3.5-flash';

// --- OCHRANA ENDPOINTU ---
// Bez těchto limitů může kdokoliv volat /api/borek-ai přímo (curl, skript)
// a utrácet za Gemini na účet Remexa. Endpoint je veřejná adresa,
// takže musí sám ověřit, kdo se ptá.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iyvvwsnhezjrjrkscbyc.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_OehKo_l9qTAp-xfmlHpzOA_OYBp4ouc';

const MAX_TELO_ZNAKU = 8 * 1024 * 1024;   // ~8 MB, pět fotek v base64 se vejde
const MAX_PROMPT_ZNAKU = 4000;            // systémový prompt od klienta
const MAX_TEXT_ZNAKU = 20000;             // popis závady
const MAX_FOTEK = 5;
const LIMIT_ZA_HODINU = 30;               // na jednoho uživatele

// Paměť instance. Serverless jich může běžet víc, takže tohle není
// dokonalá hráz – zastaví ale běžné spamování z jednoho účtu.
const pocitadlo = new Map();

function prekrocilLimit(uid) {
    const ted = Date.now();
    const hodina = 60 * 60 * 1000;
    const zaznam = pocitadlo.get(uid);

    if (!zaznam || ted - zaznam.od > hodina) {
        pocitadlo.set(uid, { od: ted, pocet: 1 });
        return false;
    }
    zaznam.pocet += 1;
    // Ať mapa neroste donekonečna
    if (pocitadlo.size > 5000) {
        for (const [k, v] of pocitadlo) { if (ted - v.od > hodina) pocitadlo.delete(k); }
    }
    return zaznam.pocet > LIMIT_ZA_HODINU;
}

// Ověření přihlášení proti Supabase – token posílá frontend v hlavičce
async function zjistiUzivatele(req) {
    const hlavicka = req.headers.authorization || '';
    const token = hlavicka.startsWith('Bearer ') ? hlavicka.slice(7) : null;
    if (!token) return null;

    try {
        const odpoved = await fetch(SUPABASE_URL + '/auth/v1/user', {
            headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
        });
        if (!odpoved.ok) return null;
        const uzivatel = await odpoved.json();
        return uzivatel && uzivatel.id ? uzivatel : null;
    } catch (e) {
        return null;
    }
}

// AI občas vrátí JSON, ve kterém jsou uvnitř textu skutečná zalomení řádků
// (např. popis závady s odrážkami). Takový JSON se nedá přečíst, tak ho tady srovnáme.
function opravJson(raw) {
    let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    const zacatek = s.indexOf('{');
    const konec = s.lastIndexOf('}');
    if (zacatek !== -1 && konec !== -1) {
        s = s.substring(zacatek, konec + 1);
    }

    let vysledek = '';
    let vTextu = false;
    let escapovano = false;

    for (const znak of s) {
        if (escapovano) { vysledek += znak; escapovano = false; continue; }
        if (znak === '\\') { vysledek += znak; escapovano = true; continue; }
        if (znak === '"') { vTextu = !vTextu; vysledek += znak; continue; }

        if (vTextu) {
            if (znak === '\n') { vysledek += '\\n'; continue; }
            if (znak === '\r') { vysledek += '\\r'; continue; }
            if (znak === '\t') { vysledek += '\\t'; continue; }
        }

        vysledek += znak;
    }

    return vysledek;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metoda není povolena' });
    }

    const apiKey = process.env.AI_MODEL_TOKEN;
    if (!apiKey) {
        return res.status(500).json({ error: 'API klíč není nastaven na serveru.' });
    }

    // 1) Jen přihlášený uživatel
    const uzivatel = await zjistiUzivatele(req);
    if (!uzivatel) {
        return res.status(401).json({ error: 'Pro použití Bořka se musíte přihlásit.' });
    }

    // 2) Rozumný počet dotazů za hodinu.
    // Databáze je jediné místo, kde limit obejít nejde - paměť serverless
    // funkce se restartem vynuluje. Paměťová varianta níž zůstává jako záloha.
    try {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/ai_limit_prekrocen', {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON,
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_limit: LIMIT_ZA_HODINU })
        });
        if (r.ok && (await r.json()) === true) {
            return res.status(429).json({ error: 'Bořek dnes odpověděl už hodně lidem. Zkuste to prosím za chvíli.' });
        }
    } catch (e) { /* při výpadku spadneme zpět na paměťový limit */ }

    if (prekrocilLimit(uzivatel.id)) {
        return res.status(429).json({ error: 'Bořek dnes odpověděl už hodně lidem. Zkuste to prosím za chvíli.' });
    }

    try {
        const { parts, rezim, useJson } = req.body;

        // Prompty jsou na serveru. Dřív je posílal klient, takže si kdokoliv
        // přihlášený mohl přes náš účet nechat generovat cokoliv.
        const PROMPTY = {
            poptavka: 'Jsi Bořek, profesionální technik. Vytvoř zadání pro řemeslníka.\nODPOVÍDEJ PŘESNĚ V TOMTO JSON FORMÁTU BEZ DALŠÍHO TEXTU:\n{"status":"question","message":"otázka"} nebo {"status":"done","nazev":"titulek","kategorie":"POUZE JEDNA Z: Instalatérství, Elektrikář, Malíř, Tesař, Zámečník, Ostatní","popis":"popis","nalehavost":"Vysoká/Střední/Nízká","odhad_ceny":"cena Kč","rada":"rada"}',

            poradce: [
                'Jsi Bořek, přátelský asistent platformy Remexo. Mluvíš česky, tykáš, jsi stručný a věcný.',
                'ÚKOL: pomoz uživateli zorientovat se. Odpovídej maximálně 3 krátkými větami. Žádné odrážky, žádný markdown.',
                'JAK REMEXO FUNGUJE: uživatel vyfotí problém a popíše ho, ty z toho připravíš srozumitelné zadání, řemeslníci z okolí pošlou nabídky, uživatel si vybere.',
                'NEDIAGNOSTIKUJ ZÁVADU S JISTOTOU. Můžeš naznačit, jaká profese to nejspíš řeší, ale vždy nech rozhodnutí na řemeslníkovi.',
                'NIKDY netvrď, že už fungují: ověřování řemeslníků, platby přes platformu, úschova peněz, pojištění nebo hodnocení. Tyto věci teprve připravujeme.',
                'NEVYMÝŠLEJ SI ceny, termíny, počty řemeslníků ani konkrétní firmy. Když něco nevíš, přiznej to.',
                'Když se ptá na něco mimo domácí opravy a Remexo, slušně to odmítni a nabídni pomoc s poptávkou.'
            ].join(' ')
        };

        const systemPrompt = PROMPTY[rezim];
        if (!systemPrompt) {
            return res.status(400).json({ error: 'Neznámý režim požadavku.' });
        }

        // 3) Velikost požadavku
        const velikost = JSON.stringify(req.body || {}).length;
        if (velikost > MAX_TELO_ZNAKU) {
            return res.status(413).json({ error: 'Požadavek je příliš velký. Zkuste nahrát méně fotek.' });
        }
        if (!Array.isArray(parts) || parts.length === 0) {
            return res.status(400).json({ error: 'Chybí popis závady.' });
        }
        if (typeof systemPrompt === 'string' && systemPrompt.length > MAX_PROMPT_ZNAKU) {
            return res.status(400).json({ error: 'Neplatný požadavek.' });
        }
        const pocetFotek = parts.filter(p => p && p.inlineData).length;
        if (pocetFotek > MAX_FOTEK) {
            return res.status(400).json({ error: 'Najednou lze poslat nejvýše ' + MAX_FOTEK + ' fotek.' });
        }
        const delkaTextu = parts.reduce((sou, p) => sou + (typeof p === 'string' ? p.length : (p && p.text ? String(p.text).length : 0)), 0);
        if (delkaTextu > MAX_TEXT_ZNAKU) {
            return res.status(400).json({ error: 'Popis je příliš dlouhý. Zkuste ho zkrátit.' });
        }

        // Frontend posílá text i fotky rovnou ve formátu, kterému Gemini rozumí
        const contentParts = (parts || []).map(p => {
            if (typeof p === 'string') return { text: p };
            if (p.text) return { text: p.text };
            if (p.inlineData) {
                return {
                    inline_data: {
                        mime_type: p.inlineData.mimeType,
                        data: p.inlineData.data
                    }
                };
            }
            return null;
        }).filter(Boolean);

        const payload = {
            contents: [{ role: 'user', parts: contentParts }],
            generationConfig: {
                maxOutputTokens: 8192,
                // Nové Gemini modely jinak spotřebují limit na interní "přemýšlení"
                // a odpověď se usekne v půlce
                thinkingConfig: { thinkingBudget: 0 }
            }
        };

        if (systemPrompt) {
            payload.system_instruction = { parts: [{ text: systemPrompt }] };
        }

        if (useJson) {
            payload.generationConfig.responseMimeType = 'application/json';
        }

        // Gemini občas vrátí 503 (přetížení) nebo 429 (příliš mnoho požadavků).
        // Bývá to otázka vteřin, tak to zkusíme znovu, než uživatele odmítneme.
        // Na Bořkovi visí zakládání poptávky - kdo dostane chybu, většinou se nevrátí.
        const POKUSU = 3;
        let response, data;

        for (let pokus = 1; pokus <= POKUSU; pokus++) {
            response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    body: JSON.stringify(payload)
                }
            );

            data = await response.json();
            if (response.ok) break;

            const doCasuPrejde = response.status === 503 || response.status === 429 || response.status >= 500;
            if (!doCasuPrejde || pokus === POKUSU) break;

            // 1s, 2s, 4s - ať do přetíženého modelu nebušíme
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, pokus - 1)));
        }

        if (!response.ok) {
            const pretizeno = response.status === 503 || response.status === 429;
            return res.status(pretizeno ? 503 : response.status).json({
                error: pretizeno
                    ? 'Bořek je zrovna zavalený, model má nával. Zkus to prosím za minutu.'
                    : (data.error?.message || 'Chyba od API'),
                pretizeno: pretizeno
            });
        }

        const candidate = data.candidates?.[0];
        let text = candidate?.content?.parts?.[0]?.text;

        if (!text) {
            return res.status(500).json({ error: 'AI nevrátila žádnou odpověď.' });
        }

        // Když se odpověď usekne kvůli limitu, radši to řekneme narovinu,
        // než aby frontend spadl na rozbitém JSONu
        if (candidate.finishReason === 'MAX_TOKENS') {
            return res.status(500).json({ error: 'Odpověď AI byla příliš dlouhá a usekla se. Zkuste problém popsat stručněji.' });
        }

        // U JSON odpovědí ověříme, že se dá přečíst, a případně ji opravíme
        if (useJson) {
            try {
                JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
            } catch (e) {
                const opraveno = opravJson(text);
                try {
                    JSON.parse(opraveno);
                    text = opraveno;
                } catch (e2) {
                    // Model občas odpoví běžnou větou místo JSON. Není důvod
                    // kvůli tomu shodit celý průchod - vezmeme to jako otázku
                    // a uživatel může odpovědět dál.
                    const cistyText = String(text || '')
                        .replace(/```json/gi, '').replace(/```/g, '').trim();

                    // Když to začíná složenou závorkou, je to rozepsaný JSON,
                    // který se nedokončil. Ukázat ho uživateli by bylo horší
                    // než přiznat chybu.
                    if (cistyText.startsWith('{') || cistyText.startsWith('[')) {
                        // duvod pomůže při ladění: proč model přestal psát
                        return res.status(500).json({
                            error: 'Bořkovi se odpověď nedokončila. Zkus popsat závadu stručněji, nebo vyplň poptávku ručně.',
                            duvod: candidate.finishReason || 'neznamy',
                            delka: cistyText.length
                        });
                    }

                    if (cistyText) {
                        text = JSON.stringify({ status: 'question', message: cistyText.slice(0, 600) });
                    } else {
                        return res.status(500).json({
                            error: 'Bořek neodpověděl srozumitelně. Zkus to prosím znovu, nebo vyplň poptávku ručně.'
                        });
                    }
                }
            }
        }

        return res.status(200).json({ text });

    } catch (err) {
        // Text chyby ze serveru ven neposíláme – může prozradit vnitřní detaily
        console.error('borek-ai:', err);
        return res.status(500).json({ error: 'Bořkovi se něco nepovedlo. Zkuste to prosím znovu.' });
    }
}
