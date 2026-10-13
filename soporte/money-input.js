(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TSMoneyInput=api;})(typeof window==='object'?window:this,function(){
  'use strict';
  // es-VE: 1.234,56; también admite 1234.56 y 1,234.56.
  function parse(value){
    let text=String(value??'').trim().replace(/\s|\u00a0|\u202f|USD|US\$/gi,'');
    if(!text||!/^[0-9.,]+$/.test(text))return NaN;
    const dot=text.lastIndexOf('.'),comma=text.lastIndexOf(',');
    if(dot>=0&&comma>=0){const decimal=dot>comma?'.':',';const group=decimal==='.'?',':'.';if(text.split(decimal).at(-1).length>2)return NaN;text=text.replaceAll(group,'').replace(decimal,'.');}
    else if(dot>=0||comma>=0){const sep=dot>=0?'.':',';const chunks=text.split(sep);
      if(chunks.length>2){if(chunks.slice(1).every(x=>x.length===3))text=chunks.join('');else return NaN;}
      else if(chunks[1]?.length===3&&chunks[0]?.length>=1)text=chunks.join('');
      else {if(chunks[1]?.length>2)return NaN;text=chunks.join('.');}
    }
    const n=Number(text);if(!Number.isFinite(n)||n<0||Math.round(n*100)/100!==Number(n.toFixed(2)))return NaN;
    return Math.round(n*100)/100;
  }
  function display(n){return Number.isFinite(Number(n))?new Intl.NumberFormat('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)):'';}
  function attach(id){const el=document.getElementById(id);if(!el||el.dataset.tsMoneyReady)return;
    el.dataset.tsMoneyReady='1';el.addEventListener('focus',()=>{const value=parse(el.value);if(Number.isFinite(value))el.value=value.toFixed(2).replace('.',',');});
    el.addEventListener('blur',()=>{const value=parse(el.value);if(Number.isFinite(value))el.value=display(value);});
  }
  return{parse,display,attach};
});
