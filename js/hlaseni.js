// hlaseni.js — nahlášení problému uživatelem
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
    #hl-btn{position:fixed;left:16px;bottom:16px;z-index:149;
      background:#1e293b;color:#f59e0b;border:1px solid #334155;
      border-radius:9999px;padding:9px 15px;font-size:13px;font-weight:700;
      font-family:inherit;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2)}
    #hl-btn:hover{background:#334155}
    @media (max-width:1024px){#hl-btn{bottom:80px}}
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

  const btn = document.createElement('button');
  btn.id = 'hl-btn';
  btn.type = 'button';
  btn.innerHTML = '<i class="fa-solid fa-bug"></i> Nahlásit problém';

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

  document.body.appendChild(btn);
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

  btn.addEventListener('click', otevri);
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
})();
