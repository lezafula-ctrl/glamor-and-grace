// GLAMOR & GRACE - OPTION-AWARE SHOPPING CART
let cart = [];
try { cart = JSON.parse(localStorage.getItem("ggCart")) || []; } catch { cart = []; }
function saveCart() { localStorage.setItem("ggCart", JSON.stringify(cart)); }
function safeCartText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function cartProductId(item) { return String(item.productId ?? item.id); }
function stockForCartItem(product, options) {
    const entries = Array.isArray(product.variant_stock) ? product.variant_stock : [];
    if (!entries.length) return Number(product.stock || 0);
    const match = entries.find(entry => {
        const values = entry.options || {};
        return Object.keys(values).length === Object.keys(options || {}).length &&
            Object.entries(values).every(([key, value]) => String(value).toLowerCase() === String((options || {})[key] || "").toLowerCase());
    });
    return match ? Number(match.quantity || 0) : 0;
}
function addToCart(productId, selectedOptions = {}, customisation = {}) {
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) { alert("Product not found. Please refresh the store and try again."); return; }
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const required = variants.filter(v => v && v.name && Array.isArray(v.options) && v.options.length);
    if (required.some(v => !selectedOptions[v.name])) {
        alert("Please choose your product options first.");
        window.location.href = "product.html?id=" + encodeURIComponent(productId);
        return;
    }
    const available = stockForCartItem(product, selectedOptions);
    if (available <= 0) { alert("Sorry, that size/colour combination is currently unavailable."); return; }
    const signature = JSON.stringify({options: selectedOptions || {}, customisation: customisation || {}});
    const lineId = String(product.id) + "::" + signature;
    const existing = cart.find(item => String(item.lineId || item.id) === lineId);
    if (existing) {
        if (existing.quantity >= available) { alert("You have reached the available stock for this combination."); return; }
        existing.quantity += 1;
    } else {
        const photos = Array.isArray(product.product_images) ? product.product_images : [];
        const selectedColour = Object.entries(selectedOptions || {}).find(([key]) => /^(colour|color)$/i.test(key));
        const colourPhoto = selectedColour && photos.find(img => String(img.color || "").toLowerCase() === String(selectedColour[1]).toLowerCase());
        cart.push({
            id: lineId, lineId, productId: String(product.id),
            name: product.name, price: Number(product.price), image: colourPhoto?.url || product.image,
            quantity: 1, selectedOptions: selectedOptions || {}, customisation: customisation || {}
        });
    }
    saveCart(); updateCartCount(); renderCart();
}
function removeFromCart(lineId) {
    cart = cart.filter(item => String(item.lineId || item.id) !== String(lineId));
    saveCart(); updateCartCount(); renderCart();
}
function updateQuantity(lineId, quantity) {
    const item = cart.find(item => String(item.lineId || item.id) === String(lineId));
    if (!item) return;
    quantity = parseInt(quantity, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) { removeFromCart(lineId); return; }
    const product = products.find(p => String(p.id) === cartProductId(item));
    if (product && quantity > stockForCartItem(product, item.selectedOptions || {})) {
        alert("You have reached the available stock for this combination.");
        renderCart(); return;
    }
    item.quantity = quantity; saveCart(); updateCartCount(); renderCart();
}
function getCartSubtotal() { return cart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0); }
function getCartItemCount() { return cart.reduce((total, item) => total + Number(item.quantity || 0), 0); }
function updateCartCount() {
    const element = document.getElementById("cart-count");
    if (element) element.textContent = getCartItemCount();
}
function optionsText(options) {
    return Object.entries(options || {}).map(([key, value]) => safeCartText(key) + ": " + safeCartText(value)).join(" · ");
}
function renderCart() {
    const container = document.getElementById("cart-items");
    const empty = document.getElementById("empty-cart");
    const summary = document.getElementById("cart-summary");
    const subtotal = document.getElementById("cart-subtotal");
    if (!container) return;
    if (!cart.length) {
        container.innerHTML = "";
        if (empty) empty.style.display = "block";
        if (summary) summary.style.display = "none";
        if (subtotal) subtotal.textContent = "R0.00";
        return;
    }
    if (empty) empty.style.display = "none";
    if (summary) summary.style.display = "block";
    container.innerHTML = cart.map(item => {
        const key = safeCartText(item.lineId || item.id);
        const options = optionsText(item.selectedOptions);
        const custom = optionsText(item.customisation);
        return '<article class="cart-item"><div class="cart-item-image"><img src="' + safeCartText(item.image) + '" alt="' + safeCartText(item.name) + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-placeholder\')"></div><div class="cart-item-info"><h2>' + safeCartText(item.name) + '</h2><p>R' + Number(item.price || 0).toFixed(2) + '</p>' +
            (options ? '<p class="cart-item-options">' + options + '</p>' : '') +
            (custom ? '<p class="cart-item-customisation">Personalisation: ' + custom + '</p>' : '') +
            '<label>Quantity: <input type="number" min="1" value="' + Number(item.quantity || 1) + '" onchange="updateQuantity(this.dataset.lineId,this.value)" data-line-id="' + key + '"></label><button type="button" class="remove-item" data-remove-line="' + key + '">Remove</button></div><div class="cart-item-total"><strong>R' + (Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2) + '</strong></div></article>';
    }).join("");
    container.querySelectorAll("[data-remove-line]").forEach(button => button.addEventListener("click", () => removeFromCart(button.dataset.removeLine)));
    if (subtotal) subtotal.textContent = "R" + getCartSubtotal().toFixed(2);
}
document.addEventListener("DOMContentLoaded", () => { updateCartCount(); renderCart(); });
function prepareCheckout() {
    if (!cart.length) { alert("Your cart is empty."); return; }
    window.location.href = "checkout.html";
}