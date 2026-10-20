// Regla compartida entre Admin y API: asignación física solo para equipos serializados.
// Por defecto los accesorios no requieren serial individual.
function requiresSerial(item){
  const raw=String(item?.producto||item?.product_name||item?.product||item?.nombre||item?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/\b(cable|cargador|adaptador|funda|case|protector|vidrio|mica|lamina|correa|strap|mousepad|soporte|base|hub|dock|audifonos? genericos?|repuesto)\b/.test(raw))return false;
  return /\b(iphone|ipad|macbook|imac|mac mini|mac studio|mac pro|apple watch|watch series|watch ultra|airpods|homepod)\b/.test(raw);
}
module.exports={requiresSerial};
