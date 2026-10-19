(function(root){
 'use strict';
 const METHODS=['Pago Móvil','Zelle','Binance','USDT','Punto de venta','Efectivo'];
 const FOREIGN=new Set(['Zelle','Binance','USDT','Efectivo']);
 const cents=n=>Math.round((Number(n)+Number.EPSILON)*100);
 function quote(items,method){
  if(!METHODS.includes(method))throw Error('Método de pago no válido.');
  if(!Array.isArray(items)||!items.length||items.length>30)throw Error('El carrito debe contener entre 1 y 30 productos.');
  let subtotal=0;
  items.forEach(i=>{const qty=Number(i.qty??i.cantidad??1),price=Number(i.price??i.precio_usd);if(!Number.isInteger(qty)||qty<1||qty>99||!Number.isFinite(price)||price<=0||price>1e7)throw Error('Confirma el precio y la cantidad de cada producto antes de pagar.');subtotal+=cents(price)*qty;});
  const discount=FOREIGN.has(method)?Math.round(subtotal*.2):0;
  return {subtotal_usd:subtotal/100,discount_type:'percent',discount_value:discount?20:0,discount_usd:discount/100,discount_reason:discount?'20% por pago con '+(method==='Efectivo'?'efectivo USD':method):'',total_usd:(subtotal-discount)/100,shipping_usd:0,shipping_separate:true};
 }
 const api={METHODS,FOREIGN,cents,quote};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreCheckoutPolicy=api;
})(typeof window!=='undefined'?window:globalThis);
