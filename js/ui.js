// === UI, NOTIFIKACE, RENDER ===
(function() {
    function hideLoader() {
        const loader = document.getElementById('loader');
        if (loader && loader.style.opacity !== '0') {
            loader.style.opacity = '0';
            loader.style.transform = 'scale(1.05)';
            loader.style.pointerEvents = 'none';
            setTimeout(() => { if (loader.parentNode) loader.remove(); }, 600);
        }
    }
    setTimeout(hideLoader, 4000);
    window.addEventListener('load', function() { setTimeout(hideLoader, 1800); });
})();

window.showToast = function(title, message, type) {
    type = type || 'success';
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'fa-check', info: 'fa-bell', error: 'fa-exclamation-triangle' };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<div class="toast-icon ' + type + '"><i class="fa-solid ' + (icons[type]||'fa-bell') + '"></i></div>' +
        '<div style="flex:1;min-width:0;"><div class="toast-title">' + title + '</div>' +
        (message ? '<div class="toast-msg">' + message + '</div>' : '') + '</div>' +
        '<button class="toast-close" onclick="this.closest(\'.toast\').remove()"><i class="fa-solid fa-times"></i></button>' +
        '<div class="toast-progress"></div>';
    container.appendChild(toast);
    window.addNotif(title, message);
    setTimeout(function() {
        toast.classList.add('hiding');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 350);
    }, 4500);
};

window.addNotif = function(title, message) {
    if (!window.notifCount) window.notifCount = 0;
    if (!window.notifItems) window.notifItems = [];

    window.notifCount++;
    window.notifItems.unshift({ title, message, time: new Date().toLocaleTimeString('cs', {hour:'2-digit', minute:'2-digit'}) });
    if (window.notifItems.length > 10) window.notifItems.pop();
    
    // Zvoneček nahoře
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.innerText = window.notifCount > 9 ? '9+' : window.notifCount;
        badge.classList.add('visible');
        badge.classList.remove('shake'); void badge.offsetWidth; badge.classList.add('shake');
    }
    
    // Bublinky u "Zpráv" (v menu a na mobilu dole)
    const sidebarBadge = document.getElementById('sidebar-msg-badge');
    const bottomBadge = document.getElementById('bottom-msg-badge');
    if (sidebarBadge || bottomBadge) {
        window.msgNotifCount = (window.msgNotifCount || 0) + 1;
        const txt = window.msgNotifCount > 9 ? '9+' : window.msgNotifCount;
        if(sidebarBadge) { sidebarBadge.innerText = txt; sidebarBadge.classList.remove('hidden'); }
        if(bottomBadge) { bottomBadge.innerText = txt; bottomBadge.classList.remove('hidden'); }
    }
    
    // Seznam oznámení
    const list = document.getElementById('notif-list');
    if (list) {
        const empty = document.getElementById('notif-empty'); if (empty) empty.remove();
        const item = document.createElement('div'); item.className = 'notif-item';
        item.innerHTML = `<div class="notif-dot"></div><div><div class="notif-item-title">${title}</div><div class="notif-item-msg">${message}</div></div><div style="margin-left:auto;font-size:11px;color:#94a3b8;flex-shrink:0">${window.notifItems[0].time}</div>`;
        list.insertBefore(item, list.firstChild);
    }
};

window.clearNotifs = function() {
    window._notifCount = 0;
    const badge = document.getElementById("notif-badge");
    if (badge) badge.classList.remove("visible","shake");
    const list = document.getElementById("notif-list");
    if (list) list.innerHTML = '<div id="notif-empty" style="padding:24px 16px;text-align:center;color:#94a3b8;font-size:13px;"><i class="fa-regular fa-bell-slash text-2xl mb-2 block opacity-40"></i>Žádná oznámení</div>';
    window._notifItems = [];
};

window.toggleNotifDropdown = function() {
    const dd = document.getElementById("notif-dropdown");
    if (!dd) return;
    const isOpen = dd.classList.contains("open");
    if (isOpen) { dd.classList.remove("open"); return; }
    dd.classList.add("open");
    setTimeout(() => {
        document.addEventListener("click", function closeDD(e) {
            if (!document.getElementById("notif-bell").contains(e.target)) {
                dd.classList.remove("open");
                document.removeEventListener("click", closeDD);
            }
        });
    }, 10);
};

window.createBeautifulCard = function(req, isMarket, i) {
    try {
        const statusMap = { waiting:"Hledáme profíka", active:"Probíhá oprava", done:"Dokončeno" };
        const badgeMap = { waiting:"status-waiting", active:"status-active", done:"status-done" };
        let rawDesc = req.description || req.popis || "";
        let extracted = window.extractPhotoFromDesc(rawDesc);
        let mainDesc = extracted.desc;
        let reqPhoto = extracted.photo || req.photo;
        let reqMime = extracted.mime || req.mime;
        let detailsHtml = "";
        if (mainDesc.includes("---")) {
            const pts = mainDesc.split("---");
            mainDesc = pts[0].trim();
            if (pts.length > 1) {
                let rawDetails = pts[1].replace("📋 DOPLŇUJÍCÍ INFORMACE:", "").trim();
                const detailItems = rawDetails.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                if (detailItems.length > 0) {
                    detailsHtml = '<div class="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700/50"><p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Doplňující informace</p><div class="flex flex-wrap gap-2">' +
                        detailItems.map(item => '<div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">' + item + '</div>').join('') +
                        '</div></div>';
                }
            }
        }
        const photoHtml = reqPhoto ? '<div class="w-full md:w-48 h-32 md:h-full shrink-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm relative group cursor-pointer" onclick="window.openLightbox(this.querySelector(\'img\').src)">' + '<img src="data:' + (reqMime||'image/jpeg') + ';base64,' + reqPhoto + '" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">' + '<div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center"><i class="fa-solid fa-expand text-white opacity-0 group-hover:opacity-100 text-2xl transition-all"></i></div></div>' : '';
        if (!isMarket) {
            return '<div class="req-card relative bg-white dark:bg-[#0f172a] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 group fade-up overflow-hidden">' +
                '<div class="absolute top-0 left-0 w-1.5 h-full ' + (req.status==='done'?'bg-slate-300 dark:bg-slate-700':'bg-remexo-500') + '"></div>' +
                '<div class="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity z-10"><button onclick="window.deleteRequest(' + i + ',' + (req.sbId||'null') + ')" class="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm"><i class="fa-solid fa-trash-can text-sm"></i></button></div>' +
                '<div class="pl-2"><div class="flex items-center gap-3 mb-3 pr-10"><span class="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide"><i class="fa-solid fa-tag mr-1.5 opacity-70"></i>' + req.kat + '</span><span class="text-[11px] text-slate-400 font-bold uppercase tracking-wide"><i class="fa-regular fa-clock mr-1.5 opacity-70"></i>' + req.time + '</span></div>' +
                '<div class="flex items-start justify-between gap-4 mb-4"><h4 class="text-xl md:text-2xl font-extrabold dark:text-white leading-tight">' + req.title + '</h4><span class="status-badge ' + (badgeMap[req.status]||'status-waiting') + ' shrink-0">' + (statusMap[req.status]||'Čeká') + '</span></div>' +
                '<div class="flex flex-col md:flex-row gap-5 mb-2">' + photoHtml + '<div class="flex-1 min-w-0"><p class="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">' + mainDesc + '</p></div></div>' +
                detailsHtml +
                '<div class="flex flex-wrap gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">' +
                '<button onclick="window.loadOffersForRequest(' + (req.sbId||0) + ',\'' + (req.title||'').replace(/'/g,"\\'") + '\')" class="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform shadow-md">Zobrazit nabídky řemeslníků</button>' +
                (req.status==='active' ? '<button onclick="window.openRatingModal(' + i + ',' + (req.sbId||'null') + ')" class="px-6 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><i class="fa-solid fa-check mr-2"></i>Označit hotovo</button>' : '') +
                '</div></div></div>';
        } else {
            const iconMap = {"Instalatérství":"fa-faucet-drip","Elektrikář":"fa-bolt","Malíř":"fa-paint-roller","Tesař":"fa-door-open","Zámečník":"fa-lock","default":"fa-screwdriver-wrench"};
            const reqCat = req.category||"Ostatní";
            const reqUrg = req.urgency||"Střední";
            return '<div class="market-item bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:border-remexo-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer fade-up overflow-hidden relative group" data-kat="' + reqCat + '" style="animation-delay:' + (i*60) + 'ms">' +
                '<div class="absolute top-0 left-0 w-1.5 h-full bg-remexo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>' +
                '<div class="pl-2"><div class="flex items-start gap-5"><div class="w-14 h-14 bg-remexo-50 dark:bg-remexo-500/10 text-remexo-500 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border border-remexo-100 dark:border-remexo-500/20"><i class="fa-solid ' + (iconMap[reqCat]||iconMap.default) + '"></i></div>' +
                '<div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-3 mb-2"><h4 class="text-xl font-extrabold dark:text-white leading-tight">' + req.title + '</h4><span class="status-badge ' + (reqUrg==="Vysoká"?"bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400":"status-waiting") + ' shrink-0">' + reqUrg + '</span></div>' +
                '<div class="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4"><span class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"><i class="fa-solid fa-tag mr-1.5 opacity-70"></i>' + reqCat + '</span><span class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"><i class="fa-solid fa-user mr-1.5 opacity-70"></i>' + (req.customer_name||'Zákazník') + '</span><span class="bg-remexo-50 dark:bg-remexo-500/10 text-remexo-600 dark:text-remexo-400 px-2 py-1 rounded"><i class="fa-solid fa-coins mr-1.5"></i>' + (req.price_estimate||'Dohodou') + '</span></div>' +
                '<p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">' + mainDesc + '</p>' +
                detailsHtml +
                '<div class="flex gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800"><button onclick="window.openOfferModal(' + i + ')" class="flex-1 bg-remexo-500 hover:bg-remexo-600 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-md hover:scale-[1.02]">Podat nabídku zákazníkovi</button><button class="w-12 h-12 border-2 border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-remexo-500 hover:border-remexo-500 hover:bg-remexo-50 dark:hover:bg-remexo-500/10 transition-colors"><i class="fa-regular fa-bookmark"></i></button></div>' +
                '</div></div></div></div>';
        }
    } catch(err) { return '<div class="p-4 bg-red-50 text-red-500 rounded-xl">Chyba vykreslení karty.</div>'; }
};

window.refreshRequestsList = function() {
    const list = document.getElementById("requests-list"); if(!list) return;
    const empty = document.getElementById("empty-req");
    list.querySelectorAll(".req-card").forEach(c => c.remove());
    if(window.STATE.requests.length===0){if(empty)empty.classList.remove("hidden");return;}
    if(empty)empty.classList.add("hidden");
    window.STATE.requests.forEach((req,i) => {
        const div = document.createElement("div");
        div.innerHTML = window.createBeautifulCard(req,false,i);
        list.insertBefore(div.firstElementChild, list.querySelector("#empty-req"));
    });
};

window.refreshDashboard = function() {
    const sa=document.getElementById("stat-active");if(sa)sa.innerText=window.STATE.requests.filter(r=>r.status!=="done").length;
    const st=document.getElementById("stat-total");if(st)st.innerText=window.STATE.requests.length;
    const dl=document.getElementById("dash-requests-list");
    if(dl&&window.STATE.requests.length>0){
        dl.innerHTML=window.STATE.requests.slice(0,3).map(r=>'<div class="flex items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0"><div class="w-10 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-xl flex items-center justify-center text-sm shrink-0"><i class="fa-solid fa-clipboard-list"></i></div><div class="flex-1 min-w-0"><p class="font-extrabold text-sm dark:text-white truncate">' + r.title + '</p><p class="text-xs text-slate-500 mt-0.5">' + r.kat + ' • ' + r.time + '</p></div><span class="status-badge ' + (r.status==="done"?"status-done":r.status==="active"?"status-active":"status-waiting") + ' shrink-0">' + (r.status==="done"?"Hotovo":r.status==="active"?"Probíhá":"Čeká") + '</span></div>').join("");
    } else if(dl){
        dl.innerHTML='<p class="text-slate-400 text-center py-8">Zatím žádné poptávky. <button onclick="window.goTab(\'new\',\'Nová poptávka\')" class="text-remexo-500 font-bold hover:underline">Vytvořit první →</button></p>';
    }
};

window.initCustomer = function(name) {
    window.buildNav([{id:"dash",icon:"fa-house",label:"Nástěnka"},{id:"requests",icon:"fa-list-check",label:"Moje poptávky"},{id:"messages",icon:"fa-comment-dots",label:"Zprávy"},{id:"payments",icon:"fa-shield-halved",label:"Platby & Escrow"},{id:"profile",icon:"fa-user",label:"Můj profil"}]);
    document.getElementById("header-cta").innerHTML = '<button onclick="window.goTab(\'new\',\'Nová poptávka\')" class="bg-remexo-500 hover:bg-remexo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition hover:scale-105"><i class="fa-solid fa-hard-hat"></i> <span>Nová poptávka</span></button>';
    if (window.customerHTML) { document.getElementById("main-content").innerHTML = window.customerHTML(name); }
    window.goTab("dash","Nástěnka");
};

window.initCraftsman = function(name) {
    window.buildNav([{id:"market",icon:"fa-map-location-dot",label:"Tržiště zakázek"},{id:"jobs",icon:"fa-hammer",label:"Moje práce"},{id:"c-messages",icon:"fa-comment-dots",label:"Zprávy"},{id:"earnings",icon:"fa-wallet",label:"Výdělky"},{id:"profile",icon:"fa-user",label:"Můj profil"}]);
    document.getElementById("header-cta").innerHTML = '<button onclick="window.goTab(\'new\',\'Nov\u00e1 popt\u00e1vka\')" class="bg-remexo-500 hover:bg-remexo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition hover:scale-105"><i class="fa-solid fa-hard-hat"></i> <span>Nov\u00e1 popt\u00e1vka</span></button>';
    if (window.craftsmanHTML) { document.getElementById("main-content").innerHTML = window.craftsmanHTML(name); }
    window.goTab("market","Tržiště zakázek");
};

// Generování menu - S přidanou HTML strukturou pro bublinku
window.buildNav = function(items) {
    document.getElementById("sidebar-nav").innerHTML = items.map(item => {
        let badgeHtml = '';
        if (item.id === 'messages' || item.id === 'c-messages') {
            badgeHtml = '<span id="sidebar-msg-badge" class="hidden ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"></span>';
        }
        return '<button onclick="window.goTab(\'' + item.id + '\',\'' + item.label + '\')" id="nav-' + item.id + '" class="nav-item w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-sm"><i class="fa-solid ' + item.icon + ' w-5 text-center text-lg"></i> ' + item.label + badgeHtml + '</button>';
    }).join("");
    
    document.getElementById("bottom-nav-items").innerHTML = items.map(item => {
        let bBadge = '';
        if (item.id === 'messages' || item.id === 'c-messages') {
            bBadge = '<span id="bottom-msg-badge" class="hidden absolute top-0 right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full"></span>';
        }
        return '<button onclick="window.goTab(\'' + item.id + '\',\'' + item.label + '\')" id="bnav-' + item.id + '" class="flex-1 relative flex flex-col items-center justify-center gap-1 py-1.5 text-slate-400 hover:text-remexo-500 transition min-w-0 px-0.5"><i class="fa-solid ' + item.icon + ' text-lg"></i><span class="text-[9px] font-bold leading-tight truncate max-w-full text-center">' + ({"dash":"Domů","requests":"Poptávky","messages":"Zprávy","payments":"Platby","profile":"Profil","market":"Tržiště","jobs":"Práce","c-messages":"Zprávy","earnings":"Výdělky"}[item.id]||item.label.split(" ")[0]) + '</span>' + bBadge + '</button>';
    }).join("");
};

window.goTab = function(id, title) {
    document.querySelectorAll('[id^="view-"]').forEach(el => { el.classList.add("hidden"); el.classList.remove("fade-up"); });
    document.querySelectorAll(".nav-item").forEach(el => { el.classList.remove("active","text-slate-900","dark:text-white"); el.classList.add("text-slate-600","dark:text-slate-400"); });
    document.querySelectorAll('[id^="bnav-"]').forEach(el => { el.classList.remove("text-remexo-500"); el.classList.add("text-slate-400"); });
    
    const view = document.getElementById("view-"+id);
    if(view){view.classList.remove("hidden");void view.offsetWidth;view.classList.add("fade-up");}
    const sideBtn = document.getElementById("nav-"+id);
    if(sideBtn){sideBtn.classList.add("active","text-slate-900","dark:text-white");sideBtn.classList.remove("text-slate-600","dark:text-slate-400");}
    const botBtn = document.getElementById("bnav-"+id);
    if(botBtn){botBtn.classList.remove("text-slate-400");botBtn.classList.add("text-remexo-500");}
    if(title) document.getElementById("page-title").innerText = title;
    
    // ZMIZÍ BUBLINA: Jakmile uživatel otevře zprávy, počitadlo notifikací zpráv se vynuluje.
    if(id==="messages" || id==="c-messages") window.clearMsgNotif();
    
    if(id==="messages" && window.loadCustomerConversations) window.loadCustomerConversations();
    if(id==="c-messages" && window.loadCraftsmanConversations) window.loadCraftsmanConversations();
    if(id==="market") {
        if(window.loadMarketFromDB) window.loadMarketFromDB();
        const mapEl=document.getElementById("market-map"),listEl=document.getElementById("market-list");
        if(mapEl&&listEl){mapEl.classList.add("hidden");listEl.classList.remove("hidden");}
        if(window._marketMap){window._marketMap.remove();window._marketMap=null;}
    }
};

window.openLightbox = function(src) {
    var lb = document.getElementById("lightbox");
    var img = document.getElementById("lightbox-img");
    img.src = src;
    lb.classList.remove("hidden");
    document.body.style.overflow = "hidden";
};
window.closeLightbox = function() {
    document.getElementById("lightbox").classList.add("hidden");
    document.body.style.overflow = "";
};
document.addEventListener("keydown", function(e) { if(e.key === "Escape") window.closeLightbox(); });
