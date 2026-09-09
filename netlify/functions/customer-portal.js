exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"customer_portal",
      sections:["Pedidos","Preórdenes","Garantías","Facturas","Reparaciones","Puntos VIP"]
    })
  };
};
