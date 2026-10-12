exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"crm_intelligence",
      segments:["Cliente nuevo","Cliente frecuente","Cliente VIP","Cliente inactivo","Lead caliente"]
    })
  };
};
