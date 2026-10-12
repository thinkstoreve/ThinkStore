'use strict';
const DESTINATIONS={
  bdv:{code:'bdv',name:'Banco de Venezuela',currency:'VES'},
  banesco:{code:'banesco',name:'Banesco',currency:'VES'},
  bnc:{code:'bnc',name:'BNC',currency:'VES'},
  bancamiga:{code:'bancamiga',name:'Bancamiga',currency:'VES'},
  bvc:{code:'bvc',name:'Venezolano de Crédito',currency:'VES'},
  boa:{code:'boa',name:'Bank of America',currency:'USD'},
  chase:{code:'chase',name:'Chase',currency:'USD'},
  pichincha:{code:'pichincha',name:'Banco Pichincha · Ecuador',currency:'USD'},
  zelle:{code:'zelle',name:'Zelle',currency:'USD'},
  binance:{code:'binance',name:'Binance',currency:'USD'}
};
const RULES={
  'Efectivo USD':{currency:'USD',allowed:[],defaultCode:null},
  'Efectivo Bs':{currency:'VES',allowed:[],defaultCode:null},
  'Pago Móvil':{currency:'VES',allowed:['bancamiga','bdv','banesco','bnc','bvc'],defaultCode:'bancamiga'},
  'Transferencia Bs':{currency:'VES',allowed:['bdv','banesco','bnc','bancamiga','bvc'],defaultCode:null},
  'Punto de venta Bs':{currency:'VES',allowed:['bdv','banesco','bnc','bancamiga','bvc'],defaultCode:null},
  'Transferencia USD':{currency:'USD',allowed:['boa','chase','pichincha'],defaultCode:null},
  'Zelle':{currency:'USD',allowed:['zelle'],defaultCode:'zelle'},
  'USDT':{currency:'USD',allowed:['binance'],defaultCode:'binance'},
  'EUR':{currency:'EUR',allowed:[],defaultCode:null},
  'Otro':{currency:'USD',allowed:[],defaultCode:null}
};
const clean=v=>String(v??'').trim();
function normalize(method,code,{required=true}={}){
  const m=clean(method),r=RULES[m]||{currency:'USD',allowed:[],defaultCode:null};
  let c=clean(code);
  if(!c&&r.defaultCode)c=r.defaultCode;
  if(!r.allowed.length)return{code:null,name:null,currency:r.currency,required:false};
  if(!c||!r.allowed.includes(c)){
    if(required)throw Error(`Selecciona la cuenta destino para ${m}.`);
    return{code:null,name:null,currency:r.currency,required:true};
  }
  const d=DESTINATIONS[c];
  if(!d||d.currency!==r.currency)throw Error(`La cuenta destino no corresponde a la moneda de ${m}.`);
  return{code:d.code,name:d.name,currency:d.currency,required:true};
}
function defaultFor(method){try{return normalize(method,null,{required:false})}catch{return{code:null,name:null,currency:(RULES[clean(method)]||{}).currency||'USD'}}}
module.exports={DESTINATIONS,RULES,normalize,defaultFor};
