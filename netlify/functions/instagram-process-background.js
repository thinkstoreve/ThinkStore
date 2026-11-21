'use strict';
const I=require('./_instagram');
exports.handler=async event=>{const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64'):Buffer.from(event.body||'');if(event.httpMethod!=='POST'||raw.length>1024*1024||!I.signature(raw,event.headers?.['x-hub-signature-256']||event.headers?.['X-Hub-Signature-256']))return {statusCode:403,body:'Forbidden'};await I.processPayload(JSON.parse(raw));return {statusCode:200,body:'OK'};};
