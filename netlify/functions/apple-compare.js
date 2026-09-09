exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"apple_compare",
      fields:["Pantalla","Procesador","Cámara","Batería","Capacidad","Peso","Recomendación"]
    })
  };
};
