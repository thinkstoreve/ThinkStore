exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ok:true, module:"smart_segments", message:"Segmentación inteligente preparada." })
  };
};
