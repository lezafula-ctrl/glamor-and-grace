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

    const essentials = products.filter(
        product => product.category === "Essentials"
    );

    if (specialContainer) {
        specialContainer.innerHTML =
            essentials.length
            ? essentials.map(createProductCard).join("")
            : "<p>No specials available yet.</p>";
    }

    if (featuredContainer) {
        featuredContainer.innerHTML =
            products.length
            ? products.map(createProductCard).join("")
            : "<p>Products coming soon.</p>";
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
