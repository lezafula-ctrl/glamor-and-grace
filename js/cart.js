// ========================================
// GLAMOR & GRACE - SHOPPING CART
// ========================================

let cart = JSON.parse(localStorage.getItem("ggCart")) || [];


// ========================================
// SAVE CART
// ========================================

function saveCart() {
    localStorage.setItem("ggCart", JSON.stringify(cart));
}


// ========================================
// ADD TO CART
// ========================================

function addToCart(productId) {

    const product =
        products.find(item => item.id === productId);

    if (!product) {
        console.error("Product not found.");
        return;
    }

    if (product.stock <= 0) {
        alert("Sorry, this product is currently unavailable.");
        return;
    }

    const existingItem =
        cart.find(item => item.id === productId);

    if (existingItem) {

        if (existingItem.quantity >= product.stock) {
            alert("You have reached the available stock.");
            return;
        }

        existingItem.quantity += 1;

    } else {

        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });

    }

    saveCart();

    updateCartCount();

    alert(`${product.name} has been added to your cart.`);

    renderCart();
}


// ========================================
// REMOVE FROM CART
// ========================================

function removeFromCart(productId) {

    cart =
        cart.filter(item => item.id !== productId);

    saveCart();

    updateCartCount();

    renderCart();
}


// ========================================
// UPDATE QUANTITY
// ========================================

function updateQuantity(productId, quantity) {

    const item =
        cart.find(item => item.id === productId);

    if (!item) {
        return;
    }

    quantity = parseInt(quantity);

    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const product =
        products.find(item => item.id === productId);

    if (product && quantity > product.stock) {
        alert("You have reached the available stock.");
        renderCart();
        return;
    }

    item.quantity = quantity;

    saveCart();

    updateCartCount();

    renderCart();
}


// ========================================
// CART TOTALS
// ========================================

function getCartSubtotal() {

    return cart.reduce(
        (total, item) =>
            total + (item.price * item.quantity),
        0
    );
}


function getCartItemCount() {

    return cart.reduce(
        (total, item) =>
            total + item.quantity,
        0
    );
}


function updateCartCount() {

    const cartCount =
        document.getElementById("cart-count");

    if (cartCount) {
        cartCount.textContent =
            getCartItemCount();
    }
}


// ========================================
// DISPLAY CART
// ========================================

function renderCart() {

    const cartContainer =
        document.getElementById("cart-items");

    const emptyCart =
        document.getElementById("empty-cart");

    const cartSummary =
        document.getElementById("cart-summary");

    const subtotalElement =
        document.getElementById("cart-subtotal");


    if (!cartContainer) {
        return;
    }


    if (cart.length === 0) {

        cartContainer.innerHTML = "";

        if (emptyCart) {
            emptyCart.style.display = "block";
        }

        if (cartSummary) {
            cartSummary.style.display = "none";
        }

        return;
    }


    if (emptyCart) {
        emptyCart.style.display = "none";
    }

    if (cartSummary) {
        cartSummary.style.display = "block";
    }


    cartContainer.innerHTML =
        cart.map(item => `

            <article class="cart-item">

                <div class="cart-item-image">

                    <img
                        src="${item.image}"
                        alt="${item.name}"
                        onerror="this.style.display='none'; this.parentElement.classList.add('image-placeholder');"
                    >

                </div>


                <div class="cart-item-info">

                    <h2>
                        ${item.name}
                    </h2>

                    <p>
                        R${item.price.toFixed(2)}
                    </p>


                    <div class="cart-quantity">

                        <label>
                            Quantity:
                        </label>

                        <input
                            type="number"
                            min="1"
                            value="${item.quantity}"
                            onchange="updateQuantity(
                                '${item.id}',
                                this.value
                            )"
                        >

                    </div>


                    <button
                        class="remove-item"
                        onclick="removeFromCart('${item.id}')"
                    >
                        Remove
                    </button>

                </div>


                <div class="cart-item-total">

                    <strong>
                        R${(
                            item.price *
                            item.quantity
                        ).toFixed(2)}
                    </strong>

                </div>

            </article>

        `).join("");


    if (subtotalElement) {

        subtotalElement.textContent =
            `R${getCartSubtotal().toFixed(2)}`;

    }
}


// ========================================
// LOAD CART
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateCartCount();

        renderCart();

    }
);
