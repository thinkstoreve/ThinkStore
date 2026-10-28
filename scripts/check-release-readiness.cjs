'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const checks=[];
for(const [html,assets] of [['panel.html',['app-experience.css?v=15.44']],['staff/index.html',['app-experience.css?v=15.44','payment-guard.js?v=15.44','repairs.js?v=15.44']],['soporte/panel.html',['app-experience.css?v=15.44','parts-catalog.js?v=15.43.1']],['growth-enterprise/index.html',['app-experience.css?v=15.44','service-breakdown.js?v=15.44']]]){
 const text=fs.readFileSync(path.join(root,html),'utf8');for(const asset of assets){const exists=fs.existsSync(path.join(root,path.dirname(html),asset.split('?')[0]));checks.push({page:html,asset,ok:exists&&text.includes(asset)});}
}
const mainKey=process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
const supportKey=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY;
const supportUrl=String(process.env.SUPPORT_SUPABASE_URL||'').replace(/\/$/,'');
const server={main_key_present:Boolean(mainKey),support_key_present:Boolean(supportKey),support_project_matches:supportUrl==='https://tnezvnziqnjxhcwjtcuy.supabase.co'};
console.log(JSON.stringify({assets:checks,server_configuration:server,server_checked:process.argv.includes('--server'),hosting:'Confirmar en Netlify qué sitio publica soporte.thinkstore.com.ve; no se puede deducir solo del repositorio.'},null,2));
if(checks.some(c=>!c.ok)||(process.argv.includes('--server')&&Object.values(server).some(v=>!v)))process.exitCode=1;
