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
    const price = Number(product.price || 0);
    const name = ggHtmlSafe(product.name || "Unnamed Product");
    const category = ggHtmlSafe(product.category || "Uncategorized");
    const image = ggHtmlSafe(product.image || "");
    const hasChoices = ggProductOptions(product).length > 0 || ggAsArray(product.customization_fields).length > 0;
    const button = !available
        ? '<button class="add-to-cart" disabled>Coming Soon</button>'
        : hasChoices
            ? '<a class="add-to-cart" href="product.html?id=' + encodeURIComponent(product.id) + '">View Options</a>'
            : '<button class="add-to-cart" onclick="addToCart(\'' + String(product.id).replace(/'/g, "\\'") + '\')">Add to Cart</button>';
    return '<article class="product-card"><a href="product.html?id=' + encodeURIComponent(product.id) + '"><div class="product-image-container"><img src="' + image + '" alt="' + name + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-placeholder\')"></div></a><div class="product-info"><div class="product-category">' + category + '</div><a href="product.html?id=' + encodeURIComponent(product.id) + '"><div class="product-name">' + name + '</div></a><div class="product-price">R' + price.toFixed(2) + '</div>' + button + '</div></article>';
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
        filteredProducts.filter(
            product =>
                (product.category || "").toLowerCase() ===
                category.toLowerCase()
        );
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
        container.innerHTML = '<div class="product-not-found"><h2>Product not found</h2><p>Sorry, we couldn\\'t find this product.</p><a href="shop.html" class="primary-button">Back to Shop</a></div>';
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
        const freeText = !values.length || /^(name|message|custom message)$/i.test(name) && values.length === 0;
        return '<div class="gg-product-field gg-personalisation-field"><label for="gg-personal-' + index + '">' + ggHtmlSafe(name) + (freeText ? ' (optional)' : '') + '</label>' +
            (freeText
                ? '<input id="gg-personal-' + index + '" class="gg-personalisation" data-field-name="' + ggHtmlSafe(name) + '" type="text" maxlength="100" placeholder="Enter ' + ggHtmlSafe(name.toLowerCase()) + '">'
                : '<select id="gg-personal-' + index + '" class="gg-personalisation" data-field-name="' + ggHtmlSafe(name) + '"><option value="">Choose ' + ggHtmlSafe(name) + '</option>' + values.map(v => '<option value="' + ggHtmlSafe(v) + '">' + ggHtmlSafe(v) + '</option>').join("") + '</select>') +
            '</div>';
    }).join("");

    container.innerHTML =
        '<div class="product-detail-image"><img id="gg-main-product-image" src="' + ggHtmlSafe(allImages[0].url) + '" alt="' + ggHtmlSafe(product.name) + '" onerror="this.style.display=\\'none\\';this.parentElement.classList.add(\\'image-placeholder\\')"><div id="gg-product-thumbnails" class="gg-product-thumbnails"></div></div>' +
        '<div class="product-detail-info"><p class="product-category">' + ggHtmlSafe(product.category) + '</p><h1>' + ggHtmlSafe(product.name) + '</h1><p class="product-detail-price">R' + Number(product.price || 0).toFixed(2) + '</p><p class="product-description">' + ggHtmlSafe(product.description || "") + '</p><p class="product-availability">' + (available ? "✓ In Stock" : "Coming Soon") + '</p><p class="delivery-note">📦 Estimated delivery: 14-21 business days</p>' +
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
    if (addButton) addButton.addEventListener("click", () => {
        const status = document.getElementById("gg-product-status");
        const missing = variants.filter(v => !selected[v.name]);
        if (missing.length) { status.textContent = "Please choose: " + missing.map(v => v.name).join(", ") + "."; return; }
        const custom = {};
        container.querySelectorAll(".gg-personalisation").forEach(input => {
            const value = input.value.trim();
            if (value) custom[input.dataset.fieldName] = value;
        });
        if (ggAsArray(product.variant_stock).length && ggStockForOptions(product, selected) <= 0) {
            status.textContent = "Sorry, that size/colour combination is out of stock."; return;
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

    const form =
        document.getElementById("order-search-form");

    const result =
        document.getElementById("order-result");

    if (!form || !result) {
        return;
    }


    form.addEventListener("submit", event => {

        event.preventDefault();


        const orderNumber =
            document.getElementById("order-number")
                .value
                .trim();


        if (!orderNumber) {
            return;
        }


        result.innerHTML = `

            <div class="order-status-card">

                <p class="section-label">
                    ORDER ${orderNumber}
                </p>

                <h2>
                    Order Status
                </h2>


                <div class="order-timeline">

                    <div class="status-step active">
                        <span>✓</span>
                        <div>
                            <strong>Payment Pending</strong>
                            <small>
                                Waiting for payment confirmation
                            </small>
                        </div>
                    </div>


                    <div class="status-step">
                        <span>2</span>
                        <div>
                            <strong>Paid / Confirmed</strong>
                            <small>
                                Payment confirmed
                            </small>
                        </div>
                    </div>


                    <div class="status-step">
                        <span>3</span>
                        <div>
                            <strong>Processing</strong>
                            <small>
                                Your order is being prepared
                            </small>
                        </div>
                    </div>


                    <div class="status-step">
                        <span>4</span>
                        <div>
                            <strong>Packed</strong>
                            <small>
                                Your order has been packed
                            </small>
                        </div>
                    </div>


                    <div class="status-step">
                        <span>5</span>
                        <div>
                            <strong>Shipped</strong>
                            <small>
                                Your order is on its way
                            </small>
                        </div>
                    </div>


                    <div class="status-step">
                        <span>6</span>
                        <div>
                            <strong>Tracking Added</strong>
                            <small>
                                Tracking information available
                            </small>
                        </div>
                    </div>


                    <div class="status-step">
                        <span>7</span>
                        <div>
                            <strong>Delivered</strong>
                            <small>
                                Order delivered
                            </small>
                        </div>
                    </div>

                </div>

            </div>

        `;

    });
}


// ========================================
// LOAD ORDER TRACKING
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupOrderTracking();
    }
);
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
