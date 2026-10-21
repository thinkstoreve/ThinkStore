'use strict';

const clean=(v,max=1000)=>String(v??'').trim().slice(0,max);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const siteRoot=()=>clean(process.env.THINKSTORE_SITE_URL||process.env.URL||'https://thinkstore.com.ve').replace(/\/$/,'');
const logoUrl=()=>`${siteRoot()}/assets/logo-thinkstore-email-transparent.png`;

function shell({preheader='',eyebrow='CUENTA THINKSTORE',title='',lead='',body='',ctaLabel='',ctaUrl='',footerNote=''}){
  const cta=(ctaLabel&&ctaUrl)?`<div style="text-align:center;margin:30px 0 6px"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#111114;color:#fff;text-decoration:none;border-radius:999px;padding:15px 28px;font-size:15px;line-height:1;font-weight:800">${esc(ctaLabel)}</a></div>`:'';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title||'ThinkStore')}</title></head>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f">
    <div style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:28px 12px">
      <tr><td align="center">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fff;border:1px solid #e8e8ed;border-radius:28px;overflow:hidden;box-shadow:0 18px 56px rgba(0,0,0,.08)">
          <tr><td align="center" style="padding:34px 28px 24px;background:#fff;border-bottom:1px solid #efeff2">
            <img src="${esc(logoUrl())}" width="210" alt="ThinkStore" style="display:block;width:210px;max-width:72%;height:auto;border:0;margin:0 auto">
          </td></tr>
          <tr><td style="padding:38px 38px 34px">
            <div style="font-size:11px;letter-spacing:.18em;font-weight:800;color:#7b7b82;margin-bottom:12px;text-transform:uppercase">${esc(eyebrow)}</div>
            <h1 style="margin:0 0 14px;font-size:34px;line-height:1.08;letter-spacing:-.035em;color:#111114;font-weight:800">${esc(title)}</h1>
            ${lead?`<p style="margin:0 0 26px;font-size:16px;line-height:1.65;color:#5d5d63">${esc(lead)}</p>`:''}
            ${body}
            ${cta}
          </td></tr>
          <tr><td style="padding:24px 38px 28px;background:#fafafa;border-top:1px solid #efeff2;font-size:12px;line-height:1.7;color:#7b7b82">
            <strong style="color:#1d1d1f">ThinkStore</strong> · Chacao, Caracas<br>
            ${footerNote?`${esc(footerNote)}<br>`:''}
            <a href="mailto:info@thinkstore.com.ve" style="color:#1d1d1f;text-decoration:none">info@thinkstore.com.ve</a> · <a href="${esc(siteRoot())}" style="color:#1d1d1f;text-decoration:none">thinkstore.com.ve</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

const infoBox=(html)=>`<div style="background:#f7f7f9;border:1px solid #e7e7eb;border-radius:18px;padding:18px 20px;font-size:14px;line-height:1.7;color:#2c2c31">${html}</div>`;
const row=(label,value)=>value?`<tr><td style="padding:8px 0;color:#7a7a80;font-size:13px;width:36%">${esc(label)}</td><td style="padding:8px 0;color:#1d1d1f;font-size:13px;font-weight:700">${esc(value)}</td></tr>`:'';

function verificationEmail({name,email,actionLink}){
  const first=clean(name).split(/\s+/)[0]||'Cliente';
  const html=shell({
    preheader:'Confirma tu correo para activar tu cuenta ThinkStore.',
    eyebrow:'VERIFICACIÓN DE CUENTA',
    title:'Confirma tu correo.',
    lead:`Hola ${first}. Solo falta un paso para activar tu cuenta ThinkStore.`,
    body:infoBox(`<strong style="color:#111114">${esc(email)}</strong><br><span style="color:#66666c">Usaremos este correo para pedidos, garantías, reparaciones y comunicaciones de tu cuenta.</span>`)+`<p style="font-size:13px;line-height:1.65;color:#77777d;margin:20px 0 0">Por seguridad, este enlace es personal. Si no creaste esta cuenta, puedes ignorar este mensaje.</p>`,
    ctaLabel:'Verificar mi cuenta',ctaUrl:actionLink,
    footerNote:'Este correo corresponde a la administración de tu cuenta.'
  });
  return{subject:'Verifica tu cuenta ThinkStore',html,text:`Hola ${first}.\n\nVerifica tu cuenta ThinkStore: ${actionLink}\n\nSi no creaste esta cuenta, ignora este mensaje.\n\nThinkStore · info@thinkstore.com.ve`};
}

function recoveryEmail({name,email,actionLink}){
  const first=clean(name).split(/\s+/)[0]||'Cliente';
  const html=shell({
    preheader:'Crea una nueva contraseña para tu cuenta ThinkStore.',
    eyebrow:'SEGURIDAD DE CUENTA',
    title:'Restablece tu contraseña.',
    lead:`Hola ${first}. Recibimos una solicitud para cambiar la contraseña de tu cuenta ThinkStore.`,
    body:infoBox(`<strong style="color:#111114">Cuenta</strong><br>${esc(email)}`)+`<p style="font-size:13px;line-height:1.65;color:#77777d;margin:20px 0 0">El enlace es de uso único. Si no solicitaste este cambio, no hagas clic y tu contraseña actual seguirá funcionando.</p>`,
    ctaLabel:'Crear nueva contraseña',ctaUrl:actionLink,
    footerNote:'ThinkStore nunca te pedirá tu contraseña por correo.'
  });
  return{subject:'Restablece tu contraseña · ThinkStore',html,text:`Hola ${first}.\n\nCrea una nueva contraseña aquí: ${actionLink}\n\nSi no solicitaste el cambio, ignora este correo.\n\nThinkStore · info@thinkstore.com.ve`};
}

function welcomeEmail({name,accountUrl}){
  const first=clean(name).split(/\s+/)[0]||'Cliente';
  const html=shell({
    preheader:'Tu cuenta ThinkStore ya está activa.',
    eyebrow:'BIENVENIDO A THINKSTORE',
    title:`Tu cuenta ya está lista, ${first}.`,
    lead:'Gracias por verificar tu correo. Desde ahora puedes gestionar tus compras y servicios desde un solo lugar.',
    body:`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0"><tr><td style="padding:0 6px 12px 0">${infoBox('<strong>Pedidos</strong><br><span style="color:#66666c">Consulta compras, pagos y entregas.</span>')}</td></tr><tr><td style="padding:0 6px 12px 0">${infoBox('<strong>Servicio Técnico</strong><br><span style="color:#66666c">Sigue reparaciones, mensajes y garantías.</span>')}</td></tr><tr><td style="padding:0 6px">${infoBox('<strong>Tu cuenta</strong><br><span style="color:#66666c">Direcciones, favoritos, preórdenes y beneficios.</span>')}</td></tr></table>`,
    ctaLabel:'Abrir Mi cuenta',ctaUrl:accountUrl,
    footerNote:'Puedes responder este correo si necesitas ayuda general con tu cuenta.'
  });
  return{subject:`Bienvenido a ThinkStore, ${first}`,html,text:`Hola ${first}.\n\nTu cuenta ThinkStore ya está activa.\nMi cuenta: ${accountUrl}\n\nPuedes responder este correo si necesitas ayuda.\n\nThinkStore · info@thinkstore.com.ve`};
}

function newCustomerInternalEmail(c){
  const adminUrl=`${siteRoot()}/panel.html#clientes`;
  const table=`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${row('Nombre',c.name)}${row('Correo',c.email)}${row('Teléfono',c.phone)}${row('Cédula / RIF',c.idNumber)}${row('Estado',c.state)}${row('Ciudad',c.city)}${row('Dirección',c.address)}${row('Registro',c.createdAt)}</table>`;
  const html=shell({
    preheader:`Nuevo cliente registrado: ${c.name||c.email}`,
    eyebrow:'NUEVO REGISTRO DE CLIENTE',
    title:'Nuevo cliente en ThinkStore.',
    lead:'La cuenta fue creada y el correo de verificación fue enviado.',
    body:infoBox(table),ctaLabel:'Abrir Clientes / CRM',ctaUrl:adminUrl,
    footerNote:'Al responder esta notificación, la respuesta puede dirigirse al correo del cliente.'
  });
  return{subject:`Nuevo cliente registrado · ${c.name||c.email}`,html,text:`Nuevo cliente ThinkStore\n\nNombre: ${c.name||''}\nCorreo: ${c.email||''}\nTeléfono: ${c.phone||''}\nCédula/RIF: ${c.idNumber||''}\nEstado: ${c.state||''}\nCiudad: ${c.city||''}\n\nClientes / CRM: ${adminUrl}`};
}

module.exports={clean,esc,siteRoot,shell,verificationEmail,recoveryEmail,welcomeEmail,newCustomerInternalEmail};
