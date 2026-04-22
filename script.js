// ===== Storage Keys =====
const TX_KEY  = "ff_transactions_v1";
const BUD_KEY = "ff_budgets_v1";
const CAT_KEY = "ff_categories_v1";
const USER_KEY = "ff_users_v1";
const SESSION_KEY = "ff_current_user_v1";

window.exportReportPDF = function () {
  renderReports();

  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");
  const rangeEl = document.getElementById("reportPrintRange");

  const start = startInput?.value || "All";
  const end = endInput?.value || "All";

  if (rangeEl) {
    rangeEl.textContent = `Date Range: ${start} to ${end}`;
  }

  const originalTitle = document.title;
  document.title = `Freedom-Finance-Report-${start}-to-${end}`;

  setTimeout(() => {
    window.print();
    document.title = originalTitle;
  }, 200);
};

// ===== App State =====
let searchTerm = "";
let editingTxId = null;
let editingBudId = null;

function getReportDateRange() {
  const txs = loadTx().slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");

  if (!startInput || !endInput) {
    return { start: "", end: "" };
  }

  if (!startInput.value || !endInput.value) {
    if (txs.length) {
      startInput.value = txs[0].date || "";
      endInput.value = txs[txs.length - 1].date || "";
    } else {
      const today = new Date().toISOString().slice(0, 10);
      startInput.value = today;
      endInput.value = today;
    }
  }

  return {
    start: startInput.value,
    end: endInput.value
  };
}

window.setReportRange = function (type) {
  const startInput = document.getElementById("reportStartDate");
  const endInput = document.getElementById("reportEndDate");
  if (!startInput || !endInput) return;

  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (type === "thisMonth") {
    start.setDate(1);
  } else if (type === "last30") {
    start.setDate(now.getDate() - 29);
  } else if (type === "thisYear") {
    start.setMonth(0, 1);
  }

  startInput.value = start.toISOString().slice(0, 10);
  endInput.value = end.toISOString().slice(0, 10);

  renderReports();
};

function filterTransactionsByDateRange(txs, start, end) {
  return txs.filter(t => {
    const d = t.date || "";
    return (!start || d >= start) && (!end || d <= end);
  });
}

function groupTransactionsByMonth(txs) {
  const monthMap = new Map();

  for (const t of txs) {
    if (!t.date) continue;
    const key = t.date.slice(0, 7);

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        income: 0,
        expenses: 0,
        savings: 0,
        investment: 0
      });
    }

    const row = monthMap.get(key);
    const amt = Number(t.amount || 0);

    if (t.type === "income") row.income += amt;
    if (t.type === "expense") row.expenses += Math.abs(amt);
    if (t.type === "savings") row.savings += amt;
    if (t.type === "investment") row.investment += amt;
  }

  return Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatMonthLabel(yyyyMm) {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function renderReportMonthlySummary(txs) {
  const wrap = document.getElementById("monthlySummaryGrid");
  if (!wrap) return;

  const grouped = groupTransactionsByMonth(txs);
  wrap.innerHTML = "";

  if (!grouped.length) {
    wrap.innerHTML = `<div class="report-empty">No monthly data found for this date range.</div>`;
    return;
  }

  for (const [monthKey, vals] of grouped) {
    const net = vals.income - vals.expenses + vals.savings + vals.investment;
    const card = document.createElement("div");
    card.className = "month-card";
    card.innerHTML = `
      <div class="month-card-top">
        <div class="month-card-title">${escapeHtml(formatMonthLabel(monthKey))}</div>
        <div class="month-net ${net >= 0 ? "good" : "bad"}">${net >= 0 ? "Net Gain" : "Net Loss"}: ${money(net)}</div>
      </div>
      <div class="month-stats">
        <div class="month-stat">
          <div class="month-stat-label">Income</div>
          <div class="month-stat-value">${money(vals.income)}</div>
        </div>
        <div class="month-stat">
          <div class="month-stat-label">Expenses</div>
          <div class="month-stat-value">${money(vals.expenses)}</div>
        </div>
        <div class="month-stat">
          <div class="month-stat-label">Savings / Investments</div>
          <div class="month-stat-value">${money(vals.savings + vals.investment)}</div>
        </div>
      </div>
    `;
    wrap.appendChild(card);
  }
}

function renderReportCategoryBars(txs) {
  const wrap = document.getElementById("reportCategoryBars");
  if (!wrap) return;

  const categoryMap = expenseByCategory(txs);
  const rows = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

  wrap.innerHTML = "";

  if (!rows.length) {
    wrap.innerHTML = `<div class="report-empty">No expense categories found in this range.</div>`;
    return;
  }

  const maxVal = rows[0][1] || 1;

  for (const [cat, val] of rows) {
    const pct = Math.max(4, Math.round((val / maxVal) * 100));
    const row = document.createElement("div");
    row.className = "report-bar-row";
    row.innerHTML = `
      <div class="report-bar-top">
        <span>${escapeHtml(cat)}</span>
        <span>${money(val)}</span>
      </div>
      <div class="report-bar-track">
        <div class="report-bar-fill" style="width:${pct}%"></div>
      </div>
    `;
    wrap.appendChild(row);
  }
}

function renderReportTopCategories(txs) {
  const wrap = document.getElementById("reportTopCategories");
  if (!wrap) return;

  const rows = Array.from(expenseByCategory(txs).entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  wrap.innerHTML = "";

  if (!rows.length) {
    wrap.innerHTML = `<div class="report-empty">No top categories yet.</div>`;
    return;
  }

  for (const [cat, val] of rows) {
    const div = document.createElement("div");
    div.className = "report-top-cat";
    div.innerHTML = `
      <div class="report-top-cat-name">${escapeHtml(cat)}</div>
      <div class="report-top-cat-value">${money(val)}</div>
    `;
    wrap.appendChild(div);
  }
}

function renderReportInsights(txs) {
  const wrap = document.getElementById("reportInsights");
  if (!wrap) return;

  const budgets = loadBudgets();
  const spentMap = expenseByCategory(txs);
  wrap.innerHTML = "";

  if (!budgets.length) {
    wrap.innerHTML = `<div class="report-empty">Set up budgets to unlock spending insights.</div>`;
    return;
  }

  const cards = [];

  for (const b of budgets) {
    const limit = Number(b.limit || 0);
    const spent = spentMap.get(b.category) || 0;

    if (limit <= 0) continue;

    const pct = (spent / limit) * 100;

    if (pct >= 100) {
      cards.push({
        cls: "bad",
        title: `${b.category} is over budget`,
        text: `You spent ${money(spent)} against a budget of ${money(limit)}. Consider cutting back here first.`
      });
    } else if (pct >= 80) {
      cards.push({
        cls: "warn",
        title: `${b.category} is close to the limit`,
        text: `You have used ${Math.round(pct)}% of this budget. Slow spending here to avoid going over.`
      });
    }
  }

  const topSpending = Array.from(spentMap.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topSpending) {
    cards.unshift({
      cls: "",
      title: `Highest spending category: ${topSpending[0]}`,
      text: `Your largest expense in this range is ${money(topSpending[1])}. This is the first place to review if you want to spend less.`
    });
  }

  if (!cards.length) {
    wrap.innerHTML = `
      <div class="report-insight-card">
        <div class="report-insight-title">Looking good</div>
        <div class="report-insight-text">No major budget warnings were found in this selected date range.</div>
      </div>
    `;
    return;
  }

  for (const c of cards.slice(0, 6)) {
    const div = document.createElement("div");
    div.className = `report-insight-card ${c.cls || ""}`;
    div.innerHTML = `
      <div class="report-insight-title">${escapeHtml(c.title)}</div>
      <div class="report-insight-text">${escapeHtml(c.text)}</div>
    `;
    wrap.appendChild(div);
  }
}

function renderReportTransactionsTable(txs) {
  const wrap = document.getElementById("reportTxTableWrap");
  if (!wrap) return;

  const rows = txs.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  wrap.innerHTML = "";

  if (!rows.length) {
    wrap.innerHTML = `<div class="report-empty">No transactions found for the selected date range.</div>`;
    return;
  }

  let html = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Type</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const t of rows) {
    html += `
      <tr>
        <td>${escapeHtml(t.date || "")}</td>
        <td>${escapeHtml(t.desc || "")}</td>
        <td>${escapeHtml(t.category || "Other")}</td>
        <td>${escapeHtml(t.type || "")}</td>
        <td>${money(Number(t.amount || 0))}</td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;

  wrap.innerHTML = html;
}

window.renderReports = function () {
  const incomeEl = document.getElementById("rep-income");
  const expensesEl = document.getElementById("rep-expenses");
  const savingInvestEl = document.getElementById("rep-saving-invest");
  const netEl = document.getElementById("rep-net");

  if (!incomeEl || !expensesEl || !savingInvestEl || !netEl) return;

  const { start, end } = getReportDateRange();
  let txs = filterTransactionsByDateRange(loadTx(), start, end);

  if (searchTerm) {
    txs = txs.filter(t =>
      (t.desc || "").toLowerCase().includes(searchTerm) ||
      (t.category || "").toLowerCase().includes(searchTerm) ||
      (t.type || "").toLowerCase().includes(searchTerm)
    );
  }

  const totals = computeTotals(txs);
  const savingInvest = totals.savings + totals.investment;
  const net = totals.income - totals.expenses + savingInvest;

  incomeEl.textContent = money(totals.income);
  expensesEl.textContent = money(totals.expenses);
  savingInvestEl.textContent = money(savingInvest);
  netEl.textContent = money(net);
  netEl.style.color = net < 0 ? "var(--bad)" : "var(--good)";

  renderReportMonthlySummary(txs);
  renderReportCategoryBars(txs);
  renderReportTopCategories(txs);
  renderReportInsights(txs);
  renderReportTransactionsTable(txs);
};

// ===== Helpers =====
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function money(n){ return Number(n).toLocaleString(undefined, {style:"currency", currency:"USD"}); }
function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function isValidEmail(email){
  return /\S+@\S+\.\S+/.test(email);
}

function setSearch(v){
  searchTerm = (v || "").trim().toLowerCase();
  renderAll();
}

function openModal(id){
  const el = document.getElementById(id);
  if(el) el.style.display = "flex";
}
function closeModal(id){
  const el = document.getElementById(id);
  if(el) el.style.display = "none";
}
function backdropClose(e, id){ if(e.target.id === id) closeModal(id); }

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    closeModal("txModal");
    closeModal("budgetModal");
  }
});

// ===== Auth Storage =====
function loadUsers(){
  try { return JSON.parse(localStorage.getItem(USER_KEY)) || []; }
  catch { return []; }
}
function saveUsers(users){ localStorage.setItem(USER_KEY, JSON.stringify(users)); }

function setCurrentUser(user){ localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }

function getCurrentUser(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function clearCurrentUser(){ localStorage.removeItem(SESSION_KEY); }

// ===== Auth UI =====
function clearAuthMessages(){
  const ids = ["loginError", "signupError"];
  for(const id of ids){
    const el = document.getElementById(id);
    if(el){
      el.style.display = "none";
      el.textContent = "";
    }
  }
}

function showAuthError(id, msg){
  const el = document.getElementById(id);
  if(!el) return;
  el.style.display = "block";
  el.textContent = msg;
}

function showAuthView(name){
  clearAuthMessages();
  const loginView = document.getElementById("view-login");
  const signupView = document.getElementById("view-signup");

  if(loginView) loginView.classList.remove("active");
  if(signupView) signupView.classList.remove("active");

  const activeView = document.getElementById(`view-${name}`);
  if(activeView) activeView.classList.add("active");
}

//==Sign up feature==
function handleSignup(){
  clearAuthMessages();

  const username = (document.getElementById("signupUsername")?.value || "").trim();
  const email = (document.getElementById("signupEmail")?.value || "").trim().toLowerCase();
  const password = document.getElementById("signupPassword")?.value || "";
  const confirmPassword = document.getElementById("signupConfirmPassword")?.value || "";

  if(!username) return showAuthError("signupError", "Enter a username.");
  if(!email) return showAuthError("signupError", "Enter an email.");
  if(!isValidEmail(email)) return showAuthError("signupError", "Enter a valid email.");
  if(!password) return showAuthError("signupError", "Enter a password.");
  if(password.length < 6) return showAuthError("signupError", "Password must be at least 6 characters.");
  if(password !== confirmPassword) return showAuthError("signupError", "Passwords do not match.");

  const users = loadUsers();

  const usernameExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if(usernameExists) return showAuthError("signupError", "That username already exists.");

  const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if(emailExists) return showAuthError("signupError", "That email is already registered.");

  users.push({
    id: uid(),
    username,
    email,
    password
  });

  saveUsers(users);

  const loginIdentifier = document.getElementById("loginIdentifier");
  const loginPassword = document.getElementById("loginPassword");

  if(loginIdentifier) loginIdentifier.value = email;
  if(loginPassword) loginPassword.value = "";

  showAuthView("login");
}

//login sample database(web storage)
function handleLogin(){
  clearAuthMessages();

  const identifier = (document.getElementById("loginIdentifier")?.value || "").trim().toLowerCase();
  const password = document.getElementById("loginPassword")?.value || "";

  if(!identifier) return showAuthError("loginError", "Enter your username or email.");
  if(!password) return showAuthError("loginError", "Enter your password.");

  const users = loadUsers();
  const user = users.find(u =>
    u.email.toLowerCase() === identifier || u.username.toLowerCase() === identifier
  );

  if(!user) return showAuthError("loginError", "Account not found.");
  if(user.password !== password) return showAuthError("loginError", "Incorrect password.");

  setCurrentUser({
    id: user.id,
    username: user.username,
    email: user.email
  });

  window.location.href = "dashboard.html";
}

//logout function
window.logoutUser = function() {
  clearCurrentUser();
  window.location.href = "index.html";
}

function requireAuth(){
  const authPage = document.getElementById("authPage");
  if(authPage) return; // Don't redirect when already on login page

  const currentUser = getCurrentUser();
  if(!currentUser){
    window.location.href = "index.html";
  }
}

/* =========================================
   3. DATA LOAD / SAVE
   ========================================= */
function loadTx()   { try { return JSON.parse(localStorage.getItem(TX_KEY))  || []; } catch { return []; } }
function saveTx(txs){ localStorage.setItem(TX_KEY, JSON.stringify(txs)); }

function loadBudgets() {
  try {
    const b = JSON.parse(localStorage.getItem(BUD_KEY));
    if (Array.isArray(b)) return b;
  } catch { /**/ }
  const seed = [
    { id: uid(), category: "Food",          limit: 200 },
    { id: uid(), category: "Entertainment", limit: 100 },
    { id: uid(), category: "Transport",     limit: 150 },
    { id: uid(), category: "Utilities",     limit: 120 },
    { id: uid(), category: "Shopping",      limit: 180 },
    { id: uid(), category: "Dining Out",    limit: 160 },
  ];
  localStorage.setItem(BUD_KEY, JSON.stringify(seed));
  return seed;
}
function saveBudgets(buds) { localStorage.setItem(BUD_KEY, JSON.stringify(buds)); }

function loadCategories() {
  try {
    const c = JSON.parse(localStorage.getItem(CAT_KEY));
    if (Array.isArray(c) && c.length) return c;
  } catch { /**/ }
  const defaults = ["Other", "Salary"];
  localStorage.setItem(CAT_KEY, JSON.stringify(defaults));
  return defaults;
}
function saveCategories(cats) { localStorage.setItem(CAT_KEY, JSON.stringify(cats)); }

function getAllCategoryOptions() {
  const set = new Map();
  for (const c of loadCategories()) set.set(c.toLowerCase(), c);
  for (const b of loadBudgets())    set.set(String(b.category).toLowerCase(), b.category);
  for (const t of loadTx())         if (t.category) set.set(String(t.category).toLowerCase(), t.category);
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

/* =========================================
   4. CALCULATIONS
   ========================================= */
function computeTotals(txs) {
  let income = 0, expenses = 0, savings = 0, investment = 0;
  for (const t of txs) {
    const amt = Number(t.amount || 0);
    if (t.type === "income")     income     += amt;
    if (t.type === "expense")    expenses   += Math.abs(amt);
    if (t.type === "savings")    savings    += amt;
    if (t.type === "investment") investment += amt;
  }
  return { income, expenses, savings, investment, balance: income - expenses + savings + investment };
}

function expenseByCategory(txs) {
  const m = new Map();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const cat = t.category || "Other";
    m.set(cat, (m.get(cat) || 0) + Math.abs(Number(t.amount || 0)));
  }
  return m;
}

//* =========================================
// 5. TRANSACTION UI
// ========================================= *//
function clearTxError() { const b = document.getElementById("txError"); if (b) { b.style.display = "none"; b.textContent = ""; } }
function txError(msg) { const b = document.getElementById("txError"); if (b) { b.style.display = "block"; b.textContent = msg; } }

function populateTxCategoryDropdown(selected) {
  const sel = document.getElementById("txCategory");
  if (!sel) return;
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
  window.onTxCategoryChange();
}

window.onTxCategoryChange = function () {
  const sel = document.getElementById("txCategory");
  const input = document.getElementById("txNewCategory");
  if (!sel || !input) return;
  if (sel.value === "__new__") {
    input.classList.remove("hidden");
    input.value = "";
    input.focus();
  } else {
    input.classList.add("hidden");
    input.value = "";
  }
};

//==Open transaction modal for adding,editing,deleting transactions==
window.openTxModalAdd = function () {
  editingTxId = null;
  clearTxError();
  document.getElementById("txModalTitle").textContent = "Add Transaction";
  document.getElementById("txSaveBtn").textContent = "Save";
  document.getElementById("txType").value = "expense";
  document.getElementById("txDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("txDesc").value = "";
  document.getElementById("txAmount").value = "";
  populateTxCategoryDropdown("Food");
  window.openModal("txModal");
};

window.openTxModalEdit = function (id) {
  const t = loadTx().find(x => x.id === id);
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
  window.openModal("txModal");
};

window.saveTransaction = function () {
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
    if (idx >= 0) txs[idx] = { id: editingTxId, type, date, desc, amount: storedAmount, category };
  } else {
    txs.push({ id: uid(), type, date, desc, amount: storedAmount, category });
  }

  saveTx(txs);
  window.closeModal("txModal");
  renderAll();
};

window.deleteTransaction = function (id) {
  saveTx(loadTx().filter(t => t.id !== id));
  renderAll();
};

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
      ` : ""}
    </div>`;
  return el;
}

function filteredTransactions(txs) {
  if (!searchTerm) return txs;
  return txs.filter(t => `${t.desc||""} ${t.category||""} ${t.type||""}`.toLowerCase().includes(searchTerm));
}

/* =========================================
   6. BUDGET UI
   ========================================= */
function clearBudError() { const b = document.getElementById("budError"); if (b) { b.style.display = "none"; b.textContent = ""; } }
function budError(msg) { const b = document.getElementById("budError"); if (b) { b.style.display = "block"; b.textContent = msg; } }

window.openBudgetModalAdd = function () {
  editingBudId = null;
  clearBudError();
  document.getElementById("budgetModalTitle").textContent = "New Budget";
  document.getElementById("budSaveBtn").textContent = "Save";
  document.getElementById("budCategory").value = "";
  document.getElementById("budLimit").value = "";
  window.openModal("budgetModal");
  document.getElementById("budCategory").focus();
};

window.openBudgetModalEdit = function (id) {
  const b = loadBudgets().find(x => x.id === id);
  if (!b) return;
  editingBudId = id;
  clearBudError();
  document.getElementById("budgetModalTitle").textContent = "Edit Budget";
  document.getElementById("budSaveBtn").textContent = "Update";
  document.getElementById("budCategory").value = b.category;
  document.getElementById("budLimit").value = b.limit;
  window.openModal("budgetModal");
  document.getElementById("budCategory").focus();
};

window.saveBudget = function () {
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

  window.closeModal("budgetModal");
  renderAll();
};

window.clearAllBudgets = function () {
  if (confirm("Are you sure you want to clear ALL your planned budgets? This cannot be undone.")) {
    saveBudgets([]);
    renderAll();
  }
};

window.deleteBudget = function (id) {
  saveBudgets(loadBudgets().filter(b => b.id !== id));
  renderAll();
};

function budgetStatus(spent, limit) {
  if (limit <= 0) return { label: "On Track", cls: "good" };
  const pct = spent / limit;
  if (pct >= 1) return { label: "Over Budget", cls: "bad" };
  if (pct >= 0.9) return { label: "Almost There", cls: "warn" };
  return { label: "On Track", cls: "good" };
}

/* =========================================
   7. RENDERING
   ========================================= */
function renderSummary() {
  const { income, expenses, savings, balance } = computeTotals(loadTx());
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = money(val);
  };
  set("sum-income", income);
  set("sum-expenses", expenses);
  set("sum-savings", savings);
  set("sum-balance", balance);
}

function renderChart() {
  const wrap = document.getElementById("chartWrap");
  if (!wrap) return;
  const map = expenseByCategory(loadTx());
  const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  wrap.innerHTML = "";
  if (rows.length === 0) {
    wrap.innerHTML = `<div class="chart-empty">No expenses yet. Add an&nbsp;<b>Expense</b>&nbsp;to see the chart.</div>`;
    return;
  }
  const colors = ["#00c853", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6"];
  const total = rows.reduce((s, r) => s + r[1], 0);
  let stops = [], cur = 0, legendHtml = "";
  for (let i = 0; i < rows.length; i++) {
    const [cat, val] = rows[i];
    const pct = (val / total) * 100;
    stops.push(`${colors[i]} ${cur}% ${cur + pct}%`);
    cur += pct;
    legendHtml += `
      <div class="legend-item">
        <div class="legend-left">
          <div class="legend-color" style="background:${colors[i]}"></div>
          <div class="legend-label" title="${escapeHtml(cat)}">${escapeHtml(cat)}</div>
        </div>
        <div class="legend-val">${money(val)}</div>
      </div>`;
  }
  wrap.innerHTML = `
    <div class="pie-container">
      <div class="pie-chart" style="background:conic-gradient(${stops.join(",")})"></div>
      <div class="pie-legend">${legendHtml}</div>
    </div>`;
}

function renderRecent() {
  const wrap = document.getElementById("recentList");
  if (!wrap) return;
  const txs = loadTx().slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);
  wrap.innerHTML = "";
  if (!txs.length) {
    wrap.innerHTML = `<div class="chart-empty">Nothing yet. Click&nbsp;<b>+ Add Transaction</b>&nbsp;to start.</div>`;
    return;
  }
  for (const t of txs) wrap.appendChild(txRow(t, false));
}

function renderAllTransactions() {
  const wrap = document.getElementById("allList");
  if (!wrap) return;
  const txs = filteredTransactions(loadTx().slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")));
  wrap.innerHTML = "";
  if (!txs.length) {
    wrap.innerHTML = `<div class="chart-empty">No matching transactions.</div>`;
    return;
  }
  for (const t of txs) wrap.appendChild(txRow(t, true));
}

function renderBudgets() {
  const grid = document.getElementById("budgetGrid");
  if (!grid) return;
  const txs = loadTx();
  const buds = loadBudgets();
  const spentMap = expenseByCategory(txs);
  const { income, expenses } = computeTotals(txs);
  const totalBudget = buds.reduce((s, b) => s + Number(b.limit || 0), 0);
  const pct = totalBudget > 0 ? Math.min(100, Math.round((expenses / totalBudget) * 100)) : 0;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set("bud-total", money(totalBudget));
  set("bud-spent", money(expenses));
  set("bud-remain", money(totalBudget - expenses));
  set("bud-pct", pct + "%");
  const fill = document.getElementById("bud-fill");
  if (fill) fill.style.width = pct + "%";

  set("insight-income", money(income));
  const leftoverEl = document.getElementById("insight-leftover");
  if (leftoverEl) {
    const leftover = income - totalBudget;
    leftoverEl.textContent = money(leftover);
    leftoverEl.style.color = leftover < 0 ? "var(--bad)" : "var(--good)";
  }

  grid.innerHTML = "";
  if (!buds.length) {
    grid.innerHTML = `<div class="chart-empty">No budgets. Click <b>+ New Budget</b> to add one.</div>`;
    return;
  }

  for (const b of buds) {
    const limit = Number(b.limit || 0);
    const spent = spentMap.get(b.category) || 0;
    const width = limit > 0 ? Math.round(Math.min(1, spent / limit) * 100) : 0;
    const status = budgetStatus(spent, limit);
    const rightText = limit <= 0
      ? `<span class="right">$0 left</span>`
      : spent > limit
        ? `<span class="right red-text">$${Math.round(spent - limit)} over</span>`
        : `<span class="right">$${Math.round(limit - spent)} left</span>`;
    const barColor = status.cls === "bad" ? "var(--bad)" : status.cls === "warn" ? "var(--warn)" : "#3b82f6";

    const card = document.createElement("div");
    card.className = "budget-card";
    card.innerHTML = `
      <div class="budget-actions">
        <button class="mini-btn" onclick="openBudgetModalEdit('${b.id}')">Edit</button>
        <button class="mini-btn danger" onclick="deleteBudget('${b.id}')">Delete</button>
      </div>
      <span class="badge ${status.cls}">${status.label}</span>
      <h3 class="category">${escapeHtml(b.category)}</h3>
      <p class="money">${money(spent)} <span class="gray">of ${money(limit)}</span></p>
      <div class="bar-container"><div class="bar-fill2" style="width:${width}%;background:${barColor}"></div></div>
      <p class="details">${limit > 0 ? Math.round((spent / limit) * 100) : 0}% used ${rightText}</p>`;
    grid.appendChild(card);
  }
}

function renderAll() {
  renderSummary();
  renderChart();
  renderRecent();
  renderAllTransactions();
  renderBudgets();
  renderReports();
}

/* =========================================
   8. AI CHATBOT — SPARK
   ========================================= */
let rs = null;
let aiPipeline = null;
let LangchainPromptTemplate = null;
let isAiReady = false;

function initRiveScript() {
  if (typeof window.RiveScript === "undefined") return;
  rs = new window.RiveScript();
  rs.stream(`
    + hello
    - Hi there! I'm Spark ✨, your financial assistant. How can I help you today?
    + hi
    @ hello
    + hey
    @ hello
    + thank you
    - You're welcome! Keep up the great financial work!
    + thanks
    @ thank you
    + *
    - CALL_LLM
  `);
  rs.sortReplies();
}

window.toggleChat = function () {
  const win = document.getElementById("spark-chat-window");
  if (!win) return;
  win.classList.toggle("hidden");

  if (!aiPipeline && !win.classList.contains("hidden")) {
    initializeSparkAI();
  }
};

window.handleSparkSend = async function () {
  const inputEl = document.getElementById("spark-input");
  const message = inputEl.value.trim();
  if (!message) return;

  appendMessage("user", message);
  inputEl.value = "";

  let reply = "CALL_LLM";
  if (rs) {
    try {
      reply = await rs.reply("local-user", message.toLowerCase());
    } catch {
      reply = "CALL_LLM";
    }
  }

  if (reply === "CALL_LLM") {
    const typingId = appendMessage("bot", "Spark is thinking... (Running local AI)");

    try {
      reply = await generateAIResponse(message);
    } catch (err) {
      console.error("Chat Error:", err);
      reply = "Sorry, I hit a snag trying to process that. Could you try again?";
    }

    const el = document.getElementById(typingId);
    if (el) el.innerText = reply;
  } else {
    appendMessage("bot", reply);
  }
  scrollToBottom();
};

async function initializeSparkAI() {
  const inputEl = document.getElementById("spark-input");
  const sendBtn = document.getElementById("spark-send-btn");

  const loadingId = appendMessage("bot", "Waking up my AI brain... (Downloading local model. This may take a minute!)");

  try {
    const langchain = await import('https://esm.sh/@langchain/core@0.1.58/prompts?bundle');
    LangchainPromptTemplate = langchain.PromptTemplate;

    const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers');
    transformers.env.allowLocalModels = false;

    aiPipeline = await transformers.pipeline('text-generation', 'HuggingFaceTB/SmolLM-135M-Instruct');

    document.getElementById(loadingId).innerText = "I'm online and ready! Ask me for advice or search your transactions.";
    isAiReady = true;

    if (inputEl) inputEl.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (inputEl) inputEl.focus();
  } catch (error) {
    console.error("AI Load Error:", error);
    document.getElementById(loadingId).innerText = "Oops! I had trouble waking up. Please check your internet connection.";
  }
}

function toMoney(val) {
  return window.currency ? window.currency(val).format() : `$${Number(val).toFixed(2)}`;
}

async function generateAIResponse(userMessage) {
  if (!isAiReady) return "I'm still waking up! Give me just a second.";

  const txs = JSON.parse(localStorage.getItem("ff_transactions_v1")) || [];
  const buds = JSON.parse(localStorage.getItem("ff_budgets_v1")) || [];
  const totals = computeTotals(txs);
  const spentMap = expenseByCategory(txs);

  const lowerMsg = userMessage.toLowerCase();
  const stopWords = /\b(what|whats|what's|is|are|am|my|the|a|an|transaction|transactions|budget|budgets|overbudget|amount|cost|for|how|much|did|i|spend|on|find|search|show|me|tell|about)\b/gi;
  const searchWords = lowerMsg.replace(stopWords, "").replace(/[^a-z0-9\s]/gi, "").trim();

  if (lowerMsg.includes("saving") && !lowerMsg.includes("increase") && !lowerMsg.includes("would i")) {
    return `Dashboard: Your total savings are ${toMoney(totals.savings)}.`;
  }

  if (lowerMsg.includes("balance") || (lowerMsg.includes("total") && !lowerMsg.includes("budget"))) {
    return `Dashboard: Your total balance is ${toMoney(totals.balance)}. (Income: ${toMoney(totals.income)}, Expenses: ${toMoney(totals.expenses)}, Savings: ${toMoney(totals.savings)})`;
  }

  if (lowerMsg.includes("income")) {
    return `Dashboard: Your total income is ${toMoney(totals.income)}.`;
  }

  if (lowerMsg.includes("expense") || lowerMsg.includes("spent") || lowerMsg.includes("spend")) {
    if (searchWords.length === 0 && !lowerMsg.includes("too much")) {
      return `Dashboard: Your total expenses are ${toMoney(totals.expenses)}.`;
    }
  }

  if (
    lowerMsg.includes("too much") ||
    lowerMsg.includes("cut down") ||
    lowerMsg.includes("would i save") ||
    lowerMsg.includes("invest") ||
    lowerMsg.includes("advice") ||
    lowerMsg.includes("suggestion") ||
    lowerMsg.includes("help me save")
  ) {
    let highestCat = "nothing";
    let highestAmt = 0;

    for (const [cat, amt] of spentMap.entries()) {
      if (amt > highestAmt) {
        highestAmt = amt;
        highestCat = cat;
      }
    }

    if (highestAmt > 0) {
      const cutAmount = highestAmt * 0.20;
      return `Insight: Your highest expense right now is ${highestCat} (${toMoney(highestAmt)}). If you cut down your ${highestCat} spending by just 20%, you could save/invest an extra ${toMoney(cutAmount)} this month!`;
    } else {
      return "Insight: You don't have any expenses logged yet! Once you add some transactions, I can analyze where you can save money.";
    }
  }

  if (lowerMsg.includes("budget") || lowerMsg.includes("allowance") || lowerMsg.includes("overbudget") || lowerMsg.includes("over budget")) {
    if (buds.length > 0) {
      let targetBud = null;

      if (searchWords.length > 0 && window.Fuse) {
        const fuseBud = new window.Fuse(buds, { keys: ['category'], threshold: 0.4 });
        const budResults = fuseBud.search(searchWords).map(res => res.item);
        if (budResults.length > 0) {
          targetBud = budResults[0];
        }
      }

      if (targetBud) {
        const limit = Number(targetBud.limit);
        const spent = spentMap.get(targetBud.category) || 0;
        const left = limit - spent;

        if (lowerMsg.includes("overbudget") || lowerMsg.includes("over budget")) {
          if (left < 0) {
            return `Yes, you are overbudget for ${targetBud.category}. You are over your limit by ${toMoney(Math.abs(left))}.`;
          } else if (left === 0) {
            return `You have reached your exact limit for ${targetBud.category}. You have $0 left to spend in this category.`;
          } else {
            return `No, you are not overbudget for ${targetBud.category}. You still have ${toMoney(left)} left to spend.`;
          }
        } else {
          return `Budget: Your limit for ${targetBud.category} is ${toMoney(limit)}. You have spent ${toMoney(spent)}, leaving you with ${toMoney(left)} left.`;
        }
      } else {
        const totalBud = buds.reduce((s, b) => s + Number(b.limit), 0);
        return `Budget: Your total planned budget across all categories is ${toMoney(totalBud)}.`;
      }
    } else {
      return "Budget: You don't have any budgets set up yet.";
    }
  }

  if (window.Fuse && txs.length > 0) {
    if (searchWords.length > 1) {
      const fuseTx = new window.Fuse(txs, { keys: ['desc', 'category'], threshold: 0.4 });
      const txResults = fuseTx.search(searchWords).map(res => res.item);

      if (txResults.length > 0) {
        const t = txResults[0];
        const sign = t.type === "expense" ? "-" : "+";
        return `${t.desc}: ${t.date} | Amount: ${sign}${toMoney(t.amount)}`;
      }
    }
  }

  try {
    const promptTemplate = LangchainPromptTemplate.fromTemplate(`
<|im_start|>system
You are Spark, a helpful financial assistant. Answer briefly and conversationally. Do not write formulas, code, or math equations.<|im_end|>
<|im_start|>user
{question}<|im_end|>
<|im_start|>assistant
`);

    const formattedPrompt = await promptTemplate.format({
      question: userMessage
    });

    const output = await aiPipeline(formattedPrompt, {
      max_new_tokens: 60,
      do_sample: false,
      return_full_text: false
    });

    let replyText = output[0].generated_text;

    if (replyText.includes("assistant\n")) {
      const parts = replyText.split("assistant\n");
      replyText = parts[parts.length - 1];
    }

    return replyText.trim() || "I couldn't find a matching transaction. Try asking about a specific item like 'food' or 'groceries'!";
  } catch (error) {
    console.error("The REAL Generation Error:", error);
    return "I couldn't find a matching transaction or budget. Try searching for a specific expense!";
  }
}

function appendMessage(sender, text) {
  const chatBody = document.getElementById("spark-chat-body");
  if (!chatBody) return null;
  const div = document.createElement("div");
  div.className = "chat-msg " + sender;
  div.id = "msg-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  div.innerText = text;

  if (sender === "user") {
    div.style.cssText =
      "background:var(--green);color:#fff;align-self:flex-end;" +
      "border-bottom-left-radius:12px;border-bottom-right-radius:4px;margin-left:auto;";
  }

  chatBody.appendChild(div);
  scrollToBottom();
  return div.id;
}

function scrollToBottom() {
  const cb = document.getElementById("spark-chat-body");
  if (cb) cb.scrollTop = cb.scrollHeight;
}

/* =========================================
   9. INITIALIZATION
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  const sparkInput = document.getElementById("spark-input");
  if (sparkInput) {
    sparkInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") window.handleSparkSend();
    });
  }

  loadBudgets();
  loadCategories();
  renderAll();
  initRiveScript();
});
