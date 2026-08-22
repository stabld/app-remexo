// js/vzdalenost.js
// ---------------------------------------------------------------------------
// Vzdálenost poptávky od řemeslníkovy základny.
//
// Poloha se bere z města v profilu, ne z GPS prohlížeče. Důvody:
//   * řemeslníka zajímá dojezd z dílny, ne z místa, kde zrovna stojí,
//   * funguje to i na desktopu bez vyskakovacího povolení,
//   * neukládáme nikomu pohyb, jen jeden bod, který si sám zadal.
//
// Přesnost je na úroveň města. Souřadnice poptávek jsou zaokrouhlené na ~100 m,
// takže i tak jde o odhad vzdušnou čarou – rozhraní to nikde netvrdí jinak.
// ---------------------------------------------------------------------------

(function () {
    "use strict";

    var R_ZEME = 6371;

    // Haversine. Vrací km, nebo null, když některý bod chybí.
    window.vzdalenostKm = function (lat1, lon1, lat2, lon2) {
        var b = [lat1, lon1, lat2, lon2].map(parseFloat);
        if (b.some(function (v) { return v == null || isNaN(v); })) return null;
        var dLat = (b[2] - b[0]) * Math.PI / 180;
        var dLon = (b[3] - b[1]) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(b[0] * Math.PI / 180) * Math.cos(b[2] * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R_ZEME * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Základna přihlášeného řemeslníka. null = neznáme, nikde nic neukazujeme.
    window.APP_POLOHA = null;

    window.nactiPolohuRemeslnika = async function () {
        window.APP_POLOHA = null;
        if (!window.sb || !window.APP_USER) return null;
        try {
            var odpoved = await window.sb.from("profiles")
                .select("lat, lon").eq("id", window.APP_USER.id).maybeSingle();
            var d = odpoved.data;
            if (odpoved.error || !d || d.lat == null || d.lon == null) return null;
            window.APP_POLOHA = { lat: parseFloat(d.lat), lon: parseFloat(d.lon) };
            return window.APP_POLOHA;
        } catch (e) { return null; }
    };

    // Přepíše základnu podle textu z profilu. Volá se při uložení profilu.
    // Prázdný text polohu smaže – řemeslník ji musí umět vypnout.
    window.ulozPolohuRemeslnika = async function (mistoText) {
        if (!window.sb || !window.APP_USER) return null;
        var misto = (mistoText || "").trim();

        if (!misto) {
            try {
                await window.sb.from("profiles")
                    .update({ lat: null, lon: null }).eq("id", window.APP_USER.id);
            } catch (e) {}
            window.APP_POLOHA = null;
            return null;
        }

        try {
            var resp = await fetch(
                "https://nominatim.openstreetmap.org/search?format=json&q=" +
                encodeURIComponent(misto + ", Česká republika") + "&limit=1",
                { headers: { "Accept-Language": "cs" } });
            var geo = await resp.json();
            if (!geo || geo.length === 0) return null;

            // Stejné zaokrouhlení jako u poptávek (~100 m). Přesná adresa
            // řemeslníka nemá důvod ležet v databázi.
            var lat = Math.round(parseFloat(geo[0].lat) * 1000) / 1000;
            var lon = Math.round(parseFloat(geo[0].lon) * 1000) / 1000;
            if (isNaN(lat) || isNaN(lon)) return null;

            var vysledek = await window.sb.from("profiles")
                .update({ lat: lat, lon: lon }).eq("id", window.APP_USER.id);
            if (vysledek.error) return null;

            window.APP_POLOHA = { lat: lat, lon: lon };
            return window.APP_POLOHA;
        } catch (e) { return null; }
    };

    // Vzdálenost poptávky od základny. null = jeden z bodů chybí.
    window.vzdalenostPoptavky = function (req) {
        if (!window.APP_POLOHA || !req) return null;
        if (req.lat == null || req.lon == null) return null;
        return window.vzdalenostKm(
            window.APP_POLOHA.lat, window.APP_POLOHA.lon, req.lat, req.lon);
    };

    window.formatVzdalenost = function (km) {
        if (km == null || isNaN(km)) return null;
        if (km < 1)  return "do 1 km";
        if (km < 10) return String(Math.round(km * 10) / 10).replace(".", ",") + " km";
        return Math.round(km) + " km";
    };

    // Odznak na kartu poptávky. Prázdný řetězec, když vzdálenost neznáme –
    // radši nic než vymyšlené číslo.
    window.odznakVzdalenosti = function (req) {
        var km = window.vzdalenostPoptavky(req);
        var text = window.formatVzdalenost(km);
        if (!text) return "";

        var blizko = km <= 10;
        var tridy = blizko
            ? "bg-remexo-50 dark:bg-remexo-500/10 text-remexo-600 dark:text-remexo-400"
            : "bg-slate-100 dark:bg-slate-800";

        return '<span class="' + tridy + ' px-2 py-1 rounded" ' +
               'title="Vzdušnou čarou z místa ve vašem profilu. Orientační údaj.">' +
               '<i class="fa-solid fa-route mr-1.5 opacity-70"></i>' +
               window.escapeHtml(text) + '</span>';
    };

    // ---- ŘAZENÍ ----------------------------------------------------------
    // "nove" = nejnovější první (výchozí), "blizko" = nejbližší první.

    window.RAZENI = "nove";

    window.seradPoptavky = function (pole) {
        var kopie = (pole || []).slice();
        if (window.RAZENI !== "blizko" || !window.APP_POLOHA) return kopie;

        return kopie.sort(function (a, b) {
            var va = window.vzdalenostPoptavky(a);
            var vb = window.vzdalenostPoptavky(b);
            // Poptávky bez souřadnic patří na konec, ne na začátek
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;
            return va - vb;
        });
    };

    window.prepniRazeni = function (jak) {
        if (jak === "blizko" && !window.APP_POLOHA) {
            window.showToast("Nevíme, odkud jezdíte",
                "Doplňte si město v profilu a řazení podle vzdálenosti se zapne.", "info");
            return;
        }
        window.RAZENI = jak;

        ["razeni-nove", "razeni-blizko"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var aktivni = (id === "razeni-" + jak);
            el.className = "shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition " + (aktivni
                ? "bg-remexo-500 text-white shadow-md"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-remexo-500");
        });

        var aktivniFiltr = document.querySelector(".filter-btn.bg-remexo-500");
        var kat = "all";
        if (aktivniFiltr && aktivniFiltr.getAttribute("onclick")) {
            var m = aktivniFiltr.getAttribute("onclick").match(/filterMarket\('([^']*)'/);
            if (m) kat = m[1];
        }
        if (window.filterMarket) window.filterMarket(kat, aktivniFiltr);
    };
})();
