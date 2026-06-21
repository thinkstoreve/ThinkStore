exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"thinkstore_care",
      plans:[
        {name:"ThinkStore Care 6 meses", coverage:["Diagnóstico prioritario","Soporte Apple","Revisión preventiva"]},
        {name:"ThinkStore Care 12 meses", coverage:["Diagnóstico prioritario","Soporte Apple","Revisión preventiva","Atención VIP"]}
      ]
    })
  };
};
