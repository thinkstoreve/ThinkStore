/* Refresh stale cached image responses without replacing the original photos. */
(function(){
 'use strict';
 const version='15.40.48';
 function refreshed(src){
  const value=String(src||'');
  if(!/(?:^|\/)assets\/(?:iphone18\/colors\/iphone18-pro-max-(?:light-blue|dark-cherry|dark-gray|silver)\.jpg|iphone-18-pro-max-colores\.webp)(?:[?#]|$)/.test(value)||/[?&]v=15\.40\.48(?:&|$)/.test(value))return value;
  return value+(value.includes('?')?'&':'?')+'v='+version;
 }
 const original=resolveCatalogAsset;
 resolveCatalogAsset=function(p){return refreshed(original(p));};
 function fix(img){if(img?.tagName!=='IMG')return;const src=img.getAttribute('src'),next=refreshed(src);if(next!==src)img.setAttribute('src',next);}
 function scan(node){if(node?.nodeType!==1&&node!==document)return;fix(node);node.querySelectorAll?.('img').forEach(fix);}
 new MutationObserver(records=>records.forEach(r=>{if(r.type==='attributes')fix(r.target);else r.addedNodes.forEach(scan);})).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 document.addEventListener('error',e=>fix(e.target),true);
 scan(document);
})();
