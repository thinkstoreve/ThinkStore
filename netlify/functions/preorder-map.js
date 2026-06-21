exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"preorder_map",
      steps:["Pedido recibido","Comprado","En tránsito","Aduana","Venezuela","Disponible","Entregado"]
    })
  };
};
