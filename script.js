/**
 * script.js — ShopSwift Frontend Logic
 * Vanilla JS SPA with cart, checkout, EMI, and order management
 */

"use strict";

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
let allProducts = [];          // All products from API
let filteredProducts = [];     // After search/filter
let cart = loadCart();         // Persisted cart from localStorage
let currentOrder = null;       // Last confirmed order
let selectedEmiMonths = null;  // EMI plan choice
let selectedPayment = null;    // Payment method

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  fetchProducts();
});

/* ═══════════════════════════════════════════════════════════════
   ROUTING (SPA)
═══════════════════════════════════════════════════════════════ */
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Render the correct page
  if (page === "cart") renderCart();
  if (page === "checkout") renderCheckout();
}

/* ═══════════════════════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════════════════════ */
async function fetchProducts(category = "All", search = "") {
  try {
    let url = `/api/products?category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      allProducts = data.data;
      filteredProducts = data.data;
      renderProducts(filteredProducts);
    }
  } catch (err) {
    // Fallback: render error state
    document.getElementById("products-grid").innerHTML =
      `<div class="empty-cart" style="grid-column:1/-1">
         <div class="empty-icon">⚠️</div>
         <h3>Could not load products</h3>
         <p>Make sure the server is running: <code>node server.js</code></p>
       </div>`;
  }
}

async function submitOrder(orderData) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Order failed");
  return data.data;
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT RENDERING
═══════════════════════════════════════════════════════════════ */
function renderProducts(products) {
  const grid = document.getElementById("products-grid");
  const countEl = document.getElementById("products-count");

  countEl.textContent = `${products.length} product${products.length !== 1 ? "s" : ""} found`;

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-cart" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try a different search or category</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => createProductCard(p)).join("");
}

function createProductCard(p) {
  const discount = Math.round((1 - p.price / p.originalPrice) * 100);
  const emi3 = calcEmi(p.price, 3);
  const inCart = cart.some(i => i.id === p.id);

  return `
    <div class="product-card" id="card-${p.id}">
      ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
      <div class="product-img-wrap">
        <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300/f0f4f8/0f1b2d?text=Product'" />
      </div>
      <div class="product-info">
        <span class="product-category">${p.category}</span>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-rating">
          <span class="stars">${getStars(p.rating)}</span>
          <span class="rating-val">${p.rating}</span>
          <span class="rating-count">(${formatNum(p.reviews)})</span>
        </div>
        <div class="product-price">
          <span class="price-current">₹${formatNum(p.price)}</span>
          <span class="price-original">₹${formatNum(p.originalPrice)}</span>
          <span class="price-discount">${discount}% off</span>
        </div>
        <span class="product-emi">EMI from ₹${formatNum(emi3)}/mo (3m)</span>
      </div>
      <div class="product-actions">
        <button class="btn-add-cart ${inCart ? "added" : ""}"
          id="cart-btn-${p.id}"
          onclick="addToCart(${p.id})">
          ${inCart ? "✓ Added" : "🛒 Add to Cart"}
        </button>
        <button class="btn-buy-now" onclick="buyNow(${p.id})">Buy Now</button>
      </div>
    </div>`;
}

/* Stars helper */
function getStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH & FILTER
═══════════════════════════════════════════════════════════════ */
let searchDebounce = null;

function filterProducts() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const category = document.getElementById("category-filter").value;
    const search = document.getElementById("search-input").value.trim();
    fetchProducts(category, search);
  }, 350);
}

function setRibbonCategory(category, btn) {
  // Update ribbon UI
  document.querySelectorAll(".ribbon-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  // Sync category dropdown
  document.getElementById("category-filter").value = category;
  fetchProducts(category, document.getElementById("search-input").value.trim());
}

/* ═══════════════════════════════════════════════════════════════
   CART LOGIC
═══════════════════════════════════════════════════════════════ */
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("shopswift_cart")) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("shopswift_cart", JSON.stringify(cart));
}

function updateCartBadge() {
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  const badge = document.getElementById("cart-badge");
  badge.textContent = total;

  // Bump animation
  badge.classList.remove("bump");
  void badge.offsetWidth; // reflow
  badge.classList.add("bump");
  setTimeout(() => badge.classList.remove("bump"), 300);
}

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, product.stock);
    showToast(`Quantity updated to ${existing.qty}`, "info");
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category,
      qty: 1,
      stock: product.stock,
    });
    showToast(`${product.name.substring(0, 30)}… added to cart!`, "success");
  }

  saveCart();
  updateCartBadge();

  // Update button state on the card
  const btn = document.getElementById(`cart-btn-${productId}`);
  if (btn) {
    btn.classList.add("added");
    btn.textContent = "✓ Added";
  }
}

function buyNow(productId) {
  addToCart(productId);
  showPage("cart");
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, Math.min(item.qty + delta, item.stock));
  saveCart();
  updateCartBadge();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartBadge();
  renderCart();
  showToast("Item removed from cart", "info");
}

/* ═══════════════════════════════════════════════════════════════
   CART RENDER
═══════════════════════════════════════════════════════════════ */
function renderCart() {
  const listEl = document.getElementById("cart-items-list");
  const summaryEl = document.getElementById("order-summary");

  if (!cart.length) {
    listEl.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added anything yet</p>
        <button class="btn-primary" onclick="showPage('home')">Start Shopping</button>
      </div>`;
    summaryEl.innerHTML = "";
    return;
  }

  // Items
  listEl.innerHTML = cart.map(item => {
    const subtotal = item.price * item.qty;
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}"
          onerror="this.src='https://via.placeholder.com/90/f0f4f8/0f1b2d?text=Img'" />
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-category">${item.category}</div>
          <div>
            <span class="cart-item-price">₹${formatNum(item.price)}</span>
            <span class="cart-item-original">₹${formatNum(item.originalPrice)}</span>
          </div>
          <div class="cart-item-controls">
            <div class="qty-control">
              <button class="qty-btn" onclick="updateQty(${item.id}, -1)">−</button>
              <span class="qty-num">${item.qty}</span>
              <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
            </div>
            <button class="btn-remove" onclick="removeFromCart(${item.id})">✕ Remove</button>
          </div>
        </div>
        <div class="cart-item-subtotal">
          <div class="subtotal-label">Subtotal</div>
          <div class="subtotal-val">₹${formatNum(subtotal)}</div>
        </div>
      </div>`;
  }).join("");

  // Summary
  const { subtotal, savings, delivery, total } = calcTotals();
  summaryEl.innerHTML = `
    <div class="summary-title">Price Details</div>
    <div class="summary-row">
      <span>Price (${cart.reduce((s,i)=>s+i.qty,0)} items)</span>
      <span>₹${formatNum(subtotal + savings)}</span>
    </div>
    <div class="summary-row discount">
      <span>Discount</span>
      <span>− ₹${formatNum(savings)}</span>
    </div>
    <div class="summary-row">
      <span>Delivery</span>
      <span>${delivery === 0 ? '<span style="color:var(--green);font-weight:700">FREE</span>' : "₹" + delivery}</span>
    </div>
    <hr class="summary-divider" />
    <div class="summary-row">
      <span class="summary-total">Total Amount</span>
      <span class="summary-total">₹${formatNum(total)}</span>
    </div>
    <div class="savings-badge">🎉 You save ₹${formatNum(savings)} on this order!</div>
    <button class="btn-checkout" onclick="showPage('checkout')">
      Proceed to Checkout →
    </button>`;
}

/* ═══════════════════════════════════════════════════════════════
   CHECKOUT RENDER
═══════════════════════════════════════════════════════════════ */
function renderCheckout() {
  const summaryEl = document.getElementById("checkout-summary");
  const { subtotal, savings, delivery, total } = calcTotals();

  summaryEl.innerHTML = `
    <div class="summary-title">Order Summary</div>
    ${cart.map(i => `
      <div class="summary-row" style="font-size:13px;align-items:flex-start;gap:10px">
        <span style="flex:1;line-height:1.4">${i.name} × ${i.qty}</span>
        <span style="flex-shrink:0;font-weight:700">₹${formatNum(i.price * i.qty)}</span>
      </div>`).join("")}
    <hr class="summary-divider"/>
    <div class="summary-row discount"><span>Discount</span><span>−₹${formatNum(savings)}</span></div>
    <div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? "FREE" : "₹"+delivery}</span></div>
    <hr class="summary-divider"/>
    <div class="summary-row">
      <span class="summary-total">Total</span>
      <span class="summary-total">₹${formatNum(total)}</span>
    </div>
    <div class="savings-badge" style="margin-top:12px">You save ₹${formatNum(savings)}!</div>`;

  // Pre-render EMI options if a payment method is already selected
  if (selectedPayment === "emi") renderEmiOptions(total);
}

function selectPayment(method) {
  selectedPayment = method;
  selectedEmiMonths = null;

  // Hide all detail sections
  ["upi","card","emi"].forEach(m => {
    const el = document.getElementById(`detail-${m}`);
    if (el) el.style.display = "none";
  });

  // Show relevant section
  const detail = document.getElementById(`detail-${method}`);
  if (detail) detail.style.display = "flex";

  if (method === "emi") {
    const { total } = calcTotals();
    renderEmiOptions(total);
  }
}

function renderEmiOptions(totalAmount) {
  const container = document.getElementById("emi-options");
  if (!container) return;

  const plans = [3, 6, 12];
  container.innerHTML = plans.map(months => {
    const emi = calcEmi(totalAmount, months);
    const totalPayable = emi * months;
    const interest = totalPayable - totalAmount;
    return `
      <div class="emi-option ${selectedEmiMonths === months ? "selected" : ""}"
           onclick="selectEmi(${months}, ${emi})">
        <div>
          <div class="emi-months">${months} Months</div>
          <div class="emi-total">Total: ₹${formatNum(totalPayable)} (Interest: ₹${formatNum(interest)})</div>
        </div>
        <div class="emi-amount">₹${formatNum(emi)}/mo</div>
      </div>`;
  }).join("");
}

function selectEmi(months, emiAmount) {
  selectedEmiMonths = months;
  document.querySelectorAll(".emi-option").forEach(el => el.classList.remove("selected"));
  event.currentTarget.classList.add("selected");
}

/* ═══════════════════════════════════════════════════════════════
   PLACE ORDER
═══════════════════════════════════════════════════════════════ */
async function placeOrder() {
  // Validate address
  const fields = [
    { id: "addr-name", label: "Full Name" },
    { id: "addr-phone", label: "Phone Number" },
    { id: "addr-line1", label: "Address Line 1" },
    { id: "addr-city", label: "City" },
    { id: "addr-state", label: "State" },
    { id: "addr-pin", label: "PIN Code" },
  ];

  let hasError = false;
  for (const f of fields) {
    const el = document.getElementById(f.id);
    const val = el ? el.value.trim() : "";
    if (!val) {
      el && el.classList.add("error");
      if (!hasError) {
        showToast(`Please fill in: ${f.label}`, "error");
        el && el.focus();
        hasError = true;
      }
    } else {
      el && el.classList.remove("error");
    }
  }
  if (hasError) return;

  // Validate phone
  const phone = document.getElementById("addr-phone").value.trim();
  if (!/^\d{10}$/.test(phone)) {
    showToast("Please enter a valid 10-digit phone number", "error");
    return;
  }

  // Validate PIN
  const pin = document.getElementById("addr-pin").value.trim();
  if (!/^\d{6}$/.test(pin)) {
    showToast("Please enter a valid 6-digit PIN code", "error");
    return;
  }

  // Validate payment
  if (!selectedPayment) {
    showToast("Please select a payment method", "error");
    return;
  }

  if (selectedPayment === "upi") {
    const upiId = document.getElementById("upi-id").value.trim();
    if (!upiId || !upiId.includes("@")) {
      showToast("Please enter a valid UPI ID", "error");
      return;
    }
  }

  if (selectedPayment === "emi" && !selectedEmiMonths) {
    showToast("Please select an EMI plan", "error");
    return;
  }

  // Build order payload
  const { total } = calcTotals();
  const address = {
    name: document.getElementById("addr-name").value.trim(),
    phone,
    line1: document.getElementById("addr-line1").value.trim(),
    line2: document.getElementById("addr-line2").value.trim(),
    city: document.getElementById("addr-city").value.trim(),
    state: document.getElementById("addr-state").value,
    pin,
  };

  const orderData = {
    items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    address,
    paymentMethod: selectedPayment,
    totalAmount: total,
    emiMonths: selectedEmiMonths,
  };

  // Show loading state
  const btn = document.getElementById("place-order-btn");
  const btnText = document.getElementById("pay-btn-text");
  const spinner = document.getElementById("pay-btn-spinner");
  btn.disabled = true;
  btnText.style.display = "none";
  spinner.style.display = "inline-block";

  try {
    // Simulate payment processing delay (like a real gateway)
    await new Promise(r => setTimeout(r, 1500));

    const order = await submitOrder(orderData);
    currentOrder = order;

    // Clear cart
    cart = [];
    saveCart();
    updateCartBadge();

    // Show confirmation
    showConfirmation(order);
  } catch (err) {
    showToast("Order failed. Please try again.", "error");
    btn.disabled = false;
    btnText.style.display = "inline";
    spinner.style.display = "none";
  }
}

/* ═══════════════════════════════════════════════════════════════
   ORDER CONFIRMATION
═══════════════════════════════════════════════════════════════ */
function showConfirmation(order) {
  showPage("confirmation");

  const detailsEl = document.getElementById("confirm-details");
  const payLabel = {
    upi: "UPI Payment",
    card: "Credit/Debit Card",
    cod: "Cash on Delivery",
    emi: `EMI — ${order.emiMonths} months`,
  }[order.paymentMethod] || order.paymentMethod;

  const deliveryDate = new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
    weekday: "long", month: "long", day: "numeric"
  });

  detailsEl.innerHTML = `
    <div class="confirm-row">
      <span>Order ID</span>
      <strong style="color:var(--navy);font-size:13px">${order.id}</strong>
    </div>
    <div class="confirm-row">
      <span>Amount Paid</span>
      <strong style="color:var(--green)">₹${formatNum(order.totalAmount)}</strong>
    </div>
    <div class="confirm-row">
      <span>Payment Method</span>
      <strong>${payLabel}</strong>
    </div>
    <div class="confirm-row">
      <span>Deliver To</span>
      <strong>${order.address.name}, ${order.address.city}</strong>
    </div>
    <div class="confirm-row">
      <span>Estimated Delivery</span>
      <strong style="color:var(--green)">${deliveryDate}</strong>
    </div>`;

  // Confetti!
  launchConfetti();
  showToast("🎉 Payment Successful! Order Confirmed", "success");
}

function continueShopping() {
  // Reset checkout state
  selectedPayment = null;
  selectedEmiMonths = null;
  document.querySelectorAll(".form-group input, .form-group select").forEach(el => {
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = "";
    el.classList.remove("error");
  });
  document.querySelectorAll("input[name='payment']").forEach(r => r.checked = false);
  ["upi","card","emi"].forEach(m => {
    const el = document.getElementById(`detail-${m}`);
    if (el) el.style.display = "none";
  });

  // Re-enable order button
  const btn = document.getElementById("place-order-btn");
  if (btn) {
    btn.disabled = false;
    document.getElementById("pay-btn-text").style.display = "inline";
    document.getElementById("pay-btn-spinner").style.display = "none";
  }

  showPage("home");
  // Re-fetch to reset card states
  fetchProducts();
}

/* ═══════════════════════════════════════════════════════════════
   CONFETTI ANIMATION
═══════════════════════════════════════════════════════════════ */
function launchConfetti() {
  const container = document.getElementById("confetti");
  container.innerHTML = "";
  const colors = ["#f5a623","#0f1b2d","#1a9e5f","#e53935","#3b82f6","#a855f7","#ec4899"];

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    const size = Math.random() * 10 + 5;
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size * (Math.random() > 0.5 ? 1 : 2.5)}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      transform: rotate(${Math.random() * 360}deg);
      animation-duration: ${Math.random() * 2 + 2}s;
      animation-delay: ${Math.random() * 0.8}s;
      opacity: ${Math.random() * 0.7 + 0.3};
      border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
    `;
    container.appendChild(piece);
  }

  // Clean up after animation
  setTimeout(() => container.innerHTML = "", 5000);
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════════ */
let toastTimer = null;

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  clearTimeout(toastTimer);

  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
    <span>${message}</span>`;

  // Force reflow then show
  void toast.offsetWidth;
  toast.classList.add("show");

  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

/** Format number as Indian currency style */
function formatNum(n) {
  return Math.round(n).toLocaleString("en-IN");
}

/** Calculate EMI with interest (5% for 3m, 7% for 6m, 10% for 12m) */
function calcEmi(price, months) {
  const rates = { 3: 0.05, 6: 0.07, 12: 0.10 };
  const rate = rates[months] || 0.07;
  return Math.ceil((price * (1 + rate)) / months);
}

/** Calculate cart totals */
function calcTotals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const mrp = cart.reduce((s, i) => s + i.originalPrice * i.qty, 0);
  const savings = mrp - subtotal;
  const delivery = subtotal > 499 ? 0 : 49;
  const total = subtotal + delivery;
  return { subtotal, savings, delivery, total };
}

/** Format card number with spaces */
function formatCard(input) {
  let v = input.value.replace(/\D/g, "").substring(0, 16);
  input.value = v.replace(/(.{4})/g, "$1 ").trim();
}

/** Format card expiry MM/YY */
function formatExpiry(input) {
  let v = input.value.replace(/\D/g, "").substring(0, 4);
  if (v.length >= 2) v = v.substring(0, 2) + " / " + v.substring(2);
  input.value = v;
}

/* Clear input error on focus */
document.addEventListener("focusin", (e) => {
  if (e.target.matches("input, select")) {
    e.target.classList.remove("error");
  }
});
