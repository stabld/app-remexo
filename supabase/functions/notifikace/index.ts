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
//
// ZMĚNY OPROTI PŘEDCHOZÍ VERZI (30. 10.):
//  1) Předmět je čistě ASCII. Dřív do něj mohla proniknout "…" a knihovna
//     z ní udělala neplatnou hlavičku (mezery a dvojtečka uvnitř
//     "=?utf-8?Q?...?="), kterou poštovní servery berou jako podezřelou.
//  2) Tělo zprávy kódujeme sami (base64, řádky po 76 znacích, CRLF).
//     Kódování quoted-printable v knihovně denomailer 1.6.0 občas poškodí
//     české znaky na místě zalomení řádku, používá malá hex písmena
//     a nechává v těle holé LF.
//  3) Zpráva má textovou i HTML část (multipart/alternative).
//  4) Odesílatel má jméno ("Remexo <adresa>"), i když je v SMTP_FROM jen adresa.
//  5) Hlavička Auto-Submitted: auto-generated (strojově odeslané upozornění).
//  6) Bez zadaného města se nepíše žádné (dřív se tam doplnilo "Brno").

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const secret = Deno.env.get("NOTIF_SECRET") ?? "";

// Řídicí znaky včetně CR/LF a oddělovačů řádků Unicode (U+2028, U+2029).
// V hlavičce e-mailu (předmět) nesmí být nikdy: knihovna denomailer
// předmět zapíše tak, jak je, a zalomení řádku by dovolilo podstrčit
// další hlavičky (např. Bcc) nebo vlastní text zprávy.
const RADKY = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;

// Zkrácení textu do předmětu. Tři tečky jsou ASCII, ne znak "…".
function zkratit(text: unknown, delka: number): string {
  const t = String(text ?? "").replace(RADKY, " ").trim();
  return t.length > delka ? t.slice(0, delka - 3).trimEnd() + "..." : t;
}

// Předmět posíláme bez diakritiky a bez jakéhokoliv jiného znaku mimo ASCII.
// Knihovna totiž zakódovaný předmět zabalí podruhé (viz dřívější pokusy),
// takže čistý ASCII je jediná spolehlivá cesta, dokud knihovnu nevyměníme.
function predmetASCII(text: unknown): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")        // háčky a čárky
    .replace(RADKY, " ")                    // žádné zalomení řádku v hlavičce
    .replace(/[^\x20-\x7e]/g, "")           // cokoliv dalšího mimo ASCII pryč
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Text -> UTF-8 -> base64 po řádcích do 76 znaků, oddělených CRLF.
function base64Radky(text: string): string {
  const bajty = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bajty.length; i += 0x8000) {
    bin += String.fromCharCode(...bajty.subarray(i, i + 0x8000));
  }
  return (btoa(bin).match(/.{1,76}/g) ?? []).join("\r\n");
}

// V textové části budou jen CRLF zalomení.
function naCRLF(text: string): string {
  return text.replace(/\r\n|\r|\n/g, "\r\n");
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

const PATICKA =
  "Tento e-mail ti přišel, protože máš účet na Remexo. " +
  "Odhlásit upozornění můžeš v aplikaci v sekci Můj profil.";

function sablonaHtml(nadpis: string, textHtml: string, odkaz: string, tlacitko: string) {
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><title>${esc(nadpis)}</title></head><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#f59e0b;letter-spacing:1px;">REMEXO</p>
    <h1 style="margin:0 0 12px;font-size:21px;color:#0f172a;">${esc(nadpis)}</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#475569;">${textHtml}</p>
    <a href="${odkaz}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:13px 26px;border-radius:12px;font-weight:700;font-size:15px;">${esc(tlacitko)}</a>
    <p style="margin:26px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">${esc(PATICKA)}</p>
  </div></body></html>`;
}

function sablonaText(nadpis: string, textPlain: string, odkaz: string, tlacitko: string) {
  return [
    "REMEXO",
    "",
    nadpis,
    "",
    textPlain,
    "",
    `${tlacitko}: ${odkaz}`,
    "",
    "--",
    PATICKA,
    "",
  ].join("\n");
}

// Jméno odesílatele. Když je v SMTP_FROM jen adresa, přidá se "Remexo".
function odesilatel(): string {
  const z = (Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "").trim();
  if (!z) return "";
  return z.includes("<") ? z : `Remexo <${z}>`;
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

  // Hodnoty od uživatelů: bez řídicích znaků, a to ve verzi pro HTML i pro text
  const c = (v: unknown) => String(v ?? "").replace(RADKY, " ").trim();
  const h = (v: unknown) => esc(c(v));

  let predmet: string, nadpis: string, textHtml: string, textPlain: string, tlacitko: string;

  if (udalost === "nova_poptavka") {
    const radek = [c(kategorie), c(mesto)].filter(Boolean).join(" · ");
    predmet = `Nova poptavka: ${zkratit(nazev, 45)}`;
    nadpis = "Nová poptávka ve tvém okolí";
    textHtml = `<strong>${h(nazev)}</strong>${radek ? `<br>${esc(radek)}` : ""}` +
      `<br><br>Kdo se ozve dřív, má větší šanci zakázku získat.`;
    textPlain = `${c(nazev)}\n${radek ? radek + "\n" : ""}\nKdo se ozve dřív, má větší šanci zakázku získat.`;
    tlacitko = "Zobrazit poptávku";
  } else if (udalost === "nova_nabidka") {
    predmet = `Nova nabidka: ${zkratit(nazev, 45)}`;
    nadpis = "Řemeslník ti poslal nabídku";
    const cenaTxt = c(cena) ? ` za ${c(cena)}` : "";
    textHtml = `Na tvoji poptávku <strong>${h(nazev)}</strong> dorazila nabídka${esc(cenaTxt)}.` +
      `<br><br>Podívej se na ni a rozhodni se, jestli ti sedí.`;
    textPlain = `Na tvoji poptávku "${c(nazev)}" dorazila nabídka${cenaTxt}.\n\n` +
      `Podívej se na ni a rozhodni se, jestli ti sedí.`;
    tlacitko = "Zobrazit nabídku";
  } else if (udalost === "zakazka_hotova") {
    // kategorie nese informaci, komu píšeme
    const zakaznikovi = kategorie === "zakaznik";
    predmet = `Zakazka dokoncena: ${zkratit(nazev, 45)}`;
    nadpis = zakaznikovi ? "Řemeslník označil práci za hotovou" : "Zákazník potvrdil dokončení";
    if (zakaznikovi) {
      textHtml = `U zakázky <strong>${h(nazev)}</strong> je hotovo.<br><br>` +
        `Zkontroluj práci a potvrď dokončení. Pak můžeš řemeslníka ohodnotit — pomůže to dalším lidem při výběru.`;
      textPlain = `U zakázky "${c(nazev)}" je hotovo.\n\n` +
        `Zkontroluj práci a potvrď dokončení. Pak můžeš řemeslníka ohodnotit — pomůže to dalším lidem při výběru.`;
    } else {
      textHtml = `Zákazník potvrdil dokončení zakázky <strong>${h(nazev)}</strong>.<br><br>Díky za odvedenou práci.`;
      textPlain = `Zákazník potvrdil dokončení zakázky "${c(nazev)}".\n\nDíky za odvedenou práci.`;
    }
    tlacitko = "Zobrazit zakázku";
  } else {
    return odpoved(400, { chyba: "Neznámá událost." });
  }

  const html = sablonaHtml(nadpis, textHtml, app, tlacitko);
  const plain = sablonaText(nadpis, textPlain, app, tlacitko);

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

  const from = odesilatel();
  const subject = predmetASCII(predmet);

  let odeslano = 0;
  const chyby: string[] = [];

  for (const email of seznam) {
    try {
      // Každému zvlášť, aby příjemci navzájem neviděli své adresy
      await client.send({
        from,
        to: email,
        subject,
        // Tělo předkódované base64; textová část první, HTML druhá (ta se preferuje)
        mimeContent: [
          {
            mimeType: 'text/plain; charset="utf-8"',
            content: base64Radky(naCRLF(plain)),
            transferEncoding: "base64",
          },
          {
            mimeType: 'text/html; charset="utf-8"',
            content: base64Radky(naCRLF(html)),
            transferEncoding: "base64",
          },
        ],
        headers: { "Auto-Submitted": "auto-generated" },
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
