window.customerHTML = function(name) {
    const first = name.split(" ")[0];
    return `
    <div id="view-dash" class="hidden fade-up">
        <div id="dash-profile-alert" class="hidden mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm fade-up">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-md"><i class="fa-solid fa-user-pen text-xl"></i></div>
                <div class="text-left">
                    <h4 class="font-bold text-slate-800 dark:text-white text-lg">Doplňte si svůj profil</h4>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Přidejte si telefon a město, aby vás řemeslníci mohli snadno kontaktovat.</p>
                </div>
            </div>
            <button onclick="window.goTab('profile','Můj profil')" class="shrink-0 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg hover:-translate-y-1">Přejít do nastavení</button>
        </div>

        <div class="mb-10"><h2 class="text-3xl font-extrabold mb-2 dark:text-white">Vítejte, ${first} 👋</h2><p class="text-slate-500 text-lg">Přehled vašich aktivit na platformě Remexo.</p></div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Aktivní</p><p class="text-4xl font-black text-remexo-500" id="stat-active">0</p></div>
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Celkem</p><p class="text-4xl font-black dark:text-white" id="stat-total">0</p></div>
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Zprávy</p><p class="text-4xl font-black dark:text-white" id="stat-msgs">0</p></div>
            <div class="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm"><p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">V Escrow</p><p class="text-4xl font-black dark:text-white" id="stat-escrow">0 Kč</p></div>
        </div>
        <div class="bg-white dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
            <h3 class="text-xl font-extrabold mb-6 dark:text-white">Poslední poptávky</h3>
            
            <div id="dash-requests-list">
                <div class="bg-remexo-50 dark:bg-remexo-500/10 rounded-2xl p-8 text-center border border-remexo-100 dark:border-remexo-500/20">
                    <div class="w-16 h-16 bg-remexo-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-remexo-500/30">
                        <i class="fa-solid fa-plus text-2xl"></i>
                    </div>
                    <h4 class="text-xl font-black text-slate-800 dark:text-white mb-2">Začněte svou první poptávkou</h4>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">Nechte našeho asistenta, ať vám pomůže s popisem závady a najde vám nejlepšího řemeslníka.</p>
                    <button onclick="window.goTab('new','Nová poptávka')" class="bg-remexo-500 hover:bg-remexo-600 text-white px-8 py-3.5 rounded-xl font-bold transition shadow-lg hover:-translate-y-1">
                        Vytvořit poptávku
                    </button>
                </div>
            </div>
        </div>
    </div>
    // ... (zbytek logiky zůstává v podobném duchu, stačí hromadně přepsat fixit-* na remexo-*)
    `;
};
