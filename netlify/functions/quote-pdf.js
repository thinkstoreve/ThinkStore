exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"quote_pdf",
      message:"Cotizador PDF ThinkStore preparado.",
      quoteCode:"TS-COT-0001"
    })
  };
};
