'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../soporte/parts-catalog');
const screen={id:'screen',sku:'ST-PANT-STD-15PL',name:'Estándar',category:'iPhone',catalog_details:{model:'iPhone 15 Plus',repair:'Pantalla',quality:'Estándar',inventory_group:'Apple · Pantallas'}};
test('encuentra pantalla por palabras separadas y modelo guardado en metadata',()=>{
 for(const q of ['pantalla 15 plus','pantalla iphone 15 plus','15','15 plus pantalla','ST-PANT-STD-15PL','estandar','  PANTALLA   15  PLUS  '])assert.equal(C.matches(screen,q),true,q);
 assert.equal(C.matches(screen,'bateria 15 plus'),false);assert.equal(C.matches(screen,'pantalla 16 plus'),false);
 assert.equal(C.displayName(screen),'Pantalla iPhone 15 Plus · Estándar');
});
function clientFor(rows,{failAt=null,repeat=false}={}){
 const calls=[];
 return {calls,from(table){assert.equal(table,'service_parts');const q={select(){return q},order(){return q},async range(start,end){calls.push([start,end]);if(start===failAt)return {error:{message:'consulta fallida'}};return {data:rows.slice(repeat?0:start,repeat?500:end+1),error:null};}};return q;}};
}
test('carga más de 1000 repuestos y encuentra la pantalla en la última página',async()=>{
 const rows=Array.from({length:1200},(_,i)=>({id:'p'+i,name:'Repuesto '+i}));rows.push(screen);
 const client=clientFor(rows),res=await C.loadAll(client);assert.equal(res.data.length,1201);assert.equal(res.data.find(p=>C.matches(p,'pantalla 15 plus')).sku,screen.sku);assert.deepEqual(client.calls,[[0,499],[500,999],[1000,1499]]);
});
test('una página con error o repetida no se convierte en lista parcial exitosa',async()=>{
 const rows=Array.from({length:1000},(_,i)=>({id:'p'+i}));
 await assert.rejects(C.loadAll(clientFor(rows,{failAt:500})),/consulta fallida/);
 await assert.rejects(C.loadAll(clientFor(rows,{repeat:true})),/página repetida/);
});
test('catálogo vacío legítimo se distingue de un error',async()=>{const res=await C.loadAll(clientFor([]));assert.deepEqual(res,{data:[],error:null});});
