exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"imports_tracking",
      steps:["Pedido al proveedor","Comprado","Casillero Miami","En tránsito","Aduana","Venezuela","Disponible","Entregado"]
    })
  };
};
