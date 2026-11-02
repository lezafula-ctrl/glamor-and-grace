// ========================================
// GLAMOR & GRACE - TEMPORARY WHATSAPP CHECKOUT
// ========================================

const MINIMUM_CART_TOTAL = 150;
const GG_BUSINESS_WHATSAPP = "27730592497";

function escapeCheckoutText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function getCheckoutTotal(deliveryFee = 0) {
    return getCartSubtotal() + deliveryFee;
}

function displayCheckout() {
    const checkoutItems = document.getElementById("checkout-items");
    const subtotalElement = document.getElementById("checkout-subtotal");
    const deliveryElement = document.getElementById("checkout-delivery");
    const totalElement = document.getElementById("checkout-total");
    if (!checkoutItems) return;
    if (!cart.length) {
        checkoutItems.innerHTML = '<p>Your cart is empty. <a href="shop.html">Continue shopping</a></p>';
        const button = document.querySelector('#checkout-form button[type="submit"]');
        if (button) button.disabled = true;
        return;
    }
    const subtotal = getCartSubtotal();
    checkoutItems.innerHTML = cart.map(item => {
        const details = [
            ...Object.entries(item.selectedOptions || {}).map(([key, value]) => key + ": " + value),
            ...Object.entries(item.customisation || {}).map(([key, value]) => key + ": " + value)
        ].join(" | ");
        return '<div class="checkout-item"><span>' + escapeCheckoutText(item.name) +
            (details ? '<br><small>' + escapeCheckoutText(details) + '</small>' : '') +
            ' × ' + Number(item.quantity || 1) + '</span><strong>R' +
            (Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2) + '</strong></div>';
    }).join("");
    if (subtotalElement) subtotalElement.textContent = 'R' + subtotal.toFixed(2);
    if (deliveryElement) deliveryElement.textContent = "Select delivery";
    if (totalElement) totalElement.textContent = 'R' + subtotal.toFixed(2);
}

function setupDeliveryOptions() {
    document.querySelectorAll('input[name="delivery"]').forEach(option => {
        option.addEventListener("change", () => {
            const fee = Number(option.dataset.fee || 0);
            const deliveryElement = document.getElementById("checkout-delivery");
            const totalElement = document.getElementById("checkout-total");
            if (deliveryElement) deliveryElement.textContent = 'R' + fee.toFixed(2);
            if (totalElement) totalElement.textContent = 'R' + getCheckoutTotal(fee).toFixed(2);
        });
    });
}

function setupCheckoutForm() {
    const form = document.getElementById("checkout-form");
    if (!form) return;
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!Array.isArray(cart) || !cart.length) {
            alert("Your cart is empty.");
            return;
        }
        const subtotal = getCartSubtotal();
        if (subtotal < MINIMUM_CART_TOTAL) {
            alert('The minimum order amount is R' + MINIMUM_CART_TOTAL + '.');
            return;
        }
        const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
        if (!selectedDelivery) {
            alert("Please select a delivery option.");
            return;
        }
        const customer = {
            firstName: document.getElementById("first-name").value.trim(),
            surname: document.getElementById("surname").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            whatsapp: document.getElementById("whatsapp").value.trim(),
            email: document.getElementById("email").value.trim(),
            deliveryDetails: document.getElementById("delivery-details").value.trim()
        };
        if (!customer.firstName || !customer.surname || !customer.phone || !customer.email || !customer.deliveryDetails) {
            alert("Please complete all required checkout details.");
            return;
        }
        const deliveryLabels = {
            "paxi": "PAXI Standard (R150)",
            "paxi-large": "PAXI Large / Heavy (R200)",
            "courier": "Courier Guy Standard (R200)",
            "courier-large": "Courier Guy Large / Heavy (R250)"
        };
        const deliveryFee = Number(selectedDelivery.dataset.fee || 0);
        const total = getCheckoutTotal(deliveryFee);
        const orderLines = cart.map((item, index) => {
            const details = [
                ...Object.entries(item.selectedOptions || {}).map(([key, value]) => key + ": " + value),
                ...Object.entries(item.customisation || {}).map(([key, value]) => key + ": " + value)
            ];
            return (index + 1) + ". " + item.name +
                (details.length ? "\n   " + details.join("; ") : "") +
                "\n   Quantity: " + Number(item.quantity || 1) +
                " | Unit price: R" + Number(item.price || 0).toFixed(2) +
                " | Line total: R" + (Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2);
        });
        const message = [
            "Hello Glamor and Grace! 🤍", "",
            "I would like to place an order:", "",
            "CUSTOMER DETAILS",
            "Name: " + customer.firstName + " " + customer.surname,
            "Phone: " + customer.phone,
            "WhatsApp: " + (customer.whatsapp || customer.phone),
            "Email: " + customer.email, "",
            "DELIVERY",
            "Method: " + (deliveryLabels[selectedDelivery.value] || selectedDelivery.value),
            "Delivery / collection details: " + customer.deliveryDetails, "",
            "ORDER", ...orderLines, "",
            "Subtotal: R" + subtotal.toFixed(2),
            "Delivery: R" + deliveryFee.toFixed(2),
            "ESTIMATED TOTAL: R" + total.toFixed(2), "",
            "Please confirm product availability and the final amount, then send me the payment instructions.",
            "I understand this WhatsApp request is not yet an order confirmation. Payment should only be made after Glamor and Grace confirms the details."
        ].join("\n");
        window.location.href = "https://wa.me/" + GG_BUSINESS_WHATSAPP + "?text=" + encodeURIComponent(message);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    displayCheckout();
    setupDeliveryOptions();
    setupCheckoutForm();
});
