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

    window.ggPromotionDiscount = function (category) {
        const promotion = window.GGPromotion;
        if (!promotion || !promotion.category_discounts) return 0;
        const wanted = normalise(category);
        const key = Object.keys(promotion.category_discounts)
            .find(name => normalise(name) === wanted);
        const value = key ? Number(promotion.category_discounts[key]) : 0;
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    };

    window.ggSalePrice = function (category, originalPrice) {
        const price = Number(originalPrice || 0);
        const discount = window.ggPromotionDiscount(category);
        return discount > 0 ? Math.round(price * (1 - discount / 100)) : Math.round(price);
    };
})();
