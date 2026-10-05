(function(){
  'use strict';
  let current=0,timer=null,root=null,slides=[],dots=[],counter=null,title=null;
  let colorIndex=0,colorTimer=null,colorSlide=null,colorFrames=[],colorDots=[],colorLabel=null;
  const delay=7200;
  const colorDelay=2200;
  function syncVideo(){
    slides.forEach((slide,i)=>{
      const v=slide.querySelector('video');
      if(!v)return;
      if(i===current){try{v.currentTime=0;}catch(_){ }const p=v.play(); if(p&&p.catch)p.catch(()=>{});} else {v.pause();}
    });
  }
  function setToneClass(index){
    if(!colorSlide)return;
    colorSlide.classList.remove('ts76-tone-cherry','ts76-tone-blue','ts76-tone-silver','ts76-tone-gray');
    colorSlide.classList.add(['ts76-tone-cherry','ts76-tone-blue','ts76-tone-silver','ts76-tone-gray'][index]||'ts76-tone-cherry');
  }
  function activateColor(index){
    if(!colorFrames.length)return;
    colorIndex=(Number(index)+colorFrames.length)%colorFrames.length;
    colorFrames.forEach((frame,i)=>frame.classList.toggle('is-active',i===colorIndex));
    colorDots.forEach((dot,i)=>dot.classList.toggle('is-active',i===colorIndex));
    if(colorLabel)colorLabel.textContent=colorFrames[colorIndex].dataset.ts76ColorName||'';
    setToneClass(colorIndex);
  }
  function restartColor(){
    clearInterval(colorTimer);
    if(!slides.length || slides[current]!==colorSlide)return;
    colorTimer=setInterval(()=>activateColor(colorIndex+1),colorDelay);
  }
  function activate(i){
    if(!slides.length)return;
    current=(Number(i)+slides.length)%slides.length;
    slides.forEach((el,n)=>el.classList.toggle('is-active',n===current));
    dots.forEach((el,n)=>el.classList.toggle('is-active',n===current));
    if(counter)counter.textContent=String(current+1).padStart(2,'0');
    if(title)title.textContent=slides[current].dataset.label||'';
    syncVideo();
    restartColor();
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
    colorSlide=root.querySelector('.ts76-slide--colorcycle');
    if(colorSlide){
      colorFrames=[...colorSlide.querySelectorAll('.ts76-color-frame')];
      colorDots=[...colorSlide.querySelectorAll('[data-ts76-color-dot]')];
      colorLabel=colorSlide.querySelector('[data-ts76-color-current]');
      colorDots.forEach((btn,i)=>btn.addEventListener('click',()=>{activateColor(i);restartColor();}));
      activateColor(0);
    }
    activate(0);restart();
    root.addEventListener('mouseenter',()=>{clearInterval(timer);clearInterval(colorTimer)});
    root.addEventListener('mouseleave',()=>{restart();restartColor();});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){clearInterval(timer);clearInterval(colorTimer);}else{restart();restartColor();}
    });
    let sx=0;
    root.addEventListener('touchstart',e=>{if(e.touches[0])sx=e.touches[0].clientX},{passive:true});
    root.addEventListener('touchend',e=>{if(!e.changedTouches[0])return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>44){dx<0?window.ts76HeroNext():window.ts76HeroPrev()}},{passive:true});
  });
})();
