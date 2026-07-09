// === ZPRÁVY A REALTIME CHAT ===
window.clearMsgNotif = function() {
    window.msgNotifCount = 0;
    const badge = document.getElementById('sidebar-msg-badge');
    if (badge) badge.classList.add('hidden');
    const bottomBadge = document.getElementById('bottom-msg-badge');
    if (bottomBadge) bottomBadge.classList.add('hidden');
};

window.showConvList = function(role) {
    var convPanel = document.getElementById('conv-panel-' + role);
    var msgPanel = document.getElementById('msg-panel-' + role);
    if (!convPanel || !msgPanel) return;
    if (window.innerWidth <= 767) {
        convPanel.classList.remove('hidden-mobile');
        msgPanel.classList.remove('show-mobile');
    }
};

window.showMsgPanel = function(role) {
    var convPanel = document.getElementById('conv-panel-' + role);
    var msgPanel = document.getElementById('msg-panel-' + role);
    if (!convPanel || !msgPanel) return;
    if (window.innerWidth <= 767) {
        convPanel.classList.add('hidden-mobile');
        msgPanel.classList.add('show-mobile');
    }
};

// OPRAVENO: Chytré načítání profilovek s pojistkou proti chybě 404
window.getUserAvatar = async function(userId, fallbackSeed, fallbackBg) {
    const fallback = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(fallbackSeed||"user") + "&backgroundColor=" + (fallbackBg||"f59e0b");
    if (!userId || !window.sb) return fallback;
    if (window._avatarCache[userId]) return window._avatarCache[userId];
    
    try {
        if (window.APP_USER && window.APP_USER.id === userId) {
            const url = window.APP_USER.user_metadata?.avatar_url;
            if (url) { window._avatarCache[userId] = url; return url; }
        }
        
        const { data } = window.sb.storage.from("avatars").getPublicUrl(userId + ".jpg");
        if (data && data.publicUrl) {
            // Tady to zjistí, jestli fotka fakt existuje, dřív než ji to nacpe do UI
            return await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    window._avatarCache[userId] = data.publicUrl;
                    resolve(data.publicUrl);
                };
                img.onerror = () => {
                    window._avatarCache[userId] = fallback;
                    resolve(fallback);
                };
                img.src = data.publicUrl;
            });
        }
    } catch(e) {}
    
    window._avatarCache[userId] = fallback;
    return fallback;
};

window.openConversation = async function(requestId, partnerName, partnerSeed, partnerUserId) {
    window.activeChatId = String(requestId);
    const nameEl = document.getElementById("chat-partner-name")||document.getElementById("chat-partner-name-c");
    if(nameEl) nameEl.innerText = partnerName;
    var role = window.APP_ROLE === "customer" ? "customer" : "craftsman";
    window.showMsgPanel(role);
    
    const avatarEl = document.getElementById("chat-partner-avatar");
    if(avatarEl) {
        avatarEl.dataset.loadedId = ""; 
        const fallbackBg = window.APP_ROLE === "customer" ? "0f172a" : "f59e0b";
        const avUrl = await window.getUserAvatar(partnerUserId, partnerSeed, fallbackBg);
        avatarEl.style.backgroundImage = "url('" + avUrl + "')";
    }
    
    document.querySelectorAll(".conv-item").forEach(el=>el.classList.remove("bg-white","dark:bg-slate-800/50","border--500","border-l-4"));
    const ac=document.getElementById("conv-"+requestId);
    if(ac)ac.classList.add("bg-white","dark:bg-slate-800/50","border-remexo-500","border-l-4");
    
    if (!window.STATE.unreadChats) window.STATE.unreadChats = {};
    window.STATE.unreadChats[requestId] = 0;
    
    await window.loadMessages(requestId);
    window.subscribeMessages(requestId);
};

window.loadMessages = async function(requestId) {
    const boxId = window.APP_ROLE==="customer"?"chat-msgs":"chat-msgs-c";
    const box = document.getElementById(boxId); if(!box)return;
    box.innerHTML='<div class="text-center text-slate-400 text-sm py-8"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-remexo-500 mb-3 block"></i>Načítám zprávy...</div>';
    if(!window.sb){box.innerHTML='<div class="text-center text-slate-400 text-sm py-8">Nepřipojeno.</div>';return;}
    const {data,error}=await window.sb.from("messages").select("*").eq("conversation_id",String(requestId)).order("created_at",{ascending:true});
    if(error){box.innerHTML='<div class="text-center text-red-400 text-sm py-8">Chyba načítání.</div>';return;}
    box.innerHTML="";
    if(data.length===0){box.innerHTML='<div class="text-center text-slate-400 text-sm py-10"><i class="fa-regular fa-comments text-4xl mb-3 block opacity-50"></i>Zatím žádné zprávy. Napište první!</div>';return;}
    
    data.forEach(m => {
        window.renderMessage(m, boxId);
        if (m.sender_id !== window.APP_USER?.id && m.sender_name) {
            const nameEl = document.getElementById("chat-partner-name")||document.getElementById("chat-partner-name-c");
            if (nameEl && (nameEl.innerText === "Řemeslník" || nameEl.innerText === "Zákazník" || nameEl.innerText === "Vyberte konverzaci" || nameEl.innerText === "Zprávy")) {
                nameEl.innerText = m.sender_name;
            }
            const avatarEl = document.getElementById("chat-partner-avatar");
            if (avatarEl && !avatarEl.dataset.loadedId) {
                avatarEl.dataset.loadedId = m.sender_id;
                const fallbackBg = window.APP_ROLE === "customer" ? "0f172a" : "f59e0b";
                window.getUserAvatar(m.sender_id, m.sender_name, fallbackBg).then(avUrl => {
                    avatarEl.style.backgroundImage = "url('" + avUrl + "')";
                    const cavEl = document.getElementById("cav-" + requestId);
                    if(cavEl) cavEl.src = avUrl;
                });
            }
        }
    });
    box.scrollTop=box.scrollHeight;
};

window.escapeHtml = function(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
};

window.renderMessage = function(m, boxId) {
    const box=document.getElementById(boxId);if(!box)return;
    const myUserId = window.APP_USER?.id ? String(window.APP_USER.id) : "";
    const senderId = m?.sender_id ? String(m.sender_id) : "";
    const senderRole = (m?.senderrole || "").trim();
    const myRole = (window.APP_ROLE || "").trim();
    const senderName = (m?.sender_name || "").trim();
    const myName = (document.getElementById("user-name")?.innerText || "").trim();

    let isMe = false;
    if (myUserId && senderId) { isMe = myUserId === senderId; } 
    else if (senderRole && myRole && senderName && myName) { isMe = senderRole === myRole && senderName === myName; } 
    else if (senderRole && myRole) { isMe = senderRole === myRole; } 
    else if (senderName && myName) { isMe = senderName === myName; }

    const time=new Date(m.created_at).toLocaleTimeString("cs",{hour:"2-digit",minute:"2-digit"});
    box.querySelector(".text-center")?.remove();
    const d=document.createElement("div");
    const safeSender = window.escapeHtml(senderName || (isMe?"Já":"Uživatel"));
    const safeText = window.escapeHtml(m.text || "").replace(/\n/g, "<br>");
    d.className="flex "+(isMe?"justify-end":"justify-start");
    d.innerHTML='<div class="max-w-[75%]"><p class="text-[10px] font-bold mb-1.5 uppercase tracking-wide ' + (isMe?"text-remexo-500 text-right mr-2":"text-slate-400 ml-2") + '">' + safeSender + '</p><div class="px-5 py-3 rounded-2xl text-sm shadow-sm ' + (isMe?"bg-remexo-500 text-white rounded-br-sm":"bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-bl-sm") + '"><p class="leading-relaxed">' + safeText + '</p><p class="text-[10px] opacity-50 mt-1.5 font-medium ' + (isMe?"text-right":"") + '">' + time + '</p></div></div>';
    box.appendChild(d);box.scrollTop=box.scrollHeight;
};

window.subscribeMessages = function(requestId) {
    if(window.msgSubscription){try{window.sb.removeChannel(window.msgSubscription);}catch(e){}}
    if(!window.sb)return;
    const boxId=window.APP_ROLE==="customer"?"chat-msgs":"chat-msgs-c";
    window.msgSubscription=window.sb.channel("msgs-"+requestId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"conversation_id=eq."+requestId},payload=>{
        if(payload.new.sender_id!==window.APP_USER?.id){
            window.renderMessage(payload.new,boxId);
            const nameEl = document.getElementById("chat-partner-name")||document.getElementById("chat-partner-name-c");
            if (nameEl && payload.new.sender_name && (nameEl.innerText === "Řemeslník" || nameEl.innerText === "Zákazník" || nameEl.innerText === "Vyberte konverzaci" || nameEl.innerText === "Zprávy")) {
                nameEl.innerText = payload.new.sender_name;
            }
            const avatarEl = document.getElementById("chat-partner-avatar");
            if (avatarEl && payload.new.sender_id && !avatarEl.dataset.loadedId) {
                avatarEl.dataset.loadedId = payload.new.sender_id;
                const fallbackBg = window.APP_ROLE === "customer" ? "0f172a" : "f59e0b";
                window.getUserAvatar(payload.new.sender_id, payload.new.sender_name, fallbackBg).then(avUrl => {
                    avatarEl.style.backgroundImage = "url('" + avUrl + "')";
                });
            }
        }
    }).subscribe();
};

window.sendMsg = async function() {
    const inp=document.getElementById("msg-input");
    const txt=inp?.value?.trim();if(!txt)return;
    if(!window.activeChatId){ window.showToast("Nejprve otevřete konverzaci", "Vyberte vlevo konkrétní chat.", "info"); return; }
    inp.value="";
    const userNameEl = document.getElementById("user-name");
    const msgBase={conversation_id:String(window.activeChatId),sender_id:window.APP_USER?.id,sender_name:userNameEl?userNameEl.innerText:"Uživatel",text:txt};
    window.renderMessage({...msgBase,senderrole:window.APP_ROLE||"customer",created_at:new Date().toISOString()},"chat-msgs");
    if(window.sb){
        const {error}=await window.sb.from("messages").insert({...msgBase,senderrole:window.APP_ROLE||"customer"});
        if(error) window.showToast("Zprávu se nepodařilo uložit", error.message || "Zkuste to prosím znovu.", "error");
    }
};

window.sendMsgC = async function() {
    const inp=document.getElementById("msg-input-c");
    const txt=inp?.value?.trim();if(!txt)return;
    if(!window.activeChatId){ window.showToast("Nejprve otevřete konverzaci", "Vyberte vlevo konkrétní chat.", "info"); return; }
    inp.value="";
    const userNameEl = document.getElementById("user-name");
    const msgBase={conversation_id:String(window.activeChatId),sender_id:window.APP_USER?.id,sender_name:userNameEl?userNameEl.innerText:"Uživatel",text:txt};
    window.renderMessage({...msgBase,senderrole:window.APP_ROLE||"craftsman",created_at:new Date().toISOString()},"chat-msgs-c");
    if(window.sb){
        const {error}=await window.sb.from("messages").insert({...msgBase,senderrole:window.APP_ROLE||"craftsman"});
        if(error) window.showToast("Zprávu se nepodařilo uložit", error.message || "Zkuste to prosím znovu.", "error");
    }
};

window.loadCustomerConversations = async function() {
    const list=document.getElementById("conv-list");
    if(!list||!window.sb||!window.APP_USER) return;
    const {data:reqs}=await window.sb.from("requests").select("*").eq("customer_id",window.APP_USER.id).order("created_at",{ascending:false});
    if(!reqs||reqs.length===0){
        list.innerHTML='<div class="p-8 text-center text-sm text-slate-400"><i class="fa-regular fa-comments text-4xl mb-3 block opacity-50"></i>Žádné zprávy.<br>Vytvořte poptávku!</div>';
        return;
    }
    
    list.innerHTML = reqs.map(r => {
        const statusDot = r.status === 'active' ? '#22c55e' : r.status === 'done' ? '#94a3b8' : '#f59e0b';
        const safeName = (r.craftsman_name || "Řemeslník").replace(/'/g, "\\'");
        const craftIdParam = r.craftsman_id ? `'${r.craftsman_id}'` : 'null';
        const seed = encodeURIComponent(r.craftsman_name || 'c');
        const unreadCount = (window.STATE.unreadChats && window.STATE.unreadChats[r.id]) || 0;
        const unreadBadge = unreadCount > 0 ? '<div class="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ml-auto shrink-0 shadow-sm">' + unreadCount + '</div>' : '<i class="fa-solid fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 shrink-0 ml-auto"></i>';
        const isActiveClass = window.activeChatId === String(r.id) ? 'bg-white dark:bg-slate-800/50 border-remexo-500 border-l-4' : 'border-l-transparent';

        return '<div id="conv-' + r.id + '" onclick="window.openConversation(' + r.id + ',\'' + safeName + '\',\'craftsman' + r.id + '\',' + craftIdParam + ')" class="conv-item px-4 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800/80 transition-all duration-150 flex items-center gap-3 ' + isActiveClass + '">' +
        '<div class="relative shrink-0"><img id="cav-' + r.id + '" src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + seed + '&backgroundColor=0f172a" class="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-100 object-cover"><span style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:' + statusDot + ';border:2px solid white;"></span></div>' +
        '<div class="flex-1 min-w-0"><p class="font-bold text-sm dark:text-white truncate leading-tight" id="clist-name-' + r.id + '">' + (r.craftsman_name || "Řemeslník") + '</p><p class="text-xs text-slate-400 mt-0.5 truncate">' + r.title + '</p></div>' +
        unreadBadge +
        '</div>';
    }).join("");
    
    reqs.forEach(async r => {
        if (!r.craftsman_name || r.craftsman_name === "Řemeslník") {
            const {data} = await window.sb.from("messages").select("sender_name").eq("conversation_id", String(r.id)).neq("sender_id", window.APP_USER.id).limit(1);
            if (data && data.length > 0 && data[0].sender_name) {
                const el = document.getElementById("clist-name-" + r.id);
                if(el) el.innerText = data[0].sender_name;
            }
        }
    });
};

window.loadCraftsmanConversations = async function() {
    const list=document.getElementById("conv-list-c");
    if(!list||!window.sb||!window.APP_USER) return;
    const {data:offers}=await window.sb.from("offers").select("*, requests(*)").eq("craftsman_id",window.APP_USER.id).order("created_at",{ascending:false});
    if(!offers||offers.length===0){
        list.innerHTML='<div class="p-8 text-center text-sm text-slate-400"><i class="fa-regular fa-comments text-4xl mb-3 block opacity-50"></i>Žádné zprávy.<br>Podejte nabídku!</div>';
        return;
    }
    
    const uniqueOffers = [];
    const seen = new Set();
    offers.forEach(o => {
        if (!seen.has(o.request_id)) {
            seen.add(o.request_id);
            uniqueOffers.push(o);
        }
    });
    
    list.innerHTML = uniqueOffers.map(o => {
        const statusDot = o.requests?.status === 'active' ? '#22c55e' : o.requests?.status === 'done' ? '#94a3b8' : '#f59e0b';
        const safeName = (o.requests?.customer_name || "Zákazník").replace(/'/g, "\\'");
        const customerIdParam = o.requests?.customer_id ? `'${o.requests.customer_id}'` : 'null';
        const seed = encodeURIComponent(o.requests?.customer_name || 'u');
        const unreadCount = (window.STATE.unreadChats && window.STATE.unreadChats[o.request_id]) || 0;
        const unreadBadge = unreadCount > 0 ? '<div class="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ml-auto shrink-0 shadow-sm">' + unreadCount + '</div>' : '<i class="fa-solid fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600 shrink-0 ml-auto"></i>';
        const isActiveClass = window.activeChatId === String(o.request_id) ? 'bg-white dark:bg-slate-800/50 border-remexo-500 border-l-4' : 'border-l-transparent';

        // Tady se předává i ID zákazníka, aby fungovalo chytré načítání fotky!
        return '<div id="conv-' + o.request_id + '" onclick="window.openConversation(' + o.request_id + ',\'' + safeName + '\',\'customer' + o.request_id + '\',' + customerIdParam + ')" class="conv-item px-4 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800/80 transition-all duration-150 flex items-center gap-3 ' + isActiveClass + '">' +
        '<div class="relative shrink-0"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + seed + '&backgroundColor=f59e0b" class="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-slate-100"><span style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:' + statusDot + ';border:2px solid white;"></span></div>' +
        '<div class="flex-1 min-w-0"><p class="font-bold text-sm dark:text-white truncate leading-tight" id="clist-name-c-' + o.request_id + '">' + (o.requests?.customer_name || "Zákazník") + '</p><p class="text-xs text-slate-400 mt-0.5 truncate">' + (o.requests?.title || "Poptávka") + '</p></div>' +
        unreadBadge +
        '</div>';
    }).join("");

    uniqueOffers.forEach(async o => {
        if (!o.requests?.customer_name || o.requests?.customer_name === "Zákazník") {
            const {data} = await window.sb.from("messages").select("sender_name").eq("conversation_id", String(o.request_id)).neq("sender_id", window.APP_USER.id).limit(1);
            if (data && data.length > 0 && data[0].sender_name) {
                const el = document.getElementById("clist-name-c-" + o.request_id);
                if(el) el.innerText = data[0].sender_name;
            }
        }
    });
};

window.initGlobalNotifications = function() {
    if (!window.sb || !window.APP_USER) return;
    if (window.globalNotifSub) { try { window.sb.removeChannel(window.globalNotifSub); } catch(e){} }

    window.globalNotifSub = window.sb.channel('global-notifs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const msg = payload.new;
            const isMyChat = window.APP_ROLE === "customer" 
                ? (window.STATE.requests || []).some(r => String(r.sbId) === String(msg.conversation_id))
                : (window.STATE.craftJobs || []).some(j => String(j.requestId) === String(msg.conversation_id));

            if (isMyChat && msg.sender_id !== window.APP_USER.id) {
                if (window.activeChatId !== String(msg.conversation_id)) {
                    // Tohle je JEDINÝ typ notifikace, který má zvyšovat bublinu u "Zprávy"
                    // (4. parametr "true" u showToast to zajišťuje)
                    window.showToast("Nová zpráva! 💬", "Napsal vám: " + (msg.sender_name || "Uživatel"), "info", true);
                    
                    if (!window.STATE.unreadChats) window.STATE.unreadChats = {};
                    window.STATE.unreadChats[msg.conversation_id] = (window.STATE.unreadChats[msg.conversation_id] || 0) + 1;
                    
                    if (window.APP_ROLE === "customer" && window.loadCustomerConversations) window.loadCustomerConversations();
                    else if (window.loadCraftsmanConversations) window.loadCraftsmanConversations();
                }
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offers' }, payload => {
            if (window.APP_ROLE === "customer") {
                // Nová nabídka NENÍ zpráva - jde jen do zvonečku nahoře, ne do bubliny u Zpráv
                window.showToast("Nová nabídka! 🎉", "Řemeslník " + (payload.new.craftsman_name || "") + " má zájem.", "success");
                if (window.loadCustomerRequestsFromDB) window.loadCustomerRequestsFromDB();
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers' }, payload => {
            if (window.APP_ROLE === "craftsman" && payload.new.craftsman_id === window.APP_USER.id) {
                if (payload.new.status === "accepted") {
                    // Přijetí nabídky NENÍ zpráva - jde jen do zvonečku nahoře
                    window.showToast("Nabídka přijata! ✅", "Zákazník přijal vaši nabídku.", "success");
                    if (window.loadCraftsmanJobsFromDB) window.loadCraftsmanJobsFromDB();
                    if (window.loadCraftsmanConversations) window.loadCraftsmanConversations();
                } else if (payload.new.status === "rejected") {
                    // Odmítnutí nabídky NENÍ zpráva - jde jen do zvonečku nahoře
                    window.showToast("Nabídka odmítnuta ❌", "Zákazník si vybral někoho jiného.", "error");
                    if (window.loadCraftsmanJobsFromDB) window.loadCraftsmanJobsFromDB();
                }
            }
        })
        .subscribe();
};
