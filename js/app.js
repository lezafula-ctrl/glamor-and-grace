// ========================================
// GLAMOR & GRACE - MAIN WEBSITE FUNCTIONS
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    displayProducts();
    setupSearch();
    setupShopFilters();
    updateCartCount();
});


// ========================================
// PRODUCT CARD
// ========================================

function createProductCard(product) {

    const available = product.stock > 0;

    return `
        <article class="product-card">

            <a href="product.html?id=${product.id}">
                <div class="product-image-container">

                    <img
                        src="${product.image}"
                        alt="${product.name}"
                        onerror="this.style.display='none'; this.parentElement.classList.add('image-placeholder');"
                    >

                </div>
            </a>

            <div class="product-info">

                <div class="product-category">
                    ${product.category}
                </div>

                <a href="product.html?id=${product.id}">
                    <div class="product-name">
                        ${product.name}
                    </div>
                </a>

                <div class="product-price">
                    R${product.price.toFixed(2)}
                </div>

                ${
                    available
                    ?
                    `<button
                        class="add-to-cart"
                        onclick="addToCart('${product.id}')">
                        Add to Cart
                    </button>`
                    :
                    `<button
                        class="add-to-cart"
                        disabled>
                        Coming Soon
                    </button>`
                }

            </div>

        </article>
    `;
}


// ========================================
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
                    product.category.toLowerCase() ===
                    category.toLowerCase()
            );
    }

    if (search) {

        const searchTerm =
            search.toLowerCase();

        filteredProducts =
            filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
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

    const container =
        document.getElementById("product-details");

    if (!container) {
        return;
    }

    const params =
        new URLSearchParams(window.location.search);

    const productId =
        params.get("id");

    const product =
        products.find(item => item.id === productId);

    if (!product) {

        container.innerHTML = `
            <div class="product-not-found">
                <h2>Product not found</h2>
                <p>Sorry, we couldn't find this product.</p>
                <a href="shop.html" class="primary-button">
                    Back to Shop
                </a>
            </div>
        `;

        return;
    }

    const available =
        product.stock > 0;

    container.innerHTML = `

        <div class="product-detail-image">

            <img
                src="${product.image}"
                alt="${product.name}"
                onerror="this.style.display='none'; this.parentElement.classList.add('image-placeholder');"
            >

        </div>


        <div class="product-detail-info">

            <p class="product-category">
                ${product.category}
            </p>

            <h1>
                ${product.name}
            </h1>

            <p class="product-detail-price">
                R${product.price.toFixed(2)}
            </p>

            <p class="product-description">
                ${product.description}
            </p>

            <div class="product-availability">

                ${
                    available
                    ? "✓ In Stock"
                    : "Coming Soon"
                }

            </div>

            <p class="delivery-note">
                📦 Estimated delivery: 7–14 business days
            </p>

            ${
                available
                ?
                `<button
                    class="primary-button"
                    onclick="addToCart('${product.id}')">
                    Add to Cart
                </button>`
                :
                `<button
                    class="primary-button"
                    disabled>
                    Coming Soon
                </button>`
            }

            <br><br>

            <a href="shop.html" class="back-to-shop">
                ← Continue Shopping
            </a>

        </div>

    `;
}


// Automatically load product page when needed

document.addEventListener("DOMContentLoaded", () => {
    displayProductPage();
});
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

});
mobileMenu.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
    });

});
