(function(root){'use strict';
function newMessages(previous,current,ready=true){if(!ready)return[];const map=new Map((previous||[]).map(x=>[x.phone_e164,x]));return(current||[]).filter(x=>{if(!(Number(x.unread_count)>0))return false;const old=map.get(x.phone_e164);if(!old)return true;const now=Date.parse(x.latest_at),before=Date.parse(old.latest_at);if(Number.isFinite(now)&&Number.isFinite(before)){if(now>before)return true;if(now<before)return false;}return Number(x.unread_count)>Number(old.unread_count)||x.latest_id!==old.latest_id&&Number(x.unread_count)>=Number(old.unread_count);});}
function isBot(c,now=Date.now()){const b=c?.metadata?.care_assistant;return Boolean(b?.active&&!c.needs_human&&Date.parse(b.expires_at)>now);}
function initials(name){return String(name||'Cliente').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
function matches(c,q,filter='all'){const text=String((c.name||'')+' '+c.phone_e164).toLowerCase(),bot=isBot(c);return text.includes(String(q||'').trim().toLowerCase())&&(filter==='all'||filter==='unread'&&Number(c.unread_count)>0||filter==='bot'&&bot||filter==='human'&&!bot);}
const api={newMessages,isBot,initials,matches};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreWhatsAppModel=api;
})(typeof window==='undefined'?globalThis:window);
