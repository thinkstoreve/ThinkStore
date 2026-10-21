(function(root){
'use strict';
const amount=v=>{const s=String(v??'').trim().replace(',','.');return /^\d+(\.\d{1,2})?$/.test(s)&&Number.isSafeInteger(Math.round(Number(s)*100))?Math.round(Number(s)*100)/100:null;};
const expected=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Math.round(Number(v)*100)/100:null;
function evaluate(accounts,counts={},notes={}){
 const rows=accounts.filter(a=>a.active!==false).map(a=>{const counted=amount(counts[a.id]),balance=expected(a.balance);return {...a,expected:balance,counted,difference:counted===null||balance===null?null:Math.round((counted-balance)*100)/100,note:String(notes[a.id]||'').trim()};});
 const totals={};for(const r of rows){const c=r.currency;if(!totals[c])totals[c]={expected:0,counted:0,difference:0,complete:true};const t=totals[c];if(r.counted===null||r.expected===null)t.complete=false;t.expected+=Math.round((r.expected||0)*100);t.counted+=Math.round((r.counted||0)*100);t.difference+=Math.round((r.difference||0)*100);}
 for(const t of Object.values(totals))for(const k of ['expected','counted','difference'])t[k]/=100;
 return {rows,totals,complete:rows.length>0&&rows.every(r=>r.counted!==null&&r.expected!==null),explained:rows.length>0&&rows.every(r=>r.difference===0||(r.difference!==null&&r.note.length>=5)),differences:rows.filter(r=>r.difference!==null&&r.difference!==0).length};
}
const api={amount,evaluate};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreCountModel=api;
})(typeof window==='undefined'?globalThis:window);
