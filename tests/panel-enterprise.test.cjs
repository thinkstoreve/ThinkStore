const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../panel.html'),'utf8');
let count=0;
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){if(match[1].trim()){new vm.Script(match[1]);count++;}}
const business=require('../enterprise-template');
const fields={};
function field(id,value=''){const label={hidden:false},section={hidden:false};return fields[id]={id,value,hidden:false,style:{},closest:s=>s==='label'?label:section,_label:label,_section:section};}
['mTemplateId','mSubject','mPreheader','mTitle','mSubtitle','mMessage','mKicker','mBadge','mProduct','mDetails','mOffer','mPricePro','mPriceProMax','mButton','mUrl','mSecondaryButton','mSecondaryUrl','mContactName','mCompanyName','mImageFile','enterpriseFields'].forEach(id=>field(id));
fields.mTemplateId.value='standard';fields.mSubject.value='Original draft';fields.mTitle.value='Old title';fields.mMessage.value='Old message';
const generic={hidden:false},footer={hidden:false},preset={hidden:false},style={hidden:false};
const card={querySelector:s=>s==='.campaign-preview'?generic:footer,appendChild:el=>fields[el.id]=el};
const document={querySelector:()=>card,querySelectorAll:()=>[preset,style],createElement:()=>({style:{},setAttribute(){}})};
const ctx={ThinkStoreEnterprise:business,document,$:id=>fields[id],val:id=>fields[id]?.value||'',updateCampaignPreview:()=>vm.runInContext('updateEnterprisePreview()',ctx)};
vm.createContext(ctx);
const start=html.indexOf('let enterpriseLegacyDraft = null;'),end=html.indexOf('\nfunction campaignOccasionAuto()',start);
assert.ok(start>0&&end>start);vm.runInContext(html.slice(start,end),ctx);
vm.runInContext("selectCampaignTemplate('empresas-soporte-apple')",ctx);
assert.equal(fields.mSubject.value,business.subject);assert.equal(fields.mPreheader.value,business.preheader);assert.equal(fields.enterpriseFields.hidden,false);
assert.equal(generic.hidden,true);assert.equal(fields.mImageFile._section.hidden,true);assert.equal(fields.mProduct._section.hidden,true);assert.equal(fields.mMessage._label.hidden,true);assert.ok(fields.enterprisePreview.srcdoc.includes(business.logo));
fields.mContactName.value='Ana';fields.mCompanyName.value='Empresa & Hijos';ctx.updateCampaignPreview();assert.ok(fields.enterprisePreview.srcdoc.includes('Empresa &amp; Hijos'));
vm.runInContext("selectCampaignTemplate('standard')",ctx);assert.equal(fields.mSubject.value,'Original draft');assert.equal(fields.mTitle.value,'Old title');assert.equal(generic.hidden,false);assert.equal(fields.enterprisePreview.hidden,true);assert.equal(fields.mProduct._section.hidden,false);
vm.runInContext("selectCampaignTemplate('empresas-soporte-apple',false)",ctx);assert.equal(fields.mSubject.value,'Original draft');assert.equal(fields.enterpriseFields.hidden,false);
console.log(`Panel: ${count} inline scripts parsed; enterprise selection, preview escaping, history mode and legacy draft restoration passed.`);
