// ========================================================
// === POPTÁVKY, AI ASISTENT, TRŽIŠTĚ, MAPA A PROFIL ===
// ========================================================

window.checkProfileCompletion = function() {
    if (!window.APP_USER) return;
    const meta = window.APP_USER.user_metadata || {};
    // Pokud chybí telefon NEBO město, zobrazíme varovný banner
    const alertElements = document.querySelectorAll("#dash-profile-alert");
    if (!meta.phone || !meta.city) {
        alertElements.forEach(el => el.classList.remove("hidden"));
    } else {
        alertElements.forEach(el => el.classList.add("hidden"));
    }
};

window.extractPhotoFromDesc = function(rawDesc) {
    if (!rawDesc) return { desc: "", photos: [] };
    const parts = rawDesc.split("||PHOTO||");
    const desc = parts[0].trim();
    const photos = [];
    for (let i = 1; i < parts.length; i++) {
        const photoParts = parts[i].split("||MIME||");
        if(photoParts.length >= 2) {
            photos.push({ photo: photoParts[0], mime: photoParts[1].trim() });
        }
    }
    return { desc, photos };
};

// --- HODNOCENÍ ŘEMESLNÍKŮ ---
window.openRatingModal = function(index, sbId) {
    document.getElementById("rating-req-index").value = index;
    document.getElementById("rating-req-sbid").value = sbId;
    window.setRating(5);
    document.getElementById("rating-comment").value = "";
    const modal = document.getElementById("rating-modal");
    if (modal) {
        modal.classList.remove("hidden");
        void modal.offsetWidth;
        modal.classList.add("opacity-100");
    }
};

window.closeRatingModal = function() {
    const modal = document.getElementById("rating-modal");
    if (modal) { 
        modal.classList.remove("opacity-100"); 
        setTimeout(() => modal.classList.add("hidden"), 300); 
    }
};

window.setRating = function(val) {
    window.currentRatingValue = val;
    const stars = document.getElementById("star-rating-container");
    if (stars) {
        stars.querySelectorAll("i").forEach((star, idx) => {
            star.classList.toggle("text-yellow-400", idx < val);
            star.classList.toggle("text-slate-300", idx >= val);
        });
    }
};

window.submitRating = async function() {
    const index = document.getElementById("rating-req-index").value;
    const sbId = document.getElementById("rating-req-sbid").value;
    const btn = document.getElementById("btn-submit-rating");
    const orig = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Ukládám...'; 
    btn.disabled = true;
    
    if (sbId !== "null" && window.sb) {
        try { await window.sb.from("requests").update({ status: "done" }).eq("id", sbId); } catch(e) {}
    }
    
    window.STATE.requests[index].status = "done";
    window.refreshRequestsList(); 
    window.refreshDashboard();
    
    btn.innerHTML = orig; 
    btn.disabled = false;
    window.closeRatingModal();
    window.showToast("Hotovo! ⭐", "Hodnocení bylo odesláno. Děkujeme za důvěru v Remexo!", "success");
};

// --- MAZÁNÍ POPTÁVEK ---
window.confirmDelete = function(index, sbId) {
    window._pendingDelete = { index, sbId };
    const modal = document.getElementById("confirm-modal");
    if (modal) { modal.classList.remove("hidden"); void modal.offsetWidth; modal.classList.add("opacity-100"); }
};

window.closeConfirmModal = function() {
    const modal = document.getElementById("confirm-modal");
    if (modal) { modal.classList.remove("opacity-100"); setTimeout(() => modal.classList.add("hidden"), 300); }
    window._pendingDelete = null;
};

window.doConfirmDelete = function() {
    if (!window._pendingDelete) return;
    const { index, sbId } = window._pendingDelete;
    window.closeConfirmModal();
    window._doDeleteRequest(index, sbId);
};

window._doDeleteRequest = async function(index, sbId) {
    if(sbId && window.sb){
        try {
            await window.sb.from("requests").delete().eq("id", sbId);
            await window.sb.from("offers").delete().eq("request_id", sbId);
            await window.sb.from("messages").delete().eq("conversation_id", String(sbId));
        } catch(e) {}
    }
    window.STATE.requests.splice(index, 1);
    window.refreshRequestsList(); 
    window.refreshDashboard();
    window.showToast("Smazáno", "Poptávka byla úspěšně odstraněna z Remexo.", "info");
};

window.deleteRequest = function(index, sbId) { window.confirmDelete(index, sbId); };

// --- PROFIL A FOTKY ---
window.handleProfilePhoto = async function(input) {
    const file = input.files[0]; if (!file) return;
    if (file.size > 10000000) { window.showToast("Fotka je příliš velká", "Maximální velikost je 10 MB.", "error"); return; }
    
    const compressedBlob = await new Promise(function(resolve) {
        const fr = new FileReader();
        fr.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const MAX = 600; let w = img.width, h = img.height;
                if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
                const canvas = document.createElement("canvas"); canvas.width=w; canvas.height=h;
                canvas.getContext("2d").drawImage(img,0,0,w,h);
                const preview = canvas.toDataURL("image/jpeg", 0.9);
                
                document.querySelectorAll("#prof-avatar-img").forEach(function(el){ el.src=preview; el.style.objectFit="cover"; });
                const mainAvatar = document.getElementById("user-avatar");
                if (mainAvatar) mainAvatar.src = preview;
                
                canvas.toBlob(function(blob){ resolve(blob); }, "image/jpeg", 0.9);
            };
            img.onerror = function() { resolve(null); }; img.src = e.target.result;
        };
        fr.onerror = function() { resolve(null); }; fr.readAsDataURL(file);
    });
    
    if (!compressedBlob) { window.showToast("Chyba", "Nepodařilo se zpracovat obrázek.", "error"); return; }
    if (!window.sb || !window.APP_USER) { window._profilePhotoBlob = compressedBlob; return; }
    
    window.showToast("Nahrávám...", "Ukládám novou profilovou fotku.", "info");
    try {
        const path = window.APP_USER.id + ".jpg";
        const { error: upErr } = await window.sb.storage.from("avatars").upload(path, compressedBlob, { upsert: true, contentType: "image/jpeg" });
        if (upErr) throw new Error(upErr.message);
        
        const { data: urlData } = window.sb.storage.from("avatars").getPublicUrl(path);
        await window.sb.auth.updateUser({ data: { avatar_url: urlData.publicUrl } });
        
        const { data: fresh } = await window.sb.auth.getUser();
        if (fresh?.user) window.APP_USER = fresh.user;
        
        const displayUrl = urlData.publicUrl + "?v=" + Date.now();
        document.getElementById("user-avatar").src = displayUrl;
        document.querySelectorAll("#prof-avatar-img").forEach(function(el){ el.src=displayUrl; });
        
        if (window.APP_USER) delete window._avatarCache[window.APP_USER.id];
        window._profilePhotoBlob = null;
        window.showToast("Fotka nahrána! 📸", "Váš profilový obrázek je aktualizován.", "success");
    } catch(err) { 
        window._profilePhotoBlob = compressedBlob; 
        window.showToast("Chyba při nahrávání", err.message, "error"); 
    }
};

window.saveProfile = async function(btnNode) {
    if (!window.sb || !window.APP_USER) return;
    const orig = btnNode.innerHTML; 
    btnNode.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Ukládám...'; 
    btnNode.disabled = true;
    
    try {
        const updateData = { 
            full_name: document.getElementById("prof-name").value.trim(), 
            phone: document.getElementById("prof-phone").value.trim(), 
            city: document.getElementById("prof-city").value.trim(), 
            bio: document.getElementById("prof-bio")?.value.trim() || "" 
        };
        
        if (window._profilePhotoBlob) {
            btnNode.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Nahrávám fotku...';
            const path = window.APP_USER.id + ".jpg";
            await window.sb.storage.from("avatars").upload(path, window._profilePhotoBlob, { upsert: true, contentType: "image/jpeg" });
            const { data: urlData } = window.sb.storage.from("avatars").getPublicUrl(path);
            updateData.avatar_url = urlData.publicUrl; 
            window._profilePhotoBlob = null;
        }
        
        const { data, error } = await window.sb.auth.updateUser({ data: updateData });
        if (error) throw error;
        
        const freshUser = (await window.sb.auth.getUser()).data?.user || data.user;
        window.APP_USER = freshUser;
        const name = freshUser.user_metadata?.full_name || updateData.full_name;
        const savedAvatarUrl = freshUser.user_metadata?.avatar_url || updateData.avatar_url;
        const displayUrl = savedAvatarUrl || ("https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(name) + "&backgroundColor=" + (window.APP_ROLE==="customer"?"f59e0b":"0f172a"));
        
        // Synchronizace veřejného profilu v DB
        try {
            await window.sb.from('public_profiles').upsert({
                id: window.APP_USER.id,
                full_name: name,
                avatar_url: displayUrl,
                role: window.APP_ROLE,
                city: updateData.city,
                bio: updateData.bio
            });
        } catch (dbErr) { console.error("Veřejný profil neuložen:", dbErr); }

        document.getElementById("user-name").innerText = name;
        document.getElementById("user-avatar").src = displayUrl;
        document.querySelectorAll("#prof-avatar-img").forEach(function(img) { img.src = displayUrl; });
        
        window.showToast("Profil uložen! ✅", "Všechny změny byly úspěšně uloženy.", "success");
        window.checkProfileCompletion();
    } catch(e) { 
        window.showToast("Chyba ukládání", e.message, "error"); 
    } finally { 
        btnNode.innerHTML = orig; 
        btnNode.disabled = false; 
    }
};

// --- AI ASISTENT (BOŘEK) ---
window.callGeminiAPI = async function(parts, systemPrompt, useJson) {
    const res = await fetch('/api/gemini', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ parts, systemPrompt, useJson }) 
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Chyba API komunikace');
    return data.text;
};

window.handlePhoto = async function(input) {
    const files = Array.from(input.files).slice(0, 5);
    if (!files.length) return;

    window.poptPhotos = [];
    const gallery = document.getElementById("photo-gallery");
    const zone = document.getElementById("photo-zone");

    gallery.innerHTML = "";
    gallery.classList.remove("hidden");
    zone.classList.add("hidden");

    for (let file of files) {
        const compressedBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 800; 
                    let w = img.width, h = img.height;
                    if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}} else {if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
                    const canvas = document.createElement("canvas");
                    canvas.width = w; canvas.height = h;
                    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                img.onerror = () => resolve(null);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });

        if (compressedBase64) {
            window.poptPhotos.push({ base64: compressedBase64.split(",")[1], mime: "image/jpeg" });
            const imgEl = document.createElement("img");
            imgEl.src = compressedBase64;
            imgEl.className = "w-full h-20 object-cover rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 pointer-events-auto cursor-pointer hover:opacity-80 transition";
            imgEl.onclick = (e) => { e.stopPropagation(); window.openLightbox(imgEl.src); };
            gallery.appendChild(imgEl);
        }
    }
};

window.appendChat = function(role, text) {
    const box = document.getElementById("popt-chat-msgs");
    const d = document.createElement("div");
    if (role==="user") { 
        d.className="poptavka-bubble-user text-sm font-medium"; 
        d.innerText=text; 
    } else { 
        d.className="poptavka-bubble-ai text-sm flex items-start gap-3"; 
        d.innerHTML='<div class="w-8 h-8 bg-remexo-500 rounded-full flex items-center justify-center text-white shrink-0"><i class="fa-solid fa-hard-hat text-xs"></i></div><div>' + text + '</div>'; 
    }
    box.appendChild(d); 
    box.scrollTop=box.scrollHeight;
};

window.processPopt = async function(text) {
    const loading = document.getElementById("popt-loading");
    const replyArea = document.getElementById("popt-reply-area");
    loading.classList.remove("hidden"); 
    replyArea.classList.add("hidden");
    
    const sp = 'Jsi Bořek, profesionální technik Remexo. Vytvoř zadání pro řemeslníka. ODPOVÍDEJ PŘESNĚ V TOMTO JSON FORMÁTU BEZ DALŠÍHO TEXTU: {"status":"question","message":"otázka"} nebo {"status":"done","nazev":"titulek","kategorie":"obor","popis":"popis","nalehavost":"Vysoká/Střední/Nízká","odhad_ceny":"cena Kč","rada":"rada"}';
    let parts = [{text}];
    
    if (window.poptPhotos && window.poptPhotos.length > 0) {
        window.poptPhotos.forEach(p => {
            parts.push({ inlineData: { mimeType: p.mime, data: p.base64 } });
        });
    }
    
    try {
        const raw = await window.callGeminiAPI(parts, sp, true);
        let clean = raw.replace(/```json/gi,"").replace(/```/g,"").trim();
        const s=clean.indexOf("{"), e=clean.lastIndexOf("}");
        if(s!==-1&&e!==-1) clean=clean.substring(s,e+1);
        const d = JSON.parse(clean);
        
        loading.classList.add("hidden");
        if(d.status==="question") { 
            window.appendChat("ai", d.message.replace(/[*]/g,"")); 
            replyArea.classList.remove("hidden"); 
            document.getElementById("popt-reply").focus(); 
        } else if(d.status==="done") {
            document.getElementById("r-nazev").innerText = d.nazev.replace(/[*]/g,"");
            document.getElementById("r-kat").innerText = d.kategorie.replace(/[*]/g,"");
            document.getElementById("r-nal").innerText = d.nalehavost.replace(/[*]/g,"");
            document.getElementById("r-cena").innerText = d.odhad_ceny.replace(/[*]/g,"");
            document.getElementById("r-popis").innerText = d.popis.replace(/[*]/g,"");
            if(d.rada && d.rada.trim()){
                document.getElementById("popt-tip-text").innerText = d.rada.replace(/[*]/g,"");
                document.getElementById("popt-tip").classList.remove("hidden");
            }
            document.getElementById("popt-result").classList.remove("hidden");
        }
    } catch(err) { 
        loading.classList.add("hidden"); 
        replyArea.classList.remove("hidden"); 
        window.showToast("Chyba AI Bořka", err.message, "error"); 
    }
};
// ... (ostatní funkce zůstávají stejné)
