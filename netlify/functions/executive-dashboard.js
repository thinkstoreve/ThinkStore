exports.handler = async function(event) {
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"executive_dashboard",
      metrics:{
        salesToday:0,
        salesMonth:0,
        activePreorders:0,
        newCustomers:0
      }
    })
  };
};
