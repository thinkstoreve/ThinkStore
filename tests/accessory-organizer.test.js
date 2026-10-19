const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm'),fs=require('node:fs');
const {type,matches}=require('../accessory-organizer.js');
test('accessory families separate device cases, keyboard folios and sleeves',()=>{
 assert.equal(type({name:'Fender',subcategory:'Cases para iPhone'}),'Cases para iPhone');
 assert.equal(type({name:'Slim',subcategory:'Cases para iPad'}),'Cases para iPad');
 assert.equal(type({name:'Rigid',subcategory:'Cases para MacBook'}),'Cases para MacBook');
 assert.equal(type({name:'Case teclado',subcategory:'Folios con teclado para iPad'}),'Folios con teclado');
 assert.equal(type({subcategory:'Fundas y bolsos para MacBook'}),'Fundas y bolsos');
});
test('filters match model brand style and color together',()=>{
 const v={type:'Cases para iPad',model:'iPad Air 13"',brand:'Fender',style:'Cuero',color:'Rojo',name:'Folio'};
 assert.ok(matches(v,{brand:'fender',style:'Cuero',q:'ipad'}));assert.ok(!matches(v,{type:'Cases para iPhone'}));assert.ok(!matches(v,{color:'Negro'}));
});
test('same collection names from different brands keep separate parents and exact stock',()=>{
 const c={document:{},module:undefined,TSCaseOptions:require('../case-browser.js'),tsBuildInventoryCatalog:()=>[{id:'legacy',name:'Slim',category:'Accesorios'}],tsCatalogSlug:s=>s.replace(/[^a-z0-9]/gi,'-'),tsCatalogFallbackImage:()=> 'placeholder',openCategoryModalV2:()=>{},addEventListener:()=>{}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../accessory-organizer.js'),'utf8'),c);
 const rows=[{id:'1',sku:'F',name:'Slim',brand:'Fender',category:'Accesorios',subcategory:'Cases para iPad',compatibility:'iPad Air · 11"',color:'Negro',sale_price:30},{id:'2',sku:'L',name:'Slim',brand:'Logitech',category:'Accesorios',subcategory:'Folios con teclado para iPad',compatibility:'iPad Air · 11"',color:'Negro',sale_price:90},{id:'3',sku:'hidden',name:'Hidden',category:'Accesorios',published:false}];
 const out=c.tsBuildInventoryCatalog([{sku:'F',stock_on_hand:5,stock_reserved:2,price_usd:35,active:true},{sku:'L',stock_on_hand:1,stock_reserved:0,active:true}],[],[],rows);
 assert.equal(out.length,2);assert.notEqual(out[0].id,out[1].id);assert.equal(out[0].case_variants[0].available,3);assert.equal(out[0].case_variants[0].price,35);assert.equal(out[1].case_variants[0].sku,'L');
});
