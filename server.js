/**
 * server.js — ShopSwift Mini E-Commerce Backend
 * Run: npm install express && node server.js
 */

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── In-Memory Product Catalog ────────────────────────────────────────────────
const products = [
  {
    id: 1,
    name: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    price: 24999,
    originalPrice: 34990,
    rating: 4.8,
    reviews: 12430,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
    badge: "Best Seller",
    description: "Industry-leading noise cancellation with 30hr battery life",
    stock: 45,
  },
  {
    id: 2,
    name: 'Samsung 65" 4K QLED TV',
    category: "Electronics",
    price: 89999,
    originalPrice: 129999,
    rating: 4.6,
    reviews: 8920,
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=400&q=80",
    badge: "31% Off",
    description: "Quantum HDR 32X, Dolby Atmos, Smart TV with Alexa built-in",
    stock: 12,
  },
  {
    id: 3,
    name: "Apple MacBook Air M3",
    category: "Computers",
    price: 114900,
    originalPrice: 134900,
    rating: 4.9,
    reviews: 5670,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80",
    badge: "New Launch",
    description: "15% faster than M2, 18hr battery, stunning Liquid Retina display",
    stock: 8,
  },
  {
    id: 4,
    name: "Nike Air Max 270",
    category: "Footwear",
    price: 10995,
    originalPrice: 14995,
    rating: 4.5,
    reviews: 22100,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    badge: "26% Off",
    description: "Max Air unit for all-day comfort, breathable mesh upper",
    stock: 78,
  },
  {
    id: 5,
    name: "Instant Pot Duo 7-in-1",
    category: "Kitchen",
    price: 8499,
    originalPrice: 11999,
    rating: 4.7,
    reviews: 34500,
    image: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80",
    badge: "Top Rated",
    description: "Pressure cooker, slow cooker, rice cooker, steamer & more",
    stock: 33,
  },
  {
    id: 6,
    name: "Kindle Paperwhite 11th Gen",
    category: "Books & Readers",
    price: 14999,
    originalPrice: 18999,
    rating: 4.8,
    reviews: 19800,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    badge: "21% Off",
    description: "6.8\" display, adjustable warm light, waterproof, 10 weeks battery",
    stock: 55,
  },
  {
    id: 7,
    name: "Levi's 511 Slim Fit Jeans",
    category: "Clothing",
    price: 3499,
    originalPrice: 4999,
    rating: 4.4,
    reviews: 41200,
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80",
    badge: "30% Off",
    description: "Slim fit through thigh and leg, sits below waist",
    stock: 120,
  },
  {
    id: 8,
    name: "Dyson V15 Detect Vacuum",
    category: "Home",
    price: 52900,
    originalPrice: 62900,
    rating: 4.7,
    reviews: 7340,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    badge: "Trending",
    description: "Laser detects invisible dust, HEPA filtration, 60min runtime",
    stock: 15,
  },
];

// ─── In-Memory Orders Store ───────────────────────────────────────────────────
const orders = [];

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/products — Return all products (with optional category filter)
app.get("/api/products", (req, res) => {
  const { category, search } = req.query;
  let result = [...products];

  if (category && category !== "All") {
    result = result.filter((p) => p.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  res.json({ success: true, data: result, total: result.length });
});

// GET /api/products/:id — Return single product
app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, data: product });
});

// POST /api/orders — Create a new order
app.post("/api/orders", (req, res) => {
  const { items, address, paymentMethod, totalAmount, emiMonths } = req.body;

  if (!items || !items.length || !address || !paymentMethod || !totalAmount) {
    return res.status(400).json({ success: false, message: "Missing required order fields" });
  }

  const orderId = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
  const order = {
    id: orderId,
    items,
    address,
    paymentMethod,
    totalAmount,
    emiMonths: emiMonths || null,
    status: "Confirmed",
    placedAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  };

  orders.push(order);
  console.log(`✅ Order placed: ${orderId} | ₹${totalAmount} | ${paymentMethod}`);

  res.json({ success: true, data: order });
});

// GET /api/orders/:id — Get order by ID
app.get("/api/orders/:id", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  res.json({ success: true, data: order });
});

// GET / — Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🛍️  ShopSwift is running at http://localhost:${PORT}`);
  console.log(`📦  ${products.length} products loaded in memory`);
  console.log(`🚀  Press Ctrl+C to stop\n`);
});
