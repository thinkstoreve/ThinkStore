/* ThinkStore · Respuesta táctil y apertura suave de ventanas. */
(function(){
 'use strict';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const selector='.modal,.ts-premium-auth-modal';
 const visible=new WeakMap();
 const running=new WeakMap();
 const activeAnimations=new Set();
 function motion(el,frames,options){const a=el.animate(frames,options);activeAnimations.add(a);a.finished.catch(()=>{}).finally(()=>activeAnimations.delete(a));return a;}
 reduced.addEventListener('change',()=>{if(reduced.matches){activeAnimations.forEach(a=>a.cancel());activeAnimations.clear();}});
 function isOpen(el){return getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getClientRects().length>0;}
 function animateOpen(el){
  if(reduced.matches||!el.animate)return;
  const panel=Array.from(el.children).find(c=>!c.className.toString().includes('backdrop'));
  const old=running.get(el);if(old)old.forEach(a=>a.cancel());
  const animations=[motion(el,[{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'})];
  if(panel){
   const base=getComputedStyle(panel).transform;
   const transform=base==='none'?'':base;
   animations.push(motion(panel,[{opacity:0,transform:transform+' translateY(14px) scale(.985)'},{opacity:1,transform:transform+' translateY(0) scale(1)'}],{duration:280,easing:'cubic-bezier(.2,.75,.25,1)'}));
  }
  running.set(el,animations);
 }
 function check(el){const next=isOpen(el);const prev=visible.get(el);visible.set(el,next);if(next&&prev!==true)animateOpen(el);}
 function init(){
  // Content stays visible if animation APIs are unavailable; reveal only once.
  if('IntersectionObserver' in window){
   const seen=new WeakSet();
   const targets='.section>h2,.section>.eyebrow,.ts-home-service-heading,.servgrid>button,.ts-home-ad,.ts-controller-heading,.ts-controller-grid>article,.ts-console-intro,.ts-console-hero-photo,#envios .panels>article,.ts-reviews-intro,.ts-reviews-invite,.ts-newsletter-inner,.location,.ts-footer-columns>div,.ts-footer-columns>nav,.ts-mac-pro-promo';
   const io=new IntersectionObserver(entries=>{
    let stagger=0;
    entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target;io.unobserve(el);if(seen.has(el))return;seen.add(el);
     if(reduced.matches||!el.animate)return;
     const base=getComputedStyle(el).transform;const transform=base==='none'?'':base;
     motion(el,[{opacity:.25,transform:transform+' translateY(20px)'},{opacity:1,transform:transform+' translateY(0)'}],{duration:560,delay:Math.min(stagger++*55,165),easing:'cubic-bezier(.22,1,.36,1)'});
    });
   },{threshold:.08,rootMargin:'0px 0px -24px 0px'});
   document.querySelectorAll(targets).forEach(el=>io.observe(el));
  }

  document.querySelectorAll(selector).forEach(el=>visible.set(el,isOpen(el)));
  const observer=new MutationObserver(records=>{
   const pending=new Set();
   records.forEach(r=>{
    if(r.type==='attributes'&&r.target.matches(selector))pending.add(r.target);
    if(r.type==='childList')r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches(selector))pending.add(n);n.querySelectorAll(selector).forEach(el=>pending.add(el));});
   });
   pending.forEach(check);
  });
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','aria-hidden'],childList:true});
  document.addEventListener('click',e=>{
   const button=e.target.closest('button,a.btn,[role="button"]');
   if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||reduced.matches||!button.animate)return;
   const base=getComputedStyle(button).transform;
   const transform=base==='none'?'':base;
   motion(button,[{transform:transform+' scale(1)'},{transform:transform+' scale(.96)'},{transform:transform+' scale(1)'}],{duration:210,easing:'ease-out'});
  },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
