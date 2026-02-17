import './style.css'
import { gsap } from 'gsap'
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, onSnapshot, addDoc, doc, setDoc, increment } from "firebase/firestore";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check if lucide exists, if not wait for window load
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
} else {
  window.addEventListener('load', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });
}

// --- THEME LOGIC ---
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  // Initialize theme based on localStorage or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);

  // Update icons visibility on load
  const moonIcon = document.getElementById('moon-icon');
  const sunIcon = document.getElementById('sun-icon');
  if (moonIcon && sunIcon) {
    if (savedTheme === 'dark') {
      moonIcon.style.display = 'block';
      sunIcon.style.display = 'none';
    } else {
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    }
  }

  themeBtn.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';

    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    if (moonIcon && sunIcon) {
      moonIcon.style.display = isDark ? 'none' : 'block';
      sunIcon.style.display = isDark ? 'block' : 'none';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Animate transition
    gsap.fromTo('body', { opacity: 0.8 }, { opacity: 1, duration: 0.5 });
  });
}

// --- SIDEBAR LOGIC ---
const openSidebar = (id) => {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
};
const closeSidebar = (id) => {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
};

const cartBtn = document.getElementById('btn-cart'); // Changed from cart-btn to btn-cart to match HTML
if (cartBtn) cartBtn.onclick = () => openSidebar('cart-sidebar');

const closeCart = document.getElementById('close-cart');
if (closeCart) closeCart.onclick = () => closeSidebar('cart-sidebar');

const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.onclick = () => openSidebar('profile-sidebar');

const closeProfile = document.getElementById('close-profile');
if (closeProfile) closeProfile.onclick = () => closeSidebar('profile-sidebar');


// --- FIREBASE AUTH ---
const googleSignInBtn = document.getElementById('google-login');
const authView = document.getElementById('auth-view');

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Logged in:", result.user);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed: " + error.message);
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (loginBtn) loginBtn.innerHTML = `<img src="${user.photoURL}" class="user-avatar" title="${user.displayName}">`;

    // Create logout button in auth view if not exists
    if (authView) {
      authView.innerHTML = `
        <div style="text-align:center; padding: 20px;">
          <img src="${user.photoURL}" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 10px;">
          <h3>${user.displayName}</h3>
          <p style="opacity: 0.7; font-size: 0.9em; margin-bottom: 20px;">${user.email}</p>
          <button id="logout-btn" class="btn btn-primary" style="width:100%">Logout</button>
          <a href="/admin.html" style="display:block; margin-top:15px; text-decoration:none; opacity:0.6">Go to Admin Dashboard</a>
        </div>
      `;

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          signOut(auth);
        });
      }
    }
  } else {
    // Show login icon
    if (loginBtn) loginBtn.innerHTML = `<i data-lucide="user"></i>`;

    // Reset auth view
    if (authView) {
      authView.innerHTML = `
        <button id="google-login" class="btn" style="width:100%; margin-bottom:10px;">Login with Google</button>
        <a href="/admin.html" style="display:block; text-align:center; opacity:0.5; text-decoration:none; margin-top:10px;">Admin Login</a>
      `;
      // Re-attach listener
      const newLoginBtn = document.getElementById('google-login');
      if (newLoginBtn) {
        newLoginBtn.onclick = async () => {
          const provider = new GoogleAuthProvider();
          try {
            await signInWithPopup(auth, provider);
          } catch (e) { alert(e.message); }
        };
      }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
});


// --- PRODUCTS LOGIC ---
const prodList = document.getElementById('products-list');
if (prodList) {
  onSnapshot(collection(db, "products"), snap => {
    if (snap.empty) {
      prodList.innerHTML = `<p style="grid-column: 1/-1; text-align:center; opacity:0.5">No products available yet.</p>`;
      return;
    }
    prodList.innerHTML = "";
    snap.forEach(d => {
      const p = d.data();
      if (p.visible === false) return;
      const card = document.createElement('div');
      card.className = "product-card";
      card.innerHTML = `
                  <img src="${p.main_image}" class="product-img">
                  <div class="product-info">
                      <h3>${p.name}</h3>
                      <p class="p-price">${p.price_now} EGP</p>
                      <button class="btn btn-primary add-btn" style="width:100%; margin-top:1rem; padding:0.8rem; font-size:0.8rem;" 
                          data-id="${d.id}" data-name="${p.name}" data-price="${p.price_now}" data-img="${p.main_image}">
                          Add to Bag
                      </button>
                  </div>
              `;
      prodList.appendChild(card);
    });

    document.querySelectorAll('.add-btn').forEach(b => {
      b.onclick = () => {
        addToBag({ ...b.dataset });
        openSidebar('cart-sidebar');
      };
    });
  }, err => {
    console.error(err);
    prodList.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:red">Error loading products. Check console.</p>`;
  });
}

// --- BAG LOGIC ---
let bag = JSON.parse(localStorage.getItem('bag')) || [];
const renderBag = () => {
  const bagItems = document.getElementById('cart-items');
  const totalBox = document.getElementById('checkout-box');
  if (!bagItems) return;

  if (bag.length === 0) {
    bagItems.innerHTML = `<p style="opacity:0.5; text-align:center; margin-top:20px;">Your bag is empty.</p>`;
    if (totalBox) totalBox.style.display = 'none';
    return;
  }
  if (totalBox) totalBox.style.display = 'block';

  bagItems.innerHTML = bag.map((item, idx) => `
            <div style="display:flex; gap:15px; margin-bottom:1.5rem; align-items:center;">
                <img src="${item.img}" style="width:50px; height:70px; object-fit:cover; border-radius:5px;">
                <div style="flex:1"><h4>${item.name}</h4><p>${item.price} EGP × ${item.qty}</p></div>
                <button onclick="window.ripBag(${idx})" style="background:none; border:none; color:var(--text-color); cursor:pointer;"><i data-lucide="x"></i></button>
            </div>
        `).join('');

  if (document.getElementById('bag-total')) {
    document.getElementById('bag-total').innerText = bag.reduce((s, i) => s + (i.price * i.qty), 0).toLocaleString() + " EGP";
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
};

const addToBag = (p) => {
  const ex = bag.find(i => i.id === p.id);
  if (ex) ex.qty++; else bag.push({ ...p, qty: 1 });
  localStorage.setItem('bag', JSON.stringify(bag));
  renderBag();
};

// Expose ripBag to window so onclick works in innerHTML
window.ripBag = (idx) => {
  bag.splice(idx, 1);
  localStorage.setItem('bag', JSON.stringify(bag));
  renderBag();
};

// Checkout
const checkoutBtn = document.getElementById('checkout-btn');
if (checkoutBtn) {
  checkoutBtn.onclick = async (e) => {
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const addr = document.getElementById('c-addr').value;
    if (!name || !phone || !addr) return alert("Please fill in all details");

    e.target.disabled = true;
    e.target.innerText = "Processing...";

    try {
      await addDoc(collection(db, "orders"), {
        customer_name: name,
        phone,
        address: addr,
        items: bag,
        total_price: bag.reduce((s, i) => s + (i.price * i.qty), 0),
        status: 'Pending',
        createdAt: new Date()
      });
      alert("Order Placed Successfully!");
      bag = [];
      localStorage.setItem('bag', "[]");
      renderBag();
      closeSidebar('cart-sidebar');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      e.target.disabled = false;
      e.target.innerText = "Order Now";
    }
  };
}

// Initial Render of Bag
renderBag();


// --- VISITOR TRACKING ---
// Simple session-based tracking
if (!sessionStorage.getItem('v_tracked')) {
  sessionStorage.setItem('v_tracked', '1');
  const counterRef = doc(db, "stats", "counters");
  setDoc(counterRef, { total_visitors: increment(1) }, { merge: true });
}

// GSAP Animations
gsap.from("#hero-title", { y: 50, opacity: 0, duration: 1.5, ease: "power3.out" });
gsap.from(".logo", { y: -20, opacity: 0, duration: 1, delay: 0.2 });
gsap.from("nav .icon-btn", { y: -20, opacity: 0, duration: 1, stagger: 0.1, delay: 0.4 });

// Final icon refresh
if (typeof lucide !== 'undefined') lucide.createIcons();
