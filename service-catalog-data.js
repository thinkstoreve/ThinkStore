(function(){
const categories={
  iPhone:{
    label:'iPhone',hero:'Reparación de iPhone: precios por modelo',subtitle:'Consulta pantalla, batería, carga, cámaras y otras reparaciones. El precio publicado puede incluir repuesto y mano de obra según el servicio.',search:'Busca tu modelo, por ejemplo iPhone 13 Pro Max',
    series:['iPhone 7','iPhone 8','iPhone X','iPhone XR','iPhone XS','iPhone SE','iPhone 11','iPhone 12','iPhone 13','iPhone 14','iPhone 15','iPhone 16','iPhone 17','iPhone 18'],
    modelTypes:['Normal','Mini','Plus','Pro','Pro Max','Air','SE'],
    repairs:['Pantalla','Glass pantalla','Batería','Glass trasero','Cámara frontal','Cámara trasera','Cristal cámara','Cristal cámara trasera','Flex de carga','Flex de encendido','Chasis','Auricular','Parlante','Micrófono','Botón home','Botón volumen','WiFi','Dual SIM','Lector SIM','Baseband','MagSafe','Software','Face ID','Placa lógica','Baño químico','Diagnóstico'],
    qualities:['Estándar','AAA','Original'],
    symptoms:['Pantalla rota o sin imagen','Batería dura poco','No carga','Se mojó','No enciende','Cámara no funciona','Sin señal','Sonido bajo o sin audio','Equipo lento','Problema de software']
  },
  Mac:{
    label:'Mac',hero:'Servicio técnico Mac: precios de reparación',subtitle:'Cotiza MacBook Air, MacBook Pro, MacBook e iMac por familia, modelo y tipo de falla.',search:'Busca tu modelo, por ejemplo A2338 o MacBook Pro M1',
    series:['MacBook Air','MacBook Pro','MacBook','iMac','Mac mini','Mac Studio','Mac Pro'],
    modelTypes:['Intel','M1','M2','M3','M4','13 pulgadas','14 pulgadas','15 pulgadas','16 pulgadas','21.5 pulgadas','24 pulgadas','27 pulgadas'],
    repairs:['Pantalla','Batería','Teclado','Trackpad','Flex de carga / USB-C','Puerto MagSafe','Altavoz','Micrófono','Cámara','Ventilador','SSD / almacenamiento','Fuente de poder','Limpieza interna','Daño por líquido','Sistema macOS','Diagnóstico','Placa lógica','Microsoldadura'],
    qualities:['Estándar','AAA','Original'],symptoms:['Pantalla rota o sin imagen','Batería dura poco','No carga','Se mojó','No enciende','Teclado falla','Equipo lento','Sin sonido','Sin WiFi']
  },
  iPad:{
    label:'iPad',hero:'Reparación de iPad: precios por modelo',subtitle:'Consulta pantalla, glass, batería, carga, cámaras y diagnóstico según la familia exacta de iPad.',search:'Busca tu modelo, por ejemplo iPad Pro 11 M2',
    series:['iPad','iPad mini','iPad Air','iPad Pro 11','iPad Pro 12.9','iPad Pro 13'],
    modelTypes:['Normal','Mini','Air','Pro','Wi‑Fi','Cellular'],
    repairs:['Pantalla','Glass pantalla','Batería','Flex de carga','Cámara frontal','Cámara trasera','Botón home','Botón encendido','Botón volumen','Altavoz','Micrófono','Chasis','Conector Smart','Apple Pencil / carga','Daño por líquido','Software / iPadOS','Diagnóstico','Placa lógica','Microsoldadura'],
    qualities:['Estándar','AAA','Original'],symptoms:['Pantalla rota o sin imagen','Batería dura poco','No carga','Se mojó','No enciende','Cámara no funciona','Sin sonido','Problema de software']
  },
  'Apple Watch':{
    label:'Apple Watch',hero:'Reparación de Apple Watch: precios por serie',subtitle:'Consulta valores para pantalla, batería y diagnóstico según serie y tamaño.',search:'Busca tu serie, por ejemplo Series 7 45mm',
    series:['Series 1','Series 2','Series 3','Series 4','Series 5','Series 6','Series 7','Series 8','Series 9','Series 10','Series 11','SE','Ultra','Ultra 2','Ultra 3'],
    modelTypes:['38 mm','40 mm','41 mm','42 mm','44 mm','45 mm','46 mm','49 mm'],
    repairs:['Pantalla','Glass pantalla','Batería','Corona digital','Botón lateral','Altavoz','Micrófono','Sensor trasero','Carga','Sellado','Daño por líquido','Diagnóstico','Placa lógica'],
    qualities:['Estándar','AAA','Original'],symptoms:['Pantalla rota o sin imagen','Batería dura poco','No carga','Correa rota','Se mojó','No enciende']
  },
  AirPods:{
    label:'AirPods',hero:'Reparación de AirPods: precios por modelo',subtitle:'Consulta batería, audio, carga, estuche y diagnóstico según modelo y generación.',search:'Busca tu modelo, por ejemplo AirPods Pro 2',
    series:['AirPods 1','AirPods 2','AirPods 3','AirPods 4','AirPods Pro','AirPods Pro 2','AirPods Pro 3','AirPods Max'],
    modelTypes:['Izquierdo','Derecho','Estuche','USB‑C','Lightning','Max'],
    repairs:['Batería','Audio','Micrófono','Carga','Estuche de carga','Conector','Limpieza','Almohadillas','Diadema','Diagnóstico'],
    qualities:['Estándar','AAA','Original'],symptoms:['No carga','Batería dura poco','Un lado no suena','Micrófono falla','Ruido o distorsión','Estuche no carga']
  }
};

const modelRegistry={
 iPhone:[
  ['iPhone 7','Normal'],['iPhone 7 Plus','Plus'],['iPhone 8','Normal'],['iPhone 8 Plus','Plus'],['iPhone X','Normal'],['iPhone XR','Normal'],['iPhone XS','Normal'],['iPhone XS Max','Pro Max'],['iPhone SE 2','SE'],['iPhone SE 3','SE'],
  ['iPhone 11','Normal'],['iPhone 11 Pro','Pro'],['iPhone 11 Pro Max','Pro Max'],
  ['iPhone 12 Mini','Mini'],['iPhone 12','Normal'],['iPhone 12 Pro','Pro'],['iPhone 12 Pro Max','Pro Max'],
  ['iPhone 13 Mini','Mini'],['iPhone 13','Normal'],['iPhone 13 Pro','Pro'],['iPhone 13 Pro Max','Pro Max'],
  ['iPhone 14','Normal'],['iPhone 14 Plus','Plus'],['iPhone 14 Pro','Pro'],['iPhone 14 Pro Max','Pro Max'],
  ['iPhone 15','Normal'],['iPhone 15 Plus','Plus'],['iPhone 15 Pro','Pro'],['iPhone 15 Pro Max','Pro Max'],
  ['iPhone 16','Normal'],['iPhone 16 Plus','Plus'],['iPhone 16 Pro','Pro'],['iPhone 16 Pro Max','Pro Max'],['iPhone 16e','SE'],
  ['iPhone 17','Normal'],['iPhone 17 Air','Air'],['iPhone 17 Pro','Pro'],['iPhone 17 Pro Max','Pro Max'],
  ['iPhone 18','Normal'],['iPhone 18 Air','Air'],['iPhone 18 Pro','Pro'],['iPhone 18 Pro Max','Pro Max']
 ],
 Mac:[
  ['MacBook Air Intel','Intel'],['MacBook Air M1','M1'],['MacBook Air M2','M2'],['MacBook Air M3','M3'],['MacBook Air M4','M4'],
  ['MacBook Pro 13 Intel','Intel'],['MacBook Pro 13 M1','M1'],['MacBook Pro 14 M1 Pro','14 pulgadas'],['MacBook Pro 14 M2 Pro','14 pulgadas'],['MacBook Pro 14 M3 Pro','14 pulgadas'],['MacBook Pro 14 M4 Pro','14 pulgadas'],['MacBook Pro 16 Intel','16 pulgadas'],['MacBook Pro 16 M1 Pro','16 pulgadas'],['MacBook Pro 16 M2 Pro','16 pulgadas'],['MacBook Pro 16 M3 Pro','16 pulgadas'],['MacBook Pro 16 M4 Pro','16 pulgadas'],
  ['iMac 21.5','21.5 pulgadas'],['iMac 24 M1','24 pulgadas'],['iMac 24 M3','24 pulgadas'],['iMac 24 M4','24 pulgadas'],['iMac 27','27 pulgadas'],['Mac mini M1','M1'],['Mac mini M2','M2'],['Mac mini M4','M4'],['Mac Studio','M4'],['Mac Pro','Intel']
 ],
 iPad:[
  ['iPad 6','Normal'],['iPad 7','Normal'],['iPad 8','Normal'],['iPad 9','Normal'],['iPad 10','Normal'],['iPad A16','Normal'],
  ['iPad mini 5','Mini'],['iPad mini 6','Mini'],['iPad mini 7','Mini'],
  ['iPad Air 3','Air'],['iPad Air 4','Air'],['iPad Air 5','Air'],['iPad Air M2','Air'],['iPad Air M3','Air'],
  ['iPad Pro 11 1ª gen','Pro'],['iPad Pro 11 2ª gen','Pro'],['iPad Pro 11 M1','Pro'],['iPad Pro 11 M2','Pro'],['iPad Pro 11 M4','Pro'],['iPad Pro 12.9 3ª gen','Pro'],['iPad Pro 12.9 M1','Pro'],['iPad Pro 12.9 M2','Pro'],['iPad Pro 13 M4','Pro']
 ],
 'Apple Watch':[
  ['Apple Watch Series 3 38mm','38 mm'],['Apple Watch Series 3 42mm','42 mm'],['Apple Watch Series 4 40mm','40 mm'],['Apple Watch Series 4 44mm','44 mm'],['Apple Watch Series 5 40mm','40 mm'],['Apple Watch Series 5 44mm','44 mm'],['Apple Watch Series 6 40mm','40 mm'],['Apple Watch Series 6 44mm','44 mm'],['Apple Watch Series 7 41mm','41 mm'],['Apple Watch Series 7 45mm','45 mm'],['Apple Watch Series 8 41mm','41 mm'],['Apple Watch Series 8 45mm','45 mm'],['Apple Watch Series 9 41mm','41 mm'],['Apple Watch Series 9 45mm','45 mm'],['Apple Watch Series 10 42mm','42 mm'],['Apple Watch Series 10 46mm','46 mm'],['Apple Watch Series 11 42mm','42 mm'],['Apple Watch Series 11 46mm','46 mm'],['Apple Watch SE 40mm','40 mm'],['Apple Watch SE 44mm','44 mm'],['Apple Watch Ultra 49mm','49 mm'],['Apple Watch Ultra 2 49mm','49 mm'],['Apple Watch Ultra 3 49mm','49 mm']
 ],
 AirPods:[
  ['AirPods 1','Izquierdo'],['AirPods 1','Derecho'],['AirPods 1 Estuche','Estuche'],['AirPods 2','Izquierdo'],['AirPods 2','Derecho'],['AirPods 2 Estuche','Estuche'],['AirPods 3','Izquierdo'],['AirPods 3','Derecho'],['AirPods 3 Estuche','Estuche'],['AirPods 4','Izquierdo'],['AirPods 4','Derecho'],['AirPods 4 Estuche USB‑C','USB‑C'],['AirPods Pro','Izquierdo'],['AirPods Pro','Derecho'],['AirPods Pro Estuche','Estuche'],['AirPods Pro 2','Izquierdo'],['AirPods Pro 2','Derecho'],['AirPods Pro 2 Estuche USB‑C','USB‑C'],['AirPods Pro 3','Izquierdo'],['AirPods Pro 3','Derecho'],['AirPods Pro 3 Estuche USB‑C','USB‑C'],['AirPods Max','Max']
 ]
};

const repairCodes={
 'Pantalla':'DIS','Glass pantalla':'GLS','Batería':'BAT','Glass trasero':'BGL','Cámara frontal':'CAMF','Cámara trasera':'CAMR','Cristal cámara':'CGL','Cristal cámara trasera':'CGLR','Flex de carga':'CHG','Flex de encendido':'PWR','Chasis':'CHA','Auricular':'EAR','Parlante':'SPK','Micrófono':'MIC','Botón home':'HOM','Botón volumen':'VOL','WiFi':'WIFI','Dual SIM':'DSIM','Lector SIM':'SIM','Baseband':'BAND','MagSafe':'MAG','Software':'SW','Face ID':'FID','Placa lógica':'LOG','Baño químico':'LIQ','Diagnóstico':'DIA',
 'Teclado':'KEY','Trackpad':'TRK','Flex de carga / USB-C':'USBC','Puerto MagSafe':'MAG','Altavoz':'SPK','Cámara':'CAM','Ventilador':'FAN','SSD / almacenamiento':'SSD','Fuente de poder':'PSU','Limpieza interna':'CLN','Daño por líquido':'LIQ','Sistema macOS':'MACOS','Microsoldadura':'MSLD',
 'Botón encendido':'PWR','Conector Smart':'SMT','Apple Pencil / carga':'PEN','Software / iPadOS':'IPADOS','Corona digital':'CROWN','Botón lateral':'SIDE','Sensor trasero':'SNSR','Carga':'CHG','Sellado':'SEAL','Audio':'AUD','Estuche de carga':'CASE','Conector':'CON','Limpieza':'CLN','Almohadillas':'PAD','Diadema':'BAND'
};
const qualityCode={'Estándar':'STD','AAA':'AAA','Original':'ORI'};
const categoryCode={iPhone:'IP',Mac:'MAC',iPad:'IPD','Apple Watch':'AW',AirPods:'AP'};
const imgByCat={iPhone:'assets/service-cat-iphone.png',Mac:'assets/service-cat-mac.png',iPad:'assets/service-cat-ipad.png','Apple Watch':'assets/service-cat-watch.png',AirPods:'assets/service-cat-airpods.png'};
const imgByRepair={
 'Pantalla':'assets/service-screen-ref.png',
 'Glass pantalla':'assets/service-screen-ref.png',
 'Batería':'assets/service-battery-ref.png',
 'Glass trasero':'assets/service-iphone-exploded.png',
 'Cámara frontal':'assets/service-iphone-exploded.png',
 'Cámara trasera':'assets/service-iphone-exploded.png',
 'Cristal cámara':'assets/service-iphone-exploded.png',
 'Cristal cámara trasera':'assets/service-iphone-exploded.png',
 'Flex de carga':'assets/service-iphone-exploded.png',
 'Flex de encendido':'assets/service-iphone-exploded.png',
 'Chasis':'assets/service-iphone-exploded.png',
 'Auricular':'assets/service-iphone-exploded.png',
 'Parlante':'assets/service-iphone-exploded.png',
 'Micrófono':'assets/service-iphone-exploded.png',
 'Botón home':'assets/service-iphone-exploded.png',
 'Botón volumen':'assets/service-iphone-exploded.png',
 'WiFi':'assets/service-iphone-exploded.png',
 'Dual SIM':'assets/service-iphone-exploded.png',
 'Lector SIM':'assets/service-iphone-exploded.png',
 'Baseband':'assets/service-iphone-exploded.png',
 'MagSafe':'assets/service-iphone-exploded.png',
 'Software':'assets/service-cat-iphone.png',
 'Face ID':'assets/service-iphone-exploded.png',
 'Placa lógica':'assets/service-iphone-exploded.png',
 'Baño químico':'assets/service-iphone-exploded.png',
 'Diagnóstico':'assets/service-iphone-exploded.png'
};

function normSku(s){return String(s).toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,18)}
function seriesOf(cat,name){
 if(cat==='iPhone'){for(const s of categories.iPhone.series.slice().sort((a,b)=>b.length-a.length)){if(name.startsWith(s))return s}return 'iPhone 7'}
 if(cat==='Mac'){return categories.Mac.series.find(s=>name.startsWith(s))||'MacBook Pro'}
 if(cat==='iPad'){return categories.iPad.series.find(s=>name.startsWith(s))||'iPad'}
 if(cat==='Apple Watch'){if(name.includes('Ultra 3'))return'Ultra 3';if(name.includes('Ultra 2'))return'Ultra 2';if(name.includes('Ultra'))return'Ultra';if(name.includes('SE'))return'SE';const m=name.match(/Series\s+(\d+)/);return m?`Series ${m[1]}`:'Series 7'}
 if(cat==='AirPods'){return categories.AirPods.series.find(s=>name.startsWith(s))||'AirPods 2'}
 return'';
}
function relevantRepairs(cat,name){
 const r=categories[cat].repairs;
 if(cat==='iPhone') return r;
 if(cat==='Mac') return r;
 if(cat==='iPad') return r;
 if(cat==='Apple Watch') return r;
 if(cat==='AirPods') return r;
 return r;
}
function qualitiesFor(cat,repair){
 if(['Diagnóstico','Software','Software / iPadOS','Sistema macOS','Baño químico','Daño por líquido','Limpieza','Limpieza interna','Microsoldadura','Placa lógica'].includes(repair)) return ['Estándar'];
 if(cat==='AirPods') return ['Original','Estándar'];
 return ['Estándar','Original'];
}
function warrantyFor(repair,quality){if(['Diagnóstico','Software','Software / iPadOS','Sistema macOS','Baño químico','Daño por líquido','Limpieza','Limpieza interna'].includes(repair))return'Garantía según diagnóstico';return quality==='Original'?'3 meses de garantía':'3 meses de garantía'}
function timeFor(repair){if(['Placa lógica','Microsoldadura','Baño químico','Daño por líquido'].includes(repair))return'24–72 horas hábiles';if(['Diagnóstico'].includes(repair))return'El mismo día o 24 horas';return'Mismo día hábil'}
function descriptionFor(cat,repair,quality){return `${repair} para ${cat}. Repuesto ${quality.toLowerCase()} sujeto a compatibilidad y disponibilidad. El equipo se prueba antes y después del servicio.`}
const generated=[];
for(const [cat,models] of Object.entries(modelRegistry)){
 for(const [model,type] of models){
  const series=seriesOf(cat,model);
  for(const repair of relevantRepairs(cat,model)){
   for(const quality of qualitiesFor(cat,repair)){
    const sku=`TS-${categoryCode[cat]}-${normSku(model).slice(0,10)}-${repairCodes[repair]||'REP'}-${qualityCode[quality]||'STD'}`;
    generated.push({device_category:cat,series,model_type:type,repair,quality,name:`${model} ${repair}`,model,sku,price_usd:0,original_price_usd:0,available:0,catalog_only:true,image_url:(cat==='iPhone'?(imgByRepair[repair]||imgByCat[cat]):imgByCat[cat]),compatibility:`${series} · ${type}`,warranty:warrantyFor(repair,quality),repair_time:timeFor(repair),description:descriptionFor(cat,repair,quality),service_modes:['Normal','Delivery','Priority']});
   }
  }
 }
}
window.THINKSTORE_SERVICE_CATALOG={categories,modelRegistry,sampleProducts:generated};
})();
