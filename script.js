/* === Supabase Database == */
const SUPABASE_URL = 'https://pcnlidstcodvitoacpej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmxpZHN0Y29kdml0b2FjcGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjg1NDgsImV4cCI6MjA5MDc0NDU0OH0.LlUTsAaJm1CeRROBImRrwNp6SN2Hsz_ClZIQX82t-MA';

// Initialize the Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   GLOBAL APP STATE
========================= */
let appData = {
  transactions: [],
  budgets: [],
  categories: []
};

let searchTerm = "";
let editingTxId = null;
let editingBudId = null;

/* =========================
   HELPERS
========================= */
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

// Redirect LocalStorage reads to our Global State
function loadTx() { return appData.transactions; }
function loadBudgets() { return appData.budgets; }
function loadCategories() { return appData.categories; }

/* =========================
   SUPABASE DATA FETCHING
========================= */
async function fetchAllData() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  // 1. Fetch Categories
  const { data: cats } = await supabase.from('categories').select('*');
  appData.categories = cats ? cats.map(c => c.category_name) : ["Other", "Salary"];

  // 2. Fetch Transactions (joining category name)
  const { data: txs } = await supabase
    .from('transactions')
    .select(`
      transaction_id,
      amount,
      description,
      transaction_date,
      categories ( category_name )
    `);

  if (txs) {
    appData.transactions = txs.map(t => ({
      id: t.transaction_id,
      desc: t.description,
      amount: t.amount,
      date: t.transaction_date,
      type: t.amount < 0 ? "expense" : "income",
      category: t.categories?.category_name || "Other"
    }));
  }

  // 3. Fetch Budgets
  const { data: buds } = await supabase
    .from('budgets')
    .select(`
      budget_id,
      monthly_limit,
      categories ( category_name )
    `);

  if (buds) {
    appData.budgets = buds.map(b => ({
      id: b.budget_id,
      limit: b.monthly_limit,
      category: b.categories?.category_name || "Other"
    }));
  }

  renderAll();
}

/* =========================
   AUTH UI HELPERS
========================= */
function clearAuthMessages() {
  const errorIds = ["loginError", "signupError", "forgotError"];
  const successIds = ["forgotSuccess", "signupSuccess"];

  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = "none"; el.textContent = ""; }
  });

  successIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = "none"; el.textContent = ""; }
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
  el.style.color = "green";
  el.style.backgroundColor = "#e8f5e9";
  el.style.borderColor = "#c8e6c9";
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
   SUPABASE AUTH ACTIONS
========================= */
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    if (session) {
      openApp();
      fetchAllData();
    }
  } else if (event === 'SIGNED_OUT') {
    document.getElementById("appShell").classList.add("hidden");
    document.getElementById("authPage").classList.remove("hidden");
    showAuthView("login");
  }
});

async function handleSignup(e) {
  if (e) e.preventDefault();
  clearAuthMessages();
  
  const email = (document.getElementById("signupEmail").value || "").trim().toLowerCase();
  const password = document.getElementById("signupPassword").value || "";
  const confirmPassword = document.getElementById("signupConfirmPassword").value || "";

  if (!email) return showError("signupError", "Enter an email.");
  if (!isValidEmail(email)) return showError("signupError", "Enter a valid email.");
  if (!password) return showError("signupError", "Enter a password.");
  if (password.length < 6) return showError("signupError", "Password must be at least 6 characters.");
  if (password !== confirmPassword) return showError("signupError", "Passwords do not match.");

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return showError("signupError", error.message);
  
  showSuccess("signupError", "Account created! You can now log in.");
  setTimeout(() => showAuthView("login"), 2000);
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  clearAuthMessages();
  
  const email = (document.getElementById("loginIdentifier").value || "").trim().toLowerCase();
  const password = document.getElementById("loginPassword").value || "";

  if (!email || !password) return showError("loginError", "Email and password required.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return showError("loginError", error.message);
  // UI transition handled by onAuthStateChange
}

async function handleForgotPassword(e) {
  if (e) e.preventDefault();
  clearAuthMessages();
  
  const email = (document.getElementById("forgotEmail").value || "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) return showError("forgotError", "Enter a valid email.");

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return showError("forgotError", error.message);

  showSuccess("forgotSuccess", "Password reset email sent.");
}

async function logoutUser() {
  await supabase.auth.signOut();
}

/* =========================
   APP VISIBILITY & NAV
========================= */
function openApp() {
  const authPage = document.getElementById("authPage");
  const appShell = document.getElementById("appShell");
  
  if(authPage) authPage.classList.add("hidden");
  if(appShell) appShell.classList.remove("hidden");
  
  showPage("dashboard");
}

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
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
function backdropClose(e, id) { if (e.target.id === id) closeModal(id); }

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeModal("txModal"); closeModal("budgetModal"); }
});

/* =========================
   DATABASE HELPERS (GET OR CREATE CATEGORY)
========================= */
async function getOrCreateCategoryId(categoryName, userId) {
  const { data: existingCat } = await supabase
    .from('categories')
    .select('category_id')
    .eq('category_name', categoryName)
    .single();

  if (existingCat) return existingCat.category_id;

  const { data: newCat, error } = await supabase
    .from('categories')
    .insert([{ category_name: categoryName, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return newCat.category_id;
}

/* =========================
   TRANSACTION DB ACTIONS
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
  const cats = loadCategories();
  
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
  const t = loadTx().find(x => x.id === id);
  if (!t) return;

  editingTxId = id;
  clearTxError();
  document.getElementById("txModalTitle").textContent = "Edit Transaction";
  document.getElementById("txSaveBtn").textContent = "Update";
  document.getElementById("txType").value = t.amount < 0 ? "expense" : "income";
  document.getElementById("txDate").value = t.date || new Date().toISOString().slice(0, 10);
  document.getElementById("txDesc").value = t.desc || "";
  document.getElementById("txAmount").value = Math.abs(Number(t.amount || 0));
  populateTxCategoryDropdown(t.category || "Other");
  openModal("txModal");
}

async function saveTransaction() {
  clearTxError();
  const type = document.getElementById("txType").value;
  const date = document.getElementById("txDate").value;
  const desc = (document.getElementById("txDesc").value || "").trim();
  const amountRaw = Number(document.getElementById("txAmount").value);
  let categoryName = document.getElementById("txCategory").value;

  if (!date) return txError("Pick a date.");
  if (!desc) return txError("Enter a description.");
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) return txError("Amount must be positive.");

  if (categoryName === "__new__") {
    categoryName = (document.getElementById("txNewCategory").value || "").trim();
    if (!categoryName) return txError("Enter a new category name.");
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return txError("You must be logged in.");

  const storedAmount = (type === "expense") ? -Math.abs(amountRaw) : Math.abs(amountRaw);

  try {
    const catId = await getOrCreateCategoryId(categoryName, userData.user.id);

    if (editingTxId) {
      await supabase.from('transactions').update({
        category_id: catId,
        amount: storedAmount,
        description: desc,
        transaction_date: date
      }).eq('transaction_id', editingTxId);
    } else {
      await supabase.from('transactions').insert([{
        user_id: userData.user.id,
        category_id: catId,
        amount: storedAmount,
        description: desc,
        transaction_date: date
      }]);
    }

    closeModal("txModal");
    await fetchAllData();
  } catch (err) {
    txError("Failed to save transaction: " + err.message);
  }
}

async function deleteTransaction(id) {
  await supabase.from('transactions').delete().eq('transaction_id', id);
  await fetchAllData();
}

/* =========================
   BUDGET DB ACTIONS
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
  const b = loadBudgets().find(x => x.id === id);
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

async function saveBudget() {
  clearBudError();
  const categoryName = (document.getElementById("budCategory").value || "").trim();
  const lim = Number(document.getElementById("budLimit").value);

  if (!categoryName) return budError("Enter a category.");
  if (!Number.isFinite(lim) || lim < 0) return budError("Limit must be 0 or more.");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return budError("You must be logged in.");

  try {
    const catId = await getOrCreateCategoryId(categoryName, userData.user.id);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    if (editingBudId) {
      await supabase.from('budgets').update({
        category_id: catId,
        monthly_limit: lim
      }).eq('budget_id', editingBudId);
    } else {
      await supabase.from('budgets').insert([{
        user_id: userData.user.id,
        category_id: catId,
        monthly_limit: lim,
        month: currentMonth,
        year: currentYear
      }]);
    }

    closeModal("budgetModal");
    await fetchAllData();
  } catch (err) {
    budError("Failed to save budget: " + err.message);
  }
}

async function deleteBudget(id) {
  await supabase.from('budgets').delete().eq('budget_id', id);
  await fetchAllData();
}

/* =========================
   CALCULATIONS & UI RENDERING
========================= */
function computeTotals(txs) {
  let income = 0, expenses = 0, savings = 0, investment = 0;
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

function filteredTransactions(txs) {
  if (!searchTerm) return txs;
  return txs.filter(t => {
    const hay = `${t.desc || ""} ${t.category || ""} ${t.type || ""}`.toLowerCase();
    return hay.includes(searchTerm);
  });
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

function renderSummary() {
  const txs = loadTx();
  const { income, expenses, savings, balance } = computeTotals(txs);
  const sumInc = document.getElementById("sum-income");
  const sumExp = document.getElementById("sum-expenses");
  const sumSav = document.getElementById("sum-savings");
  const sumBal = document.getElementById("sum-balance");
  
  if (sumInc) sumInc.textContent = money(income);
  if (sumExp) sumExp.textContent = money(expenses);
  if (sumSav) sumSav.textContent = money(savings);
  if (sumBal) sumBal.textContent = money(balance);
}

function renderChart() {
  const txs = loadTx();
  const map = expenseByCategory(txs);
  const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const wrap = document.getElementById("chartWrap");
  if (!wrap) return;

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
  if (!wrap) return;

  wrap.innerHTML = "";
  if (recent.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">Nothing yet. Click <b>+ Add Transaction</b> to start.</div>`;
    return;
  }
  for (const t of recent) wrap.appendChild(txRow(t, false));
}

function renderTransactions() {
  const txs = filteredTransactions(
    loadTx().slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  );
  const wrap = document.getElementById("allList");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (txs.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">No matching transactions found.</div>`;
    return;
  }
  for (const t of txs) wrap.appendChild(txRow(t, true));
}

function renderBudget() {
  const buds = loadBudgets().slice().sort((a, b) => a.category.localeCompare(b.category));
  const txs = loadTx();
  const expenses = expenseByCategory(txs);
  const grid = document.getElementById("budgetGrid");
  if (!grid) return;

  grid.innerHTML = "";
  let totalBudget = 0;
  let totalSpent = 0;

  for (const b of buds) {
    const spent = expenses.get(b.category) || 0;
    const remain = b.limit - spent;
    const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0;
    
    let cls = "good"; let label = "On Track";
    if (pct >= 100) { cls = "bad"; label = "Over Budget"; }
    else if (pct >= 90) { cls = "warn"; label = "Almost There"; }

    totalBudget += b.limit;
    totalSpent += spent;

    const card = document.createElement("div");
    card.className = "budget-card";
    card.innerHTML = `
      <div class="budget-actions">
        <button class="mini-btn" onclick="openBudgetModalEdit('${b.id}')">Edit</button>
        <button class="mini-btn danger" onclick="deleteBudget('${b.id}')">Delete</button>
      </div>
      <span class="badge ${cls}">${label}</span>
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

  const bTot = document.getElementById("bud-total");
  const bSpn = document.getElementById("bud-spent");
  const bRem = document.getElementById("bud-remain");
  const bFil = document.getElementById("bud-fill");
  const bPct = document.getElementById("bud-pct");

  if (bTot) bTot.textContent = money(totalBudget);
  if (bSpn) bSpn.textContent = money(totalSpent);
  if (bRem) bRem.textContent = money(remaining);
  if (bFil) bFil.style.width = `${overallPct}%`;
  if (bPct) bPct.textContent = `${overallPct.toFixed(0)}%`;

  if (buds.length === 0) {
    grid.innerHTML = `<div class="chart-empty">No budgets yet. Click <b>+ New Budget</b> to add one.</div>`;
  }
}

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
(async function initApp() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    openApp();
    fetchAllData();
  } else {
    const authPage = document.getElementById("authPage");
    const appShell = document.getElementById("appShell");
    if(authPage) authPage.classList.remove("hidden");
    if(appShell) appShell.classList.add("hidden");
    showAuthView("login");
  }
})();
