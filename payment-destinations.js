/* ThinkStore V15.27 · catálogo visual de destinos de cobro. */
(function(win){
'use strict';
const GROUPS={
  national:{label:'Bancos nacionales',short:'Nacionales'},
  foreign:{label:'Bancos extranjeros',short:'Extranjeros'},
  quick:{label:'Pago rápido',short:'Pago rápido'}
};
const DESTINATIONS=[
  {code:'bdv',name:'Banco de Venezuela',currency:'VES',group:'national',icon:'/assets/banks/official/bdv.png'},
  {code:'banesco',name:'Banesco',currency:'VES',group:'national',icon:'/assets/banks/official/banesco.png'},
  {code:'bnc',name:'BNC',currency:'VES',group:'national',icon:'/assets/banks/bnc.svg'},
  {code:'bancamiga',name:'Bancamiga',currency:'VES',group:'national',icon:'/assets/banks/bancamiga.svg'},
  {code:'bvc',name:'Venezolano de Crédito',currency:'VES',group:'national',icon:'/assets/banks/official/bvc.png'},
  {code:'boa',name:'Bank of America',currency:'USD',group:'foreign',icon:'/assets/banks/boa.svg'},
  {code:'chase',name:'Chase',currency:'USD',group:'foreign',icon:'/assets/banks/chase.svg'},
  {code:'pichincha',name:'Banco Pichincha · Ecuador',currency:'USD',group:'foreign',icon:'/assets/banks/official/pichincha.png'},
  {code:'zelle',name:'Zelle',currency:'USD',group:'quick',icon:'/assets/banks/zelle.svg'},
  {code:'binance',name:'Binance',currency:'USD',group:'quick',icon:'/assets/banks/binance.svg'}
];
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
const METHODS=[
  {id:'national',label:'Bancos nacionales',methods:[
    {name:'Transferencia Bs',label:'Transferencia',hint:'Bolívares',icon:'/assets/transferencia.svg'},
    {name:'Punto de venta Bs',label:'Punto de venta',hint:'Bolívares',icon:'/assets/punto-venta.svg'}
  ]},
  {id:'foreign',label:'Bancos extranjeros',methods:[
    {name:'Transferencia USD',label:'Transferencia',hint:'USD',icon:'/assets/transferencia.svg'}
  ]},
  {id:'quick',label:'Pago rápido',methods:[
    {name:'Pago Móvil',label:'Pago Móvil',hint:'Bolívares',icon:'/assets/pago-movil.svg'},
    {name:'Zelle',label:'Zelle',hint:'USD',icon:'/assets/zelle.svg'},
    {name:'USDT',label:'Binance / USDT',hint:'USDT',icon:'/assets/banks/binance.svg'}
  ]},
  {id:'cash',label:'Efectivo',methods:[
    {name:'Efectivo USD',label:'Efectivo USD',hint:'Dólares',icon:'/assets/efectivo.svg'},
    {name:'Efectivo Bs',label:'Efectivo Bs.',hint:'Bolívares',icon:'/assets/efectivo.svg'}
  ]},
  {id:'mixed',label:'Combinado',methods:[
    {name:'Pago mixto',label:'Pago combinado',hint:'Hasta 3 métodos',icon:''}
  ]}
];
const byCode=code=>DESTINATIONS.find(x=>x.code===String(code||'').trim())||null;
const rule=method=>RULES[String(method||'').trim()]||{currency:'USD',allowed:[],defaultCode:null};
const allowed=method=>rule(method).allowed.map(byCode).filter(Boolean);
function normalize(method,code){
  const r=rule(method),raw=String(code||'').trim();
  if(raw&&r.allowed.includes(raw))return raw;
  return r.defaultCode&&r.allowed.includes(r.defaultCode)?r.defaultCode:'';
}
function needsDestination(method){return rule(method).allowed.length>0}
function grouped(method){
  const list=allowed(method),out=[];
  for(const key of ['national','foreign','quick']){
    const items=list.filter(x=>x.group===key);if(items.length)out.push({id:key,label:GROUPS[key].label,items});
  }
  return out;
}
win.ThinkStorePaymentDestinations={GROUPS,DESTINATIONS,RULES,METHODS,byCode,rule,allowed,normalize,needsDestination,grouped};
})(window);
