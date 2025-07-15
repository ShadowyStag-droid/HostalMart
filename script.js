// script.js (for index.html and cart.html)
import { db } from './firebaseConfig.js';
import {
  collection, addDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const productsGrid = document.getElementById("products") || document.getElementById("productList");
  const categoryFilter = document.getElementById("categoryFilter") || document.getElementById("categorySelect");
  const searchInput = document.getElementById("searchInput");

  // ---------------------------------------
  // Homepage: Load & Filter Products
  // ---------------------------------------
  if (productsGrid) {
    onSnapshot(collection(db, "products"), (snapshot) => {
      const products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });

      renderProducts(products);

      categoryFilter?.addEventListener("change", () => renderProducts(products));
      searchInput?.addEventListener("input", () => renderProducts(products));

      function renderProducts(all) {
        let filtered = [...all];
        const category = categoryFilter?.value;
        const search = searchInput?.value?.toLowerCase();

        if (category && category !== "all") {
          filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
          filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
        }

        productsGrid.innerHTML = filtered.map(prod => `
          <div class="product-card">
            ${prod.imageUrl ? `<img src="${prod.imageUrl}" alt="${prod.name}" class="product-img">` : ""}
            <h3>${prod.name}</h3>
            <p>₹${prod.price}</p>
            <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})">Add to Cart</button>
          </div>
        `).join("");
      }
    });
  }

  // ---------------------------------------
  // Cart Page: Display & Actions
  // ---------------------------------------
  const cartItemsContainer = document.getElementById("cartItems");
  const placeOrderBtn = document.getElementById("placeOrderBtn");

  function loadCart() {
    if (!cartItemsContainer) return;

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cartItemsContainer.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.style.backgroundColor = "#999";
        placeOrderBtn.style.cursor = "not-allowed";
      }
      return;
    }

    if (placeOrderBtn) {
      placeOrderBtn.disabled = false;
      placeOrderBtn.style.backgroundColor = "";
      placeOrderBtn.style.cursor = "pointer";
    }

    cart.forEach((item, index) => {
      const subtotal = item.price * item.quantity;
      total += subtotal;

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <h3>${item.name}</h3>
        <p>Price: ₹${item.price}</p>
        <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin: 10px 0;">
          <button class="nav-btn" onclick="adjustQuantity(${index}, -1)">-</button>
          <span>Qty: ${item.quantity}</span>
          <button class="nav-btn" onclick="adjustQuantity(${index}, 1)">+</button>
        </div>
        <p>Subtotal: ₹${subtotal}</p>
        <button class="nav-btn danger-btn" onclick="removeItem(${index})">Remove</button>
      `;
      cartItemsContainer.appendChild(card);
    });

    const totalDiv = document.createElement("div");
    totalDiv.innerHTML = `<h2>Total: ₹${total}</h2>`;
    cartItemsContainer.appendChild(totalDiv);
  }

  window.adjustQuantity = function(index, delta) {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) cart[index].quantity = 1;
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
  };

  window.removeItem = function(index) {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.splice(index, 1);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
  };

  // ---------------------------------------
  // Cart Page: Place Order
  // ---------------------------------------
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
      }

      const name = document.getElementById("userName").value;
      const room = document.getElementById("userRoom").value;
      const mobile = document.getElementById("userMobile").value;
      const remember = document.getElementById("rememberMe").checked;

      if (!name || !room || !mobile) {
        alert("Please fill all fields.");
        return;
      }

      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await addDoc(collection(db, "orders"), {
        name, room, mobile, cart, total,
        status: "Pending",
        timestamp: Date.now()
      });

      if (remember) {
        localStorage.setItem("userInfo", JSON.stringify({ name, room, mobile }));
      } else {
        localStorage.removeItem("userInfo");
      }

      localStorage.removeItem("cart");
      alert("Order placed successfully!");
      window.location.href = "orders.html";
    });

    // Prefill user info if remembered
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo) {
      document.getElementById("userName").value = userInfo.name || "";
      document.getElementById("userRoom").value = userInfo.room || "";
      document.getElementById("userMobile").value = userInfo.mobile || "";
      document.getElementById("rememberMe").checked = true;
    }

    // Load cart on cart.html
    loadCart();
  }

  // ---------------------------------------
  // Expose Add to Cart (used by index.html)
  // ---------------------------------------
  window.addToCart = function (id, name, price) {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find(p => p.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id, name, price, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };
});








