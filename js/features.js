// === POPTÁVKY, AI BOŘEK, TRŽIŠTĚ, MAPA A PROFIL ===
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

window.openRatingModal = function(index, sbId) {
    document.getElementById("rating-req-index").value = index;
    document.getElementById("rating-req-sbid").value = sbId;
    window.setRating(5);
    document.getElementById("rating-comment").value = "";
    const modal = document.getElementById("rating-modal");
    modal.classList.remove("hidden"); void modal.offsetWidth; modal.classList.add("opacity-100");
};

window.closeRatingModal = function() {
    const modal = document.getElementById("rating-modal");
    if (modal) { modal.classList.remove("opacity-100"); setTimeout(() => modal.classList.add("hidden"), 300); }
};

window.setRating = function(val) {
    window.currentRatingValue = val;
    document.getElementById("star-rating-container").querySelectorAll("i").forEach((star, idx) => {
        star.classList.toggle("text-yellow-400", idx < val);
        star.classList.toggle("text-slate-300", idx >= val);
    });
};

window.submitRating = async function() {
    const index = document.getElementById("rating-req-index").value;
    const sbId = document.getElementById("rating-req-sbid").value;
    const btn = document.getElementById("btn-submit-rating");
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Ukládám...'; btn.disabled = true;
    if (sbId !== "null" && window.sb) {
        try { await window.sb.from("requests").update({ status: "done" }).eq("id", sbId); } catch(e) {}
    }
    window.STATE.requests[index].status = "done";
    if(window.refreshRequestsList)window.refreshRequestsList(); if(window.refreshDashboard)window.refreshDashboard();
    btn.innerHTML = orig; btn.disabled = false;
    window.closeRatingModal();
    window.showToast("Hotovo! ⭐", "Hodnocení bylo odesláno. Děkujeme!", "success");
};

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
    if(sbId&&window.sb){
        try {
            await window.sb.from("offers").delete().eq("request_id",sbId);
            await window.sb.from("messages").delete().eq("conversation_id",String(sbId));
            const {error}=await window.sb.from("requests").delete().eq("id",sbId);
            if(error){
                window.showToast("Smazání se nezdařilo", error.message || "Zkontrolujte oprávnění (RLS) v databázi.", "error");
                return;
            }
        } catch(e){
            window.showToast("Smazání se nezdařilo", e.message || "Zkuste to prosím znovu.", "error");
            return;
        }
    }
    window.STATE.requests.splice(index,1);
    if(window.refreshRequestsList)window.refreshRequestsList(); if(window.refreshDashboard)window.refreshDashboard();
    window.showToast("Smazáno","Poptávka byla úspěšně smazána.","info");
};

window.deleteRequest = function(index, sbId) { window.confirmDelete(index, sbId); };

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
                document.getElementById("user-avatar").src = preview;
                canvas.toBlob(function(blob){ resolve(blob); }, "image/jpeg", 0.9);
            };
            img.onerror = function() { resolve(null); }; img.src = e.target.result;
        };
        fr.onerror = function() { resolve(null); }; fr.readAsDataURL(file);
    });
    if (!compressedBlob) { window.showToast("Chyba", "Nepodařilo se načíst obrázek.", "error"); return; }
    if (!window.sb || !window.APP_USER) { window._profilePhotoBlob = compressedBlob; return; }
    window.showToast("Nahrávám...", "Ukládám profilovou fotku.", "info");
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
        window.showToast("Fotka nahrána! 📸", "Profilová fotka byla úspěšně uložena.", "success");
    } catch(err) { window._profilePhotoBlob = compressedBlob; window.showToast("Chyba fotky", err.message, "error"); }
};

window.saveProfile = async function(btnNode) {
    if (!window.sb || !window.APP_USER) return;
    const orig = btnNode.innerHTML; btnNode.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Ukládám...'; btnNode.disabled = true;
    try {
        const updateData = { full_name: document.getElementById("prof-name").value.trim(), phone: document.getElementById("prof-phone").value.trim(), city: document.getElementById("prof-city").value.trim(), bio: document.getElementById("prof-bio")?.value.trim()||"" };
        if (window._profilePhotoBlob) {
            btnNode.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Nahrávám fotku...';
            const path = window.APP_USER.id + ".jpg";
            await window.sb.storage.from("avatars").upload(path, window._profilePhotoBlob, { upsert: true, contentType: "image/jpeg" });
            const { data: urlData } = window.sb.storage.from("avatars").getPublicUrl(path);
            updateData.avatar_url = urlData.publicUrl; window._profilePhotoBlob = null;
        }
        const phoneInput = document.getElementById('prof-phone');
    if (phoneInput) {
        const cleanPhone = phoneInput.value.replace(/[\s\-().]/g, '');
        if (cleanPhone.length !== 0 && !/^(\+420|00420)?\d{9}$/.test(cleanPhone)) {
            window.showToast("Chyba", "Telefonní číslo musí mít 9 číslic.", "error");
            return;
        }
    }
        btnNode.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Ukládám profil...';
        const { data, error } = await window.sb.auth.updateUser({ data: updateData });
        if (error) throw error;
        const freshUser = (await window.sb.auth.getUser()).data?.user || data.user;
        window.APP_USER = freshUser;
        const name = freshUser.user_metadata?.full_name || updateData.full_name;
        const savedAvatarUrl = freshUser.user_metadata?.avatar_url || updateData.avatar_url;
        const displayUrl = savedAvatarUrl || ("https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(name) + "&backgroundColor=" + (window.APP_ROLE==="customer"?"f59e0b":"0f172a"));
        
        try {
            await window.sb.from('public_profiles').upsert({
                id: window.APP_USER.id,
                full_name: name,
                avatar_url: displayUrl,
                role: window.APP_ROLE,
                city: updateData.city,
                bio: updateData.bio
            });
        } catch (dbErr) { console.error("Nepodařilo se uložit veřejný profil:", dbErr); }

        document.getElementById("user-name").innerText = name;
        document.getElementById("user-avatar").src = displayUrl;
        document.querySelectorAll("#prof-avatar-img").forEach(function(img) { img.src = displayUrl; });
        window.showToast("Profil uložen! ✅", "Vaše změny byly úspěšně uloženy.", "success");

        // Pokud čekala poptávka z webu na vyplnění profilu, teď ji dokončíme
        if (window.PENDING_POPTAVKA && window.applyPendingPoptavka) {
            setTimeout(() => window.applyPendingPoptavka(), 800);
        }
    } catch(e) { window.showToast("Chyba ukládání", e.message, "error"); }
    finally { btnNode.innerHTML = orig; btnNode.disabled = false; }
};

window.callGeminiAPI = async function(parts, systemPrompt, useJson) {
    const res = await fetch('/api/borek-ai', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({parts, systemPrompt, useJson}) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'API chyba');
    return data.text;
};

window.handlePhoto = async function(input, galleryId, zoneId) {
    galleryId = galleryId || "photo-gallery";
    zoneId = zoneId || "photo-zone";

    const files = Array.from(input.files).slice(0, 5);
    if (!files.length) return;

    window.poptPhotos = window.poptPhotos || [];
    const gallery = document.getElementById(galleryId);
    const zone = document.getElementById(zoneId);

    gallery.innerHTML = "";
    gallery.classList.remove("hidden");
    if (zone) zone.classList.add("hidden");

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

window.appendChat = function(role, text, photos) {
    const box = document.getElementById("popt-chat-msgs");
    const d = document.createElement("div");
    if (role==="user") {
        d.className="poptavka-bubble-user text-sm font-medium";
        d.innerText = text;
        if (photos && photos.length > 0) {
            const grid = document.createElement("div");
            grid.className = "flex flex-wrap gap-2 mt-3";
            photos.forEach(p => {
                const img = document.createElement("img");
                img.src = "data:" + p.mime + ";base64," + p.base64;
                img.className = "w-16 h-16 object-cover rounded-lg border border-white/30 shadow-sm cursor-pointer hover:opacity-80 transition";
                img.onclick = (e) => { e.stopPropagation(); window.openLightbox(img.src); };
                grid.appendChild(img);
            });
            d.appendChild(grid);
        }
    }
    else { d.className="poptavka-bubble-ai text-sm flex items-start gap-3"; d.innerHTML='<div class="w-8 h-8 bg-remexo-500 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden"><img src="/borek-hlava.PNG" alt="Bořek" class="w-full h-full object-contain p-0.5"></div><div>' + text + '</div>'; }
    box.appendChild(d); box.scrollTop=box.scrollHeight;
};

window.processPopt = async function(text) {
    const loading = document.getElementById("popt-loading");
    const replyArea = document.getElementById("popt-reply-area");
    loading.classList.remove("hidden"); replyArea.classList.add("hidden");
    const sp = 'Jsi Bořek, profesionální technik. Vytvoř zadání pro řemeslníka.\nODPOVÍDEJ PŘESNĚ V TOMTO JSON FORMÁTU BEZ DALŠÍHO TEXTU:\n{"status":"question","message":"otázka"} nebo {"status":"done","nazev":"titulek","kategorie":"POUZE JEDNA Z: Instalatérství, Elektrikář, Malíř, Tesař, Zámečník, Ostatní","popis":"popis","nalehavost":"Vysoká/Střední/Nízká","odhad_ceny":"cena Kč","rada":"rada"}';
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
        if(d.status==="question") { window.appendChat("ai",d.message.replace(/[*]/g,"")); replyArea.classList.remove("hidden"); document.getElementById("popt-reply").focus(); }
        else if(d.status==="done") {
            document.getElementById("r-nazev").innerText=d.nazev.replace(/[*]/g,"");
            document.getElementById("r-kat").innerText=d.kategorie.replace(/[*]/g,"");
            document.getElementById("r-nal").innerText=d.nalehavost.replace(/[*]/g,"");
            document.getElementById("r-cena").innerText=d.odhad_ceny.replace(/[*]/g,"");
            document.getElementById("r-popis").innerText=d.popis.replace(/[*]/g,"");
            if(d.rada&&d.rada.trim()){document.getElementById("popt-tip-text").innerText=d.rada.replace(/[*]/g,"");document.getElementById("popt-tip").classList.remove("hidden");}
            document.getElementById("popt-result").classList.remove("hidden");
        }
    } catch(err) { loading.classList.add("hidden"); replyArea.classList.remove("hidden"); window.showToast("Chyba AI", err.message, "error"); }
};

window.startAI = function() {
    const txt = document.getElementById("popt-input").value.trim();
    if(!txt && (!window.poptPhotos || window.poptPhotos.length === 0)){
        window.showToast("Chybí popis","Popište závadu nebo nahrajte fotku.","error");return;
    }
    document.getElementById("popt-form").classList.add("hidden");
    document.getElementById("popt-chat").classList.remove("hidden");
    window.poptHistoryText = txt || "Posílám fotografie k analýze.";
    window.appendChat("user",window.poptHistoryText,window.poptPhotos);
    window.processPopt(window.poptHistoryText);
};

window.replyAI = function() {
    const inp=document.getElementById("popt-reply");
    const txt=inp.value.trim(); if(!txt)return;
    window.appendChat("user",txt); window.poptHistoryText+="\nUpřesnění od uživatele: "+txt;
    inp.value=""; window.processPopt(window.poptHistoryText);
};

window.showFinalizeForm = function() {
    document.getElementById("btn-show-finalize").classList.add("hidden");
    document.getElementById("popt-finalize").classList.remove("hidden");
    document.getElementById("popt-finalize").scrollIntoView({behavior:"smooth"});
};

window.isNearBrno = async function(addressStr) {
    try {
        let resp = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(addressStr + ", Česká republika") + "&limit=1", { headers: { "Accept-Language": "cs" } });
        let geo = await resp.json();

        if (!geo || geo.length === 0) {
            const withoutNumber = addressStr.replace(/\d+\/?\d*[a-zA-Z]?\s*$/, "").trim();
            if (withoutNumber && withoutNumber !== addressStr) {
                resp = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(withoutNumber + ", Česká republika") + "&limit=1", { headers: { "Accept-Language": "cs" } });
                geo = await resp.json();
            }
        }

        if (!geo || geo.length === 0) return null;

        const lat = parseFloat(geo[0].lat), lon = parseFloat(geo[0].lon);
        const BRNO_LAT = 49.1951, BRNO_LON = 16.6068, R = 6371;
        const dLat = (lat - BRNO_LAT) * Math.PI / 180, dLon = (lon - BRNO_LON) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(BRNO_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= 35;
    } catch (e) { return null; }
};

window.publishRequest = async function(btnNode) {
    let orig = "Zveřejnit poptávku na Remexo";
    try {
        if(btnNode&&btnNode.tagName){orig=btnNode.innerHTML;btnNode.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Zpracovávám...';btnNode.disabled=true;}

        // Pojistka pro případ, že by se sem někdo dostal oklikou –
        // hlavní kontrola probíhá už při otevření Nové poptávky
        const chybi = window.chybejiciUdajeProfilu ? window.chybejiciUdajeProfilu() : [];
        if(chybi.length > 0){
            window.showToast("Nejprve vyplňte profil","Chybí: "+chybi.join(", ")+".","error");
            if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;}
            return;
        }

        const getText=(id,def)=>{const el=document.getElementById(id);return el?el.innerText.trim():def;};
        const getValue=(id,def)=>{const el=document.getElementById(id);return el?el.value.trim():def;};
        const title=getText("r-nazev","Nová poptávka"),kat=getText("r-kat","Ostatní"),popis=getText("r-popis",""),nal=getText("r-nal","Střední"),cena=getText("r-cena","Dohodou");
        const street=getValue("f-street",""),city=getValue("f-city",""),phone=getValue("f-phone",""),timeframe=getValue("f-timeframe","Během několika dnů"),property=getValue("f-property","Byt"),parking=getValue("f-parking","Bezproblémové"),budget=getValue("f-budget","");

        const highlightError = (id) => { const el=document.getElementById(id); if(!el)return; el.focus(); el.style.borderColor="#ef4444"; el.style.boxShadow="0 0 0 3px rgba(239,68,68,0.18)"; setTimeout(()=>{el.style.borderColor="";el.style.boxShadow="";},3000); };

        if(!street||!city||!phone){ window.showToast("Chybí kontaktní údaje","Vyplňte ulici, město a telefonní číslo.","error"); if(!street)highlightError("f-street"); else if(!city)highlightError("f-city"); else highlightError("f-phone"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }
        if(street.length<5||!/[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(street)||!/\d/.test(street)){ window.showToast("Neplatná adresa","Zadejte ulici i číslo popisné.","error"); highlightError("f-street"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }
        if(city.length<2||/\d/.test(city)){ window.showToast("Neplatné město","Zadejte název města bez čísel.","error"); highlightError("f-city"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }
        const phoneDigits = phone.replace(/[\s\-().]/g, "");
        if(!/^(\+420|00420)?\d{9}$/.test(phoneDigits)){ window.showToast("Neplatné telefonní číslo","Zadejte platné české číslo (9 číslic), např. +420 731 573 644.","error"); highlightError("f-phone"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }

        const nearBrno = await window.isNearBrno(street + ", " + city);
        if (nearBrno === false) { window.showToast("Mimo oblast působnosti","Momentálně fungujeme jen v Brně a okolí (do 35 km). Mrzí nás to!","error"); highlightError("f-city"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }
        if (nearBrno === null) { window.showToast("Adresu se nepodařilo najít","Zkontrolujte prosím ulici, číslo popisné a město a zkuste to znovu.","error"); highlightError("f-street"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }

        const detailInfo = ["📍 Adresa: "+street+", "+city,"📞 Telefon: "+phone,"📅 Termín: "+timeframe,"🏠 Typ objektu: "+property,"🚗 Parkování: "+parking,...(budget?["💰 Rozpočet: "+budget]:[])].join('\n');
        let finalPopis=popis+"\n\n---\n📋 DOPLŇUJÍCÍ INFORMACE:\n"+detailInfo;
        
        if (window.poptPhotos && window.poptPhotos.length > 0) {
            window.poptPhotos.forEach(p => {
                finalPopis += "\n||PHOTO||" + p.base64 + "||MIME||" + p.mime;
            });
        }

        let sbId=null;
        if(window.sb&&window.APP_USER){
            const cName=document.getElementById("user-name").textContent||"Zákazník";
            const {data,error}=await window.sb.from("requests").insert({customer_id:window.APP_USER.id,customer_name:cName,title,category:kat,description:finalPopis,urgency:nal,price_estimate:cena,status:"waiting"}).select();
            if(!error&&data&&data.length>0) sbId=data[0].id;
        }
        if (!window.STATE) window.STATE = { requests: [], craftJobs: [], marketRequests: [] };
        if (!window.STATE.requests) window.STATE.requests = [];
        window.STATE.requests.unshift({sbId,title,kat,popis:finalPopis,time:new Date().toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"}),status:"waiting"});
        if(window.refreshRequestsList)window.refreshRequestsList(); if(window.refreshDashboard)window.refreshDashboard(); window.poptHistoryText=""; window.poptPhotos=[];
        
        ["popt-input","f-street","f-city","f-phone","f-budget"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
        document.getElementById("popt-chat-msgs").innerHTML=""; 
        const gallery = document.getElementById("photo-gallery");
        if(gallery) { gallery.innerHTML=""; gallery.classList.add("hidden"); }
        const pz=document.getElementById("photo-zone");if(pz){pz.classList.remove("hidden");}
        ["popt-result","popt-tip","popt-chat","popt-finalize"].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add("hidden");});
        document.getElementById("btn-show-finalize").classList.remove("hidden"); document.getElementById("popt-form").classList.remove("hidden");
        if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;}
        window.showToast("Poptávka zveřejněna! 🎉","Nabídky od řemeslníků uvidíte v sekci Moje poptávky.","success");
        window.goTab("requests","Moje poptávky");
    } catch(err) { window.showToast("Chyba","Nastala chyba: "+err.message,"error"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} }
};

// Najde poptávku podle jejího ID (ne podle pořadí v seznamu – to se mění filtrováním)
window.najdiPoptavku = function(id) {
    const data = Array.isArray(window.STATE?.marketRequests) ? window.STATE.marketRequests : [];
    return data.find(r => String(r.id) === String(id)) || null;
};

// VYLEPŠENÍ 2: Kontrola, jestli má řemeslník profil, než pošle nabídku
// Popis poptávky bez kontaktních údajů – pro řemeslníky, kteří ještě nemají zakázku přidělenou
// Vlídná výzva nad Tržištěm – nezavírá dveře, jen říká, co chybí k reakci
window.vyzvaKProfilu = function() {
    const chybi = window.chybejiciUdajeProfilu ? window.chybejiciUdajeProfilu() : [];
    if (chybi.length === 0) return "";
    return '<div class="mb-6 p-5 rounded-3xl border-2 border-remexo-500/40 bg-remexo-50 dark:bg-remexo-500/10 flex flex-col sm:flex-row sm:items-center gap-4">'
        + '<div class="w-12 h-12 rounded-2xl bg-remexo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-remexo-500/30"><i class="fa-solid fa-user-pen text-lg"></i></div>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="font-extrabold dark:text-white leading-tight">Ještě krůček a můžete reagovat</p>'
        + '<p class="text-sm text-slate-600 dark:text-slate-300 mt-1">Poptávky si můžete prohlížet i teď. Abyste mohl poslat nabídku, doplňte: <strong>' + chybi.join(", ") + '</strong>.</p>'
        + '</div>'
        + '<button onclick="window.goTab(\'profile\',\'Můj profil\')" class="shrink-0 bg-remexo-500 hover:bg-remexo-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-md hover:scale-105">Doplnit profil</button>'
        + '</div>';
};

window.popisBezKontaktu = function(popis) {
    const text = popis || "";
    if (!text.includes("---")) return text;

    const casti = text.split("---");
    const hlavni = (casti[0] || "").trim();
    const zbytek = (casti[1] || "").replace("📋 DOPLŇUJÍCÍ INFORMACE:", "").trim();

    const radky = zbytek.split(/\r?\n/).map(r => r.trim()).filter(Boolean)
        .filter(r => !r.startsWith("📞"))          // telefon pryč
        .map(r => {
            if (r.startsWith("📍")) {              // z adresy zůstane jen město
                const c = r.split(",");
                const mesto = c.length > 1 ? c[c.length - 1].trim() : r.replace(/^📍\s*Adresa:\s*/, "").trim();
                return "📍 " + mesto;
            }
            return r;
        });

    return hlavni + (radky.length ? "\n\n📋 DOPLŇUJÍCÍ INFORMACE:\n" + radky.join("\n") : "");
};

window.openOfferModal = function(id) {
    const chybiVProfilu = window.chybejiciUdajeProfilu ? window.chybejiciUdajeProfilu() : [];
    if (chybiVProfilu.length > 0) {
        window.showToast("Nejprve vyplňte profil", "Než začnete posílat nabídky, doplňte: " + chybiVProfilu.join(", ") + ".", "error");
        window.goTab("profile", "Můj profil");
        return;
    }

    if (window.uzJsemNabidl && window.uzJsemNabidl(id)) {
        const stav = window.stavMeNabidky(id);
        window.showToast(
            "Nabídku jste už poslal",
            stav === "accepted" ? "Tuto zakázku už máte přidělenou." : "Nabídka čeká na rozhodnutí zákazníka.",
            "info"
        );
        return;
    }

    const req=window.najdiPoptavku(id);if(!req)return;
    document.getElementById("co-req-id").value=req.id;
    document.getElementById("co-req-title").value=req.title;
    document.getElementById("co-title").innerText=req.title;
    document.getElementById("co-cat").innerText=req.category||"Ostatní";
    document.getElementById("co-urg").innerText=req.urgency||"Střední";
    let extracted=window.extractPhotoFromDesc(req.description);
    document.getElementById("co-desc").innerHTML=window.popisBezKontaktu(extracted.desc).replace(/\n/g,"<br>");
    document.getElementById("co-price").value=req.price_estimate||"Dohodou";
    document.getElementById("co-msg").value='Dobrý den, mám zájem o vaši zakázku "' + req.title + '". Mám čas a vybavení, mohu pomoci.';
    
    const photoWrap = document.getElementById("co-photo-wrap");
    if(extracted.photos && extracted.photos.length > 0) {
        photoWrap.innerHTML = '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4"></div>';
        const grid = photoWrap.querySelector('div');
        extracted.photos.forEach(p => {
            const img = document.createElement("img");
            img.src = "data:" + p.mime + ";base64," + p.photo;
            img.className = "w-full h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:opacity-80 transition";
            img.onclick = () => window.openLightbox(img.src);
            grid.appendChild(img);
        });
        photoWrap.classList.remove("hidden");
    } else {
        photoWrap.classList.add("hidden");
        photoWrap.innerHTML = "";
    }

    const modal=document.getElementById("craftsman-offer-modal");
    modal.classList.remove("hidden");void modal.offsetWidth;modal.classList.add("opacity-100");
};

window.closeOfferModal = function() {
    const modal=document.getElementById("craftsman-offer-modal");
    if(modal){modal.classList.remove("opacity-100");setTimeout(()=>modal.classList.add("hidden"),300);}
};

window.submitCraftsmanOffer = async function() {
    const btn=document.getElementById("co-submit-btn"); const orig=btn.innerHTML;
    const requestId=document.getElementById("co-req-id").value; const title=document.getElementById("co-req-title").value;
    const price=document.getElementById("co-price").value.trim(); const msg=document.getElementById("co-msg").value.trim();
    if(!msg){window.showToast("Chybí zpráva","Napište zákazníkovi alespoň krátkou zprávu.","error");return;}
    if(!window.sb||!window.APP_USER){window.showToast("Nepřihlášen","Musíte se nejprve přihlásit.","error");return;}
    btn.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Odesílám...';btn.disabled=true;
    try {
        const jmenoRemeslnika = document.getElementById("user-name").innerText;
        const predchoziStav = window.stavMeNabidky ? window.stavMeNabidky(requestId) : null;

        // Zakázku už mezitím mohl někdo dostat – ověříme si to čerstvě z databáze
        const { data: aktualni } = await window.sb.from("requests")
            .select("status").eq("id", requestId).maybeSingle();
        if (aktualni && aktualni.status !== "waiting") {
            window.showToast("Zakázka už není volná", "Zákazník si mezitím vybral jiného řemeslníka.", "info");
            btn.innerHTML=orig;btn.disabled=false;
            window.closeOfferModal();
            if (window.loadMarketFromDB) window.loadMarketFromDB();
            return;
        }

        let novyPocetPokusu = 1;
        let error;
        if (predchoziStav === "rejected") {
            novyPocetPokusu = (window.pocetPokusu ? window.pocetPokusu(requestId) : 1) + 1;
            if (novyPocetPokusu > window.MAX_POKUSU) {
                window.showToast("Další pokus už nelze poslat", "U jedné poptávky můžete zkusit nabídku nejvýše " + window.MAX_POKUSU + "×.", "error");
                btn.innerHTML=orig;btn.disabled=false;
                window.closeOfferModal();
                return;
            }
            // Zákazník nás minule odmítl – nabídku přepíšeme novou místo zakládání další
            ({ error } = await window.sb.from("offers")
                .update({ message: msg, price: price||"Dohodou", status: "pending", craftsman_name: jmenoRemeslnika, pokusy: novyPocetPokusu })
                .eq("request_id", requestId).eq("craftsman_id", window.APP_USER.id));
        } else {
            ({ error } = await window.sb.from("offers")
                .insert({request_id:requestId,craftsman_id:window.APP_USER.id,craftsman_name:jmenoRemeslnika,message:msg,price:price||"Dohodou",status:"pending"}));
        }

        if(error){
            // 23505 = databáze odmítla druhou nabídku na tutéž poptávku
            if(error.code === "23505"){
                if(window._mojeNabidky) window._mojeNabidky.set(String(requestId), { stav: "pending", pokusy: novyPocetPokusu });
                window.showToast("Nabídku jste už poslal","Na jednu poptávku lze reagovat jen jednou.","info");
                btn.innerHTML=orig;btn.disabled=false;
                window.closeOfferModal();
                return;
            }
            throw error;
        }
        if(window._mojeNabidky) window._mojeNabidky.set(String(requestId), { stav: "pending", pokusy: novyPocetPokusu });
        btn.innerHTML='<i class="fa-solid fa-check mr-2"></i>Odesláno!';
        btn.className=btn.className.replace("bg-remexo-500 hover:bg-remexo-600","bg-green-500");
        window.showToast("Nabídka odeslána! 🎉","Jakmile ji zákazník přijme, otevře se vám chat.","success");
        window.STATE.craftJobs.push({title,requestId,status:"pending",time:new Date().toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"})});
        window.refreshCraftsmanJobs();
        // Do chatu se dostane až ve chvíli, kdy zákazník nabídku přijme
        setTimeout(()=>{window.closeOfferModal();btn.innerHTML=orig;btn.disabled=false;btn.className=btn.className.replace("bg-green-500","bg-remexo-500 hover:bg-remexo-600");window.goTab("jobs","Moje práce");},1000);
    } catch(e){btn.innerHTML=orig;btn.disabled=false;window.showToast("Chyba odesílání",e.message,"error");}
};

window.loadOffersForRequest = async function(requestId, requestTitle) {
    if(!window.sb)return;

    // U přidělené nebo dokončené zakázky se už další nabídky přijímat nedají
    const { data: poptavka } = await window.sb.from("requests")
        .select("status").eq("id", requestId).maybeSingle();
    const jeUzavrena = !!(poptavka && poptavka.status !== "waiting");
    const stavHtml = (o) => '<div class="text-center text-sm font-bold text-slate-400 py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">'
        + (o.status === "accepted" ? "✅ Tuto nabídku jste přijal"
            : (poptavka && poptavka.status === "done" ? "Zakázka je dokončená" : "Zakázka je už přidělená"))
        + '</div>';

    const {data:offers}=await window.sb.from("offers").select("*").eq("request_id",requestId).neq("status", "rejected").order("created_at",{ascending:false});
    
    document.getElementById("offers-modal-title").innerText=requestTitle;
    const modalList=document.getElementById("offers-modal-list");
    
    if(!offers||offers.length===0){
        modalList.innerHTML='<div class="text-center text-slate-400 py-12"><i class="fa-solid fa-inbox text-4xl mb-4 block"></i><p>Zatím žádné aktivní nabídky.</p></div>';
    } else {
        modalList.innerHTML=offers.map(o=>'<div class="p-5 border border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50"><div class="flex items-center gap-4 mb-4 cursor-pointer hover:opacity-75 transition" onclick="window.openPublicProfile(\'' + o.craftsman_id + '\')"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(o.craftsman_name) + '&backgroundColor=0f172a" class="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 dark:border-slate-700"><div><p class="font-extrabold dark:text-white">' + o.craftsman_name + '</p><p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">' + new Date(o.created_at).toLocaleDateString("cs") + '</p></div><span class="ml-auto font-black text-lg text-remexo-500">' + o.price + '</span></div><p class="text-sm text-slate-600 dark:text-slate-300 mb-5 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-700">' + o.message + '</p>' + (jeUzavrena ? stavHtml(o) : '<div class="flex gap-2"><button onclick="window.rejectOffer(this, ' + o.id + ',' + requestId + ',\'' + (requestTitle||"").replace(/'/g,"\\'") + '\')" class="px-5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 rounded-xl transition shadow-sm"><i class="fa-solid fa-times text-lg"></i></button><button onclick="window.acceptOffer(' + o.id + ',' + requestId + ',\'' + (o.craftsman_name||"").replace(/'/g,"\\'") + '\'); window.closeOffersModal();" class="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-bold text-sm transition shadow-md hover:scale-[1.02]">Přijmout a zahájit zprávy</button></div>') + '</div>').join("");
    }
    const modal=document.getElementById("offers-modal");modal.classList.remove("hidden");void modal.offsetWidth;modal.classList.add("opacity-100");
};

window.rejectOffer = async function(btnNode, offerId, requestId, requestTitle) {
    if(!window.sb) return;
    btnNode.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-lg"></i>';
    btnNode.disabled = true;
    try {
        await window.sb.from("offers").update({status: "rejected"}).eq("id", offerId);
        window.showToast("Nabídka skryta", "Řemeslník byl odmítnut.", "info");
        window.loadOffersForRequest(requestId, requestTitle);
    } catch(e) {
        window.showToast("Chyba", "Nepodařilo se odmítnout nabídku.", "error");
        btnNode.innerHTML = '<i class="fa-solid fa-times text-lg"></i>';
        btnNode.disabled = false;
    }
};

window.acceptOffer = async function(offerId, requestId, craftsmanName) {
    if(!window.sb)return;

    // Zakázka už mohla být přidělena nebo dokončená – jinou nabídku už přijmout nelze
    const { data: stavPoptavky } = await window.sb.from("requests")
        .select("status").eq("id", requestId).maybeSingle();
    if (stavPoptavky && stavPoptavky.status !== "waiting") {
        window.showToast(
            stavPoptavky.status === "done" ? "Zakázka je dokončená" : "Zakázka je už přidělená",
            "Další nabídku k ní přijmout nelze.",
            "info"
        );
        window.closeOffersModal();
        return;
    }

    // Údaje o nabídce potřebujeme na víc míst – načteme je jednou dopředu
    const { data: nabidka } = await window.sb.from("offers")
        .select("message, craftsman_id, craftsman_name").eq("id", offerId).maybeSingle();

    const { error: chybaNabidky } = await window.sb.from("offers").update({status:"accepted"}).eq("id",offerId);
    if (chybaNabidky) {
        window.showToast("Nepodařilo se přijmout nabídku", chybaNabidky.message || "Zkuste to prosím znovu.", "error");
        return;
    }

    const { error: chybaPoptavky } = await window.sb.from("requests")
        .update({status:"active",craftsman_name:craftsmanName,craftsman_id:(nabidka?.craftsman_id||null)}).eq("id",requestId);
    if (chybaPoptavky) {
        // Vrátíme nabídku zpět, ať nezůstane přijatá u poptávky, která je pořád volná
        await window.sb.from("offers").update({status:"pending"}).eq("id",offerId);
        window.showToast("Nepodařilo se přijmout nabídku", chybaPoptavky.message || "Zkuste to prosím znovu.", "error");
        return;
    }

    // Ostatní nabídky u téhle poptávky už nemají smysl
    try {
        await window.sb.from("offers").update({status:"rejected"})
            .eq("request_id", requestId).neq("id", offerId).eq("status", "pending");
    } catch(e) {}


    // Teprve teď zakládáme konverzaci – úvodní zprávou je text z přijaté nabídky
    try {
        if (nabidka && nabidka.message) {
            const { data: existujici } = await window.sb.from("messages")
                .select("id").eq("conversation_id", String(requestId)).limit(1);
            if (!existujici || existujici.length === 0) {
                await window.sb.from("messages").insert({
                    conversation_id: String(requestId),
                    sender_id: nabidka.craftsman_id,
                    sender_name: nabidka.craftsman_name || craftsmanName,
                    text: nabidka.message,
                    senderrole: "craftsman"
                });
            }
        }
    } catch(e) {}

    window.showToast("Nabídka přijata! ✅","Zahajujete spolupráci s "+craftsmanName+".","success");
    const req=window.STATE.requests.find(r=>r.sbId===requestId);if(req){req.status="active";req.craftsman_name=craftsmanName;}
    if(window.refreshRequestsList)window.refreshRequestsList();if(window.refreshDashboard)window.refreshDashboard();
    window.activeChatId=String(requestId);
    window.goTab("messages","Zprávy");

    // Seznam konverzací musí doběhnout dřív, než konverzaci otevřeme
    if(window.loadCustomerConversations) await window.loadCustomerConversations();
    const idRemeslnika = nabidka?.craftsman_id || null;
    window.openConversation(requestId, craftsmanName, "craftsman"+requestId, idRemeslnika);
};

window.closeOffersModal = function() { const modal=document.getElementById("offers-modal"); if(modal){modal.classList.add("hidden");modal.classList.remove("opacity-100");} };

window.refreshCraftsmanJobs = function() {
    const completed=window.STATE.craftJobs.filter(j=>j.status==="done"||j.status==="completed").length;
    const cnt=document.getElementById("jobs-active-count");if(cnt)cnt.innerText=window.STATE.craftJobs.length-completed;
    const doneCnt=document.getElementById("jobs-done-count");if(doneCnt)doneCnt.innerText=completed;
    const list=document.getElementById("my-jobs-list");if(!list)return;
    list.querySelector(".text-center")?.remove();list.innerHTML="";
    window.STATE.craftJobs.forEach(job=>{
        const d=document.createElement("div"); d.className="bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm fade-up";
        let badge='<span class="status-badge status-waiting">Čekám na odpověď</span>';
        if(job.status==="accepted"||job.status==="active")badge='<span class="status-badge status-active">Aktivní zakázka</span>';
        if(job.status==="done"||job.status==="completed")badge='<span class="status-badge status-done">Dokončeno</span>';
        // Kontakty na zákazníka se odemknou, až je zakázka opravdu jeho
        const jeMoje = job.status==="accepted"||job.status==="active"||job.status==="done";
        let kontaktyHtml = "";
        if (jeMoje && job.popis && job.popis.includes("---")) {
            const detaily = (job.popis.split("---")[1]||"").replace("📋 DOPLŇUJÍCÍ INFORMACE:","").trim()
                .split(/\r?\n/).map(r=>r.trim()).filter(Boolean);
            if (detaily.length) {
                kontaktyHtml = '<div class="mt-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">'
                    + '<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Kontakt na zákazníka</p>'
                    + '<p class="text-sm font-bold dark:text-white mb-2">' + job.zakaznik + '</p>'
                    + '<div class="flex flex-wrap gap-2">'
                    + detaily.map(r=>'<span class="text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">'+r+'</span>').join("")
                    + '</div></div>';
            }
        }
        d.innerHTML='<div class="flex items-start justify-between mb-4"><div><h4 class="font-extrabold text-lg dark:text-white leading-tight">' + job.title + '</h4><p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">' + job.time + '</p></div>' + badge + '</div>' + kontaktyHtml + '<button onclick="window.activeChatId=\'' + job.requestId + '\'; window.goTab(\'c-messages\',\'Zprávy\'); setTimeout(()=>window.openConversation(\'' + job.requestId + '\',\'Zákazník\',\'customer' + job.requestId + '\'),300);" class="text-sm font-bold text-remexo-500 hover:text-remexo-600 transition flex items-center gap-2"><i class="fa-regular fa-comment-dots"></i> Napsat zákazníkovi</button>';
        list.appendChild(d);
    });
};

window.loadCraftsmanJobsFromDB = async function() {
    if(!window.sb||!window.APP_USER)return;
    const {data}=await window.sb.from("offers").select("*, requests(title, category, status, description, customer_name)").eq("craftsman_id",window.APP_USER.id);
    if(data&&data.length>0){
        window.STATE.craftJobs=data.map(o=>{ let s=o.status;if(o.requests?.status==="done")s="done"; return {title:o.requests?.title||"Zakázka",requestId:o.request_id,status:s,popis:o.requests?.description||"",zakaznik:o.requests?.customer_name||"Zákazník",time:new Date(o.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"})}; });
        window.refreshCraftsmanJobs();
    }
};

window.loadCustomerRequestsFromDB = async function() {
    if(!window.sb||!window.APP_USER)return;
    const {data}=await window.sb.from("requests").select("*").eq("customer_id",window.APP_USER.id).order("created_at",{ascending:false});
    if(data&&data.length>0){
        // Ke každé poptávce spočítáme čekající nabídky, ať je zákazník vidí bez klikání
        const pocty = {};
        try {
            const { data: nabidky } = await window.sb.from("offers")
                .select("request_id, status")
                .in("request_id", data.map(r=>r.id));
            (nabidky||[]).forEach(o=>{
                if(o.status === "rejected") return;
                pocty[String(o.request_id)] = (pocty[String(o.request_id)]||0) + 1;
            });
        } catch(e) {}

        window.STATE.requests=data.map(r=>({sbId:r.id,title:r.title,kat:r.category,popis:r.description,time:new Date(r.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"}),status:r.status,craftsman_name:r.craftsman_name||null,pocetNabidek:pocty[String(r.id)]||0}));
        if(window.refreshRequestsList)window.refreshRequestsList();if(window.refreshDashboard)window.refreshDashboard();
        if(window.aktualizujBublinuNabidek)window.aktualizujBublinuNabidek();
    }
};

window.loadMarketFromDB = async function() {
    const list=document.getElementById("market-list");if(!list||!window.sb)return;
    const {data,error}=await window.sb.from("requests").select("*").eq("status","waiting").order("created_at",{ascending:false});
    if(error||!data||data.length===0){list.innerHTML='<div class="text-center p-16 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl"><i class="fa-solid fa-inbox text-5xl text-slate-300 dark:text-slate-600 mb-5 block"></i><p class="font-bold text-slate-500 text-lg">Zatím žádné poptávky ve vašem okolí.</p></div>';return;}
    window.STATE.marketRequests=data;
    if(window.nactiOblibene) await window.nactiOblibene();
    if(window.nactiMojeNabidky) await window.nactiMojeNabidky();
    list.innerHTML=(window.vyzvaKProfilu?window.vyzvaKProfilu():"")+data.map((r,i)=>window.createBeautifulCard({id:r.id,sbId:r.id,title:r.title,kat:r.category||"Ostatní",popis:r.description||"",time:new Date(r.created_at).toLocaleDateString("cs"),status:r.status,urgency:r.urgency||"Střední",category:r.category,customer_name:r.customer_name||"Zákazník",price_estimate:r.price_estimate||"Dohodou"},true,i)).join("");
};

window.toggleMarketView = async function(mode) {
    const listEl=document.getElementById("market-list"),mapEl=document.getElementById("market-map");
    const btnList=document.getElementById("toggle-list"),btnMap=document.getElementById("toggle-map");
    if(!listEl||!mapEl)return;
    if(mode==="map"){
        listEl.classList.add("hidden");mapEl.classList.remove("hidden");
        if(btnList)btnList.className=btnList.className.replace("bg-remexo-500 text-white","text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700");
        if(btnMap)btnMap.className=btnMap.className.replace("text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700","bg-remexo-500 text-white");
        if(window.loadMarketFromDB) await window.loadMarketFromDB();
        await window.initMarketMap();
    } else {
        mapEl.classList.add("hidden");listEl.classList.remove("hidden");
        if(btnMap)btnMap.className=btnMap.className.replace("bg-remexo-500 text-white","text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700");
        if(btnList)btnList.className=btnList.className.replace("text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700","bg-remexo-500 text-white");
    }
};

window.initMarketMap = async function() {
    const mapEl=document.getElementById("market-map");if(!mapEl)return;
    window._marketMarkers={};
    if(window._marketMap){window._marketMap.eachLayer(l=>{if(l instanceof L.Marker)window._marketMap.removeLayer(l);});}
    else{window._marketMap=L.map("market-map").setView([49.8,15.5],8);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(window._marketMap);}
    const vsechny=window.STATE.marketRequests||[];
    // Mapa musí ukazovat totéž co seznam – tedy podle zvoleného filtru
    const filtr=window._aktivniFiltr||"all";
    const requests = filtr==="all" ? vsechny
        : filtr==="saved" ? vsechny.filter(r=>window.jeOblibena(r.id))
        : vsechny.filter(r=>window.kategorieSedi(r.category, filtr));
    if(requests.length===0)return;
    const pinIcon=L.divIcon({className:"",html:'<div style="background:#f59e0b;color:white;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(245,158,11,0.45);border:2px solid white;"><i class="fa-solid fa-hammer" style="transform:rotate(45deg);font-size:13px;"></i></div>',iconSize:[36,36],iconAnchor:[18,36],popupAnchor:[0,-38]});
    const bounds=[];
    for(let i=0;i<requests.length;i++){
        const r=requests[i];
        const addrMatch=(r.description||"").match(/Adresa:\s*([^\n📞📅🏠🚗]+)/);
        const addr=addrMatch?addrMatch[1].trim():(r.category+", Česká republika");
        const addrParts=addr.split(",");
        const displayCity=addrParts.length>1?addrParts[addrParts.length-1].trim():addr;
        try{
            const resp=await fetch("https://nominatim.openstreetmap.org/search?format=json&q="+encodeURIComponent(addr+", Česká republika")+"&limit=1",{headers:{"Accept-Language":"cs"}});
            const geo=await resp.json();
            if(geo&&geo.length>0){
                const lat=parseFloat(geo[0].lat),lon=parseFloat(geo[0].lon);bounds.push([lat,lon]);
                const urgencyColor=r.urgency==="Vysoká"?"#ef4444":r.urgency==="Nízká"?"#22c55e":"#f59e0b";
                const popup=L.popup({maxWidth:280,minWidth:220}).setContent('<div class="remexo-pin-popup"><span class="cat-badge">'+(r.category||"Ostatní")+'</span><p class="title">'+(r.title||"Poptávka")+'</p><p class="addr"><i class="fa-solid fa-location-dot" style="color:#f59e0b;margin-right:4px"></i>'+displayCity+'</p><div style="display:flex;gap:8px;margin-bottom:10px"><span style="font-size:11px;font-weight:700;color:'+urgencyColor+';background:'+urgencyColor+'18;padding:3px 8px;border-radius:6px;">'+(r.urgency||"Střední")+' priorita</span>'+(r.price_estimate?'<span style="font-size:11px;font-weight:700;color:#0f172a;background:#f1f5f9;padding:3px 8px;border-radius:6px;">'+r.price_estimate+'</span>':'')+'</div><button class="offer-btn" onclick="window.openOfferModal(\''+r.id+'\'); document.querySelectorAll(\'.leaflet-popup-close-button\').forEach(b=>b.click());">Poslat nabídku →</button><button onclick="window.showRequestDetail(\''+r.id+'\')" style="width:100%;margin-top:6px;padding:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">Zobrazit detail poptávky</button></div>');
                const marker=L.marker([lat,lon],{icon:pinIcon}).addTo(window._marketMap).bindPopup(popup);
                window._marketMarkers[r.id]=marker;
            }
        }catch(e){}
    }
    if(bounds.length>0)window._marketMap.fitBounds(bounds,{padding:[40,40],maxZoom:13});
    setTimeout(()=>window._marketMap&&window._marketMap.invalidateSize(),100);
};

// Ze seznamu na mapu – přepne pohled a otevře bublinu u konkrétní poptávky
window.showOnMap = async function(id) {
    const req = window.najdiPoptavku(id);
    if(!req) return;

    window.showToast("Hledám na mapě…", (req.title||"Poptávka"), "info");
    await window.toggleMarketView("map");

    const marker = window._marketMarkers && window._marketMarkers[id];
    if(!marker){
        window.showToast("Adresu nelze zobrazit","U této poptávky se nepodařilo najít přesné místo na mapě.","error");
        return;
    }

    window._marketMap.setView(marker.getLatLng(), 15, { animate: true });
    marker.openPopup();
};

// Z mapy zpět do seznamu – najde kartu poptávky a zvýrazní ji
window.showRequestDetail = async function(id) {
    document.querySelectorAll(".leaflet-popup-close-button").forEach(b=>b.click());
    await window.toggleMarketView("list");

    const filterAll = document.getElementById("filter-all");
    if(filterAll) window.filterMarket("all", filterAll);

    setTimeout(()=>{
        const karta = document.getElementById("market-card-"+id);
        if(!karta) return;
        karta.scrollIntoView({ behavior:"smooth", block:"center" });
        karta.style.transition = "box-shadow .3s, border-color .3s";
        karta.style.borderColor = "#f59e0b";
        karta.style.boxShadow = "0 0 0 4px rgba(245,158,11,0.25)";
        setTimeout(()=>{ karta.style.borderColor=""; karta.style.boxShadow=""; }, 2500);
    }, 150);
};

// Kategorie píše AI sama, takže se liší velikost písmen i tvar slova
// ("instalatérství" vs "Instalatér"). Proto porovnáváme volněji.
window.normalizovatKategorii = function(s) {
    return (s || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().trim();
};

window.kategorieSedi = function(kategoriePoptavky, filtr) {
    const a = window.normalizovatKategorii(kategoriePoptavky);
    const b = window.normalizovatKategorii(filtr);
    if (!a || !b) return false;
    return a === b || a.startsWith(b) || b.startsWith(a);
};

// === MOJE NABÍDKY ===
// Na jednu poptávku smí řemeslník reagovat jen jednou.
// Po odmítnutí ale může zkusit štěstí znovu s novou nabídkou.
// Kolikrát smí řemeslník na jednu poptávku reagovat (původní nabídka + opravné pokusy)
window.MAX_POKUSU = 2;

window._mojeNabidky = new Map(); // id poptávky -> { stav, pokusy }

window.nactiMojeNabidky = async function() {
    window._mojeNabidky = new Map();
    if (!window.sb || !window.APP_USER) return;
    try {
        const { data, error } = await window.sb
            .from("offers")
            .select("request_id, status, pokusy")
            .eq("craftsman_id", window.APP_USER.id);
        if (error) throw error;
        (data || []).forEach(o => window._mojeNabidky.set(String(o.request_id), {
            stav: o.status,
            pokusy: o.pokusy || 1
        }));
    } catch (e) {
        console.error("Nepodařilo se načíst odeslané nabídky:", e.message);
    }
};

window.stavMeNabidky = function(id) {
    const zaznam = window._mojeNabidky.get(String(id));
    return zaznam ? zaznam.stav : null;
};

window.pocetPokusu = function(id) {
    const zaznam = window._mojeNabidky.get(String(id));
    return zaznam ? (zaznam.pokusy || 1) : 0;
};

// Vyčerpal už všechny pokusy?
window.dosleMiPokusy = function(id) {
    return window.pocetPokusu(id) >= window.MAX_POKUSU;
};

// Blokujeme čekající, přijaté a ty, kde už řemeslník vyčerpal pokusy
window.uzJsemNabidl = function(id) {
    const stav = window.stavMeNabidky(id);
    if (stav === "pending" || stav === "accepted") return true;
    if (stav === "rejected" && window.dosleMiPokusy(id)) return true;
    return false;
};

// === OBLÍBENÉ POPTÁVKY ===
// Uloženo v databázi (tabulka "oblibene"), takže je řemeslník vidí i na jiném zařízení
window._oblibene = new Set();

window.nactiOblibene = async function() {
    window._oblibene = new Set();
    if (!window.sb || !window.APP_USER) return;
    try {
        const { data, error } = await window.sb
            .from("oblibene")
            .select("request_id")
            .eq("user_id", window.APP_USER.id);
        if (error) throw error;
        (data || []).forEach(r => window._oblibene.add(String(r.request_id)));
    } catch (e) {
        console.error("Nepodařilo se načíst oblíbené:", e.message);
    }
};

window.jeOblibena = function(id) {
    return window._oblibene.has(String(id));
};

// Přepne vzhled tlačítka (používáme i pro vrácení stavu, když zápis selže)
window._vykresliZalozku = function(btnEl, jeOblibena) {
    if (!btnEl) return;
    const ikona = btnEl.querySelector("i");
    if (ikona) ikona.className = jeOblibena ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark";
    btnEl.classList.toggle("text-remexo-500", jeOblibena);
    btnEl.classList.toggle("border-remexo-500", jeOblibena);
    btnEl.classList.toggle("text-slate-400", !jeOblibena);
};

window.toggleOblibene = async function(id, btnEl) {
    if (!window.sb || !window.APP_USER) {
        window.showToast("Nejste přihlášen", "Pro ukládání poptávek se přihlaste.", "error");
        return;
    }

    const bylaOblibena = window.jeOblibena(id);
    const klic = String(id);

    // Nejdřív překlopíme vzhled, ať to reaguje okamžitě
    if (bylaOblibena) window._oblibene.delete(klic); else window._oblibene.add(klic);
    window._vykresliZalozku(btnEl, !bylaOblibena);

    try {
        let error;
        if (bylaOblibena) {
            ({ error } = await window.sb.from("oblibene").delete()
                .eq("user_id", window.APP_USER.id).eq("request_id", id));
        } else {
            ({ error } = await window.sb.from("oblibene")
                .insert({ user_id: window.APP_USER.id, request_id: id }));
        }
        if (error) throw error;

        const req = window.najdiPoptavku ? window.najdiPoptavku(id) : null;
        window.showToast(
            bylaOblibena ? "Odebráno z uložených" : "Uloženo ⭐",
            req?.title || "Poptávka",
            bylaOblibena ? "info" : "success"
        );

        // Když si prohlíží uložené a jednu odebere, ať karta rovnou zmizí
        if (window._aktivniFiltr === "saved") {
            const tlacitko = document.getElementById("filter-saved");
            window.filterMarket("saved", tlacitko);
        }
    } catch (e) {
        // Zápis selhal – vrátíme stav zpět, ať uživatel nevidí něco jiného, než je uloženo
        if (bylaOblibena) window._oblibene.add(klic); else window._oblibene.delete(klic);
        window._vykresliZalozku(btnEl, bylaOblibena);
        window.showToast("Nepodařilo se uložit", e.message || "Zkuste to prosím znovu.", "error");
    }
};

window.filterMarket = function(kat, triggerEl) {
    const activeBtn = triggerEl || document.activeElement;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-remexo-500','text-white','shadow-md');
        btn.classList.add('bg-white','dark:bg-slate-800','border','border-slate-200','dark:border-slate-700','text-slate-600','dark:text-slate-300');
    });
    if (activeBtn && activeBtn.classList && activeBtn.classList.contains('filter-btn')) {
        activeBtn.classList.add('bg-remexo-500','text-white','shadow-md');
        activeBtn.classList.remove('bg-white','dark:bg-slate-800','border','border-slate-200','dark:border-slate-700','text-slate-600','dark:text-slate-300');
    }
    window._aktivniFiltr = kat;
    // Když je zrovna otevřená mapa, překreslíme i ji
    const mapEl = document.getElementById("market-map");
    if (mapEl && !mapEl.classList.contains("hidden") && window.initMarketMap) {
        setTimeout(()=>window.initMarketMap(), 50);
    }
    const data = Array.isArray(window.STATE?.marketRequests) ? window.STATE.marketRequests : [];
    let filtered;
    if (kat === 'all') filtered = data;
    else if (kat === 'saved') filtered = data.filter(r => window.jeOblibena(r.id));
    else filtered = data.filter(r => window.kategorieSedi(r.category, kat));

    const list = document.getElementById('market-list');
    if (!list) return;
    if (!filtered.length) {
        const hlaska = kat === 'saved'
            ? 'Zatím nemáte uložené žádné poptávky. Ukládejte je záložkou na kartě.'
            : 'Žádné poptávky v této kategorii.';
        list.innerHTML = '<div class="text-center text-slate-400 py-10">' + hlaska + '</div>';
        return;
    }
    list.innerHTML = (window.vyzvaKProfilu?window.vyzvaKProfilu():"") + filtered.map((req, i) => window.createBeautifulCard(req, true, i)).join('');
};

window.openPublicProfile = async function(userId) {
    if (!userId || !window.sb) return;
    const modal = document.getElementById("public-profile-modal");
    
    document.getElementById("pp-name").innerText = "Načítám...";
    document.getElementById("pp-bio").innerText = "Zjišťuji informace...";
    document.getElementById("pp-city").innerHTML = "";
    document.getElementById("pp-avatar").src = "https://api.dicebear.com/7.x/avataaars/svg?seed=loading";
    
    modal.classList.remove("hidden"); void modal.offsetWidth; modal.classList.add("opacity-100");

    try {
        const { data, error } = await window.sb.from('public_profiles').select('*').eq('id', userId).single();
        if (data) {
            document.getElementById("pp-name").innerText = data.full_name || "Uživatel";
            document.getElementById("pp-role").innerText = data.role === "customer" ? "Zákazník" : "Řemeslník";
            document.getElementById("pp-city").innerHTML = data.city ? `<i class="fa-solid fa-location-dot mr-1"></i> ${data.city}` : "";
            document.getElementById("pp-rating").innerText = data.rating ? Number(data.rating).toFixed(1) : "5.0";
            document.getElementById("pp-bio").innerText = data.bio || "Tento uživatel zatím nevyplnil žádný popis.";
            document.getElementById("pp-avatar").src = data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.full_name)}&backgroundColor=0f172a`;
        } else {
            document.getElementById("pp-name").innerText = "Profil nenalezen";
            document.getElementById("pp-bio").innerText = "Tento uživatel si ještě neuložil veřejný profil (Musí kliknout na 'Uložit změny v profilu').";
        }
    } catch (e) { document.getElementById("pp-name").innerText = "Chyba načítání"; }
};

window.closePublicProfile = function() {
    const modal = document.getElementById("public-profile-modal");
    if (modal) { modal.classList.remove("opacity-100"); setTimeout(() => modal.classList.add("hidden"), 300); }
};
// === PŘEDVYPLNĚNÍ POPTÁVKY Z LANDING PAGE ===
// Tuto funkci přidej na KONEC souboru js/features.js (nebo kamkoliv do něj)
window.applyPendingPoptavka = function() {
    const data = window.PENDING_POPTAVKA;
    if (!data) return;

    // Profil ještě není vyplněný – poptávku si podržíme a doplníme ji,
    // jakmile profil uloží (jinak by o ni přišel)
    const chybi = window.chybejiciUdajeProfilu ? window.chybejiciUdajeProfilu() : [];
    if (chybi.length > 0) {
        window.showToast("Nejprve vyplňte profil", "Vaši poptávku máme uloženou. Doplňte: " + chybi.join(", ") + ".", "info");
        window.goTab("profile", "Můj profil");
        return;
    }

    window.PENDING_POPTAVKA = null;

    window.goTab("new", "Nová poptávka");

    setTimeout(() => {
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val || ""; };
        setText("r-nazev", data.title);
        setText("r-kat", data.kategorie);
        setText("r-nal", data.nalehavost);
        setText("r-cena", data.cena);
        setText("r-popis", data.popis);

        const formEl = document.getElementById("popt-form");
        const resultEl = document.getElementById("popt-result");
        if (formEl) formEl.classList.add("hidden");
        if (resultEl) resultEl.classList.remove("hidden");

        if (window.showToast) {
            window.showToast("Poptávka načtena! 📋", "Zkontrolujte údaje a pokračujte k adrese.", "success");
        }
    }, 300);
};
