// ========================================
// GLAMOR & GRACE - PRODUCTS
// ========================================

let products = [];

async function loadProducts() {

    const { data, error } =
        await ggSupabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

    console.log("SUPABASE PRODUCTS:", data);
    console.log("SUPABASE ERROR:", error);

    if (error) {
        console.error("Could not load products:", error);
        return;
    }

    products = data || [];
}

const productsReady = loadProducts();
