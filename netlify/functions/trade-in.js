exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"trade_in",
      message:"Plan Renueva tu iPhone preparado.",
      statuses:["Evaluación solicitada","Equipo recibido","Revisión técnica","Oferta enviada","Aprobado","Aplicado como parte de pago"]
    })
  };
};
