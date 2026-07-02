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
    window.refreshRequestsList(); window.refreshDashboard();
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
            await window.sb.from("requests").delete().eq("id",sbId);
            await window.sb.from("offers").delete().eq("request_id",sbId);
            await window.sb.from("messages").delete().eq("conversation_id",String(sbId));
        } catch(e){}
    }
    window.STATE.requests.splice(index,1);
    window.refreshRequestsList(); window.refreshDashboard();
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
    } catch(e) { window.showToast("Chyba ukládání", e.message, "error"); }
    finally { btnNode.innerHTML = orig; btnNode.disabled = false; }
};

window.callGeminiAPI = async function(parts, systemPrompt, useJson) {
    const res = await fetch('/api/gemini', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({parts, systemPrompt, useJson}) });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'API chyba');
    return data.text;
};

// VYLEPŠENÍ 1: Komprese nahrávaných fotek pro AI Bořka
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
                    resolve(canvas.toDataURL("image/jpeg", 0.8)); // Zkomprimuje a zmenší
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
    if (role==="user") { d.className="poptavka-bubble-user text-sm font-medium"; d.innerText=text; }
    else { d.className="poptavka-bubble-ai text-sm flex items-start gap-3"; d.innerHTML='<div class="w-8 h-8 bg-fixit-500 rounded-full flex items-center justify-center text-white shrink-0"><i class="fa-solid fa-hard-hat text-xs"></i></div><div>' + text + '</div>'; }
    box.appendChild(d); box.scrollTop=box.scrollHeight;
};

window.processPopt = async function(text) {
    const loading = document.getElementById("popt-loading");
    const replyArea = document.getElementById("popt-reply-area");
    loading.classList.remove("hidden"); replyArea.classList.add("hidden");
    const sp = 'Jsi Bořek, profesionální technik. Vytvoř zadání pro řemeslníka.\nODPOVÍDEJ PŘESNĚ V TOMTO JSON FORMÁTU BEZ DALŠÍHO TEXTU:\n{"status":"question","message":"otázka"} nebo {"status":"done","nazev":"titulek","kategorie":"obor","popis":"popis","nalehavost":"Vysoká/Střední/Nízká","odhad_ceny":"cena Kč","rada":"rada"}';
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
    window.appendChat("user",window.poptHistoryText);
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

window.publishRequest = async function(btnNode) {
    let orig = "Zveřejnit poptávku na Fixit";
    try {
        if(btnNode&&btnNode.tagName){orig=btnNode.innerHTML;btnNode.innerHTML='<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Zpracovávám...';btnNode.disabled=true;}
        const getText=(id,def)=>{const el=document.getElementById(id);return el?el.innerText.trim():def;};
        const getValue=(id,def)=>{const el=document.getElementById(id);return el?el.value.trim():def;};
        const title=getText("r-nazev","Nová poptávka"),kat=getText("r-kat","Ostatní"),popis=getText("r-popis",""),nal=getText("r-nal","Střední"),cena=getText("r-cena","Dohodou");
        const street=getValue("f-street",""),city=getValue("f-city",""),phone=getValue("f-phone",""),timeframe=getValue("f-timeframe","Během několika dnů"),property=getValue("f-property","Byt"),parking=getValue("f-parking","Bezproblémové"),budget=getValue("f-budget","");

        const highlightError = (id) => { const el=document.getElementById(id); if(!el)return; el.focus(); el.style.borderColor="#ef4444"; el.style.boxShadow="0 0 0 3px rgba(239,68,68,0.18)"; setTimeout(()=>{el.style.borderColor="";el.style.boxShadow="";},3000); };

        if(!street||!city||!phone){ window.showToast("Chybí kontaktní údaje","Vyplňte ulici, město a telefonní číslo.","error"); if(!street)highlightError("f-street"); else if(!city)highlightError("f-city"); else highlightError("f-phone"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }
        if(street.length<5||!/[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(street)||!/\d/.test(street)){ window.showToast("Neplatná adresa","Zadejte ulici i číslo popisné.","error"); highlightError("f-street"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }
        if(city.length<2||/\d/.test(city)){ window.showToast("Neplatné město","Zadejte název města bez čísel.","error"); highlightError("f-city"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }
        if(!/^[+]?[\d\s\-().]{7,20}$/.test(phone)){ window.showToast("Neplatné telefonní číslo","Zadejte číslo ve formátu +420 123 456 789.","error"); highlightError("f-phone"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} return; }

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
        window.refreshRequestsList(); window.refreshDashboard(); window.poptHistoryText=""; window.poptPhotos=[];
        
        ["popt-input","f-street","f-city","f-phone","f-budget"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
        document.getElementById("popt-chat-msgs").innerHTML=""; 
        const gallery = document.getElementById("photo-gallery");
        if(gallery) { gallery.innerHTML=""; gallery.classList.add("hidden"); }
        const pz=document.getElementById("photo-zone");if(pz){pz.classList.remove("hidden");}
        ["popt-result","popt-tip","popt-chat","popt-finalize"].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add("hidden");});
        document.getElementById("btn-show-finalize").classList.remove("hidden"); document.getElementById("popt-form").classList.remove("hidden");
        if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;}
        window.showToast("Poptávka zveřejněna! 🎉","Řemeslníci budou brzy kontaktovat.","success");
        window.goTab("requests","Moje poptávky");
    } catch(err) { window.showToast("Chyba","Nastala chyba: "+err.message,"error"); if(btnNode&&btnNode.tagName){btnNode.innerHTML=orig;btnNode.disabled=false;} }
};

// VYLEPŠENÍ 2: Kontrola, jestli má řemeslník profil, než pošle nabídku
window.openOfferModal = function(index) {
    if (!window.APP_USER || !window.APP_USER.user_metadata || !window.APP_USER.user_metadata.full_name) {
        window.showToast("Vyplňte si profil", "Než začnete posílat nabídky, uložte si svůj profil a jméno.", "error");
        window.goTab("profile", "Můj profil");
        return;
    }

    const req=window.STATE.marketRequests[index];if(!req)return;
    document.getElementById("co-req-id").value=req.id;
    document.getElementById("co-req-title").value=req.title;
    document.getElementById("co-title").innerText=req.title;
    document.getElementById("co-cat").innerText=req.category||"Ostatní";
    document.getElementById("co-urg").innerText=req.urgency||"Střední";
    let extracted=window.extractPhotoFromDesc(req.description);
    document.getElementById("co-desc").innerHTML=extracted.desc.replace(/\n/g,"<br>");
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
        const {error}=await window.sb.from("offers").insert({request_id:requestId,craftsman_id:window.APP_USER.id,craftsman_name:document.getElementById("user-name").innerText,message:msg,price:price||"Dohodou",status:"pending"});
        if(error)throw error;
        btn.innerHTML='<i class="fa-solid fa-check mr-2"></i>Odesláno!';
        btn.className=btn.className.replace("bg-fixit-500 hover:bg-fixit-600","bg-green-500");
        window.showToast("Nabídka odeslána! 🎉","Zákazník obdrží vaši nabídku co nejdříve.","success");
        window.STATE.craftJobs.push({title,requestId,status:"pending",time:new Date().toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"})});
        window.refreshCraftsmanJobs();window.activeChatId=String(requestId);
        setTimeout(()=>{window.closeOfferModal();btn.innerHTML=orig;btn.disabled=false;btn.className=btn.className.replace("bg-green-500","bg-fixit-500 hover:bg-fixit-600");window.goTab("c-messages","Zprávy");window.openConversation(requestId,"Zákazník","customer"+requestId);},1000);
    } catch(e){btn.innerHTML=orig;btn.disabled=false;window.showToast("Chyba odesílání",e.message,"error");}
};

window.loadOffersForRequest = async function(requestId, requestTitle) {
    if(!window.sb)return;
    const {data:offers}=await window.sb.from("offers").select("*").eq("request_id",requestId).neq("status", "rejected").order("created_at",{ascending:false});
    
    document.getElementById("offers-modal-title").innerText=requestTitle;
    const modalList=document.getElementById("offers-modal-list");
    
    if(!offers||offers.length===0){
        modalList.innerHTML='<div class="text-center text-slate-400 py-12"><i class="fa-solid fa-inbox text-4xl mb-4 block"></i><p>Zatím žádné aktivní nabídky.</p></div>';
    } else {
        modalList.innerHTML=offers.map(o=>'<div class="p-5 border border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50"><div class="flex items-center gap-4 mb-4 cursor-pointer hover:opacity-75 transition" onclick="window.openPublicProfile(\'' + o.craftsman_id + '\')"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(o.craftsman_name) + '&backgroundColor=0f172a" class="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 dark:border-slate-700"><div><p class="font-extrabold dark:text-white">' + o.craftsman_name + '</p><p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">' + new Date(o.created_at).toLocaleDateString("cs") + '</p></div><span class="ml-auto font-black text-lg text-fixit-500">' + o.price + '</span></div><p class="text-sm text-slate-600 dark:text-slate-300 mb-5 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-700">' + o.message + '</p><div class="flex gap-2"><button onclick="window.rejectOffer(this, ' + o.id + ',' + requestId + ',\'' + (requestTitle||"").replace(/'/g,"\\'") + '\')" class="px-5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 rounded-xl transition shadow-sm"><i class="fa-solid fa-times text-lg"></i></button><button onclick="window.acceptOffer(' + o.id + ',' + requestId + ',\'' + (o.craftsman_name||"").replace(/'/g,"\\'") + '\'); window.closeOffersModal();" class="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-bold text-sm transition shadow-md hover:scale-[1.02]">Přijmout a zahájit zprávy</button></div></div>').join("");
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
    await window.sb.from("offers").update({status:"accepted"}).eq("id",offerId);
    await window.sb.from("requests").update({status:"active",craftsman_name:craftsmanName}).eq("id",requestId);
    window.showToast("Nabídka přijata! ✅","Zahajujete spolupráci s "+craftsmanName+".","success");
    const req=window.STATE.requests.find(r=>r.sbId===requestId);if(req){req.status="active";req.craftsman_name=craftsmanName;}
    window.refreshRequestsList();window.refreshDashboard(); window.activeChatId=String(requestId); window.goTab("messages","Zprávy");
    setTimeout(()=>window.openConversation(requestId,craftsmanName,"craftsman"+requestId),300);
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
        d.innerHTML='<div class="flex items-start justify-between mb-4"><div><h4 class="font-extrabold text-lg dark:text-white leading-tight">' + job.title + '</h4><p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">' + job.time + '</p></div>' + badge + '</div><button onclick="window.activeChatId=\'' + job.requestId + '\'; window.goTab(\'c-messages\',\'Zprávy\'); setTimeout(()=>window.openConversation(\'' + job.requestId + '\',\'Zákazník\',\'customer' + job.requestId + '\'),300);" class="text-sm font-bold text-fixit-500 hover:text-fixit-600 transition flex items-center gap-2"><i class="fa-regular fa-comment-dots"></i> Napsat zákazníkovi</button>';
        list.appendChild(d);
    });
};

window.loadCraftsmanJobsFromDB = async function() {
    if(!window.sb||!window.APP_USER)return;
    const {data}=await window.sb.from("offers").select("*, requests(title, category, status)").eq("craftsman_id",window.APP_USER.id);
    if(data&&data.length>0){
        window.STATE.craftJobs=data.map(o=>{ let s=o.status;if(o.requests?.status==="done")s="done"; return {title:o.requests?.title||"Zakázka",requestId:o.request_id,status:s,time:new Date(o.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"})}; });
        window.refreshCraftsmanJobs();
    }
};

window.loadCustomerRequestsFromDB = async function() {
    if(!window.sb||!window.APP_USER)return;
    const {data}=await window.sb.from("requests").select("*").eq("customer_id",window.APP_USER.id).order("created_at",{ascending:false});
    if(data&&data.length>0){
        window.STATE.requests=data.map(r=>({sbId:r.id,title:r.title,kat:r.category,popis:r.description,time:new Date(r.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"}),status:r.status,craftsman_name:r.craftsman_name||null}));
        window.refreshRequestsList();window.refreshDashboard();
    }
};

window.loadMarketFromDB = async function() {
    const list=document.getElementById("market-list");if(!list||!window.sb)return;
    const {data,error}=await window.sb.from("requests").select("*").eq("status","waiting").order("created_at",{ascending:false});
    if(error||!data||data.length===0){list.innerHTML='<div class="text-center p-16 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl"><i class="fa-solid fa-inbox text-5xl text-slate-300 dark:text-slate-600 mb-5 block"></i><p class="font-bold text-slate-500 text-lg">Zatím žádné poptávky ve vašem okolí.</p></div>';return;}
    window.STATE.marketRequests=data;
    list.innerHTML=data.map((r,i)=>window.createBeautifulCard({id:r.id,sbId:r.id,title:r.title,kat:r.category||"Ostatní",popis:r.description||"",time:new Date(r.created_at).toLocaleDateString("cs"),status:r.status,urgency:r.urgency||"Střední",category:r.category,customer_name:r.customer_name||"Zákazník",price_estimate:r.price_estimate||"Dohodou"},true,i)).join("");
};

window.toggleMarketView = function(mode) {
    const listEl=document.getElementById("market-list"),mapEl=document.getElementById("market-map");
    const btnList=document.getElementById("view-toggle-list"),btnMap=document.getElementById("view-toggle-map");
    if(!listEl||!mapEl)return;
    if(mode==="map"){
        listEl.classList.add("hidden");mapEl.classList.remove("hidden");
        if(btnList)btnList.className=btnList.className.replace("bg-fixit-500 text-white","text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700");
        if(btnMap)btnMap.className=btnMap.className.replace("text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700","bg-fixit-500 text-white");
        window.initMarketMap();
    } else {
        mapEl.classList.add("hidden");listEl.classList.remove("hidden");
        if(btnMap)btnMap.className=btnMap.className.replace("bg-fixit-500 text-white","text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700");
        if(btnList)btnList.className=btnList.className.replace("text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700","bg-fixit-500 text-white");
    }
};

window.initMarketMap = async function() {
    const mapEl=document.getElementById("market-map");if(!mapEl)return;
    if(window._marketMap){window._marketMap.eachLayer(l=>{if(l instanceof L.Marker)window._marketMap.removeLayer(l);});}
    else{window._marketMap=L.map("market-map").setView([49.8,15.5],8);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(window._marketMap);}
    const requests=window.STATE.marketRequests||[];
    if(requests.length===0)return;
    const pinIcon=L.divIcon({className:"",html:'<div style="background:#f59e0b;color:white;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(245,158,11,0.45);border:2px solid white;"><i class="fa-solid fa-hammer" style="transform:rotate(45deg);font-size:13px;"></i></div>',iconSize:[36,36],iconAnchor:[18,36],popupAnchor:[0,-38]});
    const bounds=[];
    for(const r of requests){
        const addrMatch=(r.description||"").match(/Adresa:\s*([^\n📞📅🏠🚗]+)/);
        const addr=addrMatch?addrMatch[1].trim():(r.category+", Česká republika");
        try{
            const resp=await fetch("https://nominatim.openstreetmap.org/search?format=json&q="+encodeURIComponent(addr+", Česká republika")+"&limit=1",{headers:{"Accept-Language":"cs"}});
            const geo=await resp.json();
            if(geo&&geo.length>0){
                const lat=parseFloat(geo[0].lat),lon=parseFloat(geo[0].lon);bounds.push([lat,lon]);
                const urgencyColor=r.urgency==="Vysoká"?"#ef4444":r.urgency==="Nízká"?"#22c55e":"#f59e0b";
                const popup=L.popup({maxWidth:280,minWidth:220}).setContent('<div class="fixit-pin-popup"><span class="cat-badge">'+(r.category||"Ostatní")+'</span><p class="title">'+(r.title||"Poptávka")+'</p><p class="addr"><i class="fa-solid fa-location-dot" style="color:#f59e0b;margin-right:4px"></i>'+addr+'</p><div style="display:flex;gap:8px;margin-bottom:10px"><span style="font-size:11px;font-weight:700;color:'+urgencyColor+';background:'+urgencyColor+'18;padding:3px 8px;border-radius:6px;">'+(r.urgency||"Střední")+' priorita</span>'+(r.price_estimate?'<span style="font-size:11px;font-weight:700;color:#0f172a;background:#f1f5f9;padding:3px 8px;border-radius:6px;">'+r.price_estimate+'</span>':'')+'</div><button class="offer-btn" onclick="window.openOfferModal('+r.id+',\\"'+(r.title||"").replace(/"/g,"")+'\\""); document.querySelectorAll(\".leaflet-popup-close-button\").forEach(b=>b.click());">Poslat nabídku →</button></div>');
                L.marker([lat,lon],{icon:pinIcon}).addTo(window._marketMap).bindPopup(popup);
            }
        }catch(e){}
    }
    if(bounds.length>0)window._marketMap.fitBounds(bounds,{padding:[40,40],maxZoom:13});
    setTimeout(()=>window._marketMap&&window._marketMap.invalidateSize(),100);
};

window.filterMarket = function(kat, triggerEl) {
    const activeBtn = triggerEl || document.activeElement;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-fixit-500','text-white','shadow-md');
        btn.classList.add('bg-white','dark:bg-slate-800','border','border-slate-200','dark:border-slate-700','text-slate-600','dark:text-slate-300');
    });
    if (activeBtn && activeBtn.classList && activeBtn.classList.contains('filter-btn')) {
        activeBtn.classList.add('bg-fixit-500','text-white','shadow-md');
        activeBtn.classList.remove('bg-white','dark:bg-slate-800','border','border-slate-200','dark:border-slate-700','text-slate-600','dark:text-slate-300');
    }
    const data = Array.isArray(window.STATE?.marketRequests) ? window.STATE.marketRequests : [];
    const filtered = kat === 'all' ? data : data.filter(r => (r.category || '').trim() === kat);
    const list = document.getElementById('market-list');
    if (!list) return;
    if (!filtered.length) { list.innerHTML = '<div class="text-center text-slate-400 py-10">Žádné poptávky v této kategorii.</div>'; return; }
    list.innerHTML = filtered.map((req, i) => window.createBeautifulCard(req, true, i)).join('');
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
