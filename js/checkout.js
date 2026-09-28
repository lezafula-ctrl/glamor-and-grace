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
// DISPLAY CHECKOUT
// ========================================

function displayCheckout() {

    const checkoutItems =
        document.getElementById("checkout-items");

    const subtotalElement =
        document.getElementById("checkout-subtotal");

    const deliveryElement =
        document.getElementById("checkout-delivery");

    const totalElement =
        document.getElementById("checkout-total");


    if (!checkoutItems) {
        return;
    }


    if (cart.length === 0) {

        checkoutItems.innerHTML = `
            <p>
                Your cart is empty.
                <a href="shop.html">Continue shopping</a>
            </p>
        `;

        return;
    }


    const subtotal =
        getCartSubtotal();


    checkoutItems.innerHTML =
        cart.map(item => `

            <div class="checkout-item">

                <span>
                    ${item.name} × ${item.quantity}
                </span>

                <strong>
                    R${(
                        item.price * item.quantity
                    ).toFixed(2)}
                </strong>

            </div>

        `).join("");


    if (subtotalElement) {

        subtotalElement.textContent =
            `R${subtotal.toFixed(2)}`;

    }


    if (deliveryElement) {

        deliveryElement.textContent =
            "Select delivery";

    }


    if (totalElement) {

        totalElement.textContent =
            `R${subtotal.toFixed(2)}`;

    }
}


// ========================================
// DELIVERY FEE
// ========================================

function setupDeliveryOptions() {

    const deliveryOptions =
        document.querySelectorAll(
            'input[name="delivery"]'
        );

    if (!deliveryOptions.length) {
        return;
    }


    deliveryOptions.forEach(option => {

        option.addEventListener("change", () => {

            const deliveryFee =
                Number(option.dataset.fee);


            const subtotal =
                getCartSubtotal();


            const total =
                getCheckoutTotal(deliveryFee);


            const deliveryElement =
                document.getElementById(
                    "checkout-delivery"
                );

            const totalElement =
                document.getElementById(
                    "checkout-total"
                );


            if (deliveryElement) {

                deliveryElement.textContent =
                    `R${deliveryFee.toFixed(2)}`;

            }


            if (totalElement) {

                totalElement.textContent =
                    `R${total.toFixed(2)}`;

            }

        });

    });
}


// ========================================
// CHECKOUT FORM
// ========================================

function setupCheckoutForm() {

    const form =
        document.getElementById("checkout-form");

    if (!form) {
        return;
    }


    form.addEventListener("submit", event => {

        event.preventDefault();


        if (cart.length === 0) {

            alert("Your cart is empty.");

            return;

        }


        const subtotal =
            getCartSubtotal();


        if (subtotal < MINIMUM_CART_TOTAL) {

            alert(
                `The minimum order amount is R${MINIMUM_CART_TOTAL}.`
            );

            return;

        }


        const selectedDelivery =
            document.querySelector(
                'input[name="delivery"]:checked'
            );


        if (!selectedDelivery) {

            alert(
                "Please select a delivery option."
            );

            return;

        }


        const deliveryFee =
            Number(selectedDelivery.dataset.fee);


        const total =
            getCheckoutTotal(deliveryFee);


        alert(
            `Order total: R${total.toFixed(2)}\n\n` +
            `Next we will connect this to online payment.`
        );

    });
}


// ========================================
// LOAD CHECKOUT
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        displayCheckout();

        setupDeliveryOptions();

        setupCheckoutForm();

    }
);
