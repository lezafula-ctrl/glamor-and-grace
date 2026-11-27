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
            ...Object.entries(item.customisation || {}).map(([key, value]) => key + ": " + (key === "Customer Photo Upload" ? "Photo attached" : value))
        ].join(" | ");
        return '<div class="checkout-item"><span>' + escapeCheckoutText(item.name) +
            (details ? '<br><small>' + escapeCheckoutText(details) + '</small>' : '') +
            ' × ' + Number(item.quantity || 1) + '</span><strong>R' +
            Math.round(ggCartUnitPrice(item) * Number(item.quantity || 1)) + '</strong></div>';
    }).join("");
    const subtotalElement = document.getElementById("checkout-subtotal");
    const deliveryElement = document.getElementById("checkout-delivery");
    const totalElement = document.getElementById("checkout-total");
    if (subtotalElement) subtotalElement.textContent = "R" + Math.round(subtotal);
    if (deliveryElement) deliveryElement.textContent = "Select delivery";
    if (totalElement) totalElement.textContent = "R" + Math.round(subtotal);
}

function setupDeliveryOptions() {
    document.querySelectorAll('input[name="delivery"]').forEach(option => {
        option.addEventListener("change", () => {
            const fee = Number(option.dataset.fee || 0);
            const deliveryElement = document.getElementById("checkout-delivery");
            const totalElement = document.getElementById("checkout-total");
            if (deliveryElement) deliveryElement.textContent = "R" + Math.round(fee);
            if (totalElement) totalElement.textContent = "R" + Math.round(getCheckoutTotal(fee));
        });
    });
}

function buildWhatsAppOrderMessage(customer, deliveryLabel, orderId, items, subtotal, deliveryFee, total) {
    const lines = items.map((item, index) => {
        const options = item.selected_variants || {};
        const details = [
            ...Object.entries(options.options || {}).map(([key, value]) => key + ": " + value),
            ...Object.entries(options.customisation || {}).map(([key, value]) => key + ": " + (key === "Customer Photo Upload" ? "Photo attached" : value))
        ];
        return (index + 1) + ". " + item.product_name +
            (details.length ? "\n   " + details.join("; ") : "") +
            "\n   Quantity: " + item.quantity +
            " | Unit price: R" + Math.round(Number(item.unit_price)) +
            " | Line total: R" + Math.round(Number(item.unit_price) * item.quantity);
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
        "Subtotal: R" + Math.round(subtotal),
        "Delivery: R" + Math.round(deliveryFee),
        "TOTAL: R" + Math.round(total), "",
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
        if (typeof ggSupabase === "undefined") throw new Error("Checkout is temporarily unavailable. Please try again shortly.");
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
        const paymentReference = "GG-" + String(orderId).replace(/-/g, "").slice(0, 8).toUpperCase();
        const proofMessage = [
            "Hello Glamor and Grace! 💗",
            "I have made payment for my order.",
            "Order reference: " + paymentReference,
            "Amount paid: R" + actualTotal.toFixed(2),
            "I have attached my proof of payment."
        ].join("\n");

        localStorage.removeItem("ggCart");
        if (typeof cart !== "undefined") cart = [];
        const success = document.getElementById("checkout-success");
        if (success) {
            success.hidden = false;
            success.innerHTML =
                '<div class="gg-success-hero">' +
                    '<span class="gg-success-icon">✓</span>' +
                    '<p class="gg-success-eyebrow">GLAMOR &amp; GRACE</p>' +
                    '<h2>Thank you, your order has been placed!</h2>' +
                    '<p>We are so happy you chose to shop with us. Your order has been saved successfully.</p>' +
                    '<span class="gg-payment-status">Payment pending</span>' +
                '</div>' +
                '<div class="gg-success-content">' +
                    '<div class="gg-reference-card">' +
                        '<span>YOUR ORDER REFERENCE</span>' +
                        '<strong>' + escapeCheckoutText(paymentReference) + '</strong>' +
                        '<small>Use this reference when making your bank transfer.</small>' +
                    '</div>' +
                    '<div class="gg-payment-total"><span>Total to pay</span><strong>R' + actualTotal.toFixed(2) + '</strong></div>' +
                    '<div class="gg-bank-card">' +
                        '<div class="gg-success-section-heading"><span>01</span><div><h3>Make your payment</h3><p>Use the bank details below to pay for your order.</p></div></div>' +
                        '<div class="gg-bank-details">' +
                            '<div><span>Bank</span><strong>GoTyme Bank</strong></div>' +
                            '<div><span>Account name</span><strong>Glamor and Grace</strong></div>' +
                            '<div><span>Account number</span><strong>51133813751</strong></div>' +
                            '<div><span>Payment reference</span><strong>' + escapeCheckoutText(paymentReference) + '</strong></div>' +
                        '</div>' +
                        '<p class="gg-payment-reminder">Please enter the reference exactly as shown. Your order will only be processed once the payment reflects in our account.</p>' +
                    '</div>' +
                    '<div class="gg-next-step-card">' +
                        '<div class="gg-success-section-heading"><span>02</span><div><h3>Send your proof of payment</h3><p>After making the transfer, send us your proof of payment on WhatsApp.</p></div></div>' +
                        '<a class="primary-button gg-whatsapp-button" href="https://wa.me/' + GG_BUSINESS_WHATSAPP +
                        '?text=' + encodeURIComponent(proofMessage) +
                        '" target="_blank" rel="noopener">Send Proof of Payment on WhatsApp</a>' +
                        '<small>If you are using a computer, you can open this link on your phone instead.</small>' +
                    '</div>' +
                    '<p class="gg-thankyou-note">Thank you for supporting Glamor &amp; Grace. We will update your order once your payment has been verified. 💗</p>' +
                '</div>'
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
