// ==========================================
// === AUTH LOGIKA PRO APLIKACI REMEXO ===
// ==========================================

// --- Přihlášení přes sociální sítě (OAuth) ---
window.signInWith = async function(provider) {
    if (!window.sb) { 
        if (window.showToast) window.showToast("Chyba", "Supabase není inicializováno", "error");
        else alert("Chyba: Supabase není inicializováno"); 
        return; 
    }
    await window.sb.auth.signInWithOAuth({ 
        provider: provider, 
        options: { redirectTo: window.location.origin } 
    });
};

// --- Výběr role (Zákazník / Řemeslník) a přechod na formulář ---
window.goToAuth = function(role) {
    window.APP_ROLE = role;
    
    // Dynamická změna ikonky a textu podle zvolené role
    const roleIcon = document.getElementById("role-icon");
    const roleText = document.getElementById("role-text");
    
    if (roleIcon) roleIcon.className = role === "customer" ? "fa-solid fa-house" : "fa-solid fa-toolbox";
    if (roleText) roleText.innerText = role === "customer" ? "Zákazník" : "Řemeslník";
    
    // Přepínání obrazovek v auth-screenu
    const roleSelect = document.getElementById("view-role-select");
    const authForm = document.getElementById("view-auth-form");
    
    if (roleSelect) roleSelect.classList.add("hidden");
    if (authForm) authForm.classList.remove("hidden");
    
    window.switchTab("login"); 
    window.clearMsg();
};

// --- Návrat zpět na výběr role ---
window.backToRoles = function() {
    const roleSelect = document.getElementById("view-role-select");
    const authForm = document.getElementById("view-auth-form");
    
    if (authForm) authForm.classList.add("hidden");
    if (roleSelect) roleSelect.classList.remove("hidden");
    window.clearMsg();
};

// --- Přepínání záložek (Přihlášení / Registrace / Zapomenuté heslo) ---
window.switchTab = function(t) {
    window.clearMsg();
    const slider = document.getElementById("tab-slider");
    
    if (slider) { 
        slider.style.opacity = t === 'forgot' ? '0' : '1'; 
        slider.style.transform = t === "register" ? "translateX(100%)" : "translateX(0)"; 
    }
    
    // Úprava vizuálního stavu tlačítek
    const btnLogin = document.getElementById("btn-login");
    const btnReg = document.getElementById("btn-reg");
    if (btnLogin) btnLogin.classList.toggle("text-slate-500", t !== "login");
    if (btnReg) btnReg.classList.toggle("text-slate-500", t !== "register");
    
    // Zobrazení správného formuláře
    const formLogin = document.getElementById("form-login");
    const formReg = document.getElementById("form-reg");
    const formForgot = document.getElementById("form-forgot");
    
    if (formLogin) formLogin.classList.toggle("hidden", t !== "login");
    if (formReg) formReg.classList.toggle("hidden", t !== "register");
    if (formForgot) formForgot.classList.toggle("hidden", t !== "forgot");
};

// --- Pomocné funkce pro chybové / úspěšné hlášky přímo ve formuláři ---
window.showErr = function(m) { 
    const e = document.getElementById("auth-error"); 
    const ok = document.getElementById("auth-ok");
    if (e) { e.innerText = m; e.classList.remove("hidden"); }
    if (ok) ok.classList.add("hidden"); 
};

window.showOk = function(m) { 
    const e = document.getElementById("auth-ok"); 
    const err = document.getElementById("auth-error");
    if (e) { e.innerText = m; e.classList.remove("hidden"); }
    if (err) err.classList.add("hidden"); 
};

window.clearMsg = function() { 
    const err = document.getElementById("auth-error");
    const ok = document.getElementById("auth-ok");
    if (err) err.classList.add("hidden"); 
    if (ok) ok.classList.add("hidden"); 
};

// --- Funkce pro zobrazení/skrytí hesla (kliknutí na ikonku oka) ---
window.togglePassword = function(inputId, btnNode) {
    const inp = document.getElementById(inputId);
    const icon = btnNode.querySelector("i");
    if (!inp || !icon) return;

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

// --- Registrace nového uživatele ---
window.doRegister = async function() {
    if (!window.sb) return window.showErr("Chyba připojení k databázi.");

    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-pass").value;
    const confirmPassword = document.getElementById("reg-pass-confirm").value;

    if (!name || !email) {
        return window.showErr("Vyplňte prosím všechna pole.");
    }

    // Kontrola shody hesel
    if (password !== confirmPassword) {
        return window.showErr("Hesla se neshodují. Zkontrolujte je prosím.");
    }

    // Validace síly hesla
    if (password.length < 8) { 
        return window.showErr("Heslo musí mít alespoň 8 znaků."); 
    }
    if (!/[A-Z]/.test(password)) { 
        return window.showErr("Heslo musí obsahovat alespoň jedno velké písmeno."); 
    }
    if (!/[0-9]/.test(password)) { 
        return window.showErr("Heslo musí obsahovat alespoň jednu číslici."); 
    }

    const btn = document.getElementById("btn-do-reg");
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Vytvářím...'; btn.disabled = true; }
    
    try {
        const { error } = await window.sb.auth.signUp({ 
            email: email, 
            password: password, 
            options: { 
                data: { 
                    full_name: name, 
                    role: window.APP_ROLE 
                } 
            } 
        });
        
        if (error) throw error;
        
        window.showOk("Účet úspěšně vytvořen! Nyní se přihlaste.");
        setTimeout(() => window.switchTab("login"), 1800);
    } catch(e) { 
        window.showErr("Chyba registrace: " + e.message); 
    } finally { 
        if (btn) { btn.innerHTML = "Vytvořit účet"; btn.disabled = false; }
    }
};

// --- Přihlášení uživatele e-mailem a heslem ---
window.doLogin = async function() {
    if (!window.sb) return window.showErr("Chyba připojení k databázi.");
    
    const email = document.getElementById("log-email").value.trim();
    const password = document.getElementById("log-pass").value;
    
    if (!email || !password) return window.showErr("Vyplňte e-mail a heslo.");

    const btn = document.getElementById("btn-do-login");
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Přihlašuji...'; btn.disabled = true; }
    
    try {
        const { data, error } = await window.sb.auth.signInWithPassword({ 
            email: email, 
            password: password 
        });
        
        if (error) throw error;
        
        window.showOk("Přihlášeno! Spouštím Remexo...");
        window.APP_USER = data.user;
        
        // Získání role z metadat uživatele, pokud už existuje, jinak použijeme aktuální volbu
        const finalRole = data.user.user_metadata?.role || window.APP_ROLE || "customer";
        const name = data.user.user_metadata?.full_name || "Uživatel";
        
        setTimeout(() => window.launchApp(finalRole, name), 900);
    } catch(e) { 
        window.showErr("Špatný e-mail nebo heslo."); 
    } finally { 
        if (btn) { btn.innerHTML = "Přihlásit se"; btn.disabled = false; }
    }
};

// --- Žádost o obnovení hesla (Odeslání e-mailu z inline formuláře) ---
window.doResetPassword = async function() {
    if (!window.sb) return window.showErr("Chyba připojení k databázi.");
    
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) return window.showErr("Zadejte prosím svůj e-mail.");
    
    const btn = document.getElementById("btn-do-forgot");
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Odesílám...'; btn.disabled = true; }
    
    try {
        const { error } = await window.sb.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        
        window.showOk("Odkaz pro obnovu hesla byl odeslán na váš e-mail.");
        if (window.showToast) window.showToast("E-mail odeslán! 📧", "Zkontrolujte si doručenou poštu i spam.", "info");
        setTimeout(() => window.switchTab("login"), 4000);
    } catch(e) { 
        window.showErr("Chyba: " + e.message); 
    } finally { 
        if (btn) { btn.innerHTML = "Odeslat odkaz"; btn.disabled = false; }
    }
};

// --- Odhlášení z aplikace ---
window.doLogout = async function() { 
    if (window.sb) await window.sb.auth.signOut(); 
    window.location.reload(); 
};

// --- Odchycení odkazu z e-mailu pro obnovu hesla (Supabase trigger) ---
if (window.sb) {
    window.sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            // Pokud uživatel kliknul na link v e-mailu, otevřeme modal pro zadání nového hesla
            const newPwModal = document.getElementById("new-pw-modal");
            if (newPwModal) {
                newPwModal.classList.remove("hidden"); 
                void newPwModal.offsetWidth; 
                newPwModal.classList.add("opacity-100");
            } else {
                // Alternativní fallback pro inline zobrazení, pokud modal nemáš v HTML
                if (window.showToast) window.showToast("Obnova hesla", "Zadejte své nové heslo v nastavení profilu.", "info");
            }
        }
    });
}

// --- Uložení nově vygenerovaného hesla uživatele ---
window.saveNewPassword = async function() {
    const pw = document.getElementById("new-pw-input").value;
    
    if (pw.length < 8) { window.showToast("Slabé heslo", "Heslo musí mít alespoň 8 znaků.", "error"); return; }
    if (!/[A-Z]/.test(pw)) { window.showToast("Slabé heslo", "Heslo musí obsahovat alespoň jedno velké písmeno.", "error"); return; }
    if (!/[0-9]/.test(pw)) { window.showToast("Slabé heslo", "Heslo musí obsahovat alespoň jednu číslici.", "error"); return; }
    
    const btn = document.getElementById("btn-save-new-pw");
    const orig = btn ? btn.innerHTML : "Uložit";
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Ukládám...'; btn.disabled = true; }

    try {
        const { error } = await window.sb.auth.updateUser({ password: pw });
        if (error) throw error;
        
        const m = document.getElementById("new-pw-modal");
        if (m) { m.classList.remove("opacity-100"); setTimeout(() => m.classList.add("hidden"), 300); }
        
        window.showToast("Heslo změněno! ✅", "Nyní používáte nové heslo.", "success");
        window.switchTab("login");
    } catch (e) {
        window.showToast("Chyba", "Nepodařilo se změnit heslo: " + e.message, "error");
    } finally {
        if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    }
};

// --- Spuštění hlavní aplikace (přechodová animace) ---
window.launchApp = function(role, name) {
    const as = document.getElementById("auth-screen");
    if (!as) return window.initApp(role, name);

    as.style.opacity = "0"; 
    as.style.transition = "opacity 0.4s";
    
    setTimeout(() => {
        as.classList.add("hidden");
        const app = document.getElementById("main-app");
        if (app) {
            app.classList.remove("hidden"); 
            app.style.opacity = "0";
            setTimeout(() => { 
                app.style.transition = "opacity 0.4s"; 
                app.style.opacity = "1"; 
            }, 50);
        }
        window.initApp(role, name);
    }, 400);
};
