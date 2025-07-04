import { db, auth } from './firebaseConfig.js';
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Admin credentials
const ADMIN_EMAIL = "sushan.kumar@hostel.com";

// DOM Elements
const loginForm = document.getElementById('adminLogin');
const adminContent = document.getElementById('adminContent');
const logoutBtn = document.getElementById('logoutBtn');
const loginBtn = document.getElementById('adminLoginBtn');
const errorMsg = document.getElementById('loginError');
const addProductForm = document.getElementById('addProductForm');

// ---- Admin Authentication ---- //
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        errorMsg.textContent = 'Access denied. Not an authorized admin.';
      } else {
        errorMsg.textContent = '';
      }
    } catch (error) {
      errorMsg.textContent = 'Invalid email or password.';
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
  });
}

// Auto Auth UI
onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    loginForm?.classList.add('hidden');
    adminContent?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');
    loadProducts();
    loadOrders();
  } else {
    loginForm?.classList.remove('hidden');
    adminContent?.classList.add('hidden');
    logoutBtn?.classList.add('hidden');
  }
});

// ---- Product Listing for Index ---- //
const productList = document.getElementById('productList');
if (productList) {
  onSnapshot(collection(db, 'products'), (snapshot) => {
    productList.innerHTML = '';
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('categorySelect')?.value || 'all';
    snapshot.forEach(docSnap => {
      const product = docSnap.data();
      const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchSearch = product.name.toLowerCase().includes(searchInput);
      if (matchCategory && matchSearch) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>₹${product.price}</p>
          <button onclick="addToCart('${docSnap.id}', '${product.name}', ${product.price})">Add to Cart</button>
        `;
        productList.appendChild(card);
      }
    });
  });
}

// Filters
document.getElementById('searchInput')?.addEventListener('input', () => location.reload());
document.getElementById('categorySelect')?.addEventListener('change', () => location.reload());
document.getElementById('adminSearchInput')?.addEventListener('input', () => location.reload());
document.getElementById('adminCategorySelect')?.addEventListener('change', () => location.reload());

// ---- Add Product ---- //
if (addProductForm) {
  addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const image = document.getElementById('productImage').value;

    await addDoc(collection(db, 'products'), { name, category, price, image });
    addProductForm.reset();
    alert("Product added!");
  });
}

// ---- Load Products in Admin Panel ---- //
function loadProducts() {
  const adminProductList = document.getElementById('adminProductList');
  if (!adminProductList) return;

  onSnapshot(collection(db, 'products'), (snapshot) => {
    adminProductList.innerHTML = '';
    const searchInput = document.getElementById('adminSearchInput')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('adminCategorySelect')?.value || 'all';

    snapshot.forEach(docSnap => {
      const product = docSnap.data();
      const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchSearch = product.name.toLowerCase().includes(searchInput);
      if (matchCategory && matchSearch) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>₹${product.price}</p>
          <p>Category: ${product.category}</p>
          <button onclick="deleteProduct('${docSnap.id}')">Delete</button>
        `;
        adminProductList.appendChild(card);
      }
    });
  });
}

// ---- Delete Product ---- //
window.deleteProduct = async (id) => {
  await deleteDoc(doc(db, 'products', id));
};

// ---- Cart ---- //
function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function setCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

window.addToCart = (id, name, price) => {
  const cart = getCart();
  const existing = cart.find(p => p.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id, name, price, quantity: 1 });
  setCart(cart);
  alert("Added to cart!");
};

const cartItems = document.getElementById('cartItems');
if (cartItems) {
  const cart = getCart();
  let total = 0;
  cartItems.innerHTML = '';
  cart.forEach(item => {
    total += item.price * item.quantity;
    const div = document.createElement('div');
    div.className = 'product-card';
    div.innerHTML = `
      <h3>${item.name}</h3>
      <p>Quantity: ${item.quantity}</p>
      <p>Price: ₹${item.price}</p>
      <p>Total: ₹${item.price * item.quantity}</p>
    `;
    cartItems.appendChild(div);
  });
  document.getElementById('cartTotal').textContent = total;
}

// ---- Place Order ---- //
const placeOrderBtn = document.getElementById('placeOrderBtn');
if (placeOrderBtn) {
  placeOrderBtn.addEventListener('click', async () => {
    const cart = getCart();
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    const username = prompt("Enter your name:");
    if (!username) return;

    await addDoc(collection(db, 'orders'), {
      username,
      items: cart,
      status: "Pending"
    });

    setCart([]);
    alert("Order placed!");
    location.href = "orders.html";
  });
}

// ---- View Orders for User ---- //
const userOrders = document.getElementById('userOrders');
if (userOrders) {
  onSnapshot(collection(db, 'orders'), (snapshot) => {
    userOrders.innerHTML = '';
    const username = prompt("Enter your name to view your orders:");
    snapshot.forEach(docSnap => {
      const order = docSnap.data();
      if (order.username === username) {
        let total = 0;
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `<h3>${order.username}</h3>`;
        order.items.forEach(item => {
          card.innerHTML += `<p>${item.name} × ${item.quantity} = ₹${item.price * item.quantity}</p>`;
          total += item.price * item.quantity;
        });
        card.innerHTML += `
          <p><strong>Total: ₹${total}</strong></p>
          <p>Status: <strong>${order.status}</strong></p>
        `;
        userOrders.appendChild(card);
      }
    });
  });
}

// ---- Load All Orders for Admin ---- //
function loadOrders() {
  const ordersContainer = document.getElementById('allOrders');
  if (!ordersContainer) return;

  onSnapshot(collection(db, 'orders'), (snapshot) => {
    ordersContainer.innerHTML = '';
    snapshot.forEach(docSnap => {
      const order = docSnap.data();
      const card = document.createElement('div');
      card.className = 'product-card';
      let total = 0;
      card.innerHTML = `<h3>${order.username}</h3>`;
      order.items.forEach(item => {
        card.innerHTML += `<p>${item.name} × ${item.quantity} = ₹${item.price * item.quantity}</p>`;
        total += item.price * item.quantity;
      });
      card.innerHTML += `
        <p><strong>Total: ₹${total}</strong></p>
        <p>Status: <strong>${order.status}</strong></p>
        <button onclick="updateOrderStatus('${docSnap.id}', 'Pending')">Mark Pending</button>
        <button onclick="updateOrderStatus('${docSnap.id}', 'Delivered')">Mark Delivered</button>
      `;
      ordersContainer.appendChild(card);
    });
  });
}

// ---- Update Order Status ---- //
window.updateOrderStatus = async (id, status) => {
  await updateDoc(doc(db, "orders", id), {
    status
  });
};



