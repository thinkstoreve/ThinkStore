exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"smart_recommendations",
      examples:[
        {base:"iPhone", suggest:["AirPods Pro","Apple Watch","Cable USB-C","Cargador"]},
        {base:"MacBook", suggest:["Magic Mouse","Magic Keyboard","Hub USB-C"]}
      ]
    })
  };
};
