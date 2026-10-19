/* Shared by App Ventas and its server; no rounding or limit differences. */
(function(root){
 'use strict';
 function decimal(v){if(v===null||v===undefined||String(v).trim()==='')return 0;const s=String(v).trim().replace(',','.');return /^\d+(\.\d{0,2})?$/.test(s)?Number(s):NaN;}
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 function calculate(subtotal,type,input){
  subtotal=round(Number(subtotal));type=type==='percent'?'percent':'usd';const value=decimal(input);
  let error='';if(!Number.isFinite(subtotal)||subtotal<0)error='Subtotal inválido.';
  else if(!Number.isFinite(value)||value<0)error='Escribe un descuento válido, con máximo dos decimales.';
  else if(type==='percent'&&value>100)error='El porcentaje debe estar entre 0 y 100%.';
  else if(type==='usd'&&value>subtotal)error='El descuento en USD no puede superar el subtotal.';
  const discount=error?null:round(type==='percent'?subtotal*value/100:value);
  return{subtotal,type,value,discount,total:error?null:round(subtotal-discount),error};
 }
 function conversion(total,quote){return Number.isFinite(total)&&total>=0&&Number(quote?.rate)>0?round(total*Number(quote.rate)):null;}
 const api={decimal,round,calculate,conversion};if(typeof module!=='undefined')module.exports=api;root.ThinkStorePOSMath=api;
})(typeof window==='undefined'?globalThis:window);
