// analytics.js — jednoduché měření událostí do Supabase
(function () {
  const KLIC = 'remexo_session';

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
      const sb = window.supabase || window.supabaseClient;
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
      console.debug('mer selhalo', e);
    }
  };
})();
