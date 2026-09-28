// Glamor & Grace Shopping Cart

let cart = JSON.parse(localStorage.getItem("ggCart")) || [];

function saveCart() {
    localStorage.setItem("ggCart", JSON.stringify(cart));
}

function addToCart(productId) {
    const product = products.find(item => item.id === productId);

    if (!product) {
        console.error("Product not found.");
        return;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
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

    alert(`${product.name} has been added to your cart.`);
    updateCartCount();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);

    saveCart();
    updateCartCount();
}

function updateQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);

    if (!item) return;

    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    item.quantity = quantity;

    saveCart();
    updateCartCount();
}

function getCartSubtotal() {
    return cart.reduce(
        (total, item) => total + (item.price * item.quantity),
        0
    );
}

function getCartItemCount() {
    return cart.reduce(
        (total, item) => total + item.quantity,
        0
    );
}

function updateCartCount() {
    const cartCount = document.getElementById("cart-count");

    if (cartCount) {
        cartCount.textContent = getCartItemCount();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
});
