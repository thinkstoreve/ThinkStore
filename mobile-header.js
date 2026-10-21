/* ThinkStore V15.41.6: navegación móvil sin afectar el menú de escritorio. */
(function(){
  'use strict';
  function init(){
    const header=document.querySelector('.top.ts-clean-header');
    const toggle=document.getElementById('tsMobileMenuToggle');
    const panel=document.getElementById('tsMobileMenu');
    if(!header||!toggle||!panel||toggle.dataset.tsReady==='1') return;
    toggle.dataset.tsReady='1';
    const media=window.matchMedia('(max-width: 700px)');
    function setOpen(open){
      const show=Boolean(open && media.matches);
      header.classList.toggle('ts-mobile-menu-open',show);
      toggle.setAttribute('aria-expanded',String(show));
      toggle.setAttribute('aria-label',show?'Cerrar menú':'Abrir menú');
      panel.hidden=!show;
    }
    toggle.addEventListener('click',()=>setOpen(panel.hidden));
    panel.addEventListener('click',event=>{if(event.target.closest('a')) setOpen(false)});
    document.addEventListener('pointerdown',event=>{
      if(!panel.hidden && !header.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape' && !panel.hidden){setOpen(false);toggle.focus()}
    });
    header.addEventListener('click',event=>{
      if(!panel.hidden && event.target.closest('.ts-clean-brand,.ts-clean-nav')) setOpen(false);
    });
    if(media.addEventListener) media.addEventListener('change',()=>setOpen(false));
    else if(media.addListener) media.addListener(()=>setOpen(false));
    window.addEventListener('pageshow',()=>setOpen(false));
    setOpen(false);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
