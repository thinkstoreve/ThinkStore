import { handle } from '../../functions/api/admin-users.js';

export const handler = async (event) => {
  try {
    const method = String(event.httpMethod || 'GET').toUpperCase();
    const headers = new Headers(event.headers || {});
    const init = { method, headers };
    if (!['GET','HEAD'].includes(method) && event.body) init.body = event.body;
    const request = new Request('https://inventory.thinkstore.com.ve/api/admin-users', init);
    const response = await handle({ env: process.env, request });
    const outHeaders = {};
    response.headers.forEach((v,k)=>{outHeaders[k]=v});
    return { statusCode: response.status, headers: outHeaders, body: await response.text() };
  } catch (error) {
    return { statusCode: 500, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}, body:JSON.stringify({error:error?.message||'ADMIN_USERS_FAILED'}) };
  }
};
