(()=>{
 let current=null,zoom=null;
 function openZoom(){
  const main=document.getElementById('mainImg');if(!main?.src)return;
  const dialog=document.createElement('dialog');dialog.className='ts-image-zoom';dialog.setAttribute('aria-label','Ampliar imagen del producto');
  dialog.innerHTML='<div class="ts-zoom-toolbar"><button type="button" data-minus aria-label="Alejar">−</button><label>Zoom <input type="range" min="1" max="3" step="0.1" value="1" aria-label="Nivel de zoom"></label><button type="button" data-plus aria-label="Acercar">+</button><button type="button" data-reset>Ajustar</button><button type="button" data-close aria-label="Cerrar imagen">×</button></div><div class="ts-zoom-scroll"><img alt=""></div>';
  const img=dialog.querySelector('img'),range=dialog.querySelector('input');img.src=main.src;img.alt=main.alt;let base=1;
  const resize=()=>{base=Math.min(img.naturalWidth||900,Math.max(240,window.innerWidth-64),Math.max(240,window.innerHeight*.7)*(img.naturalWidth/Math.max(1,img.naturalHeight)));img.style.width=base*Number(range.value)+'px';};
  const change=delta=>{range.value=Math.max(1,Math.min(3,Number(range.value)+delta));resize();};
  range.oninput=resize;dialog.querySelector('[data-minus]').onclick=()=>change(-.25);dialog.querySelector('[data-plus]').onclick=()=>change(.25);dialog.querySelector('[data-reset]').onclick=()=>{range.value=1;resize();};
  const close=()=>{dialog.close();dialog.remove();zoom=null;};dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',()=>{dialog.remove();zoom=null;});img.ondblclick=()=>{range.value=Number(range.value)>1?1:2;resize();};img.onload=resize;
  document.body.append(dialog);dialog.showModal();resize();zoom=dialog;
 }
 window.tsRefreshProductMedia=function(product){
  current=product;const main=document.getElementById('mainImg'),thumbs=document.getElementById('thumbs');if(!main||!thumbs)return;
  let tools=document.getElementById('tsProductMediaTools');if(!tools){tools=document.createElement('div');tools.id='tsProductMediaTools';thumbs.after(tools);}
  tools.replaceChildren();
  const magnify=document.createElement('button');magnify.type='button';magnify.className='ts-media-magnify';magnify.textContent='⌕ Ampliar imagen';magnify.setAttribute('aria-label','Abrir lupa y zoom de la imagen');magnify.onclick=openZoom;tools.append(magnify);
  main.style.cursor='zoom-in';main.onclick=openZoom;main.setAttribute('tabindex','0');main.setAttribute('role','button');main.setAttribute('aria-label','Ampliar imagen de '+String(product.name||'producto'));main.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openZoom();}};
  const src=String(product.video_url||'');if(/^https:\/\//i.test(src)){
   const details=document.createElement('details');details.className='ts-product-video';const summary=document.createElement('summary');summary.textContent='Ver video del producto';const video=document.createElement('video');video.src=src;video.controls=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-label','Video de '+String(product.name||'producto'));details.append(summary,video);details.addEventListener('toggle',()=>{if(!details.open)video.pause();});tools.append(details);
  }
 };
 // Pause product media when its modal closes or the browser tab loses visibility.
 const pause=()=>document.querySelectorAll('#tsProductMediaTools video').forEach(v=>v.pause());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 const init=()=>{const modal=document.getElementById('modal');if(modal)new MutationObserver(()=>{if(!modal.classList.contains('open'))pause();}).observe(modal,{attributes:true,attributeFilter:['class']});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
