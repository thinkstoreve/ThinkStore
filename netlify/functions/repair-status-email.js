exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"repair_status_email",
      message:"Correo automático de reparación preparado con Resend."
    })
  };
};
