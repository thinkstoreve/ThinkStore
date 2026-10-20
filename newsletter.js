(function(){
  'use strict';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getClient(){
    if (window.tsSupabase) return window.tsSupabase;
    try {
      const cfg = window.THINKSTORE_SUPABASE || {};
      if (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY) {
        window.tsSupabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
        return window.tsSupabase;
      }
    } catch (_) {}
    return null;
  }

  function setState(form, type, message){
    const status = form.querySelector('.ts-newsletter-status');
    const btn = form.querySelector('button[type="submit"]');
    if(status){
      status.textContent = message || '';
      status.className = 'ts-newsletter-status' + (type ? ' ' + type : '');
    }
    if(btn){
      btn.disabled = type === 'loading';
      btn.setAttribute('aria-busy', type === 'loading' ? 'true' : 'false');
    }
  }

  async function subscribe(email, source){
    const client = getClient();
    if(!client) throw new Error('SUPABASE_UNAVAILABLE');

    const payload = {
      email: email.toLowerCase(),
      status: 'subscribed',
      source: source || 'web',
      consent_at: new Date().toISOString()
    };

    const { error } = await client.from('newsletter_subscribers').insert(payload);
    if(error){
      if(error.code === '23505') return { duplicate:true };
      throw error;
    }
    return { duplicate:false };
  }

  async function onSubmit(event){
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.querySelector('input[type="email"]');
    const email = (input?.value || '').trim();
    if(!EMAIL_RE.test(email)){
      setState(form, 'error', 'Escribe un correo electrónico válido.');
      input?.focus();
      return;
    }

    setState(form, 'loading', 'Guardando tu suscripción…');
    try{
      const result = await subscribe(email, form.dataset.source || 'web');
      localStorage.setItem('ts_newsletter_email', email.toLowerCase());
      form.classList.add('is-success');
      setState(form, 'success', result.duplicate
        ? 'Ese correo ya está suscrito a las novedades de ThinkStore. ✓'
        : '¡Listo! Te avisaremos sobre ofertas, lanzamientos y novedades. ✓');
      if(input) input.value = email;
    }catch(error){
      console.warn('ThinkStore newsletter:', error);
      if(String(error?.message || error).includes('newsletter_subscribers') || error?.code === '42P01'){
        setState(form, 'error', 'La suscripción está lista en la web, pero falta activar la tabla Newsletter en Supabase.');
      }else if(String(error?.message || error).includes('SUPABASE_UNAVAILABLE')){
        setState(form, 'error', 'Conecta Supabase para guardar suscripciones reales.');
      }else{
        setState(form, 'error', 'No pudimos guardar tu correo ahora. Inténtalo nuevamente.');
      }
    }
  }

  function init(){
    document.querySelectorAll('.ts-newsletter-form').forEach(form => {
      if(form.dataset.ready === '1') return;
      form.dataset.ready = '1';
      form.addEventListener('submit', onSubmit);
      const saved = localStorage.getItem('ts_newsletter_email');
      const input = form.querySelector('input[type="email"]');
      if(saved && input && !input.value) input.value = saved;
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
