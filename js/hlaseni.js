// hlaseni.js — nahlášení problému uživatelem
// Vyžaduje inicializovaného Supabase klienta (window.supabase nebo window.supabaseClient).
(function () {
  const styl = document.createElement('style');
  styl.textContent = `
    #hl-btn{position:fixed;right:16px;bottom:16px;z-index:9998;
      background:#1c1917;color:#fbbf24;border:1px solid #44403c;
      border-radius:9999px;padding:10px 16px;font-size:14px;
      font-family:inherit;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25)}
    #hl-btn:hover{background:#292524}
    #hl-overlay{position:fixed;inset:0;z-index:9999;display:none;
      background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:16px}
    #hl-box{background:#1c1917;color:#e7e5e4;border:1px solid #44403c;
      border-radius:16px;padding:20px;width:100%;max-width:420px;font-family:inherit}
    #hl-box h3{margin:0 0 8px;font-size:17px;color:#fbbf24}
    #hl-box p{margin:0 0 12px;font-size:13px;color:#a8a29e}
    #hl-box textarea,#hl-box input{width:100%;box-sizing:border-box;
      background:#292524;color:#e7e5e4;border:1px solid #57534e;
      border-radius:10px;padding:10px;font-size:14px;font-family:inherit}
    #hl-box textarea{min-height:110px;resize:vertical;margin-bottom:10px}
    #hl-box textarea:focus,#hl-box input:focus{outline:none;border-color:#fbbf24}
    #hl-akce{display:flex;gap:8px;margin-top:14px}
    #hl-akce button{flex:1;border-radius:10px;padding:10px;font-size:14px;
      font-family:inherit;cursor:pointer;border:1px solid #57534e}
    #hl-zrus{background:transparent;color:#a8a29e}
    #hl-odesli{background:#fbbf24;color:#1c1917;border-color:#fbbf24;font-weight:600}
    #hl-odesli:disabled{opacity:.6;cursor:default}
    #hl-stav{font-size:13px;color:#a8a29e;margin-top:10px;min-height:18px}
  `;
  document.head.appendChild(styl);

  const btn = document.createElement('button');
  btn.id = 'hl-btn';
  btn.type = 'button';
  btn.textContent = 'Nahlásit problém';

  const ov = document.createElement('div');
  ov.id = 'hl-overlay';
  ov.innerHTML = `
    <div id="hl-box">
      <h3>Nahlásit problém</h3>
      <p>Co nefungovalo? Klidně stručně, pomůže i pár slov.</p>
      <textarea id="hl-text" placeholder="Například: po odeslání poptávky se stránka zasekla…"></textarea>
      <input id="hl-email" type="email" placeholder="E-mail (nepovinné, kdybych se chtěl ozvat)">
      <div id="hl-stav"></div>
      <div id="hl-akce">
        <button id="hl-zrus" type="button">Zavřít</button>
        <button id="hl-odesli" type="button">Odeslat</button>
      </div>
    </div>`;

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
      const sb = window.supabase || window.supabaseClient;
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
