// === START APLIKACE A KONTROLA SESSION ===
window.addEventListener('load', async () => {
    if (window.sb) {
        const { data: { session } } = await window.sb.auth.getSession();
        if (session && session.user) {
            window.APP_USER = session.user;
            window.APP_ROLE = session.user.user_metadata?.role || "customer";
            const name = session.user.user_metadata?.full_name || "Uživatel";
            const authEl = document.getElementById("auth-screen");
            if (authEl) authEl.classList.add("hidden");
            const appEl = document.getElementById("main-app");
            if (appEl) {
                appEl.classList.remove("hidden");
                appEl.style.opacity = "1";
            }
            window.initApp(window.APP_ROLE, name);
        } else {
            const roleSelect = document.getElementById("view-role-select");
            if (roleSelect) roleSelect.classList.remove("hidden");
        }
    } else {
        const roleSelect = document.getElementById("view-role-select");
        if (roleSelect) roleSelect.classList.remove("hidden");
    }
});

// === HLAVNÍ INICIALIZACE MODULŮ ===
window.initApp = function(role, name) {
    const avatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(name) + "&backgroundColor=" + (role==="customer"?"f59e0b":"0f172a");
    const el = (id) => document.getElementById(id);
    
    if(el("user-name")) el("user-name").innerText = name;
    if(el("user-role-lbl")) el("user-role-lbl").innerText = role==="customer"?"Zákazník":"Řemeslník";
    
    const savedAv = window.APP_USER?.user_metadata?.avatar_url;
    const displayAv = savedAv ? (savedAv + "?v=" + (window.APP_USER?.updated_at||Date.now())) : avatarUrl;
    if(el("user-avatar")) el("user-avatar").src = displayAv;
    
    const tt = el("theme-toggle");
    const uiTheme = () => {
        const d = document.documentElement.classList.contains("dark");
        if (el("theme-toggle-dark-icon")) el("theme-toggle-dark-icon").classList.toggle("hidden", d);
        if (el("theme-toggle-light-icon")) el("theme-toggle-light-icon").classList.toggle("hidden", !d);
    };
    uiTheme();

    if (tt && !tt.dataset.boundTheme) {
        tt.dataset.boundTheme = "1";
        tt.addEventListener("click", () => {
            document.documentElement.classList.toggle("dark");
            try { if (window.localStorage) window.safeStorageSet("color-theme", document.documentElement.classList.contains("dark") ? "dark" : "light"); } catch (e) {}
            uiTheme();
        });
    }

    if (role === "customer" && window.initCustomer) window.initCustomer(name); 
    else if (window.initCraftsman) window.initCraftsman(name);

    setTimeout(() => {
        if(window.APP_USER) {
            const meta = window.APP_USER.user_metadata || {};
            ["prof-name","prof-email","prof-phone","prof-city","prof-bio"].forEach(id => {
                const pel = el(id); if(!pel) return;
                if(id==="prof-name") pel.value = name;
                else if(id==="prof-email") pel.value = window.APP_USER.email||"";
                else if(id==="prof-phone") pel.value = meta.phone||"";
                else if(id==="prof-city") pel.value = meta.city||"";
                else if(id==="prof-bio") pel.value = meta.bio||"";
            });
            if(el("prof-avatar-img")) el("prof-avatar-img").src = displayAv;
            if(el("prof-role-badge")) el("prof-role-badge").innerText = role==="customer"?"Zákazník":"Řemeslník";
        }
    }, 100);

    setTimeout(async () => {
        if (role==="customer") { 
            if (window.loadCustomerRequestsFromDB) await window.loadCustomerRequestsFromDB(); 
            if (window.loadCustomerConversations) await window.loadCustomerConversations(); 
        } else { 
            if (window.loadCraftsmanJobsFromDB) await window.loadCraftsmanJobsFromDB(); 
            if (window.loadCraftsmanConversations) await window.loadCraftsmanConversations(); 
            if (window.loadMarketFromDB) await window.loadMarketFromDB(); 
        }
        
        // AKTIVACE NOTIFIKACÍ
        if (window.initGlobalNotifications) window.initGlobalNotifications();
    }, 500);

    if (window.showToast) {
        setTimeout(() => window.showToast("Vítej, " + name + "! 👋", "Aplikace je připravena.", "success"), 600);
    }
};
