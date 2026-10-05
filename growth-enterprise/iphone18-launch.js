(function(){'use strict';
const root=document.querySelector('.ts18-launch');if(!root)return;
const slides=[...root.querySelectorAll('.ts18-slide')],dots=[...root.querySelectorAll('.ts18-dots>button:not(.ts18-pause)')],pause=root.querySelector('.ts18-pause');let idx=0,timer=null,paused=false;
function show(n){idx=(n+slides.length)%slides.length;slides.forEach((s,i)=>s.classList.toggle('is-active',i===idx));dots.forEach((d,i)=>d.classList.toggle('is-active',i===idx));}
function play(){clearInterval(timer);if(!paused&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show(idx+1),5200)}
root.querySelector('.prev')?.addEventListener('click',()=>{show(idx-1);play()});root.querySelector('.next')?.addEventListener('click',()=>{show(idx+1);play()});dots.forEach((d,i)=>d.addEventListener('click',()=>{show(i);play()}));
root.querySelectorAll('.ts18-colors button').forEach((b,i)=>b.addEventListener('click',()=>{show(Math.min(i,slides.length-1));play()}));
pause?.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Reanudar carrusel':'Pausar carrusel');play()});
root.addEventListener('mouseenter',()=>clearInterval(timer));root.addEventListener('mouseleave',play);document.addEventListener('visibilitychange',()=>document.hidden?clearInterval(timer):play());show(0);play();
})();