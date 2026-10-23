
/* ========================================
   GLAMOR & GRACE - MANAGE EXISTING PRODUCTS
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("manage-products-list");
    const status = document.getElementById("manage-products-status");
    const form = document.getElementById("edit-product-form");
    const cancelButton = document.getElementById("cancel-product-edit");

    if (!list || !status || !form) {
        console.error("Product management section was not found on this page.");
        return;
    }

    let products = [];
    let editingProductId = null;

    const field = id => document.getElementById(id);

    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

    const money = value => "R" + Number(value || 0).toFixed(2);

    function parseOptionFields(text) {
        return text.split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const separator = line.indexOf(":");

                if (separator === -1) {
                    return { name: line, options: [] };
                }

                return {
                    name: line.slice(0, separator).trim(),
                    options: line.slice(separator + 1)
                        .split(",")
                        .map(value => value.trim())
                        .filter(Boolean)
                };
            });
    }

    function optionsToText(value) {
        let options = value;

        if (typeof options === "string") {
            try {
                options = JSON.parse(options);
            } catch {
                options = [];
            }
        }

        if (!Array.isArray(options)) return "";

        return options.map(option => {
            const name = String(option?.name ?? "").trim();
            const values = Array.isArray(option?.options)
                ? option.options : [];

            return name
                ? `${name}${values.length ? ": " + values.join(", ") : ""}`
                : "";
        }).filter(Boolean).join("\n");
    }

    function stockLabel(stock) {
        if (Number(stock) <= 0) return "Out of stock";
        if (Number(stock) <= 3) return "Low stock";
        return "In stock";
    }

    function renderProducts() {
        if (!products.length) {
            list.innerHTML = "<p>No products found.</p>";
            return;
        }

        list.innerHTML = products.map(product => {
            const id = escapeHTML(product.id);
            const image = product.image_url || product.image || "";

            return `
                <article class="admin-card" style="margin:12px 0;">
                    <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
                        ${image
                            ? `<img src="${escapeHTML(image)}"
                                alt="${escapeHTML(product.name)}"
                                style="width:75px;height:75px;object-fit:contain;"
                                onerror="this.style.display='none'">`
                            : "<span>No image</span>"}

                        <div style="flex:1;min-width:180px;">
                            <strong>${escapeHTML(product.name || "Unnamed product")}</strong>
                            <p style="margin:5px 0;">
                                ${escapeHTML(product.category || "No category")}
                                · ${money(product.price)}
                            </p>
                            <p style="margin:5px 0;">
                                Stock: ${Number(product.stock || 0)}
                                — ${stockLabel(product.stock)}
                            </p>
                        </div>

                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button type="button" class="primary-button"
                                data-edit-id="${id}">Edit</button>
                            <button type="button" class="remove-item"
                                data-delete-id="${id}">Remove</button>
                        </div>
                    </div>
                </article>`;
        }).join("");
    }

    async function loadProducts() {
        status.textContent = "Loading products...";

        try {
            const { data: authData, error: authError } =
                await ggSupabase.auth.getUser();

            if (authError || !authData.user) {
                throw new Error("Please sign in to manage products.");
            }

            const { data: admin, error: adminError } = await ggSupabase
                .from("admin_users")
                .select("role")
                .eq("id", authData.user.id)
                .maybeSingle();

            if (adminError || !admin ||
                !["owner", "staff"].includes(admin.role)) {
                throw new Error("You do not have permission to manage products.");
            }

            const { data, error } = await ggSupabase
                .from("products")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            products = (data || []).map(product => ({
                ...product,
                id: String(product.id),
                name: String(product.name ?? product.Name ?? ""),
                category: String(product.category ?? product.Category ?? ""),
                price: Number(product.price ?? product.Price ?? 0),
                stock: Number(product.stock ?? product.Stock ?? 0),
                image: product.image_url || product.image || "",
                description: String(product.description ?? product.Description ?? "")
            }));

            renderProducts();
            status.textContent = `Loaded ${products.length} product(s).`;

        } catch (error) {
            console.error("Could not load products:", error);
            status.textContent =
                "Could not load products: " + (error.message || "Unknown error");
            list.innerHTML =
                "<p>Please check your admin access and database permissions.</p>";
        }
    }

    function beginEdit(productId) {
        const product = products.find(
            item => String(item.id) === String(productId)
        );

        if (!product) {
            status.textContent = "Product not found. Please reload the product list.";
            return;
        }

        editingProductId = String(product.id);

        field("edit-product-name").value = product.name;
        field("edit-product-category").value = product.category;
        field("edit-product-price").value = product.price;
        field("edit-product-stock").value = product.stock;
        field("edit-product-description").value = product.description;
        field("edit-product-options").value = optionsToText(product.variants);
        field("edit-product-personalisation").value =
            optionsToText(product.customization_fields);
        field("edit-product-image").value = "";

        field("edit-product-image-note").textContent = product.image
            ? "A current image is saved. Choose a new file only if you want to replace it."
            : "This product has no saved image. Choose a file to add one.";

        field("edit-form-title").textContent =
            `Edit: ${product.name || "Unnamed product"}`;

        form.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        status.textContent =
            "Editing product. Make your changes and select Save Changes.";
    }

    function cancelEdit() {
        editingProductId = null;
        form.reset();
        form.hidden = true;
        status.textContent = "Product editing cancelled.";
    }

    list.addEventListener("click", async event => {
        const editButton = event.target.closest("[data-edit-id]");
        const deleteButton = event.target.closest("[data-delete-id]");

        if (editButton) {
            beginEdit(editButton.dataset.editId);
            return;
        }

        if (!deleteButton) return;

        const productId = deleteButton.dataset.deleteId;
        const product = products.find(
            item => String(item.id) === String(productId)
        );

        if (!product) return;

        const confirmed = window.confirm(
            `Remove "${product.name}" from the store? This cannot be undone. Products linked to orders cannot be removed.`
        );

        if (!confirmed) return;

        deleteButton.disabled = true;
        status.textContent =
            `Checking whether ${product.name} can be removed...`;

        try {
            const { data: orderItems, error: orderItemsError } =
                await ggSupabase
                    .from("order_items")
                    .select("id")
                    .eq("product_id", String(product.id))
                    .limit(1);

            if (orderItemsError) throw orderItemsError;

            if (orderItems && orderItems.length > 0) {
                throw new Error(
                    "This product is linked to an order, so it cannot be removed. Set its stock to 0 to stop new purchases for now."
                );
            }

            const { data: deletedProduct, error: deleteError } =
                await ggSupabase
                    .from("products")
                    .delete()
                    .eq("id", product.id)
                    .select("id")
                    .maybeSingle();

            if (deleteError) throw deleteError;

            if (!deletedProduct) {
                throw new Error(
                    "No product was removed. Check the delete permission and try again."
                );
            }

            products = products.filter(
                item => String(item.id) !== String(product.id)
            );

            if (editingProductId === String(product.id)) {
                cancelEdit();
            }

            renderProducts();
            status.textContent = `Removed "${product.name}".`;

        } catch (error) {
            console.error("Could not remove product:", error);
            status.textContent =
                error.message || "Could not remove product.";
            deleteButton.disabled = false;
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (editingProductId === null) {
            status.textContent = "Choose a product to edit first.";
            return;
        }

        const saveButton = form.querySelector('button[type="submit"]');
        const originalText = saveButton.textContent;

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const name = field("edit-product-name").value.trim();
            const category = field("edit-product-category").value.trim();
            const price = Number(field("edit-product-price").value);
            const stock = Number(field("edit-product-stock").value);
            const description =
                field("edit-product-description").value.trim();

            const variants =
                parseOptionFields(field("edit-product-options").value);

            const customizationFields =
                parseOptionFields(field("edit-product-personalisation").value);

            const imageFile = field("edit-product-image").files[0];

            if (!name || !category) {
                throw new Error("Product name and category are required.");
            }

            if (!Number.isFinite(price) || price < 0 ||
                !Number.isInteger(stock) || stock < 0) {
                throw new Error(
                    "Enter a valid price and a whole-number stock quantity of zero or more."
                );
            }

            if (imageFile && !imageFile.type.startsWith("image/")) {
                throw new Error("Please select an image file.");
            }

            if (imageFile && imageFile.size > 5 * 1024 * 1024) {
                throw new Error("Please choose an image smaller than 5 MB.");
            }

            const payload = {
                name,
                category,
                price,
                stock,
                description,
                variants,
                customization_fields: customizationFields
            };

            if (imageFile) {
                const extension = imageFile.name.split(".").pop()
                    .toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

                const imagePath = `${crypto.randomUUID()}.${extension}`;

                const { error: uploadError } = await ggSupabase.storage
                    .from("product-images")
                    .upload(imagePath, imageFile, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: imageFile.type
                    });

                if (uploadError) {
                    throw new Error("Image upload failed: " + uploadError.message);
                }

                const { data: imageData } = ggSupabase.storage
                    .from("product-images")
                    .getPublicUrl(imagePath);

                payload.image = imageData.publicUrl;
                payload.image_url = imageData.publicUrl;
            }

            const { data: savedProduct, error: updateError } =
                await ggSupabase
                    .from("products")
                    .update(payload)
                    .eq("id", editingProductId)
                    .select("*")
                    .maybeSingle();

            if (updateError) throw updateError;

            if (!savedProduct) {
                throw new Error(
                    "No product was updated. Check the admin update permission and try again."
                );
            }

            status.textContent = `Saved changes to "${savedProduct.name}".`;

            editingProductId = null;
            form.reset();
            form.hidden = true;

            await loadProducts();

        } catch (error) {
            console.error("Could not save product changes:", error);
            status.textContent =
                "Could not save changes: " + (error.message || "Unknown error");

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = originalText;
        }
    });

    cancelButton?.addEventListener("click", cancelEdit);
    loadProducts();
});
