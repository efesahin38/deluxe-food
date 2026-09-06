/* ── Navbar scroll ───────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

/* ── Drawer ──────────────────────────── */
const hamburger     = document.getElementById('hamburger');
const drawer        = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose   = document.getElementById('drawerClose');

function openDrawer() {
  drawer.classList.add('open');
  drawerOverlay.classList.add('visible');
  hamburger.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('visible');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
}
hamburger.addEventListener('click', () =>
  drawer.classList.contains('open') ? closeDrawer() : openDrawer()
);
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
drawer.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeDrawer));

/* ── Tabs: drag-scroll on desktop ────── */
const tabsWrap = document.getElementById('menuTabs')?.parentElement;
if (tabsWrap) {
  let isDragging = false, startX = 0, scrollStart = 0;
  tabsWrap.addEventListener('mousedown', e => {
    isDragging = true; startX = e.clientX; scrollStart = tabsWrap.scrollLeft;
    tabsWrap.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    tabsWrap.scrollLeft = scrollStart - (e.clientX - startX);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false; tabsWrap.style.cursor = 'grab';
  });
}

const SUPABASE_URL = 'https://avsnsfvkhkqscmnnkgjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2c25zZnZraGtxc2Ntbm5rZ2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDA3MTMsImV4cCI6MjEwNDI3NjcxM30.8RCgiobVp9kGy2w58z4FDRdZF2BuV0LkgZQbKguO1aM';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── Menu & Cart Logic ───────────────── */
let cart = [];
const dynamicMenuContainer = document.getElementById('dynamicMenuContainer');

async function loadMenu() {
  if (!dynamicMenuContainer) return;
  try {
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Group by category
    const categories = {
      burger: [], vegi: [], doener: [], salate: [], pizza: [], pasta: []
    };
    
    items.forEach(item => {
      if (categories[item.category]) {
        categories[item.category].push(item);
      }
    });

    const categoryTitles = {
      burger: "Burger & Co", vegi: "Vegi Gerichte", doener: "Döner Spezialitäten",
      salate: "Frische Salate", pizza: "Pizza", pasta: "Pasta"
    };

    let html = '';
    let first = true;
    for (const [cat, catItems] of Object.entries(categories)) {
      html += `
        <div class="menu-panel ${first ? 'active' : ''}" id="cat-${cat}">
          <h3 class="cat-title">${categoryTitles[cat] || cat}</h3>
          <div class="menu-grid">
      `;
      catItems.forEach(item => {
        html += `
            <div class="mc">
              <div class="mc-left">
                <p class="mc-name">${item.name}</p>
                <p class="mc-desc">${item.description || ''}</p>
                <button class="add-to-cart-btn" onclick="addToCart('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.price})">Sepete Ekle</button>
              </div>
              <span class="mc-price">€ ${item.price.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
      });
      html += `</div></div>`;
      first = false;
    }

    dynamicMenuContainer.innerHTML = html;

    // Attach Tab logic after panels are rendered
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.menu-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const cat = tab.dataset.cat;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach(p => {
          p.classList.remove('active');
          if (p.id === 'cat-' + cat) p.classList.add('active');
        });
      });
    });

  } catch (err) {
    console.error(err);
    dynamicMenuContainer.innerHTML = '<p style="text-align:center; padding:40px;">Menü yüklenemedi.</p>';
  }
}

// Init Menu
loadMenu();

// Cart Functions
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const checkoutForm = document.getElementById('checkoutForm');
const proceedCheckoutBtn = document.getElementById('proceedCheckoutBtn');

window.toggleCart = function() {
  cartSidebar.classList.toggle('active');
  cartOverlay.classList.toggle('active');
  if (cartSidebar.classList.contains('active')) {
    checkoutForm.classList.add('hidden');
    proceedCheckoutBtn.classList.remove('hidden');
  }
}

window.addToCart = function(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  renderCart();
  
  // Show quick notification (optional)
  const btn = document.getElementById('floatingCartBtn');
  btn.style.transform = 'scale(1.2)';
  setTimeout(() => btn.style.transform = 'scale(1)', 200);
}

window.updateQty = function(id, change) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity += change;
    if (existing.quantity <= 0) {
      cart = cart.filter(item => item.id !== id);
    }
  }
  renderCart();
}

function renderCart() {
  let total = 0;
  let count = 0;
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Sepetiniz boş.</p>';
  } else {
    let html = '';
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      count += item.quantity;
      html += `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">€ ${itemTotal.toFixed(2).replace('.', ',')}</div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
          </div>
        </div>
      `;
    });
    cartItemsContainer.innerHTML = html;
  }
  
  cartTotalEl.textContent = `€ ${total.toFixed(2).replace('.', ',')}`;
  cartCountEl.textContent = count;
}

window.showCheckoutForm = function() {
  if (cart.length === 0) {
    alert("Sepetiniz boş!");
    return;
  }
  proceedCheckoutBtn.classList.add('hidden');
  checkoutForm.classList.remove('hidden');
}

// Checkout Submit
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const customer = {
    name: document.getElementById('custName').value,
    phone: document.getElementById('custPhone').value,
    email: document.getElementById('custEmail').value,
    note: document.getElementById('custNote').value
  };
  
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  
  const submitBtn = document.getElementById('submitOrderBtn');
  submitBtn.textContent = "İşleniyor...";
  submitBtn.disabled = true;

  try {
    const { data, error } = await supabase.functions.invoke('checkout', {
      body: { 
        customer, 
        cart, 
        paymentMethod,
        frontendUrl: window.location.origin
      }
    });
    
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    
    if (paymentMethod === 'cash') {
      alert("Siparişiniz başarıyla alındı! (Kapıda Ödeme)");
      cart = [];
      renderCart();
      toggleCart();
    } else if (data.url) {
      // Redirect to Stripe
      window.location.href = data.url;
    }
  } catch (err) {
    console.error(err);
    alert("Hata: " + err.message);
  } finally {
    submitBtn.textContent = "Siparişi Tamamla";
    submitBtn.disabled = false;
  }
});
