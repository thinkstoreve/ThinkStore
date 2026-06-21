exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ ok:true, module:"shipping_tracking", message:"Tracking MRW / Zoom / Tealca preparado." })
  };
};
