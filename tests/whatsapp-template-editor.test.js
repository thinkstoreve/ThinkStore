'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const source=fs.readFileSync(require.resolve('../whatsapp-inbox.js'),'utf8');
const editor=source.slice(source.indexOf('let templateRows='),source.indexOf("$('replyForm').onsubmit="));
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.classList={toggle(){}};this.attributes={};}
 append(...children){for(const child of children){this.children.push(child);if(this.tag==='select'&&this.children.length===1)this.value=String(child.value);}}
 replaceChildren(...children){this.children=[];if(this.tag==='select')this.value='';this.append(...children);}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);}
 setAttribute(k,v){this.attributes[k]=v;}
 focus(){this.focused=true;}
}
const approved={name:'first_contact',language:'es',category:'UTILITY',body:'Hola {{1}}',header:null,buttons:[]};
function harness({templates=[approved],api:handle}={}){
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,new Element(id==='templateSelect'?'select':'div'));return nodes.get(id);};
 $('templatePanel').hidden=true;
 const state={phone:'12125550123',channel:'meta-us',epoch:0,busy:false},calls=[],messages=[];
 const api=async(action,data,options)=>{calls.push({action,data,options});return handle?handle(action,data):action==='templates'?{templates}:{ok:true,result:{status:'sent',message_id:'test'}};};
 vm.runInNewContext(editor,{state,$,api,message:(text,error)=>messages.push({text,error}),refresh:async()=>{},el:(tag,text)=>Object.assign(new Element(tag),{textContent:text}),crypto,URL});
 return{$,state,calls,messages,open:()=>$('templatesToggle').onclick(),send:()=>$('templateSend').onclick()};
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
test('template catalog shows loading, disables send and shows an inline error when it fails',async()=>{
 const loading=deferred(),h=harness({api:()=>loading.promise}),open=h.open();
 assert.match(h.$('templateStatus').textContent,/Cargando/);assert.equal(h.$('templateSend').disabled,true);
 loading.reject(Error('No autorizado'));await open;
 assert.equal(h.$('templateStatus').textContent,'No autorizado');assert.equal(h.$('templateSend').disabled,true);
 assert.equal(h.$('templatePanel').hidden,false);
});
test('empty catalogs and missing selection provide feedback without sending',async()=>{
 const h=harness({templates:[]});await h.open();assert.match(h.$('templateStatus').textContent,/no tiene plantillas aprobadas/);assert.equal(h.$('templateSend').disabled,true);
 await h.send();assert.match(h.$('templateStatus').textContent,/Selecciona una plantilla/);assert.equal(h.calls.filter(c=>c.action==='send_template').length,0);
});
test('required variables focus the missing field and never call the send API',async()=>{
 const h=harness();await h.open();await h.send();assert.match(h.$('templateStatus').textContent,/Completa todos/);assert.equal(h.$('templateVariables').querySelectorAll('input')[0].focused,true);assert.equal(h.calls.filter(c=>c.action==='send_template').length,0);
});
test('image templates require HTTPS and include the image separately from body variables',async()=>{
 const h=harness({templates:[{...approved,header:{format:'IMAGE'}}]});await h.open();assert.equal(h.$('templateImageField').hidden,false);
 h.$('templateVariables').querySelectorAll('input')[0].value='Ana';await h.send();assert.match(h.$('templateStatus').textContent,/HTTPS/);
 h.$('templateImage').value='https://thinkstore.com.ve/promo.jpg';await h.send();const send=h.calls.find(c=>c.action==='send_template');
 assert.equal(send.data.image,'https://thinkstore.com.ve/promo.jpg');assert.deepEqual(Array.from(send.data.variables),['Ana']);
 assert.equal(h.$('templateSend').disabled,true);assert.match(h.$('templateStatus').textContent,/aceptó/);assert.equal(h.$('templatePanel').hidden,false);
 await h.send();assert.equal(h.calls.filter(c=>c.action==='send_template').length,1);
});
test('send displays progress immediately and uncertain retries keep the same reference',async()=>{
 const pending=deferred();let attempts=0;
 const h=harness({templates:[{...approved,body:'Hola'}],api:action=>action==='templates'?{templates:[{...approved,body:'Hola'}]}:++attempts===1?pending.promise:{ok:true}});
 await h.open();const sending=h.send();assert.equal(h.$('templateSend').textContent,'Enviando plantilla…');assert.equal(h.$('templateSend').disabled,true);assert.match(h.$('templateStatus').textContent,/Enviando/);
 pending.reject(Object.assign(Error('Entrega sin confirmar'),{code:'unconfirmed'}));await sending;assert.equal(h.$('templateSend').disabled,false);assert.match(h.$('templateStatus').textContent,/sin confirmar/);
 await h.send();const sends=h.calls.filter(c=>c.action==='send_template');assert.equal(sends[0].data.client_id,sends[1].data.client_id);assert.equal(sends[0].options.timeout,45000);
});
test('explicit provider rejections show diagnostics and allow a fresh deliberate attempt',async()=>{
 let attempts=0;const h=harness({api:action=>action==='templates'?{templates:[{...approved,body:'Hola'}]}:++attempts===1?Promise.reject(Object.assign(Error('Meta rechazó la plantilla (código 131042).'),{code:'rejected'})):{ok:true}});
 await h.open();await h.send();assert.match(h.$('templateStatus').textContent,/131042/);await h.send();const sends=h.calls.filter(c=>c.action==='send_template');assert.notEqual(sends[0].data.client_id,sends[1].data.client_id);
});
test('catalog response from a previous chat never populates the selected conversation',async()=>{
 const pending=deferred(),h=harness({api:()=>pending.promise}),opening=h.open();h.state.phone='12125550456';pending.resolve({templates:[approved]});await opening;assert.equal(h.$('templateSelect').children.length,0);assert.equal(h.$('templateSend').disabled,true);
});
