
(function(){
  'use strict';
  const copy=[
    {title:'iPhone 18 Pro Max',lead:'Un salto en cada detalle. Más poder, más inteligencia y una nueva expresión de diseño.'},
    {title:'Light Blue',lead:'Una tonalidad luminosa, limpia y premium para la nueva generación Pro.'},
    {title:'Dark Cherry',lead:'Profundo, elegante y diferente. Un acabado con carácter para la línea Pro.'},
    {title:'Dark Gray',lead:'Sobrio y técnico. Un acabado oscuro pensado para una presencia Pro discreta.'},
    {title:'Silver',lead:'Limpio, brillante y atemporal. El acabado clásico de la nueva generación Pro.'}
  ];
  let index=0,timer=null;
  const slides=()=>[...document.querySelectorAll('.ts-v2-hero18 .ts18-slide')];
  const dots=()=>[...document.querySelectorAll('.ts-v2-hero18 .ts18-dots button')];

  function paint(i){
    const list=slides(); if(!list.length)return;
    index=(Number(i)+list.length)%list.length;
    list.forEach((el,n)=>el.classList.toggle('active',n===index));
    dots().forEach((el,n)=>el.classList.toggle('active',n===index));
    const h=document.getElementById('ts18Title'),p=document.getElementById('ts18Lead');
    if(h)h.textContent=copy[index]?.title||copy[0].title;
    if(p)p.textContent=copy[index]?.lead||copy[0].lead;
  }
  function restart(){
    clearInterval(timer);
    timer=setInterval(()=>paint(index+1),4800);
  }
  window.ts18Go=i=>{paint(i);restart()};
  window.ts18Next=()=>{paint(index+1);restart()};
  window.ts18Prev=()=>{paint(index-1);restart()};

  document.addEventListener('DOMContentLoaded',()=>{
    paint(0);restart();
    document.addEventListener('visibilitychange',()=>document.hidden?clearInterval(timer):restart());
  });
})();
