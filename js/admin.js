// === SPRÁVA (ADMIN) ===
//
// DŮLEŽITÉ: tenhle soubor NEZAJIŠŤUJE bezpečnost. Rozhoduje databáze -
// každá RPC funkce si na prvním řádku ověří, že volá administrátor.
// Kdyby si někdo tenhle kód v prohlížeči přepsal, nedostane se nikam:
// funkce mu vrátí "Pouze pro administratora".
// Skrývání záložky je pohodlí, ne ochrana.

window.JSEM_ADMIN = false;

window.zjistiAdmina = async function () {
    try {
        const { data, error } = await window.sb.rpc("je_admin");
        window.JSEM_ADMIN = !error && data === true;
    } catch (e) {
        window.JSEM_ADMIN = false;
    }
    return window.JSEM_ADMIN;
};

// ---------- POMOCNÉ ----------
const aEsc = (v) => window.escapeHtml(v == null ? "" : String(v));

function aDatum(t) {
    if (!t) return "—";
    try { return new Date(t).toLocaleString("cs", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return "—"; }
}

function aTabulka(hlavicky, radky) {
    if (!radky.length) return '<p class="text-slate-400 text-center py-10">Zatím nic.</p>';
    return '<div class="overflow-x-auto"><table class="w-full text-sm">'
        + '<thead><tr class="border-b border-slate-200 dark:border-slate-700">'
        + hlavicky.map(h => '<th class="text-left font-extrabold text-[11px] uppercase tracking-wider text-slate-400 pb-2 pr-4 whitespace-nowrap">' + aEsc(h) + '</th>').join("")
        + '</tr></thead><tbody>'
        + radky.map(r => '<tr class="border-b border-slate-100 dark:border-slate-800 last:border-0">'
            + r.map(b => '<td class="py-2.5 pr-4 align-top dark:text-slate-300">' + b + '</td>').join("")
            + '</tr>').join("")
        + '</tbody></table></div>';
}

function aChyba(e) {
    const t = (e && e.message) || "Neznámá chyba";
    return '<div class="text-center py-10"><p class="text-red-500 font-bold mb-1">Nepodařilo se načíst</p>'
        + '<p class="text-sm text-slate-400">' + aEsc(t) + '</p></div>';
}

const aObsah = () => document.getElementById("admin-obsah");

// ---------- ZÁLOŽKY ----------
window.adminZalozka = async function (ktera) {
    window._adminZalozka = ktera;

    document.querySelectorAll(".admin-tab").forEach(b => {
        const aktivni = b.dataset.azal === ktera;
        b.className = "admin-tab px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition "
            + (aktivni
                ? "bg-remexo-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700");
    });

    const cil = aObsah();
    if (!cil) return;
    cil.innerHTML = '<p class="text-slate-400 text-center py-10"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Načítám...</p>';

    try {
        if (ktera === "remeslnici") await adminRemeslnici(cil);
        else if (ktera === "cisla") await adminCisla(cil);
        else if (ktera === "poptavky") await adminPoptavky(cil);
        else if (ktera === "uzivatele") await adminUzivatele(cil);
        else if (ktera === "audit") await adminAudit(cil);
    } catch (e) {
        cil.innerHTML = aChyba(e);
    }
};

// ---------- ŘEMESLNÍCI ----------
async function adminRemeslnici(cil) {
    const { data, error } = await window.sb.rpc("admin_seznam_remeslniku");
    if (error) throw error;

    const radky = (data || []).map(r => [
        '<div class="font-bold dark:text-white">' + aEsc(r.jmeno || "Bez jména") + '</div>'
        + '<div class="text-xs text-slate-400">' + aEsc(r.email) + '</div>',
        aEsc(r.ico || "—"),
        r.overeno
            ? '<span class="inline-block bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">Ověřen</span>'
            : '<span class="inline-block bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap">Čeká</span>',
        String(r.zakazek || 0),
        '<span class="text-xs text-slate-400 whitespace-nowrap">' + aDatum(r.registrovan) + '</span>',
        r.overeno
            ? '<button onclick="window.adminZrusitOvereni(\'' + aEsc(r.uzivatel_id) + '\')" class="text-xs font-bold text-slate-500 hover:text-red-500 whitespace-nowrap">Zrušit ověření</button>'
            : '<button onclick="window.adminOverit(\'' + aEsc(r.uzivatel_id) + '\',\'' + aEsc(r.jmeno || "") + '\')" class="bg-remexo-500 hover:bg-remexo-600 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap">Ověřit</button>'
    ]);

    cil.innerHTML = aTabulka(["Řemeslník", "IČO", "Stav", "Nabídek", "Registrace", ""], radky);
}

window.adminOverit = async function (id, jmeno) {
    const ico = prompt("IČO řemeslníka " + (jmeno || "") + "\n\nZkontroluj ho v živnostenském rejstříku (rzp.gov.cz) a teprve pak potvrď.\nPrázdné pole = ověřeno bez IČO.");
    if (ico === null) return;
    try {
        const { error } = await window.sb.rpc("admin_overit", {
            p_uzivatel: id,
            p_ico: (ico || "").trim() || null,
            p_pozn: "Ověřeno v rejstříku"
        });
        if (error) throw error;
        window.showToast("Řemeslník ověřen", (jmeno || "Profil") + " má teď odznak ověření.", "success");
        window.adminZalozka("remeslnici");
    } catch (e) {
        window.showToast("Nepovedlo se", e.message, "error");
    }
};

window.adminZrusitOvereni = async function (id) {
    const duvod = prompt("Proč ověření rušíš? (zapíše se do záznamů)");
    if (duvod === null) return;
    try {
        const { error } = await window.sb.rpc("admin_zrusit_overeni", { p_uzivatel: id, p_duvod: duvod || null });
        if (error) throw error;
        window.showToast("Ověření zrušeno", "Odznak byl odebrán.", "info");
        window.adminZalozka("remeslnici");
    } catch (e) {
        window.showToast("Nepovedlo se", e.message, "error");
    }
};

// ---------- ČÍSLA ----------
async function adminCisla(cil) {
    const { data, error } = await window.sb.rpc("admin_prehled");
    if (error) throw error;

    cil.innerHTML = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">'
        + (data || []).map(x =>
            '<div class="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">'
            + '<p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">' + aEsc(x.ukazatel) + '</p>'
            + '<p class="text-2xl font-black dark:text-white">' + aEsc(x.hodnota) + '</p></div>').join("")
        + '</div>';
}

// ---------- POPTÁVKY ----------
async function adminPoptavky(cil) {
    const { data, error } = await window.sb.rpc("admin_poptavky", { p_limit: 100 });
    if (error) throw error;

    // Třídy musí být napsané celé. Kdyby se skládaly řetězcem
    // ('bg-' + barva + '-100'), Tailwind by je při buildu neviděl
    // a odznaky by zůstaly bez barvy.
    const odznak = {
        waiting:   "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
        active:    "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
        done:      "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400",
        completed: "bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400"
    };
    const vychozi = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";

    const radky = (data || []).map(r => {
        return [
            '<div class="font-bold dark:text-white max-w-xs truncate">' + aEsc(r.nazev) + '</div>'
            + '<div class="text-xs text-slate-400">' + aEsc(r.kategorie) + ' · ' + aEsc(r.mesto || "—") + '</div>',
            '<span class="inline-block text-xs font-bold px-2.5 py-1 rounded-lg ' + (odznak[r.stav] || vychozi) + '">' + aEsc(r.stav) + '</span>',
            aEsc(r.zakaznik || "—"),
            aEsc(r.remeslnik || "—"),
            '<span class="' + (Number(r.nabidek) === 0 ? "text-red-500 font-bold" : "") + '">' + String(r.nabidek || 0) + '</span>',
            '<span class="text-xs text-slate-400 whitespace-nowrap">' + aDatum(r.vytvoreno) + '</span>'
        ];
    });
    cil.innerHTML = aTabulka(["Poptávka", "Stav", "Zákazník", "Řemeslník", "Nabídek", "Vytvořeno"], radky);
}

// ---------- UŽIVATELÉ ----------
async function adminUzivatele(cil) {
    const { data, error } = await window.sb.rpc("admin_uzivatele", { p_limit: 100 });
    if (error) throw error;

    const radky = (data || []).map(u => [
        '<div class="font-bold dark:text-white">' + aEsc(u.jmeno || "Bez jména") + '</div>'
        + '<div class="text-xs text-slate-400">' + aEsc(u.email) + '</div>',
        aEsc(u.role === "craftsman" ? "Řemeslník" : "Zákazník")
        + (u.overeno ? ' <span class="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>' : ""),
        String(u.poptavek || 0),
        String(u.nabidek || 0),
        '<span class="text-xs text-slate-400 whitespace-nowrap">' + aDatum(u.registrovan) + '</span>',
        '<span class="text-xs text-slate-400 whitespace-nowrap">' + aDatum(u.posledni_prihlaseni) + '</span>'
    ]);
    cil.innerHTML = aTabulka(["Uživatel", "Role", "Poptávek", "Nabídek", "Registrace", "Naposledy"], radky);
}

// ---------- ZÁZNAMY ----------
async function adminAudit(cil) {
    const { data, error } = await window.sb.rpc("admin_audit", { p_limit: 100 });
    if (error) throw error;

    const radky = (data || []).map(z => [
        '<span class="text-xs text-slate-400 whitespace-nowrap">' + aDatum(z.cas) + '</span>',
        '<span class="font-bold dark:text-white">' + aEsc(z.udalost) + '</span>',
        aEsc(z.uzivatel || "—"),
        '<span class="text-xs text-slate-400 font-mono">' + aEsc(JSON.stringify(z.detail || {})) + '</span>'
    ]);
    cil.innerHTML = aTabulka(["Kdy", "Událost", "Kdo", "Podrobnosti"], radky);
}

// ---------- CO POTŘEBUJE POZORNOST ----------
async function adminPozornost() {
    const box = document.getElementById("admin-pozornost");
    if (!box) return;
    try {
        const { data, error } = await window.sb.rpc("admin_pozornost");
        if (error) throw error;

        const dulezite = (data || []).filter(x => Number(x.pocet) > 0);
        if (!dulezite.length) {
            box.innerHTML = '<div class="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-4 text-sm text-green-700 dark:text-green-400 font-bold">'
                + 'Nic nečeká na zásah.</div>';
            return;
        }
        box.innerHTML = '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">'
            + dulezite.map(x =>
                '<div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">'
                + '<div class="flex items-baseline gap-2"><span class="text-2xl font-black text-amber-600 dark:text-amber-400">' + aEsc(x.pocet) + '</span>'
                + '<span class="font-bold text-sm dark:text-white">' + aEsc(x.typ) + '</span></div>'
                + '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">' + aEsc(x.popis) + '</p></div>').join("")
            + '</div>';
    } catch (e) {
        box.innerHTML = "";
    }
}

// ---------- VSTUPNÍ BOD ----------
window.nactiAdmin = async function () {
    await adminPozornost();
    await window.adminZalozka(window._adminZalozka || "remeslnici");
};
