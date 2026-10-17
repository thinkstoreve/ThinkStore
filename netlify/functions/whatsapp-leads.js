exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"whatsapp_leads",
      message:"WhatsApp inteligente preparado para consultas de productos."
    })
  };
};
