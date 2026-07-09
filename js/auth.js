// === AUTH LOGIKA ===
window.signInWith = async function(provider) {
    if (!window.sb) { alert("Chyba: Supabase není inicializováno"); return; }
    await window.sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: window.location.origin } });
};

window.goToAuth = function(role) {
    window.APP_ROLE = role;
    document.getElementById("role-icon").className = role === "customer" ? "fa-solid fa-house" : "fa-solid fa-toolbox";
    document.getElementById("role-text").innerText = role === "customer" ? "Zákazník" : "Řemeslník";
    document.getElementById("view-role-select").classList.add("hidden");
    document.getElementById("view-auth-form").classList.remove("hidden");
    window.switchTab("login"); window.clearMsg();
};

window.backToRoles = function() {
    document.getElementById("view-auth-form").classList.add("hidden");
    document.getElementById("view-role-select").classList.remove("hidden");
    window.clearMsg();
};

window.switchTab = function(t) {
    window.clearMsg();
    const slider = document.getElementById("tab-slider");
    if (slider) { slider.style.opacity = t==='forgot'?'0':'1'; slider.style.transform = t==="register"?"translateX(100%)":"translateX(0)"; }
    document.getElementById("btn-login").classList.toggle("text-slate-500", t!=="login");
    document.getElementById("btn-reg").classList.toggle("text-slate-500", t!=="register");
    document.getElementById("form-login").classList.toggle("hidden", t!=="login");
    document.getElementById("form-reg").classList.toggle("hidden", t!=="register");
    document.getElementById("form-forgot").classList.toggle("hidden", t!=="forgot");
};

window.showErr = function(m) { const e = document.getElementById("auth-error"); e.innerText = m; e.classList.remove("hidden"); document.getElementById("auth-ok").classList.add("hidden"); };
window.showOk = function(m) { const e = document.getElementById("auth-ok"); e.innerText = m; e.classList.remove("hidden"); document.getElementById("auth-error").classList.add("hidden"); };
window.clearMsg = function() { document.getElementById("auth-error").classList.add("hidden"); document.getElementById("auth-ok").classList.add("hidden"); };

// FUNKCE PRO ZOBRAZENÍ/SKRYTÍ HESLA (OČKO)
window.togglePassword = function(inputId, btnNode) {
    const inp = document.getElementById(inputId);
    const icon = btnNode.querySelector("i");
    if (inp.type === "password") {
        inp.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        inp.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
};

window.doRegister = async function() {
    if (!window.sb) return window.showErr("Chyba připojení.");

    const consentEl = document.getElementById("reg-consent");
    if (consentEl && !consentEl.checked) {
        return window.showErr("Pro vytvoření účtu musíte souhlasit s podmínkami použití a zpracováním osobních údajů.");
    }

    const password = document.getElementById("reg-pass").value;
    const confirmPassword = document.getElementById("reg-pass-confirm").value;

    // --- KONTROLA SHODY HESEL ---
    if (password !== confirmPassword) {
        return window.showErr("Hesla se neshodují. Zkontrolujte je prosím.");
    }

    // --- KONTROLA SÍLY HESLA ---
    if (password.length < 8) { 
        return window.showErr("Heslo musí mít alespoň 8 znaků."); 
    }
    if (!/[A-Z]/.test(password)) { 
        return window.showErr("Heslo musí obsahovat alespoň jedno velké písmeno."); 
    }
    if (!/[0-9]/.test(password)) { 
        return window.showErr("Heslo musí obsahovat alespoň jednu číslici."); 
    }
    // ---------------------------

    const btn = document.getElementById("btn-do-reg");
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Vytvářím...'; btn.disabled = true;
    try {
        const { error } = await window.sb.auth.signUp({ email: document.getElementById("reg-email").value, password: password, options: { data: { full_name: document.getElementById("reg-name").value, role: window.APP_ROLE } } });
        if (error) throw error;
        window.showOk("Účet vytvořen! Nyní se přihlaste.");
        setTimeout(() => window.switchTab("login"), 1800);
    } catch(e) { window.showErr("Chyba: " + e.message); }
    finally { btn.innerHTML = "Vytvořit účet"; btn.disabled = false; }
};

window.doLogin = async function() {
    if (!window.sb) return window.showErr("Chyba připojení.");
    const btn = document.getElementById("btn-do-login");
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Přihlašuji...'; btn.disabled = true;
    try {
        const { data, error } = await window.sb.auth.signInWithPassword({ email: document.getElementById("log-email").value, password: document.getElementById("log-pass").value });
        if (error) throw error;
        window.showOk("Přihlášeno! Spouštím aplikaci...");
        window.APP_USER = data.user;
        const name = data.user.user_metadata?.full_name || "Uživatel";
        setTimeout(() => window.launchApp(window.APP_ROLE, name), 900);
    } catch(e) { window.showErr("Špatný e-mail nebo heslo."); }
    finally { btn.innerHTML = "Přihlásit se"; btn.disabled = false; }
};

window.doResetPassword = async function() {
    if (!window.sb) return window.showErr("Chyba připojení.");
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) return window.showErr("Zadejte prosím svůj e-mail.");
    const btn = document.getElementById("btn-do-forgot");
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Odesílám...'; btn.disabled = true;
    try {
        const { error } = await window.sb.auth.resetPasswordForEmail(email);
        if (error) throw error;
        window.showOk("Odkaz pro obnovu hesla byl odeslán.");
        setTimeout(() => window.switchTab("login"), 4000);
    } catch(e) { window.showErr("Chyba: " + e.message); }
    finally { btn.innerHTML = "Odeslat odkaz"; btn.disabled = false; }
};

window.doLogout = async function() { if(window.sb) await window.sb.auth.signOut(); window.location.reload(); };

// === OTEVÍRÁNÍ A ZAVÍRÁNÍ OKEN PRO HESLO ===
window.openForgotPw = function() {
    const authModal = document.getElementById("auth-modal");
    if(authModal) authModal.classList.add("hidden");
    
    const m = document.getElementById("forgot-pw-modal");
    m.classList.remove("hidden"); void m.offsetWidth; m.classList.add("opacity-100");
};

window.closeForgotPw = function() {
    const m = document.getElementById("forgot-pw-modal");
    if(m){ m.classList.remove("opacity-100"); setTimeout(() => m.classList.add("hidden"), 300); }
};

// === 1. ODESLÁNÍ E-MAILU S ODKAZEM ===
window.sendResetLink = async function() {
    const email = document.getElementById("forgot-pw-email").value.trim();
    if (!email) { window.showToast("Chyba", "Zadejte svůj e-mail.", "error"); return; }
    
    const btn = document.getElementById("btn-send-reset");
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Odesílám...'; btn.disabled = true;

    try {
        const { data, error } = await window.sb.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        
        window.closeForgotPw();
        window.showToast("Odesláno! 📧", "Zkontrolujte si e-mail (i složku Spam).", "success");
    } catch(e) {
        window.showToast("Chyba", e.message, "error");
    } finally {
        btn.innerHTML = orig; btn.disabled = false;
    }
};

// === 2. ODCHYCENÍ KLIKNUTÍ NA E-MAIL ===
if (window.sb) {
    window.sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            const m = document.getElementById("new-pw-modal");
            m.classList.remove("hidden"); void m.offsetWidth; m.classList.add("opacity-100");
        }
    });
}

// === 3. ULOŽENÍ NOVÉHO HESLA ===
window.saveNewPassword = async function() {
    const pw = document.getElementById("new-pw-input").value;
    
    if (pw.length < 8) { window.showToast("Slabé heslo", "Heslo musí mít alespoň 8 znaků.", "error"); return; }
    if (!/[A-Z]/.test(pw)) { window.showToast("Slabé heslo", "Heslo musí obsahovat alespoň jedno velké písmeno.", "error"); return; }
    if (!/[0-9]/.test(pw)) { window.showToast("Slabé heslo", "Heslo musí obsahovat alespoň jednu číslici.", "error"); return; }
    
    const btn = document.getElementById("btn-save-new-pw");
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Ukládám...'; btn.disabled = true;

    try {
        const { data, error } = await window.sb.auth.updateUser({ password: pw });
        if (error) throw error;
        
        const m = document.getElementById("new-pw-modal");
        m.classList.remove("opacity-100"); setTimeout(() => m.classList.add("hidden"), 300);
        
        window.showToast("Heslo změněno! ✅", "Nyní používáte nové heslo.", "success");
    } catch (e) {
        window.showToast("Chyba", "Nepodařilo se změnit heslo: " + e.message, "error");
    } finally {
        btn.innerHTML = orig; btn.disabled = false;
    }
};

window.launchApp = function(role, name) {
    const as = document.getElementById("auth-screen");
    as.style.opacity = "0"; as.style.transition = "opacity 0.4s";
    setTimeout(() => {
        as.classList.add("hidden");
        const app = document.getElementById("main-app");
        app.classList.remove("hidden"); app.style.opacity = "0";
        setTimeout(() => { app.style.transition = "opacity 0.4s"; app.style.opacity = "1"; }, 50);
        window.initApp(role, name);
    }, 400);
};
