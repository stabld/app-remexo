// hlaseni.js — nahlášení problému uživatelem
// Na počítači: položka v levém panelu nad odhlášením.
// Na mobilu: úchyt přilepený k levé hraně, ve výšce Bořka.
(function () {
  // Pozor: window.supabase je knihovna z CDN, ne klient.
  function klient() {
    const kandidati = [
      window.supabaseClient, window.sb, window.db, window.supa,
      window.klient, window.supabase
    ];
    for (let i = 0; i < kandidati.length; i++) {
      const k = kandidati[i];
      if (k && typeof k.from === 'function' && k.auth) return k;
    }
    return null;
  }

  const styl = document.createElement('style');
  styl.textContent = `
    /* Úchyt přilepený k levé hraně, ve výšce Bořka. Dovnitř trčí jen 30 px. */
    /* Světlý režim je výchozí, tmavý se přebíjí přes html.dark */
    #hl-mobil{position:fixed;left:0;bottom:78px;z-index:149;display:none;
      width:30px;height:46px;padding:0;align-items:center;justify-content:center;
      background:#fff;color:#d97706;border:1px solid #e2e8f0;border-left:none;
      border-radius:0 14px 14px 0;font-size:14px;font-family:inherit;cursor:pointer;
      box-shadow:2px 3px 12px rgba(15,23,42,.12)}
    #hl-mobil:active{background:#f8fafc}
    html.dark #hl-mobil{background:#1e293b;color:#f59e0b;border-color:#334155;
      box-shadow:2px 3px 12px rgba(0,0,0,.3)}
    html.dark #hl-mobil:active{background:#334155}
    @media (max-width:1023px){#hl-mobil{display:flex}}
    #hl-overlay{position:fixed;inset:0;z-index:800;display:none;
      background:rgba(15,23,42,.6);backdrop-filter:blur(4px);
      align-items:center;justify-content:center;padding:16px}
    #hl-box{background:#fff;color:#0f172a;border-radius:24px;padding:26px;
      width:100%;max-width:420px;font-family:inherit;box-shadow:0 20px 50px rgba(0,0,0,.25)}
    html.dark #hl-box{background:#0f172a;color:#e2e8f0;border:1px solid #1e293b}
    #hl-box h3{margin:0 0 6px;font-size:20px;font-weight:900}
    #hl-box p{margin:0 0 14px;font-size:13px;color:#64748b}
    #hl-box textarea,#hl-box input{width:100%;box-sizing:border-box;
      background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;
      border-radius:12px;padding:11px 14px;font-size:16px;font-family:inherit}
    html.dark #hl-box textarea,html.dark #hl-box input{background:#1e293b;color:#e2e8f0;border-color:#334155}
    #hl-box textarea{min-height:110px;resize:vertical;margin-bottom:10px}
    #hl-box textarea:focus,#hl-box input:focus{outline:none;border-color:#f59e0b}
    #hl-akce{display:flex;gap:10px;margin-top:16px}
    #hl-akce button{flex:1;border-radius:12px;padding:12px;font-size:14px;
      font-weight:700;font-family:inherit;cursor:pointer;border:none}
    #hl-zrus{background:transparent;color:#64748b}
    #hl-zrus:hover{background:#f1f5f9}
    html.dark #hl-zrus:hover{background:#1e293b}
    #hl-odesli{background:#f59e0b;color:#fff;box-shadow:0 6px 16px rgba(245,158,11,.3)}
    #hl-odesli:hover{background:#d97706}
    #hl-odesli:disabled{opacity:.6;cursor:default}
    #hl-stav{font-size:13px;color:#64748b;margin-top:10px;min-height:18px;font-weight:600}
  `;
  document.head.appendChild(styl);

  const ov = document.createElement('div');
  ov.id = 'hl-overlay';
  ov.innerHTML = '<div id="hl-box">' +
    '<h3>Nahlásit problém</h3>' +
    '<p>Co nefungovalo? Klidně stručně, pomůže i pár slov.</p>' +
    '<textarea id="hl-text" placeholder="Například: po odeslání poptávky se stránka zasekla…"></textarea>' +
    '<input id="hl-email" type="email" placeholder="E-mail (nepovinné, kdybych se chtěl ozvat)">' +
    '<div id="hl-stav"></div>' +
    '<div id="hl-akce">' +
      '<button id="hl-zrus" type="button">Zavřít</button>' +
      '<button id="hl-odesli" type="button">Odeslat</button>' +
    '</div></div>';
  document.body.appendChild(ov);

  const txt = ov.querySelector('#hl-text');
  const em = ov.querySelector('#hl-email');
  const stav = ov.querySelector('#hl-stav');
  const odesli = ov.querySelector('#hl-odesli');

  function otevri() {
    ov.style.display = 'flex';
    stav.textContent = '';
    txt.focus();
  }

  function zavri() {
    ov.style.display = 'none';
  }

  // --- Položka v levém panelu, nad tlačítkem Odhlásit se ---
  const odhlasit = document.querySelector('#sidebar button[onclick*="doLogout"]');
  if (odhlasit && odhlasit.parentNode) {
    const polozka = document.createElement('button');
    polozka.id = 'hl-panel';
    polozka.type = 'button';
    polozka.className = 'w-full mb-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-remexo-500 hover:bg-remexo-50 dark:hover:bg-remexo-500/10 transition flex items-center justify-center gap-2';
    polozka.innerHTML = '<i class="fa-solid fa-bug"></i> Nahlásit problém';
    polozka.addEventListener('click', otevri);
    odhlasit.parentNode.insertBefore(polozka, odhlasit);
  }

  // --- Plovoucí tlačítko pro mobil ---
  const mobil = document.createElement('button');
  mobil.id = 'hl-mobil';
  mobil.type = 'button';
  mobil.title = 'Nahlásit problém';
  mobil.setAttribute('aria-label', 'Nahlásit problém');
  mobil.innerHTML = '<i class="fa-solid fa-bug"></i>';
  mobil.addEventListener('click', otevri);
  document.body.appendChild(mobil);

  ov.querySelector('#hl-zrus').addEventListener('click', zavri);
  ov.addEventListener('click', function (e) { if (e.target === ov) zavri(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ov.style.display === 'flex') zavri();
  });

  odesli.addEventListener('click', async function () {
    const obsah = txt.value.trim();
    if (obsah.length < 5) {
      stav.textContent = 'Napiš prosím aspoň pár slov.';
      return;
    }

    odesli.disabled = true;
    stav.textContent = 'Odesílám…';

    try {
      const sb = klient();
      if (!sb) throw new Error('chybí Supabase klient');

      let uid = null;
      try {
        const { data } = await sb.auth.getUser();
        uid = data && data.user ? data.user.id : null;
      } catch (e) {}

      const { error } = await sb.from('hlaseni').insert({
        text: obsah.slice(0, 4000),
        user_id: uid,
        email: em.value.trim() || null,
        url: location.href,
        prohlizec: navigator.userAgent
      });
      if (error) throw error;

      if (window.mer) window.mer('hlaseni_odeslano', null);

      stav.textContent = 'Díky, odesláno.';
      txt.value = '';
      em.value = '';
      setTimeout(zavri, 1200);
    } catch (e) {
      console.error('hlaseni:', e);
      stav.textContent = 'Nepovedlo se odeslat, zkus to prosím znovu.';
    } finally {
      odesli.disabled = false;
    }
  });

  window.otevriHlaseni = otevri;
})();
