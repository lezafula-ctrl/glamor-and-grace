// ========================================
// GLAMOR & GRACE - MAIN WEBSITE FUNCTIONS
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await productsReady;

        displayProducts();
        setupSearch();
        setupShopFilters();
        updateCartCount();
    }
);

// ========================================

function ggAsArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
    return [];
}
function ggHtmlSafe(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function ggProductOptions(product) {
    return ggAsArray(product.variants).map(v => ({
        name: String(v?.name || "").trim(),
        options: Array.isArray(v?.options) ? v.options.map(x => String(x)) : []
    })).filter(v => v.name && v.options.length);
}
function ggProductImages(product) {
    return ggAsArray(product.product_images).filter(item => item && item.url);
}
function ggPriceForOptions(product, selected) {
    const chosen = selected || {};
    const variants = ggAsArray(product.variants);
    const allPrices = [];
    for (const variant of variants) {
        const prices = variant && variant.prices && typeof variant.prices === "object" ? variant.prices : {};
        Object.values(prices).forEach(value => {
            const amount = Number(value);
            if (Number.isFinite(amount)) allPrices.push(amount);
        });
        const value = chosen[variant.name];
        if (value !== undefined) {
            const match = Object.keys(prices).find(key => key.toLowerCase() === String(value).toLowerCase());
            if (match) return Number(prices[match]);
        }
    }
    return allPrices.length ? Math.min(...allPrices) : Number(product.price || 0);
}

function ggStockForOptions(product, selected) {
    const entries = ggAsArray(product.variant_stock);
    if (!entries.length) return Number(product.stock || 0);
    const match = entries.find(entry => {
        const opts = entry.options || {};
        return Object.entries(opts).every(([key, value]) => String(value).toLowerCase() === String((selected || {})[key] || "").toLowerCase()) &&
            Object.keys(opts).length === Object.keys(selected || {}).length;
    });
    return match ? Number(match.quantity || 0) : 0;
}

// ========================================
// PRODUCT CARD
// ========================================

function createProductCard(product) {
    const available = Number(product.stock || 0) > 0;
    const originalPrice = ggPriceForOptions(product, {});
    const discount = window.ggPromotionDiscount ? window.ggPromotionDiscount(product.category, product.name) : 0;
    const price = window.ggSalePrice ? window.ggSalePrice(product.category, originalPrice, product.name) : originalPrice;
    const hasOptionPrices = ggAsArray(product.variants).some(v => v && v.prices && Object.keys(v.prices).length);
    const priceMarkup = discount > 0
        ? (hasOptionPrices ? 'From ' : '') + '<span class="gg-sale-badge">-' + (Number.isInteger(Number(discount)) ? Number(discount) : Number(discount).toFixed(1)) + '%</span><span class="gg-original-price">R' + Math.round(originalPrice) + '</span><strong class="gg-sale-price">R' + Math.round(price) + '</strong>'
        : (hasOptionPrices ? 'From R' : 'R') + Math.round(originalPrice);
    const name = ggHtmlSafe(product.name || "Unnamed Product");
    const category = ggHtmlSafe(product.category || "Uncategorized");
    const stockBadge = available && Number(product.stock || 0) <= 30 ? '<span class="gg-stock-badge">Limited Stock</span>' : "";
    const image = ggHtmlSafe(product.image || "");
    const hasChoices = ggProductOptions(product).length > 0 || ggAsArray(product.customization_fields).length > 0;
    const button = !available
        ? '<button class="add-to-cart" disabled>Coming Soon</button>'
        : hasChoices
            ? '<a class="add-to-cart" href="product.html?id=' + encodeURIComponent(product.id) + '">View Options</a>'
            : '<button class="add-to-cart" onclick="addToCart(\'' + String(product.id).replace(/'/g, "\'") + '\')">Add to Cart</button>';
    return '<article class="product-card"><a href="product.html?id=' + encodeURIComponent(product.id) + '"><div class="product-image-container"><img src="' + image + '" alt="' + name + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-placeholder\')"></div></a><div class="product-info"><div class="product-category">' + category + '</div>' + stockBadge + '<a href="product.html?id=' + encodeURIComponent(product.id) + '"><div class="product-name">' + name + '</div></a><div class="product-price">' + priceMarkup + '</div>' + button + '</div></article>';
}


// HOMEPAGE PRODUCTS
// ========================================

function displayProducts() {

    const specialContainer =
        document.getElementById("special-products");

    const featuredContainer =
        document.getElementById("featured-products");

    if (!specialContainer && !featuredContainer) {
        displayShopProducts();
        return;
    }

    if (specialContainer) {
    const specials = products.filter(
        product => product.category === "Specials"
    );

    specialContainer.innerHTML =
        specials.length
        ? specials.map(createProductCard).join("")
        : "<p>No specials available yet.</p>";
}


    if (featuredContainer) {

    const featuredProducts =
        products.filter(product => product.stock > 0);

    featuredContainer.innerHTML =
        featuredProducts.length
        ? featuredProducts.map(createProductCard).join("")
        : "<p>Featured products coming soon.</p>";
}
}


// ========================================
// SHOP PAGE
// ========================================

function displayShopProducts() {

    const shopContainer =
        document.getElementById("shop-products");

    const noProducts =
        document.getElementById("no-products");

    if (!shopContainer) {
        return;
    }

    const params = new URLSearchParams(window.location.search);

    const category =
        params.get("category");

    const search =
        params.get("search");
    
let filteredProducts = [...products];

if (category) {
    filteredProducts =
        filteredProducts.filter(product => {
            const normaliseCategory = value => String(value || "")
                .toLowerCase()
                .replace(/&/g, "and")
                .replace(/[^a-z0-9]+/g, " ")
                .trim()
                .replace(/\s+/g, " ");
            return normaliseCategory(product.category) === normaliseCategory(category);
        });
}

    if (search) {

    const searchTerm =
        search.toLowerCase();

    filteredProducts =
        filteredProducts.filter(product => {

            const name =
                (product.name || "").toLowerCase();

            const category =
                (product.category || "").toLowerCase();

            const description =
                (product.description || "").toLowerCase();

            return (
                name.includes(searchTerm) ||
                category.includes(searchTerm) ||
                description.includes(searchTerm)
            );

        });
}

    shopContainer.innerHTML =
        filteredProducts.length
        ? filteredProducts.map(createProductCard).join("")
        : "";

    if (noProducts) {
        noProducts.style.display =
            filteredProducts.length ? "none" : "block";
    }
}


// ========================================
// SHOP FILTER BUTTONS
// ========================================

function setupShopFilters() {

    const filterButtons =
        document.querySelectorAll(".filter-button");

    if (!filterButtons.length) {
        return;
    }

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            const category =
                button.dataset.category;

            if (category === "All") {
                window.location.href = "shop.html";
            } else {
                window.location.href =
                    `shop.html?category=${encodeURIComponent(category)}`;
            }

        });

    });
}


// ========================================
// SEARCH
// ========================================

function setupSearch() {

    const searchInput =
        document.getElementById("search-input");

    const searchButton =
        document.getElementById("search-button");

    if (!searchInput) {
        return;
    }

    function performSearch() {

        const searchTerm =
            searchInput.value.trim();

        if (!searchTerm) {
            window.location.href = "shop.html";
            return;
        }

        window.location.href =
            `shop.html?search=${encodeURIComponent(searchTerm)}`;
    }

    searchInput.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            performSearch();
        }

    });

    if (searchButton) {
        searchButton.addEventListener(
            "click",
            performSearch
        );
    }
}
// ========================================
// PRODUCT PAGE
// ========================================

function displayProductPage() {
    const container = document.getElementById("product-details");
    if (!container) return;
    const productId = new URLSearchParams(window.location.search).get("id");
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) {
        container.innerHTML = '<div class="product-not-found"><h2>Product not found</h2><p>Sorry, we couldn\'t find this product.</p><a href="shop.html" class="primary-button">Back to Shop</a></div>';
        return;
    }
    const variants = ggProductOptions(product);
    const customFields = ggAsArray(product.customization_fields);
    const images = ggProductImages(product);
    const allImages = images.length ? images : [{url: product.image || "", color: "", alt: product.name}];
    const colorDefinition = variants.find(v => /^(colour|color)$/i.test(v.name));
    const available = Number(product.stock || 0) > 0;
    const selected = {};
    if (colorDefinition && colorDefinition.options.length) selected[colorDefinition.name] = colorDefinition.options[0];

    const optionControls = variants.map((variant, index) => {
        const isColor = /^(colour|color)$/i.test(variant.name);
        const controls = isColor
            ? '<div class="gg-colour-swatches" role="group" aria-label="Choose ' + ggHtmlSafe(variant.name) + '">' + variant.options.map((value, i) =>
                '<button type="button" class="gg-choice-button gg-colour-choice" data-option-index="' + index + '" data-option-value="' + ggHtmlSafe(value) + '" aria-pressed="' + (i === 0) + '">' + ggHtmlSafe(value) + '</button>'
              ).join("") + '</div>'
            : '<select class="gg-product-option" data-option-index="' + index + '" required><option value="">Choose ' + ggHtmlSafe(variant.name) + '</option>' + variant.options.map(value => '<option value="' + ggHtmlSafe(value) + '">' + ggHtmlSafe(value) + '</option>').join("") + '</select>';
        return '<div class="gg-product-field"><label>' + ggHtmlSafe(variant.name) + '</label>' + controls + '</div>';
    }).join("");

    const personalisation = customFields.map((field, index) => {
        const values = Array.isArray(field.options) ? field.options : [];
        const name = String(field.name || "").trim();
        if (!name) return "";
        const isPhotoUpload = /^customer photo upload$/i.test(name);
        const freeText = !isPhotoUpload && (!values.length || /^(name|message|custom message)$/i.test(name) && values.length === 0);
        return '<div class="gg-product-field gg-personalisation-field"><label for="gg-personal-' + index + '">' + ggHtmlSafe(name) + (freeText ? ' (optional)' : '') + '</label>' +
            (isPhotoUpload
                ? '<input id="gg-personal-' + index + '" class="gg-customer-photo-upload" data-field-name="' + ggHtmlSafe(name) + '" type="file" accept="image/jpeg,image/png,image/webp,image/heic"><small>Please upload a JPG, PNG, WEBP or HEIC image (max 5 MB).</small>'
                : freeText
                    ? '<input id="gg-personal-' + index + '" class="gg-personalisation" data-field-name="' + ggHtmlSafe(name) + '" type="text" maxlength="100" placeholder="Enter ' + ggHtmlSafe(name.toLowerCase()) + '">'
                    : '<select id="gg-personal-' + index + '" class="gg-personalisation" data-field-name="' + ggHtmlSafe(name) + '"><option value="">Choose ' + ggHtmlSafe(name) + '</option>' + values.map(v => '<option value="' + ggHtmlSafe(v) + '">' + ggHtmlSafe(v) + '</option>').join("") + '</select>') +
            '</div>';
    }).join("");

    container.innerHTML =
        '<div class="product-detail-image"><img id="gg-main-product-image" src="' + ggHtmlSafe(allImages[0].url) + '" alt="' + ggHtmlSafe(product.name) + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-placeholder\')"><div id="gg-product-thumbnails" class="gg-product-thumbnails"></div></div>' +
        '<div class="product-detail-info"><p class="product-category">' + ggHtmlSafe(product.category) + '</p><h1>' + ggHtmlSafe(product.name) + '</h1><p id="gg-live-product-price" class="product-detail-price">R' + Math.round(Number(product.price || 0)) + '</p><p class="product-description">' + ggHtmlSafe(product.description || "") + '</p><p class="product-availability">' + (available ? (Number(product.stock || 0) <= 10 ? '✓ Only ' + Number(product.stock) + ' left in stock' : Number(product.stock || 0) <= 30 ? '✓ Limited stock available' : '✓ In Stock') : "Coming Soon") + '</p><p class="delivery-note">📦 Estimated delivery: 14-21 business days</p>' +
        optionControls + personalisation + '<p id="gg-selected-stock" class="product-availability"></p>' +
        (available ? '<button id="gg-add-product-to-cart" type="button" class="primary-button">Add to Cart</button>' : '<button class="primary-button" disabled>Coming Soon</button>') +
        '<p id="gg-product-status" role="status" aria-live="polite"></p><br><a href="shop.html" class="back-to-shop">← Continue Shopping</a></div>';

    function setGalleryForColour(colour) {
        const matching = images.filter(img => String(img.color || img.colour || "").toLowerCase() === String(colour || "").toLowerCase());
        const fallback = images.filter(img => !img.color && !img.colour);
        const display = matching.length ? matching : fallback.length ? fallback : allImages;
        const main = document.getElementById("gg-main-product-image");
        main.src = display[0].url;
        main.alt = display[0].alt || product.name;
        document.getElementById("gg-product-thumbnails").innerHTML = display.map((img, i) =>
            '<button type="button" class="gg-thumb" data-image-url="' + ggHtmlSafe(img.url) + '" aria-label="View photo ' + (i + 1) + '"><img src="' + ggHtmlSafe(img.url) + '" alt="' + ggHtmlSafe(img.alt || product.name) + '"></button>'
        ).join("");
    }
    function updateAvailableStock() {
        const livePrice = document.getElementById("gg-live-product-price");
        if (livePrice) {
            const original = ggPriceForOptions(product, selected);
            const discount = window.ggPromotionDiscount ? window.ggPromotionDiscount(product.category, product.name) : 0;
            const salePrice = window.ggSalePrice ? window.ggSalePrice(product.category, original, product.name) : original;
            livePrice.innerHTML = discount > 0
                ? '<span class="gg-original-price">R' + Math.round(original) + '</span> <strong class="gg-sale-price">R' + Math.round(salePrice) + '</strong> <span class="gg-sale-badge">-' + (Number.isInteger(Number(discount)) ? Number(discount) : Number(discount).toFixed(1)) + '%</span>'
                : 'R' + Math.round(original);
        }
        const stockEl = document.getElementById("gg-selected-stock");
        if (ggAsArray(product.variant_stock).length && Object.keys(selected).length === variants.length) {
            const qty = ggStockForOptions(product, selected);
            stockEl.textContent = qty > 0 ? qty + " available for this combination" : "This size/colour combination is currently unavailable.";
        } else {
            stockEl.textContent = Number(product.stock) > 0 ? "Available stock: " + product.stock : "Currently unavailable";
        }
    }
    container.querySelectorAll(".gg-colour-choice").forEach(button => button.addEventListener("click", () => {
        const variant = variants[Number(button.dataset.optionIndex)];
        selected[variant.name] = button.dataset.optionValue;
        container.querySelectorAll('.gg-colour-choice[data-option-index="' + button.dataset.optionIndex + '"]').forEach(b => b.setAttribute("aria-pressed", String(b === button)));
        setGalleryForColour(selected[variant.name]);
        updateAvailableStock();
    }));
    container.querySelectorAll(".gg-product-option").forEach(select => select.addEventListener("change", () => {
        const variant = variants[Number(select.dataset.optionIndex)];
        if (select.value) selected[variant.name] = select.value; else delete selected[variant.name];
        updateAvailableStock();
    }));
    container.querySelector("#gg-product-thumbnails").addEventListener("click", event => {
        const button = event.target.closest("[data-image-url]");
        if (button) document.getElementById("gg-main-product-image").src = button.dataset.imageUrl;
    });
    if (colorDefinition && selected[colorDefinition.name]) setGalleryForColour(selected[colorDefinition.name]);
    else setGalleryForColour("");
    updateAvailableStock();

    const addButton = document.getElementById("gg-add-product-to-cart");
    if (addButton) addButton.addEventListener("click", async () => {
        const status = document.getElementById("gg-product-status");
        const missing = variants.filter(v => !selected[v.name]);
        if (missing.length) { status.textContent = "Please choose: " + missing.map(v => v.name).join(", ") + "."; return; }
        const custom = {};
        container.querySelectorAll(".gg-personalisation").forEach(input => {
            const value = input.value.trim();
            if (value) custom[input.dataset.fieldName] = value;
        });
        const photoInput = container.querySelector(".gg-customer-photo-upload");
        const photoFile = photoInput && photoInput.files ? photoInput.files[0] : null;
        if (photoInput && !photoFile) {
            status.textContent = "Please upload the picture for your personalised photo frame.";
            return;
        }
        if (photoFile) {
            if (!photoFile.type.startsWith("image/") || !["image/jpeg","image/png","image/webp","image/heic"].includes(photoFile.type)) {
                status.textContent = "Please choose a JPG, PNG, WEBP or HEIC image."; return;
            }
            if (photoFile.size > 5 * 1024 * 1024) {
                status.textContent = "Please choose an image smaller than 5 MB."; return;
            }
        }
        if (ggAsArray(product.variant_stock).length && ggStockForOptions(product, selected) <= 0) {
            status.textContent = "Sorry, that size/colour combination is out of stock."; return;
        }
        if (photoFile) {
            addButton.disabled = true;
            addButton.textContent = "Uploading photo...";
            try {
                const extension = photoFile.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
                const path = "customer-photos/" + crypto.randomUUID() + "." + extension;
                const { error: uploadError } = await ggSupabase.storage.from("customer-personalisation").upload(path, photoFile, {
                    cacheControl: "3600", upsert: false, contentType: photoFile.type
                });
                if (uploadError) throw uploadError;
                custom["Customer Photo Upload"] = path;
            } catch (error) {
                console.error("Customer photo upload failed:", error);
                status.textContent = "We couldn't upload that picture. Please try again.";
                return;
            } finally {
                addButton.disabled = false;
                addButton.textContent = "Add to Cart";
            }
        }
        addToCart(String(product.id), {...selected}, custom);
        status.textContent = "Added to cart. Choose another colour or size to add another item.";
    });
}

// Automatically load product page when needed

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await productsReady;

        displayProductPage();
    }
);
// ========================================
// ORDER STATUS
// ========================================

function setupOrderTracking() {
    const form = document.getElementById("order-search-form");
    const result = document.getElementById("order-result");
    const input = document.getElementById("order-number");
    if (!form || !result || !input) return;

    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
    const pretty = value => String(value || "pending").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const reference = input.value.trim().toUpperCase();
        if (!/^GG-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(reference)) {
            result.innerHTML = '<div class="tracking-message tracking-error"><strong>Please check your order reference.</strong><p>Use the full GG- reference shown on your order confirmation.</p></div>';
            return;
        }
        const button = form.querySelector('button[type="submit"]');
        if (button) { button.disabled = true; button.textContent = "Looking up order…"; }
        result.innerHTML = '<div class="tracking-loading">Looking up your order…</div>';
        try {
            const { data, error } = await ggSupabase.rpc("track_store_order", { p_reference: reference });
            if (error) throw error;
            if (!data) {
                result.innerHTML = '<div class="tracking-message tracking-error"><strong>We couldn’t find that order.</strong><p>Please check the reference and try again.</p></div>';
                return;
            }
            const payment = String(data.payment_status || "pending").toLowerCase();
            const order = String(data.order_status || "pending").toLowerCase();
            const stages = [
                { key: "payment", title: "Payment confirmed", detail: "We have confirmed your payment." },
                { key: "processing", title: "Being prepared", detail: "Your order is being prepared." },
                { key: "packed", title: "Packed", detail: "Your parcel has been packed." },
                { key: "shipped", title: "On its way", detail: "Your parcel has been handed to the delivery service." },
                { key: "delivered", title: "Delivered", detail: "Your order has been delivered." }
            ];
            const orderStages = ["pending", "processing", "packed", "shipped", "delivered"];
            const currentIndex = orderStages.indexOf(order);
            const paymentDone = payment === "paid";
            const activeStage = paymentDone ? Math.min(4, Math.max(1, currentIndex + 1)) : 0;
            const method = pretty(data.delivery_method);
            const date = data.created_at ? new Date(data.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "Date unavailable";
            const steps = stages.map((step, index) => {
                const completed = index === 0 ? paymentDone : (currentIndex >= index);
                const active = !completed && index === activeStage;
                return '<div class="tracking-step ' + (completed ? "completed" : (active ? "active" : "")) + '"><span class="tracking-step-icon">' + (completed ? "✓" : (index + 1)) + '</span><div><strong>' + step.title + '</strong><small>' + (completed ? step.detail : (active ? "This is your current stage." : "Coming up next.")) + '</small></div></div>';
            }).join("");
            const paymentLabel = paymentDone ? "Paid" : "Payment pending";
            const orderLabel = pretty(order);
            result.innerHTML = '<article class="tracking-result-card">' +
                '<div class="tracking-result-top"><div><span class="tracking-overline">ORDER REFERENCE</span><h2>' + escapeHtml(reference) + '</h2><small>Placed ' + escapeHtml(date) + '</small></div><span class="tracking-status-pill ' + (paymentDone ? "is-paid" : "is-pending") + '">' + escapeHtml(paymentLabel) + '</span></div>' +
                '<div class="tracking-summary-grid"><div><span>Order status</span><strong>' + escapeHtml(orderLabel) + '</strong></div><div><span>Delivery method</span><strong>' + escapeHtml(method) + '</strong></div></div>' +
                '<h3 class="tracking-progress-title">Your order progress</h3><div class="tracking-timeline">' + steps + '</div>' +
                '<p class="tracking-footnote">We’ll update this page as your order moves through each stage. If you need help, please contact us on WhatsApp.</p>' +
                '</article>';
        } catch (error) {
            console.error("Order tracking lookup failed:", error);
            result.innerHTML = '<div class="tracking-message tracking-error"><strong>We couldn’t load your order right now.</strong><p>Please try again in a moment.</p></div>';
        } finally {
            if (button) { button.disabled = false; button.textContent = "Track Order"; }
        }
    });
}


// ========================================
// LOAD ORDER TRACKING
// ========================================

document.addEventListener("DOMContentLoaded", setupOrderTracking);
// ========================================
// MOBILE MENU
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    const menuButton =
        document.querySelector(".menu-button");

    const mobileMenu =
        document.querySelector(".mobile-menu");

    if (!menuButton || !mobileMenu) {
        return;
    }

    menuButton.addEventListener("click", () => {

        mobileMenu.classList.toggle("open");

    });

    mobileMenu.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            mobileMenu.classList.remove("open");

        });

    });

});
