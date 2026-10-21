/* Improve the existing form without changing its validation or accounting handler. */
(function(){
'use strict';
let origin=null;
function enhance(wrap){if(wrap.dataset.polished)return;wrap.dataset.polished='1';const card=wrap.querySelector('.fin-modal-card'),form=wrap.querySelector('.fin-form');if(!card||!form)return;
 origin=document.activeElement;card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');const title=card.querySelector('h3');if(title){title.id='enterprise-finance-dialog-title';card.setAttribute('aria-labelledby',title.id);}
 const close=card.querySelector('.fin-modal-x');if(close){close.setAttribute('aria-label','Cerrar formulario');close.setAttribute('type','button');}
 const submit=card.querySelector('.fin-submit');if(submit&&title?.textContent==='Nuevo gasto')submit.textContent='Guardar gasto';
 const status=form.querySelector('.fin-form-status');status?.setAttribute('role','status');status?.setAttribute('aria-live','polite');
 // Keep optional inputs inside the same form so FormData and the original save logic keep working.
 const optional=['reference','receipt_url','occurred_at','notes'].map(n=>form.querySelector('[name="'+n+'"]')?.closest('label')).filter(l=>l&&!l.querySelector('[required]'));
 if(optional.length){const details=document.createElement('details');details.className='fin-optional';const summary=document.createElement('summary');summary.textContent='Referencia, comprobante y otros detalles';details.append(summary);const fields=document.createElement('div');fields.className='fin-optional-grid';optional.forEach(l=>fields.append(l));details.append(fields);form.insertBefore(details,status||form.lastElementChild);}
 const amount=form.querySelector('[name="amount_usd"]');if(amount){amount.placeholder='0,00';amount.closest('label')?.classList.add('fin-main-amount');}
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close?.click();origin?.focus?.();return;}if(e.key!=='Tab')return;const visible=[...card.querySelectorAll('button,input,select,textarea,summary,a[href]')].filter(x=>!x.disabled&&x.getClientRects().length);const first=visible[0],last=visible[visible.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
 requestAnimationFrame(()=>amount?.focus({preventScroll:true}));
}
new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes){if(n.nodeType!==1)continue;if(n.matches('.fin-modal'))enhance(n);n.querySelectorAll?.('.fin-modal').forEach(enhance);}}).observe(document.body,{childList:true});
})();
