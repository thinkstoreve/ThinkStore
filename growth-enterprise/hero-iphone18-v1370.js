(function(){
  'use strict';
  const copy=[
    {title:'iPhone 18 Pro Max',lead:'Un salto en cada detalle. Más poder, más inteligencia y una nueva expresión de diseño.'},
    {title:'Pro en vino tinto',lead:'Una presencia más intensa para la nueva generación Pro. Elegante, profunda y completamente distinta.'},
    {title:'Azul claro',lead:'Una nueva tonalidad luminosa para el iPhone 18 Pro: fresca, precisa y con acabado premium.'}
  ];
  let index=0,timer=null;
  function slides(){return [...document.querySelectorAll('.ts-v2-hero18 .ts18-slide')]}
  function paint(i){
    const list=slides(),dots=[...document.querySelectorAll('.ts-v2-hero18 .ts18-dots button')];
    if(!list.length)return;
    index=(Number(i)+list.length)%list.length;
    list.forEach((el,n)=>el.classList.toggle('active',n===index));
    dots.forEach((el,n)=>el.classList.toggle('active',n===index));
    const title=document.getElementById('ts18Title'),lead=document.getElementById('ts18Lead');
    if(title)title.textContent=copy[index].title;if(lead)lead.textContent=copy[index].lead;
  }
  function restart(){
    clearInterval(timer);
    /* Siempre rota automáticamente; reduced-motion conserva el cambio pero sin transición CSS. */
    timer=setInterval(()=>paint(index+1),4500);
  }
  window.ts18Go=i=>{paint(i);restart()};
  window.ts18Next=()=>{paint(index+1);restart()};
  window.ts18Prev=()=>{paint(index-1);restart()};
  function init(){const hero=document.querySelector('.ts-v2-hero18');if(!hero)return;paint(0);restart();document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInterval(timer);else restart()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
