// Glamor & Grace — promotion pricing shared by storefront pages.
// Supabase controls the sale window; checkout independently validates discounts in SQL.
(function () {
    const normalise = value => String(value || "")
        .toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

    window.GGPromotion = null;
    window.ggPromotionReady = (async function () {
        try {
            const { data, error } = await ggSupabase
                .from("store_promotions")
                .select("name,starts_at,ends_at,enabled,category_discounts")
                .eq("id", 1)
                .maybeSingle();
            if (error) throw error;
            if (!data || !data.enabled) return null;
            const now = Date.now();
            const start = new Date(data.starts_at).getTime();
            const end = new Date(data.ends_at).getTime();
            if (!Number.isFinite(start) || !Number.isFinite(end) || now < start || now >= end) return null;
            window.GGPromotion = data;
            return data;
        } catch (error) {
            console.warn("Promotion settings are unavailable; normal prices will be shown.", error);
            return null;
        }
    })();

    window.ggPromotionDiscount = function (category, productName) {
        const promotion = window.GGPromotion;
        if (!promotion || !promotion.category_discounts) return 0;
        const discounts = promotion.category_discounts;
        const productKey = Object.keys(discounts).find(name => productName && normalise(name) === normalise(productName));
        const categoryKey = Object.keys(discounts).find(name => normalise(name) === normalise(category));
        const productDiscount = productKey ? Number(discounts[productKey]) : 0;
        const value = Number.isFinite(productDiscount) && productDiscount > 0
            ? productDiscount
            : (categoryKey ? Number(discounts[categoryKey]) : 0);
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    };

    window.ggSalePrice = function (category, originalPrice, productName) {
        const price = Number(originalPrice || 0);
        const discount = window.ggPromotionDiscount(category, productName);
        return discount > 0 ? Math.round(price * (1 - discount / 100)) : Math.round(price);
    };
})();
