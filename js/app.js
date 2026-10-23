// ========================================
// GLAMOR & GRACE - MAIN WEBSITE FUNCTIONS
// ========================================
document.addEventListener("DOMContentLoaded", async () => {
    await productsReady;
    displayProducts();
    setupSearch();
    setupShopFilters();
    updateCartCount();
});

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
    return [];
}
function htmlSafe(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function getProductOptions(product) {
    return asArray(product.variants).map(v => ({
        name: String(v?.name || "").trim(),
        options: Array.isArray(v?.options) ? v.options.map(x => String(x)) : []
    })).filter(v => v.name && v.options.length);
}
function getProductImages(product) {
    return asArray(product.product_images).filter(item => item && item.url);
}
function getVariantStock(product, selected) {
    const entries = asArray(product.variant_stock);
    if (!entries.length) return Number(product.stock || 0);
    const match = entries.find(entry => {
        const opts = entry.options || {};
        return Object.entries(selected || {}).every(([key, value]) => String(opts[key] || "").toLowerCase() === String(value).toLowerCase()) &&
            Object.keys(opts).length === Object.keys(selected || {}).length;
    });
    return match ? Number(match.quantity || 0) : 0;
}
function productHasChoices(product) {
    return getProductOptions(product).length > 0 || asArray(product.customization_fields).length > 0;
}
function createProductCard(product) {
    const available = Number(product.stock || 0) > 0;
    const image = htmlSafe(product.image || "");
    const name = htmlSafe(product.name || "Unnamed Product");
    const category = htmlSafe(product.category || "Uncategorized");
    const button = !available
        ? '<button class="add-to-cart" disabled>Coming Soon</button>'
        : '<a class="add-to-cart" href="product.html?id=' + encodeURIComponent(product.id) + '">View Options</a>';
    return '<article class="product-card"><a href="product.html?id=' + encodeURIComponent(product.id) + '"><div class="product-image-container"><img src="' + image + '" alt="' + name + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-placeholder\')"></div></a><div class="product-info"><div class="product-category">' + category + '</div><a href="product.html?id=' + encodeURIComponent(product.id) + '"><div class="product-name">' + name + '</div></a><div class="product-price">R' + Number(product.price || 0).toFixed(2) + '</div>' + button + '</div></article>';
}
function displayProducts() {
    const specialContainer = document.getElementById("special-products");
    const featuredContainer = document.getElementById("featured-products");
    if (!specialContainer && !featuredContainer) { displayShopProducts(); return; }
    if (specialContainer) {
        const specials = products.filter(p => p.category === "Specials");
        specialContainer.innerHTML = specials.length ? specials.map(createProductCard).join("") : "<p>No specials available yet.</p>";
    }
    if (featuredContainer) {
        const featured = products.filter(p => Number(p.stock) > 0);
        featuredContainer.innerHTML = featured.length ? featured.map(createProductCard).join("") : "<p>Featured products coming soon.</p>";
    }
}
function displayShopProducts() {
    const container = document.getElementById("shop-products");
    const noProducts = document.getElementById("no-products");
    if (!container) return;
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    const search = params.get("search");
    let filtered = [...products];
    if (category) filtered = filtered.filter(p => String(p.category || "").toLowerCase() === category.toLowerCase());
    if (search) {
        const term = search.toLowerCase();
        filtered = filtered.filter(p => [p.name,p.category,p.description].some(v => String(v || "").toLowerCase().includes(term)));
    }
    container.innerHTML = filtered.length ? filtered.map(createProductCard).join("") : "";
    if (noProducts) noProducts.style.display = filtered.length ? "none" : "block";
}
function setupShopFilters() {
    document.querySelectorAll(".filter-button").forEach(button => button.addEventListener("click", () => {
        const category = button.dataset.category;
        window.location.href = category === "All" ? "shop.html" : "shop.html?category=" + encodeURIComponent(category);
    }));
}
function setupSearch() {
    const input = document.getElementById("search-input");
    const button = document.getElementById("search-button");
    if (!input) return;
    const search = () => {
        const term = input.value.trim();
        window.location.href = term ? "shop.html?search=" + encodeURIComponent(term) : "shop.html";
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") search(); });
    if (button) button.addEventListener("click", search);
}
function displayProductPage() {
    const container = document.getElementById("product-details");
    if (!container) return;
    const productId = new URLSearchParams(window.location.search).get("id");
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) {
        container.innerHTML = '<div class="product-not-found"><h2>Product not found</h2><p>Sorry, we couldn\'t find this product.</p><a href="shop.html" class="primary-button">Back to Shop</a></div>';
        return;
    }
    const variants = getProductOptions(product);
    const customFields = asArray(product.customization_fields);
    const images = getProductImages(product);
    const allImages = images.length ? images : [{url: product.image || "", color: "", alt: product.name}];
    const colorDefinition = variants.find(v => /^(colour|color)$/i.test(v.name));
    const available = Number(product.stock || 0) > 0;
    const optionControls = variants.map((variant, index) => {
        const isColor = /^(colour|color)$/i.test(variant.name);
        const controls = isColor
            ? '<div class="gg-colour-swatches" role="group" aria-label="Choose ' + htmlSafe(variant.name) + '">' + variant.options.map((value, i) =>
                '<button type="button" class="gg-choice-button gg-colour-choice" data-option-index="' + index + '" data-option-value="' + htmlSafe(value) + '" aria-pressed="' + (i === 0) + '">' + htmlSafe(value) + '</button>'
              ).join("") + '</div>'
            : '<select class="gg-product-option" data-option-index="' + index + '" required><option value="">Choose ' + htmlSafe(variant.name) + '</option>' + variant.options.map(value => '<option value="' + htmlSafe(value) + '">' + htmlSafe(value) + '</option>').join("") + '</select>';
        return '<div class="gg-product-field"><label>' + htmlSafe(variant.name) + '</label>' + controls + '</div>';
    }).join("");
    const personalisation = customFields.map((field, index) => {
        const values = Array.isArray(field.options) ? field.options : [];
        const name = String(field.name || "").trim();
        if (!name) return "";
        const freeText = !values.length || /^(name|message|custom message)$/i.test(name) && values.length === 0;
        return '<div class="gg-product-field gg-personalisation-field"><label for="gg-personal-' + index + '">' + htmlSafe(name) + (freeText ? ' (optional)' : '') + '</label>' +
            (freeText
                ? '<input id="gg-personal-' + index + '" class="gg-personalisation" data-field-name="' + htmlSafe(name) + '" type="text" maxlength="100" placeholder="Enter ' + htmlSafe(name.toLowerCase()) + '">'
                : '<select id="gg-personal-' + index + '" class="gg-personalisation" data-field-name="' + htmlSafe(name) + '"><option value="">Choose ' + htmlSafe(name) + '</option>' + values.map(v => '<option value="' + htmlSafe(v) + '">' + htmlSafe(v) + '</option>').join("") + '</select>') +
            '</div>';
    }).join("");
    container.innerHTML =
        '<div class="product-detail-image"><img id="gg-main-product-image" src="' + htmlSafe(allImages[0].url) + '" alt="' + htmlSafe(product.name) + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-placeholder\')"><div id="gg-product-thumbnails" class="gg-product-thumbnails">' +
        allImages.map((img, i) => '<button type="button" class="gg-thumb" data-image-index="' + i + '" aria-label="View product photo ' + (i + 1) + '"><img src="' + htmlSafe(img.url) + '" alt="' + htmlSafe(img.alt || product.name) + '"></button>').join("") +
        '</div></div><div class="product-detail-info"><p class="product-category">' + htmlSafe(product.category) + '</p><h1>' + htmlSafe(product.name) + '</h1><p class="product-detail-price">R' + Number(product.price || 0).toFixed(2) + '</p><p class="product-description">' + htmlSafe(product.description || "") + '</p><p class="product-availability">' + (available ? "✓ In Stock" : "Coming Soon") + '</p><p class="delivery-note">📦 Estimated delivery: 14-21 business days</p>' +
        optionControls + personalisation + '<p id="gg-selected-stock" class="product-availability"></p>' +
        (available ? '<button id="gg-add-product-to-cart" type="button" class="primary-button">Add to Cart</button>' : '<button class="primary-button" disabled>Coming Soon</button>') +
        '<p id="gg-product-status" role="status" aria-live="polite"></p><br><a href="shop.html" class="back-to-shop">← Continue Shopping</a></div>';

    const selected = {};
    const colorName = colorDefinition ? colorDefinition.name : "";
    if (colorDefinition && colorDefinition.options.length) selected[colorName] = colorDefinition.options[0];
    function setGalleryForColour(colour) {
        const matching = images.filter(img => String(img.color || img.colour || "").toLowerCase() === String(colour || "").toLowerCase());
        const chosen = matching.length ? matching : allImages.filter(img => !img.color);
        const display = chosen.length ? chosen : allImages;
        const main = document.getElementById("gg-main-product-image");
        main.src = display[0].url;
        main.alt = display[0].alt || product.name;
        const thumbs = document.getElementById("gg-product-thumbnails");
        thumbs.innerHTML = display.map((img, i) => '<button type="button" class="gg-thumb" data-image-url="' + htmlSafe(img.url) + '" aria-label="View photo ' + (i + 1) + '"><img src="' + htmlSafe(img.url) + '" alt="' + htmlSafe(img.alt || product.name) + '"></button>').join("");
    }
    container.querySelectorAll(".gg-colour-choice").forEach(button => button.addEventListener("click", () => {
        const index = Number(button.dataset.optionIndex);
        const variant = variants[index];
        selected[variant.name] = button.dataset.optionValue;
        container.querySelectorAll('.gg-colour-choice[data-option-index="' + index + '"]').forEach(b => b.setAttribute("aria-pressed", String(b === button)));
        setGalleryForColour(selected[variant.name]);
        updateAvailableStock();
    }));
    container.querySelectorAll(".gg-product-option").forEach(select => select.addEventListener("change", () => {
        const variant = variants[Number(select.dataset.optionIndex)];
        if (select.value) selected[variant.name] = select.value; else delete selected[variant.name];
        updateAvailableStock();
    }));
    container.querySelectorAll(".gg-personalisation").forEach(input => input.addEventListener("change", () => {}));
    container.querySelector("#gg-product-thumbnails").addEventListener("click", event => {
        const button = event.target.closest("[data-image-url]");
        if (button) document.getElementById("gg-main-product-image").src = button.dataset.imageUrl;
        const first = event.target.closest("[data-image-index]");
        if (first) {
            const img = allImages[Number(first.dataset.imageIndex)];
            if (img) document.getElementById("gg-main-product-image").src = img.url;
        }
    });
    function updateAvailableStock() {
        const stockEl = document.getElementById("gg-selected-stock");
        if (asArray(product.variant_stock).length && Object.keys(selected).length === variants.length) {
            const qty = getVariantStock(product, selected);
            stockEl.textContent = qty > 0 ? qty + " available for this combination" : "This size/colour combination is currently unavailable.";
        } else if (Number(product.stock) > 0) {
            stockEl.textContent = "Available stock: " + product.stock;
        } else stockEl.textContent = "Currently unavailable";
    }
    updateAvailableStock();
    const addButton = document.getElementById("gg-add-product-to-cart");
    if (addButton) addButton.addEventListener("click", () => {
        const status = document.getElementById("gg-product-status");
        const requiredMissing = variants.filter(v => !selected[v.name]);
        if (requiredMissing.length) {
            status.textContent = "Please choose: " + requiredMissing.map(v => v.name).join(", ") + ".";
            return;
        }
        const custom = {};
        let missing = false;
        container.querySelectorAll(".gg-personalisation").forEach(input => {
            const value = input.value.trim();
            if (value) custom[input.dataset.fieldName] = value;
        });
        if (missing) return;
        const currentStock = getVariantStock(product, selected);
        if (asArray(product.variant_stock).length && currentStock <= 0) {
            status.textContent = "Sorry, that size/colour combination is out of stock.";
            return;
        }
        addToCart(String(product.id), {...selected}, custom);
        status.textContent = "Added to cart. You can choose another colour and size to add another item.";
    });
}
document.addEventListener("DOMContentLoaded", async () => { await productsReady; displayProductPage(); });

// Order status
function setupOrderTracking() {
    const form = document.getElementById("order-search-form");
    const result = document.getElementById("order-result");
    if (!form || !result) return;
    form.addEventListener("submit", event => {
        event.preventDefault();
        const orderNumber = document.getElementById("order-number").value.trim();
        if (!orderNumber) return;
        result.innerHTML = '<div class="order-status-card"><p class="section-label">ORDER ' + htmlSafe(orderNumber) + '</p><h2>Order Status</h2><p>Payment Pending — waiting for payment confirmation.</p></div>';
    });
}
document.addEventListener("DOMContentLoaded", setupOrderTracking);
document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".menu-button");
    const mobileMenu = document.querySelector(".mobile-menu");
    if (!menuButton || !mobileMenu) return;
    menuButton.addEventListener("click", () => mobileMenu.classList.toggle("open"));
    mobileMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => mobileMenu.classList.remove("open")));
});