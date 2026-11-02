// ========================================
// GLAMOR & GRACE - ORDER CHECKOUT
// Orders are saved first; payment is handled separately.
// ========================================

const MINIMUM_CART_TOTAL = 150;
const GG_BUSINESS_WHATSAPP = "27730592497";
let checkoutSubmitting = false;

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
    if (!checkoutItems) return;
    const subtotal = getCartSubtotal();
    if (!Array.isArray(cart) || !cart.length) {
        checkoutItems.innerHTML = '<p>Your cart is empty. <a href="shop.html">Continue shopping</a></p>';
        const button = document.querySelector('#checkout-form button[type="submit"]');
        if (button) button.disabled = true;
        return;
    }
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
    const subtotalElement = document.getElementById("checkout-subtotal");
    const deliveryElement = document.getElementById("checkout-delivery");
    const totalElement = document.getElementById("checkout-total");
    if (subtotalElement) subtotalElement.textContent = "R" + subtotal.toFixed(2);
    if (deliveryElement) deliveryElement.textContent = "Select delivery";
    if (totalElement) totalElement.textContent = "R" + subtotal.toFixed(2);
}

function setupDeliveryOptions() {
    document.querySelectorAll('input[name="delivery"]').forEach(option => {
        option.addEventListener("change", () => {
            const fee = Number(option.dataset.fee || 0);
            const deliveryElement = document.getElementById("checkout-delivery");
            const totalElement = document.getElementById("checkout-total");
            if (deliveryElement) deliveryElement.textContent = "R" + fee.toFixed(2);
            if (totalElement) totalElement.textContent = "R" + getCheckoutTotal(fee).toFixed(2);
        });
    });
}

function buildWhatsAppOrderMessage(customer, deliveryLabel, orderId, items, subtotal, deliveryFee, total) {
    const lines = items.map((item, index) => {
        const options = item.selected_variants || {};
        const details = [
            ...Object.entries(options.options || {}).map(([key, value]) => key + ": " + value),
            ...Object.entries(options.customisation || {}).map(([key, value]) => key + ": " + value)
        ];
        return (index + 1) + ". " + item.product_name +
            (details.length ? "\n   " + details.join("; ") : "") +
            "\n   Quantity: " + item.quantity +
            " | Unit price: R" + Number(item.unit_price).toFixed(2) +
            " | Line total: R" + (Number(item.unit_price) * item.quantity).toFixed(2);
    });
    return [
        "Hello Glamor and Grace! 🤍", "",
        "I have placed an order on the website.",
        "Order reference: " + orderId, "",
        "CUSTOMER DETAILS",
        "Name: " + customer.first_name + " " + customer.surname,
        "Phone: " + customer.phone,
        "WhatsApp: " + (customer.whatsapp || customer.phone),
        "Email: " + customer.email, "",
        "DELIVERY",
        "Method: " + deliveryLabel,
        "Details: " + customer.delivery_details, "",
        "ORDER", ...lines, "",
        "Subtotal: R" + subtotal.toFixed(2),
        "Delivery: R" + deliveryFee.toFixed(2),
        "TOTAL: R" + total.toFixed(2), "",
        "Please send me the payment instructions. Thank you!"
    ].join("\n");
}

async function submitCheckoutOrder(form) {
    if (checkoutSubmitting) return;
    if (!Array.isArray(cart) || !cart.length) throw new Error("Your cart is empty.");
    const subtotal = getCartSubtotal();
    if (subtotal < MINIMUM_CART_TOTAL) throw new Error("The minimum order amount is R150.");

    const selectedDelivery = document.querySelector('input[name="delivery"]:checked');
    if (!selectedDelivery) throw new Error("Please select a delivery option.");

    const customer = {
        first_name: document.getElementById("first-name").value.trim(),
        surname: document.getElementById("surname").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        whatsapp: document.getElementById("whatsapp").value.trim() || null,
        email: document.getElementById("email").value.trim(),
        delivery_details: document.getElementById("delivery-details").value.trim()
    };
    if (!customer.first_name || !customer.surname || !customer.phone || !customer.email || !customer.delivery_details) {
        throw new Error("Please complete all required checkout details.");
    }

    const deliveryLabels = {
        "paxi": "PAXI Standard",
        "paxi-large": "PAXI Large / Heavy",
        "courier": "Courier Guy Standard",
        "courier-large": "Courier Guy Large / Heavy"
    };
    const payload = {
        ...customer,
        delivery_method: selectedDelivery.value,
        items: cart.map(item => ({
            product_id: String(item.productId),
            quantity: Number(item.quantity || 1),
            selected_variants: {
                options: item.selectedOptions || {},
                customisation: item.customisation || {}
            }
        }))
    };

    checkoutSubmitting = true;
    const button = form.querySelector('button[type="submit"]');
    const originalText = button ? button.textContent : "Place Order";
    if (button) {
        button.disabled = true;
        button.textContent = "Submitting order...";
    }

    try {
        if (!window.ggSupabase) throw new Error("Checkout is temporarily unavailable. Please try again shortly.");
        const { data: orderId, error } = await ggSupabase.rpc("create_store_order", { p_order: payload });
        if (error) throw error;
        if (!orderId) throw new Error("The order could not be confirmed as saved. Please contact us before trying again.");

        const deliveryFee = Number(selectedDelivery.dataset.fee || 0);
        // Database is authoritative for prices. WhatsApp is a follow-up message with the saved order reference.
        const { data: savedItems, error: itemsError } = await ggSupabase
            .from("order_items")
            .select("product_name, unit_price, quantity, selected_variants")
            .eq("order_id", orderId);
        if (itemsError) console.warn("Order saved; unable to load its WhatsApp summary:", itemsError);

        const actualItems = savedItems || cart.map(item => ({
            product_name: item.name,
            unit_price: item.price,
            quantity: item.quantity,
            selected_variants: { options: item.selectedOptions || {}, customisation: item.customisation || {} }
        }));
        const actualSubtotal = actualItems.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);
        const actualTotal = actualSubtotal + deliveryFee;
        const message = buildWhatsAppOrderMessage(
            customer, deliveryLabels[selectedDelivery.value], orderId,
            actualItems, actualSubtotal, deliveryFee, actualTotal
        );

        localStorage.removeItem("ggCart");
        if (typeof cart !== "undefined") cart = [];
        const success = document.getElementById("checkout-success");
        if (success) {
            success.hidden = false;
            success.innerHTML = '<h2>Thank you! Your order has been placed.</h2><p>Your order reference is <strong>' +
                escapeCheckoutText(orderId) + '</strong>.</p><p>Your order is saved. Payment is still pending; please use the WhatsApp link below to receive payment instructions.</p><a class="primary-button" href="https://wa.me/' +
                GG_BUSINESS_WHATSAPP + '?text=' + encodeURIComponent(message) + '" target="_blank" rel="noopener">Continue to WhatsApp</a>';
        }
        form.hidden = true;
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        console.error("Checkout order submission failed:", error);
        throw new Error(error.message || "We could not save your order. Please try again.");
    } finally {
        checkoutSubmitting = false;
        if (button && !form.hidden) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

function setupCheckoutForm() {
    const form = document.getElementById("checkout-form");
    if (!form) return;
    form.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            await submitCheckoutOrder(form);
        } catch (error) {
            alert(error.message);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    displayCheckout();
    setupDeliveryOptions();
    setupCheckoutForm();
});
