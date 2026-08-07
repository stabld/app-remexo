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

    // 2) Rozumný počet dotazů za hodinu
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
                maxOutputTokens: 4096,
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

        const response = await fetch(
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

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Chyba od API' });
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
                    return res.status(500).json({ error: 'AI vrátila odpověď v nečitelném formátu. Zkuste to prosím znovu.' });
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
