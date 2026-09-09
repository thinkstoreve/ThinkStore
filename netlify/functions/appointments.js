exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"appointments",
      types:["Diagnóstico","Reparación","Retiro en tienda","Asesoría de compra"]
    })
  };
};
