// ========================================
// GLAMOR & GRACE - CHECKOUT
// ========================================

const MINIMUM_CART_TOTAL = 150;


// ========================================
// CHECKOUT TOTAL
// ========================================

function getCheckoutTotal(deliveryFee = 0) {
    return getCartSubtotal() + deliveryFee;
}


// ========================================
// PREPARE CHECKOUT
// ========================================

function prepareCheckout() {

    if (cart.length === 0) {

        alert("Your cart is empty.");

        return;

    }


    const subtotal =
        getCartSubtotal();


    if (subtotal < MINIMUM_CART_TOTAL) {

        alert(
            `The minimum order amount is R${MINIMUM_CART_TOTAL}. ` +
            `Please add another R${(
                MINIMUM_CART_TOTAL - subtotal
            ).toFixed(2)} to your cart.`
        );

        return;

    }


    window.location.href =
        "checkout.html";
}
