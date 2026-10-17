exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"qr_labels",
      message:"Etiquetas QR para pedidos, reparaciones y entregas preparadas."
    })
  };
};
