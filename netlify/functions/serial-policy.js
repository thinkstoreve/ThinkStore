// Clasificación conservadora de equipos serializados para garantía.
// Ante dudas, un accesorio no bloquea la nota; los dispositivos se identifican por modelo/tipo.
const nameOf=i=>String(i?.producto||i?.product_name||i?.product||i?.nombre||i?.modelo||i?.model||'');
function requiresSerial(i){
 const s=nameOf(i).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/\b(cargador|charger|cable|adaptador|adapter|funda|case|cover|mica|protector|vidrio|glass|lamina|soporte|stand|correa|strap|almohadilla|repuesto|bateria de reemplazo|pantalla de reemplazo|flex|carcasa|mouse pad|teclado protector)\b/.test(s))return false;
 return /\b(iphone|ipad|ipod|macbook|imac|mac mini|mac studio|mac pro|apple watch|watch series|airpods|homepod|beats|parlante|corneta|altavoz|speaker|soundbar|audifono|auricular|headphone|earbuds|laptop|notebook|tablet|smartphone|telefono|telefono inteligente|computadora|ordenador|pc gamer|monitor|consola|playstation|xbox|nintendo switch|apple tv|televisor|smart tv|proyector|camara digital|drone|dron)\b/.test(s);
}
module.exports={requiresSerial};
