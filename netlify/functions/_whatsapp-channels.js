'use strict';
const {AsyncLocalStorage}=require('node:async_hooks');
const context=new AsyncLocalStorage();
const ids=new Set(['meta','meta-us']);
const current=()=>context.getStore()||'meta';
function run(channel,fn){if(!ids.has(channel))throw Object.assign(Error('Canal inválido'),{status:400});return context.run(channel,fn);}
function request(event){let b={};try{b=JSON.parse(event.body||'{}');}catch{}const channel=b.channel||'meta';return channel==='wati'?'meta':channel;}
function config(){
 const us=current()==='meta-us',prefix=us?'WHATSAPP_US_':'WHATSAPP_',value=name=>String(process.env[prefix+name]||'').trim();
 return {channel:current(),enabled:!us||value('ENABLED')==='true',token:value('ACCESS_TOKEN'),phoneId:value('PHONE_NUMBER_ID'),verifyToken:value('VERIFY_TOKEN'),appSecret:value('APP_SECRET'),version:value('GRAPH_VERSION')||(us?String(process.env.WHATSAPP_GRAPH_VERSION||'').trim():''),wabaId:value('BUSINESS_ACCOUNT_ID')||(us?'':'1394432156184316'),expectedPhone:us?'15557805646':'584241706142',webhook:us?'whatsapp-us-webhook':'whatsapp-webhook',site:String(process.env.THINKSTORE_PUBLIC_URL||process.env.THINKSTORE_SITE_URL||process.env.URL||'https://thinkstore.com.ve').trim().replace(/\/$/,'')};
}
function databasePath(path){if(current()!=='meta-us')return path;return path.replace(/^(whatsapp_(?:contacts|message_log|staff_reads|notification_outbox))(?=\?|$)/,name=>name.replace('whatsapp_','whatsapp_us_')).replace(/^rpc\/ts_whatsapp_(inbox|alerts|mark_read)(?=\?|$)/,'rpc/ts_whatsapp_us_$1');}
function missing(){const c=config();return [...['token','phoneId','verifyToken','appSecret','version','wabaId'].filter(k=>!c[k]),...(!c.enabled?['enabled']:[]),...(current()==='meta-us'&&c.phoneId!=='1370682272805383'?['phoneIdentity']:[])];}
module.exports={current,run,request,config,databasePath,missing};
