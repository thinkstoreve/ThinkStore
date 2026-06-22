async function loadEnterpriseStats() {
  const stats = {
    orders: 0,
    customers: 0,
    products: 0
  };

  const { count: ordersCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: productsCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  stats.orders = ordersCount || 0;
  stats.customers = customersCount || 0;
  stats.products = productsCount || 0;

  console.log("Enterprise Stats:", stats);
}

loadEnterpriseStats();
