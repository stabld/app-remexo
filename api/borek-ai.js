// Aktuální model. Seznam dostupných modelů: https://generativelanguage.googleapis.com/v1beta/models?key=TVUJ_KLIC
const MODEL = 'gemini-3.5-flash';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metoda není povolena' });
    }

    const apiKey = process.env.AI_MODEL_TOKEN;
    if (!apiKey) {
        return res.status(500).json({ error: 'API klíč není nastaven na serveru.' });
    }

    try {
        const { parts, systemPrompt, useJson } = req.body;

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
        const text = candidate?.content?.parts?.[0]?.text;

        if (!text) {
            return res.status(500).json({ error: 'AI nevrátila žádnou odpověď.' });
        }

        // Když se odpověď usekne kvůli limitu, radši to řekneme narovinu,
        // než aby frontend spadl na rozbitém JSONu
        if (candidate.finishReason === 'MAX_TOKENS') {
            return res.status(500).json({ error: 'Odpověď AI byla příliš dlouhá a usekla se. Zkuste problém popsat stručněji.' });
        }

        return res.status(200).json({ text });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
