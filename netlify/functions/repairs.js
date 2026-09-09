exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"repairs",
      repairCode:"TS-RP-2026-0001",
      statuses:["Recibido","Diagnóstico","Esperando repuesto","En reparación","Pruebas finales","Listo para entrega"]
    })
  };
};
