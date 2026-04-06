/* ===Supabase database ==*/
const SUPABASE_URL = 'https://pcnlidstcodvitoacpej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmxpZHN0Y29kdml0b2FjcGVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2ODU0OCwiZXhwIjoyMDkwNzQ0NTQ4fQ.TDHlqEvJYYzc3wdY6f9bdPsx7rdsUDM9hcWjEVvJ6wQ';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   STORAGE KEYS
========================= */
const TX_KEY = "ff_transactions_v1";
const BUD_KEY = "ff_budgets_v1";
const CAT_KEY = "ff_categories_v1";
const USER_KEY = "ff_users_v1";
const SESSION_KEY = "ff_current_user_v1";

/* =========================
   APP STATE
========================= */
let searchTerm = "";
let editingTxId = null;
let editingBudId = null;

/* =========================
   HELPERS
========================= */
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function money(n) {
  return Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD"
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

/* =========================
   AUTH STORAGE
========================= */
function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USER_KEY, JSON.stringify(users));
}

function setCurrentUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function clearCurrentUser() {
  localStorage.removeItem(SESSION_KEY);
}

/* =========================
   AUTH UI HELPERS
========================= */
function clearAuthMessages() {
  const errorIds = ["loginError", "signupError", "forgotError"];
  const successIds = ["forgotSuccess"];

  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "none";
      el.textContent = "";
    }
  });

  successIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "none";
      el.textContent = "";
    }
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  el.textContent = msg;
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  el.textContent = msg;
}

function showAuthView(name) {
  clearAuthMessages();

  const views = ["login", "signup", "forgot"];
  for (const view of views) {
    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.toggle("active", view === name);
  }
}

/* =========================
   AUTH ACTIONS
========================= */
function handleSignup() {
  clearAuthMessages();

  const username = (document.getElementById("signupUsername").value || "").trim();
  const email = (document.getElementById("signupEmail").value || "").trim().toLowerCase();
  const password = document.getElementById("signupPassword").value || "";
  const confirmPassword = document.getElementById("signupConfirmPassword").value || "";

  if (!username) return showError("signupError", "Enter a username.");
  if (!email) return showError("signupError", "Enter an email.");
  if (!isValidEmail(email)) return showError("signupError", "Enter a valid email.");
  if (!password) return showError("signupError", "Enter a password.");
  if (password.length < 6) return showError("signupError", "Password must be at least 6 characters.");
  if (password !== confirmPassword) return showError("signupError", "Passwords do not match.");

  const users = loadUsers();

  const usernameExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (usernameExists) return showError("signupError", "That username already exists.");

  const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailExists) return showError("signupError", "That email is already registered.");

  const newUser = {
    id: uid(),
    username,
    email,
    password
  };

  users.push(newUser);
  saveUsers(users);

  document.getElementById("loginIdentifier").value = email;
  document.getElementById("loginPassword").value = "";
  showAuthView("login");
}

function handleLogin() {
  clearAuthMessages();

  const identifier = (document.getElementById("loginIdentifier").value || "").trim().toLowerCase();
  const password = document.getElementById("loginPassword").value || "";

  if (!identifier) return showError("loginError", "Enter your username or email.");
  if (!password) return showError("loginError", "Enter your password.");

  const users = loadUsers();
  const user = users.find(u =>
    u.email.toLowerCase() === identifier || u.username.toLowerCase() === identifier
  );

  if (!user) return showError("loginError", "Account not found.");
  if (user.password !== password) return showError("loginError", "Incorrect password.");

  setCurrentUser({
    id: user.id,
    username: user.username,
    email: user.email
  });

  openApp();
}

function handleForgotPassword() {
  clearAuthMessages();

  const email = (document.getElementById("forgotEmail").value || "").trim().toLowerCase();
  const newPassword = document.getElementById("forgotNewPassword").value || "";

  if (!email) return showError("forgotError", "Enter your email.");
  if (!isValidEmail(email)) return showError("forgotError", "Enter a valid email.");
  if (!newPassword) return showError("forgotError", "Enter a new password.");
  if (newPassword.length < 6) return showError("forgotError", "Password must be at least 6 characters.");

  const users = loadUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === email);

  if (index === -1) return showError("forgotError", "No account found with that email.");

  users[index].password = newPassword;
  saveUsers(users);

  showSuccess("forgotSuccess", "Password updated. You can sign in now.");
}
async function loadTransactionsFromDB() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*');

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  
  return data; 
}
/* =========================
   APP VISIBILITY
========================= */
function openApp() {
  document.getElementById("authPage").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");
  showPage("dashboard");
  renderAll();
}

function logoutUser() {
  clearCurrentUser();
  document.getElementById("appShell").classList.add("hidden");
  document.getElementById("authPage").classList.remove("hidden");
  showAuthView("login");
}

/* =========================
   PAGE NAVIGATION
========================= */
function showPage(name) {
  const pages = ["dashboard", "transactions", "budget", "reports"];

  for (const p of pages) {
    const page = document.getElementById("page-" + p);
    const tab = document.getElementById("tab-" + p);

    if (page) page.classList.toggle("active", p === name);
    if (tab) tab.classList.toggle("active", p === name);
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

function setSearch(v) {
  searchTerm = (v || "").trim().toLowerCase();
  renderAll();
}

/* =========================
   MODAL HELPERS
========================= */
function openModal(id) {
  document.getElementById(id).style.display = "flex";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

function backdropClose(e, id) {
  if (e.target.id === id) closeModal(id);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal("txModal");
    closeModal("budgetModal");
  }
});

/* =========================
   DATA LOAD / SAVE
========================= */
function loadTx() {
  try {
    return JSON.parse(localStorage.getItem(TX_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTx(txs) {
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
}

function loadBudgets() {
  try {
    const b = JSON.parse(localStorage.getItem(BUD_KEY));
    if (Array.isArray(b)) return b;
  } catch {}

  const empty = [];
  localStorage.setItem(BUD_KEY, JSON.stringify(empty));
  return empty;
}

function saveBudgets(buds) {
  localStorage.setItem(BUD_KEY, JSON.stringify(buds));
}

function loadCategories() {
  try {
    const c = JSON.parse(localStorage.getItem(CAT_KEY));
    if (Array.isArray(c) && c.length) return c;
  } catch {}

  const defaults = ["Other", "Salary"];
  localStorage.setItem(CAT_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveCategories(cats) {
  localStorage.setItem(CAT_KEY, JSON.stringify(cats));
}

/* =========================
   CATEGORY MERGING
========================= */
function getAllCategoryOptions() {
  const set = new Map();

  for (const c of loadCategories()) set.set(c.toLowerCase(), c);
  for (const b of loadBudgets()) set.set(String(b.category).toLowerCase(), b.category);

  for (const t of loadTx()) {
    if (t.category) set.set(String(t.category).toLowerCase(), t.category);
  }

  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

/* =========================
   CALCULATIONS
========================= */
function computeTotals(txs) {
  let income = 0;
  let expenses = 0;
  let savings = 0;
  let investment = 0;

  for (const t of txs) {
    const amt = Number(t.amount || 0);

    if (t.type === "income") income += amt;
    if (t.type === "expense") expenses += Math.abs(amt);
    if (t.type === "savings") savings += amt;
    if (t.type === "investment") investment += amt;
  }

  const balance = income - expenses + savings + investment;
  return { income, expenses, savings, investment, balance };
}

function expenseByCategory(txs) {
  const m = new Map();

  for (const t of txs) {
    if (t.type !== "expense") continue;

    const cat = t.category || "Other";
    const amt = Math.abs(Number(t.amount || 0));

    m.set(cat, (m.get(cat) || 0) + amt);
  }

  return m;
}

/* =========================
   TRANSACTION UI HELPERS
========================= */
function clearTxError() {
  const b = document.getElementById("txError");
  b.style.display = "none";
  b.textContent = "";
}

function txError(msg) {
  const b = document.getElementById("txError");
  b.style.display = "block";
  b.textContent = msg;
}

function populateTxCategoryDropdown(selected) {
  const sel = document.getElementById("txCategory");
  const cats = getAllCategoryOptions();

  sel.innerHTML = "";

  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }

  const optNew = document.createElement("option");
  optNew.value = "__new__";
  optNew.textContent = "+ New category...";
  sel.appendChild(optNew);

  sel.value = (selected && cats.includes(selected)) ? selected : (cats[0] || "Other");
  onTxCategoryChange();
}

function onTxCategoryChange() {
  const v = document.getElementById("txCategory").value;
  const input = document.getElementById("txNewCategory");

  if (v === "__new__") {
    input.classList.remove("hidden");
    input.value = "";
    input.focus();
  } else {
    input.classList.add("hidden");
    input.value = "";
  }
}

function openTxModalAdd() {
  editingTxId = null;
  clearTxError();

  document.getElementById("txModalTitle").textContent = "Add Transaction";
  document.getElementById("txSaveBtn").textContent = "Save";
  document.getElementById("txType").value = "expense";
  document.getElementById("txDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("txDesc").value = "";
  document.getElementById("txAmount").value = "";

  populateTxCategoryDropdown("Other");
  openModal("txModal");
}

function openTxModalEdit(id) {
  const txs = loadTx();
  const t = txs.find(x => x.id === id);
  if (!t) return;

  editingTxId = id;
  clearTxError();

  document.getElementById("txModalTitle").textContent = "Edit Transaction";
  document.getElementById("txSaveBtn").textContent = "Update";
  document.getElementById("txType").value = t.type;
  document.getElementById("txDate").value = t.date || new Date().toISOString().slice(0, 10);
  document.getElementById("txDesc").value = t.desc || "";
  document.getElementById("txAmount").value = Math.abs(Number(t.amount || 0));

  populateTxCategoryDropdown(t.category || "Other");
  openModal("txModal");
}

function saveTransaction() {
  clearTxError();

  const type = document.getElementById("txType").value;
  const date = document.getElementById("txDate").value;
  const desc = (document.getElementById("txDesc").value || "").trim();
  const amountRaw = Number(document.getElementById("txAmount").value);

  if (!date) return txError("Pick a date.");
  if (!desc) return txError("Enter a description.");
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) return txError("Amount must be a positive number.");

  let category = document.getElementById("txCategory").value;
  const newCat = (document.getElementById("txNewCategory").value || "").trim();

  if (category === "__new__") {
    if (!newCat) return txError("Enter a new category name.");
    category = newCat;

    const cats = loadCategories();
    if (!cats.some(c => c.toLowerCase() === newCat.toLowerCase())) {
      cats.push(newCat);
      saveCategories(cats);
    }
  }

  const storedAmount = (type === "expense") ? -Math.abs(amountRaw) : Math.abs(amountRaw);
  const txs = loadTx();

  if (editingTxId) {
    const idx = txs.findIndex(x => x.id === editingTxId);

    if (idx >= 0) {
      txs[idx] = {
        id: editingTxId,
        type,
        date,
        desc,
        amount: storedAmount,
        category
      };
    }
  } else {
    txs.push({
      id: uid(),
      type,
      date,
      desc,
      amount: storedAmount,
      category
    });
  }

  saveTx(txs);
  closeModal("txModal");
  renderAll();
}

function deleteTransaction(id) {
  const txs = loadTx().filter(t => t.id !== id);
  saveTx(txs);
  renderAll();
}

function txRow(t, showActions) {
  const amt = Number(t.amount || 0);
  const type = t.type || "expense";
  const displayAmt = Math.abs(amt);

  const el = document.createElement("div");
  el.className = "tx-item";

  el.innerHTML = `
    <div class="tx-left">
      <div class="tx-title">${escapeHtml(t.desc || "")}</div>
      <div class="tx-sub">
        <span class="pill">${escapeHtml(t.category || "Other")}</span>
        <span class="pill">${escapeHtml(type)}</span>
        <span>${escapeHtml(t.date || "")}</span>
      </div>
    </div>
    <div class="tx-right">
      <div class="tx-amt ${type}">${type === "expense" ? "-" : "+"}${money(displayAmt)}</div>
      ${showActions ? `
        <button class="icon-btn" onclick="openTxModalEdit('${t.id}')">Edit</button>
        <button class="icon-btn danger" onclick="deleteTransaction('${t.id}')">Delete</button>
      ` : ``}
    </div>
  `;

  return el;
}

function filteredTransactions(txs) {
  if (!searchTerm) return txs;

  return txs.filter(t => {
    const hay = `${t.desc || ""} ${t.category || ""} ${t.type || ""}`.toLowerCase();
    return hay.includes(searchTerm);
  });
}

/* =========================
   BUDGET UI HELPERS
========================= */
function clearBudError() {
  const b = document.getElementById("budError");
  b.style.display = "none";
  b.textContent = "";
}

function budError(msg) {
  const b = document.getElementById("budError");
  b.style.display = "block";
  b.textContent = msg;
}

function openBudgetModalAdd() {
  editingBudId = null;
  clearBudError();

  document.getElementById("budgetModalTitle").textContent = "New Budget";
  document.getElementById("budSaveBtn").textContent = "Save";
  document.getElementById("budCategory").value = "";
  document.getElementById("budLimit").value = "";

  openModal("budgetModal");
  document.getElementById("budCategory").focus();
}

function openBudgetModalEdit(id) {
  const buds = loadBudgets();
  const b = buds.find(x => x.id === id);
  if (!b) return;

  editingBudId = id;
  clearBudError();

  document.getElementById("budgetModalTitle").textContent = "Edit Budget";
  document.getElementById("budSaveBtn").textContent = "Update";
  document.getElementById("budCategory").value = b.category;
  document.getElementById("budLimit").value = b.limit;

  openModal("budgetModal");
  document.getElementById("budCategory").focus();
}

function saveBudget() {
  clearBudError();

  const cat = (document.getElementById("budCategory").value || "").trim();
  const lim = Number(document.getElementById("budLimit").value);

  if (!cat) return budError("Enter a category.");
  if (!Number.isFinite(lim) || lim < 0) return budError("Limit must be 0 or more.");

  const buds = loadBudgets();
  const dup = buds.find(x => x.category.toLowerCase() === cat.toLowerCase() && x.id !== editingBudId);

  if (dup) return budError("That category already exists. Edit it instead.");

  if (editingBudId) {
    const idx = buds.findIndex(x => x.id === editingBudId);
    if (idx >= 0) buds[idx] = { id: editingBudId, category: cat, limit: lim };
  } else {
    buds.push({ id: uid(), category: cat, limit: lim });
  }

  saveBudgets(buds);

  const cats = loadCategories();
  if (!cats.some(c => c.toLowerCase() === cat.toLowerCase())) {
    cats.push(cat);
    saveCategories(cats);
  }

  closeModal("budgetModal");
  renderAll();
}

function deleteBudget(id) {
  const buds = loadBudgets().filter(b => b.id !== id);
  saveBudgets(buds);
  renderAll();
}

function budgetStatus(spent, limit) {
  if (limit <= 0) return { label: "On Track", cls: "good" };

  const pct = spent / limit;

  if (pct >= 1) return { label: "Over Budget", cls: "bad" };
  if (pct >= 0.9) return { label: "Almost There", cls: "warn" };
  return { label: "On Track", cls: "good" };
}

/* =========================
   RENDERING
========================= */
function renderSummary() {
  const txs = loadTx();
  const { income, expenses, savings, balance } = computeTotals(txs);

  document.getElementById("sum-income").textContent = money(income);
  document.getElementById("sum-expenses").textContent = money(expenses);
  document.getElementById("sum-savings").textContent = money(savings);
  document.getElementById("sum-balance").textContent = money(balance);
}

function renderChart() {
  const txs = loadTx();
  const map = expenseByCategory(txs);
  const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const wrap = document.getElementById("chartWrap");
  wrap.innerHTML = "";

  if (rows.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">No expenses yet. Add an <b>Expense</b> to see the chart.</div>`;
    return;
  }

  const colors = ["#00c853", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6"];
  const total = rows.reduce((sum, row) => sum + row[1], 0);

  let gradientStops = [];
  let currentPct = 0;
  let legendHtml = "";

  for (let i = 0; i < rows.length; i++) {
    const [cat, val] = rows[i];
    const pct = (val / total) * 100;
    const color = colors[i % colors.length];

    gradientStops.push(`${color} ${currentPct}% ${currentPct + pct}%`);
    currentPct += pct;

    legendHtml += `
      <div class="legend-item">
        <div class="legend-left">
          <div class="legend-color" style="background:${color}"></div>
          <div class="legend-label" title="${escapeHtml(cat)}">${escapeHtml(cat)}</div>
        </div>
        <div class="legend-val">${money(val)}</div>
      </div>
    `;
  }

  const conicGradient = `conic-gradient(${gradientStops.join(", ")})`;

  wrap.innerHTML = `
    <div class="pie-container">
      <div class="pie-chart" style="background:${conicGradient}"></div>
      <div class="pie-legend">${legendHtml}</div>
    </div>
  `;
}

function renderRecent() {
  const txs = loadTx().slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const recent = txs.slice(0, 6);
  const wrap = document.getElementById("recentList");

  wrap.innerHTML = "";

  if (recent.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">Nothing yet. Click <b>+ Add Transaction</b> to start.</div>`;
    return;
  }

  for (const t of recent) {
    wrap.appendChild(txRow(t, false));
  }
}

function renderTransactions() {
  const txs = filteredTransactions(
    loadTx().slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  );

  const wrap = document.getElementById("allList");
  wrap.innerHTML = "";

  if (txs.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">No matching transactions found.</div>`;
    return;
  }

  for (const t of txs) {
    wrap.appendChild(txRow(t, true));
  }
}

function renderBudget() {
  const buds = loadBudgets().slice().sort((a, b) => a.category.localeCompare(b.category));
  const txs = loadTx();
  const expenses = expenseByCategory(txs);

  const grid = document.getElementById("budgetGrid");
  grid.innerHTML = "";

  let totalBudget = 0;
  let totalSpent = 0;

  for (const b of buds) {
    const spent = expenses.get(b.category) || 0;
    const remain = b.limit - spent;
    const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0;
    const status = budgetStatus(spent, b.limit);

    totalBudget += b.limit;
    totalSpent += spent;

    const card = document.createElement("div");
    card.className = "budget-card";

    card.innerHTML = `
      <div class="budget-actions">
        <button class="mini-btn" onclick="openBudgetModalEdit('${b.id}')">Edit</button>
        <button class="mini-btn danger" onclick="deleteBudget('${b.id}')">Delete</button>
      </div>

      <span class="badge ${status.cls}">${status.label}</span>
      <div class="category">${escapeHtml(b.category)}</div>
      <p class="money">${money(spent)} <span class="gray">of ${money(b.limit)}</span></p>

      <div class="bar-container">
        <div class="bar-fill2" style="width:${pct}%"></div>
      </div>

      <p class="details">
        Remaining <span class="right ${remain < 0 ? 'red-text' : ''}">${money(remain)}</span>
      </p>
    `;

    grid.appendChild(card);
  }

  const remaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  document.getElementById("bud-total").textContent = money(totalBudget);
  document.getElementById("bud-spent").textContent = money(totalSpent);
  document.getElementById("bud-remain").textContent = money(remaining);
  document.getElementById("bud-fill").style.width = `${overallPct}%`;
  document.getElementById("bud-pct").textContent = `${overallPct.toFixed(0)}%`;

  if (buds.length === 0) {
    grid.innerHTML = `<div class="chart-empty">No budgets yet. Click <b>+ New Budget</b> to add one.</div>`;
  }
}

/* =========================
   MAIN RENDER
========================= */
function renderAll() {
  renderSummary();
  renderChart();
  renderRecent();
  renderTransactions();
  renderBudget();
}

/* =========================
   APP INIT
========================= */
(function initApp() {
  loadBudgets();
  loadCategories();

  const currentUser = getCurrentUser();

  if (currentUser) {
    openApp();
  } else {
    document.getElementById("authPage").classList.remove("hidden");
    document.getElementById("appShell").classList.add("hidden");
    showAuthView("login");
  }

  renderAll();
})();
