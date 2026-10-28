(function(root,factory){const create=factory();if(typeof module==='object'&&module.exports)module.exports=create;else root.TSPaymentGuard=create;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 return function createGuard(){let busy=false;return {get busy(){return busy},async run(action){if(busy)return;busy=true;try{return await action()}finally{busy=false}}};};
});
