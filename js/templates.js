window.customerHTML = function(name) {
    const first = name.split(" ")[0];
    return `
    <div id="view-dash" class="hidden fade-up">
        <div class="mb-10"><h2 class="text-3xl font-extrabold mb-2 dark:text-white">Vítejte, ${first} 👋</h2><p class="text-slate-500 text-lg">Přehled vašich aktivit na platformě Remexo.</p></div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Aktivní</p><p class="text-4xl font-black text-remexo-500" id="stat-active">0</p></div>
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Celkem</p><p class="text-4xl font-black dark:text-white" id="stat-total">0</p></div>
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Zprávy</p><p class="text-4xl font-black dark:text-white" id="stat-msgs">0</p></div>
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">V Escrow</p><p class="text-4xl font-black dark:text-white" id="stat-escrow">0 Kč</p></div>
        </div>
        <div class="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
            <h3 class="text-xl font-extrabold mb-6 dark:text-white">Poslední poptávky</h3>
            <div id="dash-requests-list"><p class="text-slate-400 text-center py-8">Zatím žádné poptávky. <button onclick="window.goTab('new','Nová poptávka')" class="text-remexo-500 font-bold hover:underline">Vytvořit první →</button></p></div>
        </div>
    </div>
    <div id="view-requests" class="hidden fade-up">
        <div class="flex items-center justify-between mb-8"><h2 class="text-3xl font-extrabold dark:text-white">Moje poptávky</h2><button onclick="window.goTab('new','Nová poptávka')" class="bg-remexo-500 hover:bg-remexo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition hover:scale-105"><i class="fa-solid fa-plus"></i> Nová</button></div>
        <div id="requests-list" class="space-y-5"><div id="empty-req" class="text-center p-16 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl"><i class="fa-solid fa-folder-open text-5xl text-slate-300 dark:text-slate-600 mb-5 block"></i><p class="font-bold text-slate-500 text-lg">Zatím zde nic není.</p><button onclick="window.goTab('new','Nová poptávka')" class="mt-4 text-remexo-500 font-bold hover:underline text-sm">Vytvořit první poptávku →</button></div></div>
    </div>
    <div id="view-messages" class="hidden fade-up">
        <h2 class="text-3xl font-extrabold mb-8 dark:text-white">Zprávy</h2>
        <div id="chat-container-customer" class="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div id="conv-panel-customer" class="chat-conv-panel w-80 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col bg-slate-50/50 dark:bg-transparent">
                <div class="p-4 border-b border-slate-200 dark:border-slate-800"><p class="font-bold text-sm dark:text-white">Konverzace</p></div>
                <div id="conv-list" class="flex-1 overflow-y-auto hide-scroll"><div class="p-8 text-center text-sm text-slate-400">Žádné konverzace</div></div>
            </div>
            <div id="msg-panel-customer" class="chat-msg-panel flex-1 flex flex-col relative">
                <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white/50 dark:bg-transparent backdrop-blur-md z-10">
                    <button onclick="window.showConvList('customer')" class="md:hidden w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0"><i class="fa-solid fa-arrow-left text-sm"></i></button>
                    <div id="chat-partner-avatar" class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center shrink-0"></div>
                    <p class="font-extrabold dark:text-white text-sm flex-1 truncate" id="chat-partner-name">Vyberte konverzaci</p>
                </div>
                <div id="chat-msgs" class="flex-1 overflow-y-auto hide-scroll p-4 flex flex-col gap-3"></div>
                <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50 dark:bg-transparent"><input type="text" id="msg-input" placeholder="Napište zprávu..." onkeypress="if(event.key==='Enter')window.sendMsg()" class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm"><button onclick="window.sendMsg()" class="bg-remexo-500 hover:bg-remexo-600 text-white w-11 h-11 rounded-2xl flex items-center justify-center transition shrink-0"><i class="fa-solid fa-paper-plane text-sm"></i></button></div>
            </div>
        </div>
    </div>
    <div id="view-payments" class="hidden fade-up max-w-4xl">
        <h2 class="text-3xl font-extrabold mb-8 dark:text-white">Platby & Escrow</h2>
        <div class="bg-gradient-to-br from-remexo-500 to-remexo-600 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden"><div class="absolute -right-10 -top-10 text-white/10 text-9xl"><i class="fa-solid fa-shield-halved"></i></div><p class="text-xs font-black uppercase tracking-widest opacity-80 mb-2 relative z-10">Peníze v bezpečné úschově</p><p class="text-5xl font-black mb-4 relative z-10">0 Kč</p><p class="text-sm opacity-90 relative z-10">Peníze jsou zablokovány u Remexo do vašeho potvrzení o dokončení opravy.</p></div>
        <div class="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-400 py-12">Zatím neproběhly žádné platby.</div>
    </div>
    <div id="view-profile" class="hidden fade-up max-w-4xl mx-auto">
        <h2 class="text-3xl font-extrabold mb-8 dark:text-white">Můj profil</h2>
        <div class="bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div class="flex flex-col md:flex-row gap-8">
                <div class="flex flex-col items-center gap-3 shrink-0">
                    <div class="relative group">
                        <img id="prof-avatar-img" src="" class="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-lg object-cover">
                        <label for="prof-avatar-input" class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                            <span class="text-white text-center text-xs font-bold leading-tight"><i class="fa-solid fa-camera text-xl mb-1 block"></i>Změnit</span>
                        </label>
                        <input type="file" id="prof-avatar-input" accept="image/*" class="hidden" onchange="window.handleProfilePhoto(this)">
                        <label for="prof-avatar-input" class="absolute -bottom-1 -right-1 w-9 h-9 bg-remexo-500 hover:bg-remexo-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition">
                            <i class="fa-solid fa-camera text-white text-sm"></i>
                        </label>
                    </div>
                    <span class="bg-remexo-50 dark:bg-remexo-500/10 text-remexo-600 dark:text-remexo-400 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest" id="prof-role-badge">Role</span>
                    <p class="text-xs text-slate-400 text-center">Max. 10 MB<br>JPG, PNG, GIF</p>
                </div>
                <div class="flex-1 space-y-5">
                    <div class="grid md:grid-cols-2 gap-5">
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Jméno a příjmení</label><input type="text" id="prof-name" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white"></div>
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">E-mail (nelze změnit)</label><input type="email" id="prof-email" disabled class="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm text-slate-500 cursor-not-allowed"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-5">
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Telefonní číslo</label>inp<ut type="tel" id="prof-phone" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white" placeholder="+420 ..."></div>
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Město</label><input type="text" id="prof-city" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white" placeholder="Např. Brno"></div>
                    </div>
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <button onclick="window.saveProfile(this)" class="flex-1 bg-remexo-500 hover:bg-remexo-600 text-white px-8 py-4 rounded-2xl font-black text-lg transition shadow-xl shadow-remexo-500/20 hover:-translate-y-1">Uložit změny v profilu</button>
                        <button onclick="window.doLogout()" class="sm:w-auto px-8 py-4 rounded-2xl font-black text-lg transition border-2 border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-2"><i class="fa-solid fa-arrow-right-from-bracket"></i> Odhlásit se</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="view-new" class="hidden fade-up max-w-5xl mx-auto w-full">
        <div class="bg-white dark:bg-[#0f172a] p-8 md:p-10 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div class="absolute top-[-20%] right-[-10%] w-96 h-96 bg-remexo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div class="mb-10 flex items-center gap-5 relative z-10 border-b border-slate-100 dark:border-slate-800 pb-6"><div class="w-16 h-16 rounded-2xl bg-remexo-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-remexo-500/30"><i class="fa-solid fa-hard-hat text-2xl"></i></div><div><h3 class="text-2xl font-extrabold dark:text-white leading-tight">Asistent Bořek</h3><p class="text-remexo-600 dark:text-remexo-500 text-[11px] font-black uppercase tracking-widest mt-1">Příprava zakázky s umělou inteligencí</p></div></div>
            <div id="popt-form" class="space-y-6 relative z-10">
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="flex flex-col"><label class="font-extrabold text-sm text-slate-700 dark:text-slate-300 mb-3 block">Co se pokazilo?</label><textarea id="popt-input" class="flex-1 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 dark:text-white focus:ring-2 focus:ring-remexo-500 outline-none resize-none min-h-[180px] shadow-inner" placeholder="Opište svůj problém co nejpodrobněji..."></textarea></div>
                    
                    <div class="flex flex-col">
                        <label class="font-extrabold text-sm text-slate-700 dark:text-slate-300 mb-3 block">Fotky závady (až 5 fotek)</label>
                        <div class="relative flex-1 min-h-[180px] group">
                            <input type="file" accept="image/*" multiple onchange="window.handlePhoto(this)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40">
                            <div id="photo-zone" class="w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 group-hover:border-remexo-500 group-hover:bg-remexo-50 dark:group-hover:bg-remexo-500/10 transition-all overflow-hidden relative z-10 shadow-inner">
                                <i class="fa-solid fa-camera text-4xl mb-3 text-slate-300 dark:text-slate-500 group-hover:text-remexo-500 transition-colors"></i>
                                <p class="text-sm font-bold text-slate-500 group-hover:text-remexo-600 transition-colors">Klikněte pro nahrání</p>
                                <p class="text-xs text-slate-400 mt-1">Max. 5 fotek</p>
                            </div>
                            <div id="photo-gallery" class="hidden absolute inset-0 z-30 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 overflow-y-auto grid grid-cols-2 gap-2 content-start pointer-events-none"></div>
                        </div>
                    </div>

                </div>
                <button onclick="window.startAI()" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-remexo-500 dark:hover:bg-remexo-500 hover:text-white font-black py-5 rounded-2xl text-lg transition-all shadow-xl hover:-translate-y-1">Analyzovat problém s Bořkem</button>
            </div>
            <div id="popt-chat" class="hidden flex flex-col gap-6 relative z-10">
                <div id="popt-chat-msgs" class="flex flex-col gap-4 max-h-[400px] overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 hide-scroll shadow-inner"></div>
                <div id="popt-reply-area" class="hidden flex gap-3"><input type="text" id="popt-reply" onkeypress="if(event.key==='Enter')window.replyAI()" class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm" placeholder="Odpovězte Bořkovi..."><button onclick="window.replyAI()" class="bg-remexo-500 hover:bg-remexo-600 text-white px-8 py-4 rounded-2xl font-bold transition hover:scale-105 shadow-lg"><i class="fa-solid fa-paper-plane"></i></button></div>
            </div>
            <div id="popt-loading" class="hidden mt-12 text-center relative z-10 py-10"><div class="relative w-20 h-20 mx-auto mb-6"><div class="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div><div class="absolute inset-0 border-4 border-remexo-500 rounded-full border-t-transparent animate-spin"></div><i class="fa-solid fa-microchip absolute inset-0 m-auto flex items-center justify-center text-2xl text-remexo-500" style="line-height:5rem"></i></div><p class="font-extrabold text-slate-600 dark:text-slate-300 text-lg">Bořek analyzuje data...</p><p class="text-slate-400 text-sm mt-2">Vytváříme profi zadání pro řemeslníky.</p></div>
            <div id="popt-result" class="hidden mt-10 relative z-10">
                <div id="popt-tip" class="hidden mb-8 bg-remexo-50 dark:bg-remexo-500/10 border border-remexo-200 dark:border-remexo-500/30 rounded-2xl p-6 shadow-sm"><div class="flex gap-4"><div class="w-10 h-10 rounded-full bg-white dark:bg-remexo-500/20 text-remexo-500 flex items-center justify-center shrink-0 shadow-sm"><i class="fa-solid fa-lightbulb text-lg"></i></div><div><p class="font-black text-[11px] uppercase tracking-widest mb-1.5 text-remexo-700 dark:text-remexo-400">Rada od Bořka</p><p id="popt-tip-text" class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed"></p></div></div></div>
                <div class="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800"><div class="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"><i class="fa-solid fa-check text-xl"></i></div><div><h3 class="text-2xl font-black dark:text-white">Poptávka připravena!</h3><p class="text-sm text-slate-500 mt-1">Kliknutím na text níže jej upravte.</p></div></div>
                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-inner">
                    <div class="absolute top-0 left-0 w-2 h-full bg-remexo-500"></div>
                    <div class="flex flex-wrap gap-3 mb-6 pl-4"><span id="r-kat" contenteditable="true" class="status-badge bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-remexo-500 focus:outline-none cursor-text transition"></span><span id="r-nal" contenteditable="true" class="status-badge bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 focus:outline-none cursor-text transition"></span><span id="r-cena" contenteditable="true" class="status-badge bg-remexo-50 dark:bg-remexo-500/10 text-remexo-700 dark:text-remexo-400 border border-remexo-200 dark:border-remexo-500/30 focus:outline-none cursor-text transition"></span></div>
                    <h4 id="r-nazev" contenteditable="true" class="text-3xl font-black mb-6 dark:text-white focus:outline-none rounded-xl px-4 py-2 -mx-4 hover:bg-white dark:hover:bg-slate-800 transition cursor-text pl-4">...</h4>
                    <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-4">Popis pro řemeslníka</p>
                    <p id="r-popis" contenteditable="true" class="text-base text-slate-700 dark:text-slate-300 leading-relaxed focus:outline-none rounded-xl px-4 py-3 -mx-4 hover:bg-white dark:hover:bg-slate-800 transition cursor-text whitespace-pre-line min-h-[5rem] pl-4">...</p>
                    <button id="btn-show-finalize" onclick="window.showFinalizeForm()" class="w-full mt-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-lg transition shadow-xl hover:scale-[1.02]">Pokračovat k detailům adresy →</button>
                    <div id="popt-finalize" class="hidden mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 pl-4">
                        <h4 class="text-xl font-black dark:text-white mb-6">Doplňující údaje pro výjezd</h4>
                        <div class="grid md:grid-cols-3 gap-5 mb-5"><div class="md:col-span-2"><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Ulice a číslo popisné *</label><input type="text" id="f-street" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm" placeholder="Např. Masarykova 15"></div><div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Město *</label><input type="text" id="f-city" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm" placeholder="Např. Brno"></div></div>
                        <div class="grid md:grid-cols-2 gap-5 mb-5"><div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Telefonní číslo *</label><input type="tel" id="f-phone" oninput="window.formatPhone(this)" maxlength="16" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm" placeholder="+420 ..."></div><div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Termín</label><select id="f-timeframe" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm"><option value="Havarijní stav (Co nejdříve)">Havarijní stav (Co nejdříve)</option><option value="Během několika dnů" selected>Během několika dnů</option><option value="Nespěchá (do měsíce)">Nespěchá (do měsíce)</option></select></div></div>
                        <div class="grid md:grid-cols-2 gap-5 mb-5"><div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Typ nemovitosti</label><select id="f-property" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm"><option value="Byt">Byt</option><option value="Rodinný dům">Rodinný dům</option><option value="Komerční prostor">Komerční prostor</option></select></div><div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Parkování</label><select id="f-parking" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm"><option value="Bezproblémové (vlastní pozemek / volná ulice)">Bezproblémové (vlastní / volná ulice)</option><option value="Placené zóny / modré zóny">Placené / modré zóny</option><option value="Velmi špatné parkování">Velmi špatné parkování</option></select></div></div>
                       <div class="mb-6"><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Váš rozpočet <span class="font-normal normal-case">(volitelné)</span></label><div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Kč</span><input type="text" id="f-budget" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm" placeholder="Např. 2 000 – 5 000"></div><p class="text-xs text-slate-400 mt-2">Pomůže řemeslníkům připravit realistickou nabídku.</p></div>
<div class="mb-6">
    <label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Fotky závady <span class="font-normal normal-case">(volitelné, max. 5)</span></label>
    <div class="relative min-h-[130px] group">
        <input type="file" accept="image/*" multiple onchange="window.handlePhoto(this,'photo-gallery-finalize','photo-zone-finalize')" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40">
        <div id="photo-zone-finalize" class="w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center bg-white dark:bg-slate-800 group-hover:border-remexo-500 transition-all overflow-hidden relative z-10 shadow-sm py-6">
            <i class="fa-solid fa-camera text-3xl mb-2 text-slate-300 dark:text-slate-500 group-hover:text-remexo-500 transition-colors"></i>
            <p class="text-sm font-bold text-slate-500 group-hover:text-remexo-600 transition-colors">Klikněte pro nahrání fotek</p>
        </div>
        <div id="photo-gallery-finalize" class="hidden absolute inset-0 z-30 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 overflow-y-auto grid grid-cols-3 gap-2 content-start pointer-events-none"></div>
    </div>
</div>
<button onclick="window.publishRequest(this)" class="w-full bg-remexo-500 hover:bg-remexo-600 text-white py-5 rounded-2xl font-black text-lg transition shadow-xl shadow-remexo-500/20 hover:-translate-y-1">Zveřejnit poptávku na remexo</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};

window.craftsmanHTML = function(name) {
    return `
    <div id="view-market" class="hidden fade-up">
        <div class="flex items-center justify-between mb-8">
            <h2 class="text-3xl font-extrabold dark:text-white">Tržiště zakázek</h2>
            <div class="flex items-center gap-2">
                <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex gap-1 shadow-sm">
                    <button id="view-toggle-list" onclick="window.toggleMarketView('list')" class="px-4 py-2 rounded-lg text-sm font-bold bg-remexo-500 text-white transition"><i class="fa-solid fa-list mr-1.5"></i>Seznam</button>
                    <button id="view-toggle-map" onclick="window.toggleMarketView('map')" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"><i class="fa-solid fa-map-location-dot mr-1.5"></i>Mapa</button>
                </div>
            </div>
        </div>
        <div class="flex gap-3 mb-8 overflow-x-auto hide-scroll pb-2">
            <button onclick="window.filterMarket('all', this)" id="filter-all" class="filter-btn shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold bg-remexo-500 text-white shadow-md transition hover:scale-105">Vše</button>
            <button onclick="window.filterMarket('Instalatérství', this)" class="filter-btn shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-remexo-500 transition hover:scale-105">Instalatérství</button>
            <button onclick="window.filterMarket('Elektrikář', this)" class="filter-btn shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-remexo-500 transition hover:scale-105">Elektrikář</button>
            <button onclick="window.filterMarket('Malíř', this)" class="filter-btn shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-remexo-500 transition hover:scale-105">Malíř</button>
            <button onclick="window.filterMarket('Tesař', this)" class="filter-btn shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-remexo-500 transition hover:scale-105">Tesař</button>
            <button onclick="window.filterMarket('Zámečník', this)" class="filter-btn shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-remexo-500 transition hover:scale-105">Zámečník</button>
        </div>
        <div id="market-list" class="space-y-5"><div class="text-center p-16 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl"><i class="fa-solid fa-circle-notch fa-spin text-5xl text-remexo-500 mb-5 block"></i><p class="font-bold text-slate-500 text-lg">Hledám nové poptávky ve vašem okolí...</p></div></div>
        <div id="market-map" class="hidden"></div>
    </div>
    <div id="view-jobs" class="hidden fade-up">
        <h2 class="text-3xl font-extrabold mb-8 dark:text-white">Moje práce</h2>
        <div class="grid grid-cols-3 gap-5 mb-8"><div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center"><p class="text-4xl font-black text-remexo-500" id="jobs-active-count">0</p><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-2">Aktivní</p></div><div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center"><p class="text-4xl font-black dark:text-white" id="jobs-done-count">0</p><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-2">Dokončené</p></div><div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center"><p class="text-4xl font-black text-yellow-500" id="jobs-rating">5.0 ⭐</p><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-2">Hodnocení</p></div></div>
        <div id="my-jobs-list" class="space-y-4"><div class="text-center p-12 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl"><i class="fa-solid fa-hammer text-5xl text-slate-300 dark:text-slate-600 mb-4 block"></i><p class="font-bold text-slate-500 text-lg">Zatím nemáte žádné aktivní zakázky.</p></div></div>
    </div>
    <div id="view-c-messages" class="hidden fade-up max-w-4xl">
        <h2 class="text-3xl font-extrabold mb-8 dark:text-white">Zprávy</h2>
        <div id="chat-container-craftsman" class="bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div id="conv-panel-craftsman" class="chat-conv-panel w-80 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col bg-slate-50/50 dark:bg-transparent">
                <div class="p-4 border-b border-slate-200 dark:border-slate-800"><p class="font-bold text-sm dark:text-white">Konverzace</p></div>
                <div id="conv-list-c" class="flex-1 overflow-y-auto hide-scroll"><div class="p-8 text-center text-sm text-slate-400">Žádné konverzace</div></div>
            </div>
            <div id="msg-panel-craftsman" class="chat-msg-panel flex-1 flex flex-col relative">
                <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white/50 dark:bg-transparent backdrop-blur-md z-10">
                    <button onclick="window.showConvList('craftsman')" class="md:hidden w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0"><i class="fa-solid fa-arrow-left text-sm"></i></button>
                    <div id="chat-partner-avatar" class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center shrink-0"></div>
                    <p class="font-extrabold dark:text-white text-sm flex-1 truncate" id="chat-partner-name-c">Zprávy</p>
                </div>
                <div id="chat-msgs-c" class="flex-1 overflow-y-auto hide-scroll p-4 flex flex-col gap-3"></div>
                <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50 dark:bg-transparent"><input type="text" id="msg-input-c" placeholder="Napište zprávu..." onkeypress="if(event.key==='Enter')window.sendMsgC()" class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white shadow-sm"><button onclick="window.sendMsgC()" class="bg-remexo-500 hover:bg-remexo-600 text-white w-11 h-11 rounded-2xl flex items-center justify-center transition shrink-0"><i class="fa-solid fa-paper-plane text-sm"></i></button></div>
            </div>
        </div>
    </div>
    <div id="view-earnings" class="hidden fade-up max-w-3xl">
        <h2 class="text-3xl font-extrabold mb-8 dark:text-white">Výdělky</h2>
        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 mb-8 text-white shadow-xl relative overflow-hidden"><div class="absolute -right-10 -top-10 text-white/5 text-9xl"><i class="fa-solid fa-wallet"></i></div><p class="text-xs font-black uppercase tracking-widest opacity-60 mb-2 relative z-10">Celkové výdělky přes remexo</p><p class="text-5xl font-black mb-1 relative z-10">0 Kč</p></div>
        <div class="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-400 py-12">Zatím neproběhly žádné výplaty.</div>
    </div>
    <div id="view-profile" class="hidden fade-up max-w-4xl mx-auto">
        <h2 class="text-3xl font-extrabold mb-8 dark:text-white">Můj profil</h2>
        <div class="bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div class="flex flex-col md:flex-row gap-8">
                <div class="flex flex-col items-center gap-3 shrink-0">
                    <div class="relative group">
                        <img id="prof-avatar-img" src="" class="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-lg object-cover">
                        <label for="prof-avatar-input" class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                            <span class="text-white text-center text-xs font-bold leading-tight"><i class="fa-solid fa-camera text-xl mb-1 block"></i>Změnit</span>
                        </label>
                        <input type="file" id="prof-avatar-input" accept="image/*" class="hidden" onchange="window.handleProfilePhoto(this)">
                        <label for="prof-avatar-input" class="absolute -bottom-1 -right-1 w-9 h-9 bg-remexo-500 hover:bg-remexo-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition">
                            <i class="fa-solid fa-camera text-white text-sm"></i>
                        </label>
                    </div>
                    <span class="bg-remexo-50 dark:bg-remexo-500/10 text-remexo-600 dark:text-remexo-400 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest" id="prof-role-badge">Role</span>
                    <p class="text-xs text-slate-400 text-center">Max. 10 MB<br>JPG, PNG, GIF</p>
                </div>
                <div class="flex-1 space-y-5">
                    <div class="grid md:grid-cols-2 gap-5">
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Jméno a příjmení</label><input type="text" id="prof-name" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white"></div>
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">E-mail (nelze změnit)</label><input type="email" id="prof-email" disabled class="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm text-slate-500 cursor-not-allowed"></div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-5">
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Telefonní číslo</label><input type="tel" id="prof-phone" oninput="window.formatPhone(this)" maxlength="16" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white" placeholder="+420 ..."></div>
                        <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Město / Působnost</label><input type="text" id="prof-city" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white" placeholder="Např. Brno"></div>
                    </div>
                    <div><label class="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">O mně / Popis služeb</label><textarea id="prof-bio" rows="4" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-remexo-500 outline-none dark:text-white resize-none" placeholder="Popište své zkušenosti, specializaci, reference..."></textarea></div>
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                        <button onclick="window.saveProfile(this)" class="flex-1 bg-remexo-500 hover:bg-remexo-600 text-white px-8 py-4 rounded-2xl font-black text-lg transition shadow-xl shadow-remexo-500/20 hover:-translate-y-1">Uložit změny v profilu</button>
                        <button onclick="window.doLogout()" class="sm:w-auto px-8 py-4 rounded-2xl font-black text-lg transition border-2 border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-2"><i class="fa-solid fa-arrow-right-from-bracket"></i> Odhlásit se</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};
