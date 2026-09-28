// Glamor & Grace Checkout

function getCheckoutTotal(deliveryFee = 0) {
    return getCartSubtotal() + deliveryFee;
}

function prepareCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    window.location.href = "checkout.html";
}
