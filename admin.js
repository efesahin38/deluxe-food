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
  loginError.textContent = 'Anmeldung läuft...';
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
    
    const targetId = tab.dataset.target;
    
    // Hide all views
    document.getElementById('ordersView').classList.add('hidden');
    document.getElementById('menuView').classList.add('hidden');
    document.getElementById('reportsView').classList.add('hidden');
    
    // Show target view
    document.getElementById(targetId).classList.remove('hidden');
  });
});

// Load Orders
refreshOrdersBtn.addEventListener('click', loadOrders);

async function loadOrders() {
  ordersTableBody.innerHTML = '<tr><td colspan="7">Wird geladen...</td></tr>';
  
  // Fetch orders and their items using a join
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    ordersTableBody.innerHTML = `<tr><td colspan="7">Fehler: ${error.message}</td></tr>`;
    return;
  }
  
  if (!orders || orders.length === 0) {
    ordersTableBody.innerHTML = '<tr><td colspan="7">Noch keine Bestellungen.</td></tr>';
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
    
    const noteHtml = order.note ? `<strong>Notiz:</strong> ${order.note}<br>` : '';
    const addressHtml = order.customer_address ? `<br>${order.customer_address}, ${order.customer_zip} ${order.customer_city}` : '';

    const paymentStatusText = order.payment_status === 'paid' ? 'Kreditkarte (Bezahlt)' : (order.payment_status === 'pending' ? 'Ausstehend' : 'Fehlgeschlagen');

    const isDelivered = order.delivery_status === 'delivered';
    const deliveryBtnHtml = isDelivered ? 
      `<span class="badge" style="background:#D1FAE5; color:#065F46;">Zugestellt ✔️</span>` : 
      `<button class="btn-small" onclick="markDelivered('${order.id}')" style="background:#10B981;">✔️ Zustellen</button>`;

    tr.innerHTML = `
      <td>${date}</td>
      <td>${order.customer_name}</td>
      <td>${order.customer_phone}<br>${order.customer_email}${addressHtml}</td>
      <td>${order.payment_method === 'cash' ? 'Bar (Lieferung)' : 'Kreditkarte (Stripe)'}</td>
      <td>
        <div style="margin-bottom:6px;"><span class="badge ${order.payment_status}">${paymentStatusText}</span></div>
        ${deliveryBtnHtml}
      </td>
      <td>€${order.total_amount.toFixed(2)}</td>
      <td>${noteHtml} <ul>${itemsHtml}</ul></td>
    `;
    ordersTableBody.appendChild(tr);
  });
}

window.markDelivered = async function(id) {
  const { error } = await supabase
    .from('orders')
    .update({ delivery_status: 'delivered' })
    .eq('id', id);
    
  if (error) {
    alert('Fehler beim Aktualisieren: ' + error.message);
  } else {
    loadOrders(); // refresh table
  }
}

// Load Menu
async function loadMenu() {
  menuTableBody.innerHTML = '<tr><td colspan="5">Wird geladen...</td></tr>';
  
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    menuTableBody.innerHTML = `<tr><td colspan="5">Fehler: ${error.message}</td></tr>`;
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
      <td>${item.is_available ? 'Aktiv' : 'Versteckt'}</td>
      <td style="display:flex; gap:6px;">
        <button class="btn-small" onclick="updatePrice('${item.id}')">Speichern</button>
        <button class="btn-hide" onclick="toggleVisibility('${item.id}', ${item.is_available})">
          ${item.is_available ? 'Verbergen' : 'Anzeigen'}
        </button>
        <button class="btn-hide" style="color:var(--red); border-color:var(--red);" onclick="deleteProduct('${item.id}')">Löschen</button>
      </td>
    `;
    menuTableBody.appendChild(tr);
  });
}

window.toggleVisibility = async function(id, currentStatus) {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: !currentStatus })
    .eq('id', id);
    
  if (error) {
    alert('Fehler beim Aktualisieren: ' + error.message);
  } else {
    loadMenu(); // refresh table
  }
}

window.deleteProduct = async function(id) {
  if (!confirm("Möchten Sie dieses Produkt wirklich löschen?")) return;
  
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);
    
  if (error) {
    alert('Fehler beim Löschen: ' + error.message);
  } else {
    alert('Produkt gelöscht!');
    loadMenu();
  }
}

// Add New Product
const saveNewProdBtn = document.getElementById('saveNewProdBtn');
if (saveNewProdBtn) {
  saveNewProdBtn.addEventListener('click', async () => {
    const category = document.getElementById('newProdCat').value;
    const name = document.getElementById('newProdName').value;
    const desc = document.getElementById('newProdDesc').value;
    const price = document.getElementById('newProdPrice').value;
    
    if (!name || !price) {
      return alert("Bitte Produktname und Preis eingeben.");
    }
    
    saveNewProdBtn.textContent = "Lädt...";
    const { error } = await supabase
      .from('menu_items')
      .insert({
        category,
        name,
        description: desc,
        price: parseFloat(price),
        is_available: true
      });
      
    saveNewProdBtn.textContent = "Hinzufügen";
    
    if (error) {
      alert("Fehler: " + error.message);
    } else {
      document.getElementById('newProdName').value = "";
      document.getElementById('newProdDesc').value = "";
      document.getElementById('newProdPrice').value = "";
      loadMenu();
    }
  });
}

window.updatePrice = async function(id) {
  const newPrice = document.getElementById(`price-${id}`).value;
  if (!newPrice) return alert('Bitte geben Sie einen gültigen Preis ein.');
  
  const { error } = await supabase
    .from('menu_items')
    .update({ price: parseFloat(newPrice) })
    .eq('id', id);
    
  if (error) {
    alert('Fehler beim Aktualisieren des Preises: ' + error.message);
  } else {
    alert('Preis erfolgreich aktualisiert!');
  }
}

// ----------------------------------------------------
// REPORTS LOGIC
// ----------------------------------------------------
const reportFilterType = document.getElementById('reportFilterType');
const reportDateInput = document.getElementById('reportDateInput');
const reportMonthInput = document.getElementById('reportMonthInput');
const generateReportBtn = document.getElementById('generateReportBtn');
const reportTableBody = document.querySelector('#reportTable tbody');
const totalRevenueDisplay = document.getElementById('totalRevenueDisplay');
const exportPdfBtn = document.getElementById('exportPdfBtn');

let currentReportData = [];
let currentReportTotal = 0;
let currentReportLabel = "";

if (reportFilterType) {
  // Set default to today
  const today = new Date().toISOString().split('T')[0];
  reportDateInput.value = today;
  
  const thisMonth = today.substring(0, 7);
  reportMonthInput.value = thisMonth;

  reportFilterType.addEventListener('change', (e) => {
    if (e.target.value === 'day') {
      reportDateInput.classList.remove('hidden');
      reportMonthInput.classList.add('hidden');
    } else {
      reportDateInput.classList.add('hidden');
      reportMonthInput.classList.remove('hidden');
    }
  });

  generateReportBtn.addEventListener('click', async () => {
    const isDay = reportFilterType.value === 'day';
    let startDate, endDate, label;

    if (isDay) {
      if (!reportDateInput.value) return alert('Bitte wählen Sie ein Datum.');
      label = 'Tagesbericht: ' + reportDateInput.value;
      startDate = new Date(reportDateInput.value);
      endDate = new Date(reportDateInput.value);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      if (!reportMonthInput.value) return alert('Bitte wählen Sie einen Monat.');
      label = 'Monatsbericht: ' + reportMonthInput.value;
      startDate = new Date(reportMonthInput.value + '-01');
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    reportTableBody.innerHTML = '<tr><td colspan="3">Bericht wird erstellt...</td></tr>';
    
    // Fetch orders within date range that are not failed
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .neq('payment_status', 'failed');

    if (error) {
      reportTableBody.innerHTML = `<tr><td colspan="3">Fehler: ${error.message}</td></tr>`;
      return;
    }

    let totalRev = 0;
    const itemsMap = {}; // name -> {qty, rev}

    orders.forEach(o => {
      totalRev += Number(o.total_amount);
      if (o.order_items) {
        o.order_items.forEach(item => {
          if (!itemsMap[item.menu_item_name]) {
            itemsMap[item.menu_item_name] = { qty: 0, rev: 0 };
          }
          itemsMap[item.menu_item_name].qty += item.quantity;
          itemsMap[item.menu_item_name].rev += item.quantity * Number(item.price_at_time);
        });
      }
    });

    currentReportTotal = totalRev;
    currentReportLabel = label;
    totalRevenueDisplay.textContent = `€${totalRev.toFixed(2)}`;

    // Convert map to array and sort by revenue descending
    currentReportData = Object.keys(itemsMap).map(k => ({
      name: k,
      qty: itemsMap[k].qty,
      rev: itemsMap[k].rev
    })).sort((a, b) => b.rev - a.rev);

    if (currentReportData.length === 0) {
      reportTableBody.innerHTML = '<tr><td colspan="3">Keine Verkäufe im gewählten Zeitraum.</td></tr>';
      return;
    }

    reportTableBody.innerHTML = currentReportData.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}x</td>
        <td>€${item.rev.toFixed(2)}</td>
      </tr>
    `).join('');
  });

  exportPdfBtn.addEventListener('click', () => {
    if (currentReportData.length === 0) {
      return alert('Es gibt keine Daten zum Exportieren. Bitte erstellen Sie zuerst einen Bericht.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Deluxe Food - ' + currentReportLabel, 14, 22);
    
    doc.setFontSize(14);
    doc.text(`Gesamtumsatz: EUR ${currentReportTotal.toFixed(2)}`, 14, 32);
    
    const tableData = currentReportData.map(item => [
      item.name,
      item.qty.toString(),
      'EUR ' + item.rev.toFixed(2)
    ]);
    
    doc.autoTable({
      startY: 40,
      head: [['Produktname', 'Menge', 'Umsatz']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [232, 25, 44] } // Red color
    });
    
    doc.save(`DeluxeFood_${currentReportLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  });
}

// Init
checkUser();
