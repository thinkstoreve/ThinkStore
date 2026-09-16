(function(){
  'use strict';
  let current=0,timer=null,root=null,slides=[],dots=[],counter=null,title=null;
  const delay=7200;
  function syncVideo(){
    slides.forEach((slide,i)=>{
      const v=slide.querySelector('video');
      if(!v)return;
      if(i===current){
        try{v.currentTime=0;}catch(_){ }
        const p=v.play(); if(p&&p.catch)p.catch(()=>{});
      }else{v.pause();}
    });
  }
  function activate(i){
    if(!slides.length)return;
    current=(Number(i)+slides.length)%slides.length;
    slides.forEach((el,n)=>el.classList.toggle('is-active',n===current));
    dots.forEach((el,n)=>el.classList.toggle('is-active',n===current));
    if(counter)counter.textContent=String(current+1).padStart(2,'0');
    if(title)title.textContent=slides[current].dataset.label||'';
    syncVideo();
  }
  function restart(){clearInterval(timer);timer=setInterval(()=>activate(current+1),delay)}
  window.ts76HeroGo=i=>{activate(i);restart()};
  window.ts76HeroPrev=()=>{activate(current-1);restart()};
  window.ts76HeroNext=()=>{activate(current+1);restart()};
  document.addEventListener('DOMContentLoaded',()=>{
    root=document.querySelector('.ts76-hero');if(!root)return;
    slides=[...root.querySelectorAll('[data-ts76-slide]')];
    dots=[...root.querySelectorAll('.ts76-dot')];
    counter=root.querySelector('[data-ts76-current]');
    title=root.querySelector('[data-ts76-title]');
    activate(0);restart();
    root.addEventListener('mouseenter',()=>clearInterval(timer));
    root.addEventListener('mouseleave',restart);
    document.addEventListener('visibilitychange',()=>document.hidden?clearInterval(timer):restart());
    let sx=0;
    root.addEventListener('touchstart',e=>{if(e.touches[0])sx=e.touches[0].clientX},{passive:true});
    root.addEventListener('touchend',e=>{if(!e.changedTouches[0])return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>44){dx<0?window.ts76HeroNext():window.ts76HeroPrev()}},{passive:true});
  });
})();
