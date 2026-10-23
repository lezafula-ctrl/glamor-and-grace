
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
        product_images: Array.isArray(product.product_images) ? product.product_images : (() => { try { return JSON.parse(product.product_images || "[]"); } catch { return []; } })(),
        variants: Array.isArray(product.variants) ? product.variants : (() => { try { return JSON.parse(product.variants || "[]"); } catch { return []; } })(),
        customization_fields: Array.isArray(product.customization_fields) ? product.customization_fields : (() => { try { return JSON.parse(product.customization_fields || "[]"); } catch { return []; } })(),
        variant_stock: Array.isArray(product.variant_stock) ? product.variant_stock : (() => { try { return JSON.parse(product.variant_stock || "[]"); } catch { return []; } })(),
        description: product.description ?? product.Description ?? ""
    }));

    console.log("NORMALISED PRODUCTS:", products);
}

const productsReady = loadProducts();
