// analytics.js — jednoduché měření událostí do Supabase
// Použití: mer('nazev_udalosti', { klic: 'hodnota' })
(function () {
  const KLIC = 'remexo_session';

  // Pozor: window.supabase je knihovna z CDN, ne klient.
  // Klienta poznáme podle toho, že má .from() i .auth.
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

  function sessionId() {
    try {
      let s = localStorage.getItem(KLIC);
      if (!s) {
        s = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random();
        localStorage.setItem(KLIC, s);
      }
      return s;
    } catch (e) {
      return null;
    }
  }

  window.mer = async function (typ, detail) {
    try {
      const sb = klient();
      if (!sb || !typ) return;

      let uid = null;
      try {
        const { data } = await sb.auth.getUser();
        uid = data && data.user ? data.user.id : null;
      } catch (e) {}

      await sb.from('udalosti').insert({
        typ: typ,
        user_id: uid,
        session_id: sessionId(),
        detail: detail || null
      });
    } catch (e) {
      // měření nikdy nesmí shodit aplikaci
      console.debug('mer selhalo', e);
    }
  };

  // pro ladění: v konzoli si ověříš, jestli klienta našel
  window.merKlient = klient;
})();
