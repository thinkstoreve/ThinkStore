exports.handler = async function(event) {
  const price = 1200;
  const initial = 300;
  const months = 12;
  const monthly = Math.round((price - initial) / months);
  return {
    statusCode: 200,
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      ok:true,
      module:"financing_simulator",
      example:{price, initial, months, monthly}
    })
  };
};
