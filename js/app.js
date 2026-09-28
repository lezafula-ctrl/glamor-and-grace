// ========================================
// GLAMOR & GRACE - MAIN WEBSITE FUNCTIONS
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    displayProducts();
    setupSearch();
    updateCartCount();
});


// ========================================
// PRODUCT DISPLAY
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


function displayProducts() {

    const specialContainer =
        document.getElementById("special-products");

    const featuredContainer =
        document.getElementById("featured-products");


    if (!specialContainer || !featuredContainer) {
        return;
    }


    const specials = products.filter(
        product => product.category === "G&G Specials"
    );

    const essentials = products.filter(
        product => product.category === "Essentials"
    );


    /*
        Our current G&G bags are part of
        the Essentials collection.

        We will later add more products and
        G&G Specials to products.js.
    */

    specialContainer.innerHTML =
        essentials.length
        ? essentials.map(createProductCard).join("")
        : "<p>No specials available yet.</p>";


    featuredContainer.innerHTML =
        products.length
        ? products.map(createProductCard).join("")
        : "<p>Products coming soon.</p>";
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
