import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://avsnsfvkhkqscmnnkgjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2c25zZnZraGtxc2Ntbm5rZ2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDA3MTMsImV4cCI6MjEwNDI3NjcxM30.8RCgiobVp9kGy2w58z4FDRdZF2BuV0LkgZQbKguO1aM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

const tabs = document.querySelectorAll('.tab');
const ordersView = document.getElementById('ordersView');
const menuView = document.getElementById('menuView');
const ordersTableBody = document.querySelector('#ordersTable tbody');
const menuTableBody = document.querySelector('#menuTable tbody');
const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');

// Auth State
let session = null;

async function checkUser() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    session = data.session;
    showDashboard();
  } else {
    showLogin();
  }
}

function showDashboard() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  loadOrders();
  loadMenu();
}

function showLogin() {
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
}

// Login
loginBtn.addEventListener('click', async () => {
  loginError.textContent = 'Giriş yapılıyor...';
  const email = emailInput.value;
  const password = passwordInput.value;
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    loginError.textContent = error.message;
  } else {
    loginError.textContent = '';
    session = data.session;
    showDashboard();
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  session = null;
  showLogin();
});

// Tab Switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    if (tab.dataset.target === 'ordersView') {
      ordersView.classList.remove('hidden');
      menuView.classList.add('hidden');
    } else {
      ordersView.classList.add('hidden');
      menuView.classList.remove('hidden');
    }
  });
});

// Load Orders
refreshOrdersBtn.addEventListener('click', loadOrders);

async function loadOrders() {
  ordersTableBody.innerHTML = '<tr><td colspan="7">Yükleniyor...</td></tr>';
  
  // Fetch orders and their items using a join
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Hata:", error);
    ordersTableBody.innerHTML = `<tr><td colspan="7">Hata: ${error.message}</td></tr>`;
    return;
  }
  
  if (!orders || orders.length === 0) {
    ordersTableBody.innerHTML = '<tr><td colspan="7">Henüz sipariş yok.</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = '';
  
  orders.forEach(order => {
    const tr = document.createElement('tr');
    
    const date = new Date(order.created_at).toLocaleString('tr-TR');
    
    // Format items
    const itemsHtml = order.order_items.map(item => 
      `<li>${item.quantity}x ${item.menu_item_name} (€${item.price_at_time})</li>`
    ).join('');
    
    const noteHtml = order.note ? `<strong>Not:</strong> ${order.note}<br>` : '';

    tr.innerHTML = `
      <td>${date}</td>
      <td>${order.customer_name}</td>
      <td>${order.customer_phone}<br>${order.customer_email}</td>
      <td>${order.payment_method === 'cash' ? 'Nakit (Kapıda)' : 'Kredi Kartı (Stripe)'}</td>
      <td><span class="badge ${order.payment_status}">${order.payment_status === 'paid' ? 'Ödendi' : 'Bekliyor'}</span></td>
      <td>€${order.total_amount}</td>
      <td>${noteHtml} <ul>${itemsHtml}</ul></td>
    `;
    ordersTableBody.appendChild(tr);
  });
}

// Load Menu
async function loadMenu() {
  menuTableBody.innerHTML = '<tr><td colspan="5">Yükleniyor...</td></tr>';
  
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    menuTableBody.innerHTML = `<tr><td colspan="5">Hata: ${error.message}</td></tr>`;
    return;
  }

  menuTableBody.innerHTML = '';
  
  data.forEach(item => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>${item.category}</td>
      <td>${item.name}</td>
      <td>
        <input type="number" step="0.10" class="menu-edit-input" id="price-${item.id}" value="${item.price}">
      </td>
      <td>${item.is_available ? 'Aktif' : 'Pasif'}</td>
      <td>
        <button class="btn-small" onclick="updatePrice('${item.id}')">Kaydet</button>
      </td>
    `;
    menuTableBody.appendChild(tr);
  });
}

window.updatePrice = async function(id) {
  const newPrice = document.getElementById(`price-${id}`).value;
  if (!newPrice) return alert('Lütfen geçerli bir fiyat girin.');
  
  const { error } = await supabase
    .from('menu_items')
    .update({ price: parseFloat(newPrice) })
    .eq('id', id);
    
  if (error) {
    alert('Fiyat güncellenirken hata oluştu: ' + error.message);
  } else {
    alert('Fiyat başarıyla güncellendi!');
  }
}

// Init
checkUser();
