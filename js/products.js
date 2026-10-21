
 // ========================================
 // GLAMOR & GRACE - PRODUCTS
 // ========================================

let products = [];

async function loadProducts() {
    const { data, error } = await ggSupabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

    console.log("SUPABASE PRODUCTS:", data);
    console.log("SUPABASE ERROR:", error);

    if (error) {
        console.error("Could not load products:", error);
        products = [];
        return;
    }

    products = (data || []).map(product => ({
        ...product,
        id: String(product.id),
        name: product.name ?? product.Name ?? "",
        category: product.category ?? product.Category ?? "",
        price: Number(product.price ?? product.Price ?? 0),
        stock: Number(product.stock ?? product.Stock ?? 0),
        image: product.image_url ?? product.image ?? "",
        description: product.description ?? product.Description ?? ""
    }));

    console.log("NORMALISED PRODUCTS:", products);
}

const productsReady = loadProducts();
