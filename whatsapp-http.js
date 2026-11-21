(function(root){'use strict';
async function read(response){const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw Error(response.status===504||response.status===502?'El servidor tardó demasiado en responder. Tu borrador se conserva; inténtalo de nuevo en unos segundos.':'El servidor devolvió una página en lugar de datos. Actualiza la bandeja; tu borrador se conserva.');}if(!response.ok||!data?.ok)throw Error(data?.error||'No se pudo completar la solicitud.');return data;}
const api={read};if(typeof module!=='undefined')module.exports=api;root.ThinkStoreWhatsAppHTTP=api;
})(typeof window==='undefined'?globalThis:window);
