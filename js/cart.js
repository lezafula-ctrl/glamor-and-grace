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
    const entries = Array.isArray(product.variant_stock) ? product.variant_stock : [];
    let available = Number(product.stock || 0);
    if (entries.length) {
        const match = entries.find(entry => {
            const values = entry.options || {};
            return Object.keys(values).length === Object.keys(selectedOptions || {}).length &&
                Object.entries(values).every(([key, value]) => String(value).toLowerCase() === String((selectedOptions || {})[key] || "").toLowerCase());
        });
        available = match ? Number(match.quantity || 0) : 0;
    }
    if (available <= 0) { alert("Sorry, that size/colour combination is currently unavailable."); return; }
    const signature = JSON.stringify({options: selectedOptions || {}, customisation: customisation || {}});
    const lineId = String(product.id) + "::" + signature;
    const existingItem = cart.find(item => String(item.lineId || item.id) === lineId);
    if (existingItem) {
        if (existingItem.quantity >= available) { alert("You have reached the available stock for this combination."); return; }
        existingItem.quantity += 1;
    } else {
        const photos = Array.isArray(product.product_images) ? product.product_images : [];
        const selectedColour = Object.entries(selectedOptions || {}).find(([key]) => /^(colour|color)$/i.test(key));
        const colourPhoto = selectedColour && photos.find(img => String(img.color || "").toLowerCase() === String(selectedColour[1]).toLowerCase());
        cart.push({ id: lineId, lineId, productId: String(product.id), name: product.name,
            price: Number(product.price), image: colourPhoto?.url || product.image, quantity: 1,
            selectedOptions: selectedOptions || {}, customisation: customisation || {} });
    }
    saveCart(); updateCartCount(); renderCart();
    alert(product.name + " has been added to your cart.");
}


// ========================================
// REMOVE FROM CART
// ========================================

function removeFromCart(lineId) {
    cart = cart.filter(item => String(item.lineId || item.id) !== String(lineId));
    saveCart(); updateCartCount(); renderCart();
}


// ========================================
// UPDATE QUANTITY
// ========================================

function updateQuantity(lineId, quantity) {
    const item = cart.find(item => String(item.lineId || item.id) === String(lineId));
    if (!item) return;
    quantity = parseInt(quantity, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) { removeFromCart(lineId); return; }
    const productId = String(item.productId ?? item.id);
    const product = products.find(p => String(p.id) === productId);
    if (product) {
        const entries = Array.isArray(product.variant_stock) ? product.variant_stock : [];
        let available = Number(product.stock || 0);
        if (entries.length) {
            const match = entries.find(entry => {
                const values = entry.options || {};
                return Object.keys(values).length === Object.keys(item.selectedOptions || {}).length &&
                    Object.entries(values).every(([key, value]) => String(value).toLowerCase() === String((item.selectedOptions || {})[key] || "").toLowerCase());
            });
            available = match ? Number(match.quantity || 0) : 0;
        }
        if (quantity > available) { alert("You have reached the available stock for this combination."); renderCart(); return; }
    }
    item.quantity = quantity; saveCart(); updateCartCount(); renderCart();
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
    const cartContainer = document.getElementById("cart-items");
    const emptyCart = document.getElementById("empty-cart");
    const cartSummary = document.getElementById("cart-summary");
    const subtotalElement = document.getElementById("cart-subtotal");
    if (!cartContainer) return;
    if (cart.length === 0) {
        cartContainer.innerHTML = "";
        if (emptyCart) emptyCart.style.display = "block";
        if (cartSummary) cartSummary.style.display = "none";
        if (subtotalElement) subtotalElement.textContent = "R0.00";
        return;
    }
    if (emptyCart) emptyCart.style.display = "none";
    if (cartSummary) cartSummary.style.display = "block";
    const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    cartContainer.innerHTML = cart.map(item => {
        const lineId = String(item.lineId || item.id);
        const options = Object.entries(item.selectedOptions || {}).map(([key, value]) => safe(key) + ": " + safe(value)).join(" · ");
        const custom = Object.entries(item.customisation || {}).map(([key, value]) => safe(key) + ": " + safe(value)).join(" · ");
        return '<article class="cart-item"><div class="cart-item-image"><img src="' + safe(item.image) + '" alt="' + safe(item.name) + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'image-placeholder\')"></div><div class="cart-item-info"><h2>' + safe(item.name) + '</h2><p>R' + Number(item.price || 0).toFixed(2) + '</p>' +
            (options ? '<p class="cart-item-options">' + options + '</p>' : '') +
            (custom ? '<p class="cart-item-customisation">Personalisation: ' + custom + '</p>' : '') +
            '<label>Quantity: <input type="number" min="1" value="' + Number(item.quantity || 1) + '" data-line-id="' + safe(lineId) + '" onchange="updateQuantity(this.dataset.lineId,this.value)"></label><button type="button" class="remove-item" data-remove-line="' + safe(lineId) + '">Remove</button></div><div class="cart-item-total"><strong>R' + (Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2) + '</strong></div></article>';
    }).join("");
    cartContainer.querySelectorAll("[data-remove-line]").forEach(button => button.addEventListener("click", () => removeFromCart(button.dataset.removeLine)));
    if (subtotalElement) subtotalElement.textContent = "R" + getCartSubtotal().toFixed(2);
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
function prepareCheckout() {

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    window.location.href = "checkout.html";
}
