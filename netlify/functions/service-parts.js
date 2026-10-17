const H={
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type'
};
const out=(status,body)=>({statusCode:status,headers:H,body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const isJwtKey=v=>/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(clean(v));
const normalizeSupabaseUrl=v=>clean(v).replace(/\/+$/,'').replace(/\/rest\/v1(?:\/.*)?$/i,'');
const headersForKey=key=>({apikey:key,...(isJwtKey(key)?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json'});
async function getAll(base,path,headers){
  const rows=[];
  for(let offset=0;offset<100000;offset+=1000){
    const sep=path.includes('?')?'&':'?';
    const batch=await getJson(`${base}/rest/v1/${path}${sep}limit=1000&offset=${offset}`,headers);
    if(!Array.isArray(batch))break;
    rows.push(...batch);
    if(batch.length<1000)break;
  }
  return rows;
}

function deviceCategory(...vals){
  const t=norm(vals.join(' '));
  if(/airpods|earpods|audifono|auricular|estuche/.test(t))return 'AirPods';
  if(/apple\s*watch|watch\s*(series|ultra|se)|reloj/.test(t))return 'Apple Watch';
  if(/imac|mac\s*mini|mac\s*studio|mac\s*pro/.test(t))return 'iMac';
  if(/macbook|mac\s*book|mba|mbp/.test(t))return 'MacBook';
  if(/ipad/.test(t))return 'iPad';
  if(/iphone/.test(t))return 'iPhone';
  return 'Otro';
}
function looksLikePart(p){
  const t=norm([p.name,p.category,p.subcategory,p.description,p.compatibility,p.model,p.sku,p.repair,p.inventory_group,p.item_type].join(' '));
  if(/repuesto|servicio tecnico|reparacion|repair|spare part|pieza/.test(t))return true;
  return /(pantalla|display|lcd|oled|bateria|battery|teclado|keyboard|trackpad|flex|camara|camera|face id|puerto|conector|carga|charging|circuito|cambio\s+de\s+ic|reemplazo\s+de\s+ic|altavoz|speaker|microfono|mic|vidrio|glass|tapa|back glass|carcasa|housing|logic|logica|placa|board|taptic|haptic|ventilador|fan|ssd|memoria|ram|fuente|power supply|touch|sensor|auricular|earpiece|cable interno|jack|dock|bisagra|hinge)/.test(t);
}
function seriesFrom(p,cat){
  const src=clean([p.model,p.compatibility,p.name].filter(Boolean).join(' '));
  const patterns={
    'iPhone':/(iPhone\s+(?:SE(?:\s*\d(?:st|nd|rd|th)?\s*gen)?|\d{1,2}(?:\s*(?:Pro\s*Max|Pro|Plus|mini|Air|Ultra))?))/i,
    'iPad':/(iPad\s*(?:Pro|Air|mini)?\s*(?:\d+(?:\.\d+)?(?:-inch| pulgadas)?|\d{1,2}(?:ª|a)?\s*generaci[oó]n)?)/i,
    'MacBook':/(MacBook\s*(?:Air|Pro)?\s*(?:M\d(?:\s*(?:Pro|Max|Ultra))?|\d{2}(?:-inch| pulgadas)?)?)/i,
    'iMac':/(iMac\s*(?:\d{2}(?:-inch| pulgadas)?|M\d)?)/i,
    'Apple Watch':/(Apple\s*Watch\s*(?:Series\s*\d+|Ultra\s*\d*|SE\s*\d*)?)/i,
    'AirPods':/(AirPods\s*(?:Pro\s*\d*|Max|\d+(?:ª|a)?\s*gen(?:eraci[oó]n)?)?)/i
  };
  const m=src.match(patterns[cat]);
  return clean(m?.[1]||p.model||'');
}

function repairType(p){
  const t=norm([p.repair,p.name,p.category,p.subcategory,p.description,p.compatibility,p.model,p.sku].join(' '));
  const rules=[
    ['Glass pantalla',/glass\s*pantalla|vidrio\s*pantalla|cristal\s*pantalla/],['Pantalla',/pantalla|display|lcd|oled/],['Batería',/bateria|battery/],
    ['Glass trasero',/glass\s*trasero|vidrio\s*trasero|back\s*glass/],['Cámara frontal',/camara\s*frontal|front\s*camera/],['Cámara trasera',/camara\s*trasera|rear\s*camera/],
    ['Circuito de carga',/circuito\s*(?:de\s*)?carga|charging\s*circuit|ic\s*(?:de\s*)?carga|tristar|hydra|tigris/],['Cambio de IC',/cambio\s*(?:de\s*)?ic|reemplazo\s*(?:de\s*)?ic|cambio\s+integrado/],
    ['Cristal cámara trasera',/cristal.*camara.*trasera|camera\s*lens/],['Flex de carga',/flex.*carga|charging.*flex|dock.*flex|puerto.*carga|conector.*carga/],
    ['Flex de encendido',/flex.*encendido|power.*flex/],['Chasis',/chasis|housing|carcasa/],['Auricular',/auricular|earpiece/],['Altavoz',/altavoz|speaker/],
    ['Micrófono',/microfono|microphone/],['Face ID',/face\s*id/],['Taptic Engine',/taptic|haptic/],['Teclado',/teclado|keyboard/],['Trackpad',/trackpad/],
    ['SSD / almacenamiento',/ssd|almacenamiento|storage/],['Fuente de poder',/fuente|power\s*supply/],['Ventilador',/ventilador|fan/],['Daño por líquido',/liquido|liquid|corrosion/],
    ['Diagnóstico',/diagnostico|diagnostic/],['Software / iOS',/software|ios|ipados|macos/],['Microsoldadura / placa',/microsoldadura|placa|logic|board/]
  ];
  return clean(rules.find(([,re])=>re.test(t))?.[0]||p.repair);
}
function qualityType(p){
  const t=norm([p.quality,p.name,p.description,p.sku,p.compatibility].join(' '));
  if(/original|oem/.test(t))return 'Original';
  if(/aaa|premium/.test(t))return 'AAA';
  if(/estandar|standard|compatible|alternativa/.test(t))return 'Estándar';
  return clean(p.quality);
}
function modelType(p){
  const t=norm([p.model,p.compatibility,p.name,p.sku].join(' '));
  const vals=['Pro Max','Pro','Plus','Mini','Air','SE','Ultra','Max','Intel','M1','M2','M3','M4','M5'];
  return vals.find(v=>t.includes(norm(v)))||'';
}

async function getJson(url,headers){
  const r=await fetch(url,{headers});
  const d=await r.json().catch(()=>[]);
  if(!r.ok)throw new Error(clean(d?.message||d?.error||d?.details)||`HTTP ${r.status}`);
  return d;
}
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:200,headers:H,body:''};
  if(event.httpMethod!=='GET')return out(405,{ok:false,error:'Método no permitido'});
  const base=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const service=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!base||!service)return out(501,{ok:false,error:'Faltan variables de Supabase'});
  const headers={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
  let supportItems=[];
  try{
    const supportBase=normalizeSupabaseUrl(process.env.SUPPORT_SUPABASE_URL);
    const supportKey=clean(process.env.SUPPORT_SUPABASE_SECRET_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY);
    if(supportBase&&supportKey){
      try{
        const sh=headersForKey(supportKey);
        const rows=await getAll(supportBase,'service_parts?select=id,sku,name,category,compatible_models,quantity,sale_price,catalog_details&active=eq.true&published=eq.true&order=category.asc,name.asc,sku.asc',sh);
        supportItems=rows.map(p=>{
          const m=p.catalog_details||{},pct=Math.max(0,Math.min(95,Math.round(num(m.discount_percent,0)))),price=p.sale_price===null?0:num(p.sale_price,0);
          let original=num(m.original_price_usd,0);
          if(pct>0&&price>0&&original<=price)original=Math.round((price/(1-pct/100))*100)/100;
          const src={name:p.name,category:p.category,compatibility:p.compatible_models,model:m.model||m.series,repair:m.repair,description:m.description,sku:p.sku,inventory_group:m.inventory_group,item_type:m.item_type};
          const dev=deviceCategory(p.name,p.compatible_models,m.model,m.series,m.repair,p.category);
          const item={
            id:String(p.id),sku:clean(p.sku),name:clean(p.name),model:clean(m.model||p.compatible_models),category:clean(p.category),
            subcategory:clean(m.subcategory),description:clean(m.description_html||m.description),compatibility:clean(p.compatible_models),image_url:clean(m.image_url),
            price_usd:price,available:Math.max(0,num(p.quantity,0)),stock_min:0,original_price_usd:pct>0?original:0,discount_percent:pct,is_offer:pct>0,
            repair:clean(m.repair)||repairType(src),quality:clean(m.quality)||qualityType(src),model_type:clean(m.model_type)||modelType(src),
            series:clean(m.series)||seriesFrom(src,dev),device_category:dev,warranty:clean(m.warranty),repair_time:clean(m.repair_time),
            catalog_only:p.sale_price===null,_source:'support'
          };
          return item;
        }).filter(x=>x.device_category!=='Otro');
      }catch(e){console.warn('Support service_parts fallback:',e.message);}
    }

    let products=[],bridges=[],variants=[],catalog=[],catalogImages=[];
    try{
      [products,bridges,variants,catalog,catalogImages]=await Promise.all([
        getJson(`${base}/rest/v1/thinkstore_inventory_products?select=id,data&workspace_key=eq.main&limit=3000`,headers),
        getJson(`${base}/rest/v1/thinkstore_inventory_bridge?select=inventory_product_id,sku,variant_id&workspace_key=eq.main&limit=3000`,headers).catch(()=>[]),
        getJson(`${base}/rest/v1/inventory_variants?select=id,sku,product_name,model,color,capacity,condition,stock_on_hand,stock_reserved,stock_min,price_usd,active&active=eq.true&limit=3000`,headers).catch(()=>[]),
        getJson(`${base}/rest/v1/catalog_products?select=product_key,product_name,category,description,image_url,published&limit=3000`,headers).catch(()=>[]),
        getJson(`${base}/rest/v1/catalog_product_images?select=product_key,image_url,is_primary,sort_order&order=sort_order.asc&limit=3000`,headers).catch(()=>[])
      ]);
    }catch(e){
      if(supportItems.length)return out(200,{ok:true,source:'support_service_parts',updated_at:new Date().toISOString(),items:supportItems.map(({_source,...x})=>x),warning:'Inventory principal no disponible temporalmente'});
      throw e;
    }

    const bridgeByProduct=new Map(bridges.map(x=>[String(x.inventory_product_id),x]));
    const variantById=new Map(variants.map(x=>[String(x.id),x]));
    const variantBySku=new Map(variants.map(x=>[norm(x.sku),x]));
    const catByName=new Map(catalog.map(x=>[norm(x.product_name),x]));
    const imageByKey=new Map();
    for(const i of catalogImages){if(!imageByKey.has(i.product_key)||i.is_primary)imageByKey.set(i.product_key,i.image_url)}
    const items=[];
    const usedVariant=new Set();
    for(const row of products){
      const p=row?.data||{};
      if(p.active===false||p.published===false)continue;
      const bridge=bridgeByProduct.get(String(row.id));
      const v=bridge?.variant_id?variantById.get(String(bridge.variant_id)):variantBySku.get(norm(p.sku));
      if(v)usedVariant.add(String(v.id));
      const record={
        id:String(row.id),sku:clean(p.sku||v?.sku),name:clean(p.name||v?.product_name||p.sku),model:clean(p.model||v?.model),
        category:clean(p.category),subcategory:clean(p.subcategory),description:clean(p.description_html||p.description),compatibility:clean(p.compatibility),image_url:clean(p.image_url),
        price_usd:num(p.sale_price,num(p.discounted_price,num(v?.price_usd,0))),available:Math.max(0,num(p.sync_available,Math.max(0,num(v?.stock_on_hand)-num(v?.stock_reserved)))),
        stock_min:Math.max(0,num(p.min_stock,num(v?.stock_min,0))),original_price_usd:num(p.original_price_usd||p.regular_price_usd||p.compare_at_price_usd||p.original_price,0),
        discount_percent:num(p.discount_percent,0),is_offer:Boolean(p.is_offer||p.on_sale||num(p.discount_percent,0)>0),repair:clean(p.repair),quality:clean(p.quality),model_type:clean(p.model_type),
        inventory_group:clean(p.inventory_group),item_type:clean(p.item_type),warranty:clean(p.warranty),repair_time:clean(p.repair_time),_source:'inventory'
      };
      if(!record.name||!looksLikePart(record))continue;
      record.device_category=deviceCategory(record.name,record.model,record.compatibility,record.category,record.subcategory,record.repair,record.inventory_group);
      if(record.device_category==='Otro')continue;
      record.series=clean(p.series)||seriesFrom(record,record.device_category);
      record.repair=repairType(record)||record.repair;record.quality=qualityType(record)||record.quality;record.model_type=record.model_type||modelType(record);
      const cp=catByName.get(norm(record.name));
      if(!record.description)record.description=clean(cp?.description);
      if(!record.image_url)record.image_url=clean(cp?.image_url||imageByKey.get(cp?.product_key));
      items.push(record);
    }

    for(const v of variants){
      if(usedVariant.has(String(v.id)))continue;
      const record={id:`variant-${v.id}`,sku:clean(v.sku),name:clean(v.product_name||v.sku),model:clean(v.model),category:'',subcategory:'',description:'',compatibility:'',image_url:'',price_usd:num(v.price_usd,0),available:Math.max(0,num(v.stock_on_hand)-num(v.stock_reserved)),stock_min:Math.max(0,num(v.stock_min,0)),original_price_usd:0,discount_percent:0,is_offer:false,repair:'',quality:'',model_type:'',_source:'inventory'};
      if(!record.name||!looksLikePart(record))continue;
      record.device_category=deviceCategory(record.name,record.model,record.sku);
      if(record.device_category==='Otro')continue;
      record.series=seriesFrom(record,record.device_category);record.repair=repairType(record);record.quality=qualityType(record);record.model_type=modelType(record);
      const cp=catByName.get(norm(record.name));record.description=clean(cp?.description);record.image_url=clean(cp?.image_url||imageByKey.get(cp?.product_key));items.push(record);
    }

    const unique=new Map();
    const keyFor=x=>norm(x.sku)||norm([x.device_category,x.name,x.model,x.repair].join('|'));
    for(const x of items){
      const key=keyFor(x);const prev=unique.get(key);
      if(!prev||x.available>prev.available||(!prev.image_url&&x.image_url))unique.set(key,x);
    }
    for(const s of supportItems){
      const key=keyFor(s),inv=unique.get(key);
      if(!inv){unique.set(key,s);continue}
      unique.set(key,{...inv,...s,
        available:inv.available,stock_min:inv.stock_min,
        price_usd:s.price_usd>0?s.price_usd:inv.price_usd,
        original_price_usd:s.original_price_usd>0?s.original_price_usd:inv.original_price_usd,
        image_url:s.image_url||inv.image_url,description:s.description||inv.description,
        repair:s.repair||inv.repair,quality:s.quality||inv.quality,series:s.series||inv.series,model:s.model||inv.model,
        _source:'merged'
      });
    }
    const list=[...unique.values()].map(({_source,...x})=>x).sort((a,b)=>(b.available-a.available)||a.device_category.localeCompare(b.device_category)||a.name.localeCompare(b.name,undefined,{numeric:true}));
    return out(200,{ok:true,source:'inventory+support',updated_at:new Date().toISOString(),items:list});
  }catch(e){return out(500,{ok:false,error:e.message||'No se pudo consultar precios'});}
};
