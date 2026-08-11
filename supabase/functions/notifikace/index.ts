// REMEXO: odesílání e-mailových upozornění
//
// Spouští ji databáze při vzniku poptávky nebo nabídky.
// Nasazení: supabase functions deploy notifikace
//
// Potřebné proměnné (supabase secrets set ...):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   NOTIF_SECRET  – náhodný řetězec, kterým se databáze prokazuje
//
// BEZPEČNOST: funkce je veřejně dostupná na internetu, proto si
// na začátku ověří tajemství. Bez něj by kdokoliv mohl přes tvůj
// účet rozesílat e-maily.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const secret = Deno.env.get("NOTIF_SECRET") ?? "";

// Předmět s diakritikou se musí zakódovat podle RFC 2047, jinak se
// v poště objeví "=?utf-8?Q?Nov=c3=a1..." místo "Nová".
// Knihovna to nedělá spolehlivě, tak si to uděláme sami.
// V seznamu zpráv se stejně zobrazí jen začátek předmětu
function zkratit(text: unknown, delka: number): string {
  const t = String(text ?? "").trim();
  return t.length > delka ? t.slice(0, delka - 1) + "…" : t;
}

// POZOR: nepoužívat. Knihovna si předmět kóduje sama a když dostane
// už zakódovaný text, zabalí ho podruhé - v poště se pak objeví
// "=?utf-8?Q?=3d?UTF-8?B?..." jako viditelný text.
// Knihovna denomailer diakritiku v předmětu nezvládá. Zkusili jsme ji
// nechat na ní i zakódovat sami - v obou případech se v poště objevila
// hlavička jako viditelný text ("=?utf-8?Q?Nov=c3=a1...").
//
// Předmět proto posíláme bez diakritiky. Vypadá to hůř, ale je to
// spolehlivé a čitelné ve všech poštovních klientech.
// Tělo e-mailu diakritiku má, tam je kódování v pořádku.
function bezDiakritiky(text: string): string {
  return String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function odpoved(stav: number, telo: Record<string, unknown>) {
  return new Response(JSON.stringify(telo), {
    status: stav,
    headers: { "Content-Type": "application/json" },
  });
}

// Do e-mailu jdou jména a názvy od uživatelů, takže se escapují.
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function sablona(nadpis: string, text: string, odkaz: string, tlacitko: string) {
  return `<!DOCTYPE html><html lang="cs"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#f59e0b;letter-spacing:1px;">REMEXO</p>
    <h1 style="margin:0 0 12px;font-size:21px;color:#0f172a;">${nadpis}</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">${text}</p>
    <a href="${odkaz}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:13px 26px;border-radius:12px;font-weight:700;font-size:15px;">${tlacitko}</a>
    <p style="margin:26px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
      Tento e-mail ti přišel, protože máš účet na Remexo.<br>
      Odhlásit upozornění můžeš v aplikaci v sekci Můj profil.
    </p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return odpoved(405, { chyba: "Jen POST." });

  if (!secret || req.headers.get("x-remexo-secret") !== secret) {
    return odpoved(401, { chyba: "Neoprávněný požadavek." });
  }

  let telo;
  try {
    telo = await req.json();
  } catch {
    return odpoved(400, { chyba: "Neplatný požadavek." });
  }

  const { udalost, prijemci, nazev, mesto, kategorie, cena } = telo ?? {};
  const seznam: string[] = Array.isArray(prijemci) ? prijemci.filter(Boolean).slice(0, 200) : [];
  if (!seznam.length) return odpoved(200, { odeslano: 0, poznamka: "Žádní příjemci." });

  const app = "https://app.remexo.cz";
  let predmet: string, nadpis: string, text: string, tlacitko: string;

  if (udalost === "nova_poptavka") {
    predmet = `Nová poptávka: ${zkratit(nazev, 45)}`;
    nadpis = "Nová poptávka ve tvém okolí";
    text = `<strong>${esc(nazev)}</strong><br>${esc(kategorie)} · ${esc(mesto ?? "Brno")}
            <br><br>Kdo se ozve dřív, má větší šanci zakázku získat.`;
    tlacitko = "Zobrazit poptávku";
  } else if (udalost === "nova_nabidka") {
    predmet = `Nová nabídka: ${zkratit(nazev, 45)}`;
    nadpis = "Řemeslník ti poslal nabídku";
    text = `Na tvoji poptávku <strong>${esc(nazev)}</strong> dorazila nabídka${
      cena ? ` za ${esc(cena)}` : ""
    }.<br><br>Podívej se na ni a rozhodni se, jestli ti sedí.`;
    tlacitko = "Zobrazit nabídku";
  } else if (udalost === "zakazka_hotova") {
    // kategorie nese informaci, komu píšeme
    const zakaznikovi = kategorie === "zakaznik";
    predmet = `Zakázka dokončena: ${zkratit(nazev, 45)}`;
    nadpis = zakaznikovi ? "Řemeslník označil práci za hotovou" : "Zákazník potvrdil dokončení";
    text = zakaznikovi
      ? `U zakázky <strong>${esc(nazev)}</strong> je hotovo.<br><br>Zkontroluj práci a potvrď dokončení. Pak můžeš řemeslníka ohodnotit — pomůže to dalším lidem při výběru.`
      : `Zákazník potvrdil dokončení zakázky <strong>${esc(nazev)}</strong>.<br><br>Díky za odvedenou práci.`;
    tlacitko = "Zobrazit zakázku";
  } else {
    return odpoved(400, { chyba: "Neznámá událost." });
  }

  const html = sablona(nadpis, text, app, tlacitko);

  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") ?? "",
      port: Number(Deno.env.get("SMTP_PORT") ?? "465"),
      tls: true,
      auth: {
        username: Deno.env.get("SMTP_USER") ?? "",
        password: Deno.env.get("SMTP_PASS") ?? "",
      },
    },
  });

  let odeslano = 0;
  const chyby: string[] = [];

  for (const email of seznam) {
    try {
      // Každému zvlášť, aby příjemci navzájem neviděli své adresy
      await client.send({
        from: Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "",
        to: email,
        subject: bezDiakritiky(predmet),
        html,
      });
      odeslano++;
    } catch (e) {
      chyby.push(String(e).slice(0, 80));
    }
  }

  try { await client.close(); } catch { /* spojení už mohlo spadnout */ }

  // Adresy se do odpovědi nevrací, aby neskončily v logu
  return odpoved(200, { odeslano, selhalo: chyby.length });
});
