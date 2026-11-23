document.addEventListener("DOMContentLoaded", async () => {
    const status = document.getElementById("bf-status");
    const form = document.getElementById("bf-form");
    const categoryFields = document.getElementById("bf-category-discounts");
    const saveButton = document.getElementById("bf-save");

    const categories = [
        "Sneakers", "Human Hair Wigs", "Human Blend Wigs", "Bags", "Dresses",
        "Shoes", "Accessories", "Swim & Beachwear", "Gifts", "Home Appliances",
        "Stationery", "Sportswear", "Sleepwear", "Women Comfies", "Elegancies", "Specials"
    ];

    function setStatus(message, isError = false) {
        status.textContent = message;
        status.style.color = isError ? "#a01838" : "inherit";
    }

    try {
        const { data: authData, error: authError } = await ggSupabase.auth.getUser();
        if (authError || !authData.user) throw new Error("Please sign in to manage the sale.");
        const { data: admin, error: adminError } = await ggSupabase
            .from("admin_users").select("role").eq("id", authData.user.id).maybeSingle();
        if (adminError || !admin || !["owner", "staff"].includes(admin.role)) {
            throw new Error("You do not have permission to manage promotions.");
        }

        const { data, error } = await ggSupabase.from("store_promotions")
            .select("*").eq("id", 1).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Sale settings were not found. Run supabase/black-friday-2026.sql first.");

        document.getElementById("bf-enabled").checked = Boolean(data.enabled);
        document.getElementById("bf-name").value = data.name || "";
        const toLocalInput = value => {
            const date = new Date(value);
            const pad = number => String(number).padStart(2, "0");
            return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
                "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
        };
        document.getElementById("bf-start").value = toLocalInput(data.starts_at);
        document.getElementById("bf-end").value = toLocalInput(data.ends_at);

        categoryFields.innerHTML = categories.map(category => {
            const discount = Number(data.category_discounts?.[category] ?? 0);
            return '<label class="bf-discount-row"><span>' + category + '</span><select data-category="' + category + '">' +
                [0,10,15,20,25,30].map(value => '<option value="' + value + '"' + (discount === value ? ' selected' : '') + '>' + value + '% off</option>').join("") +
                '</select></label>';
        }).join("");

        form.addEventListener("submit", async event => {
            event.preventDefault();
            saveButton.disabled = true;
            setStatus("Saving sale settings...");
            try {
                const discounts = {};
                categoryFields.querySelectorAll("select[data-category]").forEach(select => {
                    discounts[select.dataset.category] = Number(select.value);
                });
                const startsAt = new Date(document.getElementById("bf-start").value);
                const endsAt = new Date(document.getElementById("bf-end").value);
                if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
                    throw new Error("Please choose a valid sale start and end date.");
                }
                const { error: updateError } = await ggSupabase.from("store_promotions").update({
                    name: document.getElementById("bf-name").value.trim(),
                    starts_at: startsAt.toISOString(),
                    ends_at: endsAt.toISOString(),
                    enabled: document.getElementById("bf-enabled").checked,
                    category_discounts: discounts,
                    updated_at: new Date().toISOString()
                }).eq("id", 1);
                if (updateError) throw updateError;
                setStatus("Sale settings saved. The storefront and checkout will use these settings.");
            } catch (error) {
                setStatus(error.message || "Could not save sale settings.", true);
            } finally {
                saveButton.disabled = false;
            }
        });

        setStatus("Sale manager loaded. Changes are saved to Supabase.");
    } catch (error) {
        setStatus(error.message || "Could not load sale settings.", true);
        form.hidden = true;
    }
});
