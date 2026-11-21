(function(root){'use strict';
const presets=[
 {id:'care',text:'Ir a ThinkCare',url:'https://care.thinkstore.com.ve/'},
 {id:'support',text:'Servicio técnico',url:'https://thinkstore.com.ve/servicio-tecnico.html'},
 {id:'store',text:'Visitar ThinkStore',url:'https://thinkstore.com.ve/'},
 {id:'instagram',text:'Ver Instagram',url:'https://www.instagram.com/thinkstore_ve/'},
 {id:'appointment',text:'Agendar cita',url:'https://thinkstore.com.ve/agenda-soporte.html'}
];
function url(value){const text=String(value||'').trim();let parsed;try{parsed=new URL(text);}catch{throw Error('Añade un enlace HTTPS válido para el botón.');}if(text.length>2000||parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||parsed.hostname==='localhost'||parsed.hostname.endsWith('.local')||!/[a-z]/i.test(parsed.hostname)||parsed.hostname.includes(':'))throw Error('Añade un enlace público HTTPS, sin usuario ni contraseña.');return text;}
function draftButton(value){if(value===null||value===undefined)return null;if(typeof value!=='object'||Array.isArray(value)||typeof value.text!=='string'||typeof value.url!=='string'||value.text.length>20||value.url.length>2000)throw Error('El botón admite un título de hasta 20 caracteres y un enlace de hasta 2.000.');return{text:value.text,url:value.url};}
function button(value){const draft=draftButton(value);if(!draft)return null;const text=draft.text.trim();if(!text)throw Error('Escribe el título del botón.');return{text,url:url(draft.url)};}
function interactive(text,value){const cta=button(value),body=String(text||'').trim();if(!cta||!body||body.length>1024)throw Error('El mensaje con botón necesita un texto de hasta 1.024 caracteres.');return{type:'cta_url',body:{text:body},footer:{text:'ThinkStore · Chacao, Caracas'},action:{name:'cta_url',parameters:{display_text:cta.text,url:cta.url}}};}
function render(container,{body='',header='',footer='',image='',buttons=[]}={}){
 const doc=container.ownerDocument,make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const card=make('article',undefined,'wa-message-card');card.append(make('strong','ThinkStore','wa-preview-brand'));
 if(image){try{const img=make('img');img.src=url(image);img.alt='Imagen de la plantilla';card.append(img);}catch{}}
 if(header)card.append(make('strong',header,'wa-preview-header'));
 card.append(make('p',body||'Tu mensaje aparecerá aquí.','wa-preview-body'));
 if(footer)card.append(make('small',footer,'wa-preview-footer'));
 for(const item of buttons){let href;try{if(item.type==='PHONE_NUMBER'){const phone=String(item.phone_number||'').replace(/[\s().-]/g,'');if(!/^\+?[1-9]\d{7,14}$/.test(phone))throw Error();href='tel:'+phone;}else if(item.type!=='QUICK_REPLY')href=url(item.url);}catch{}
  const control=make(href?'a':'span',(item.type==='PHONE_NUMBER'?'☎ ':item.type==='QUICK_REPLY'?'':'↗ ')+(item.text||'Título del botón'),'wa-preview-button');if(href){control.href=href;control.target='_blank';control.rel='noopener noreferrer';control.title=href;}else control.setAttribute('aria-disabled','true');card.append(control);
 }
 container.replaceChildren(card);
}
const api={presets,url,draftButton,button,interactive,render};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreWhatsAppPreview=api;
})(typeof window==='undefined'?globalThis:window);
