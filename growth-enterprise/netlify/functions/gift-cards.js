exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ok:true, module:"gift_cards", message:"Gift Cards ThinkStore preparadas." })
  };
};
