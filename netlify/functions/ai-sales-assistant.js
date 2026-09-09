exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"ai_sales_assistant",
      message:"Asistente IA ThinkStore preparado para recomendaciones de compra."
    })
  };
};
