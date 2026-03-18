// Simple "student-style" state
let categories = ["Food", "Shopping", "Housing", "Income"];
let transactions = [
  { id: 1, title: "Paycheck", category: "Income", date: "2026-02-01", type: "income", amount: 2500 },
  { id: 2, title: "Rent", category: "Housing", date: "2026-02-02", type: "expense", amount: 1400 },
  { id: 3, title: "Groceries", category: "Food", date: "2026-02-03", type: "expense", amount: 65.22 },
];

let editingId = null;

// Elements
const txList = document.getElementById("txList");
const txEmpty = document.getElementById("txEmpty");

const kpiIncome = document.getElementById("kpiIncome");
const kpiExpense = document.getElementById("kpiExpense");
const kpiNet = document.getElementById("kpiNet");

const searchInput = document.getElementById("searchInput");
const filterCat = document.getElementById("filterCat");

const txForm = document.getElementById("txForm");
const txFormTitle = document.getElementById("txFormTitle");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const txError = document.getElementById("txError");
const submitTxBtn = document.getElementById("submitTxBtn");

const titleInput = document.getElementById("titleInput");
const amountInput = document.getElementById("amountInput");
const dateInput = document.getElementById("dateInput");
const typeInput = document.getElementById("typeInput");
const categoryInput = document.getElementById("categoryInput");

const newCatInput = document.getElementById("newCatInput");
const addCatBtn = document.getElementById("addCatBtn");
const catList = document.getElementById("catList");

// init date
dateInput.value = new Date().toISOString().slice(0, 10);

// Helpers
function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function showError(msg) {
  txError.textContent = msg;
  txError.style.display = "block";
}

function clearError() {
  txError.textContent = "";
  txError.style.display = "none";
}

function resetTxForm() {
  editingId = null;
  txFormTitle.textContent = "Add Transaction";
  submitTxBtn.textContent = "Add";
  cancelEditBtn.style.display = "none";
  titleInput.value = "";
  amountInput.value = "";
  typeInput.value = "expense";
  dateInput.value = new Date().toISOString().slice(0, 10);
  categoryInput.value = categories[0] || "Food";
  clearError();
}

// Render dropdowns
function renderCategoryDropdowns() {
  // filter dropdown
  filterCat.innerHTML = `<option value="All">All</option>` + categories
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  // form dropdown
  categoryInput.innerHTML = categories
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  // keep selection if possible
  if (![...filterCat.options].some(o => o.value === filterCat.value)) filterCat.value = "All";
  if (![...categoryInput.options].some(o => o.value === categoryInput.value)) categoryInput.value = categories[0] || "Food";
}

// Render KPIs
function renderKPIs() {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  kpiIncome.textContent = money(income);
  kpiExpense.textContent = money(expense);
  kpiNet.textContent = money(net);
  kpiNet.style.color = net >= 0 ? "var(--green)" : "var(--red)";
}

// Render Transactions list
function renderTransactions() {
  const s = (searchInput.value || "").toLowerCase();
  const cat = filterCat.value;

  const shown = transactions
    .filter(t => (cat === "All" ? true : t.category === cat))
    .filter(t => t.title.toLowerCase().includes(s))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  txList.innerHTML = shown.map((t) => {
    const amtClass = t.type === "income" ? "good" : "bad";
    const sign = t.type === "income" ? "+" : "-";
    return `
      <div class="item">
        <div>
          <div class="itemTitle">${t.title}</div>
          <div class="itemMeta">${t.category} • ${t.date} • ${t.type}</div>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <div class="amount ${amtClass}">${sign}${money(t.amount)}</div>
          <button class="btnSmall" data-action="edit" data-id="${t.id}">Edit</button>
          <button class="btnSmallDanger" data-action="delete" data-id="${t.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  txEmpty.style.display = shown.length === 0 ? "block" : "none";
}

// Render Categories list
function renderCategories() {
  catList.innerHTML = categories.map((c, i) => {
    return `
      <div class="item">
        <div class="itemTitle">${c}</div>
        <div style="display:flex; gap:8px;">
          <button class="btnSmall" data-action="editCat" data-index="${i}">Edit</button>
          <button class="btnSmallDanger" data-action="deleteCat" data-index="${i}">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

// One render to rule them all
function renderAll() {
  renderCategoryDropdowns();
  renderKPIs();
  renderTransactions();
  renderCategories();
}

// Events: filters
searchInput.addEventListener("input", renderTransactions);
filterCat.addEventListener("change", renderTransactions);

// Events: tx form submit
txForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;
  const type = typeInput.value;
  const category = categoryInput.value;

  if (!title) return showError("Title is required.");
  if (!date) return showError("Date is required.");
  if (!category) return showError("Pick a category.");
  if (!Number.isFinite(amount)) return showError("Amount must be a number.");
  if (amount <= 0) return showError("Amount must be greater than 0.");

  clearError();

  if (editingId) {
    transactions = transactions.map((t) =>
      t.id === editingId ? { ...t, title, amount, date, type, category } : t
    );
  } else {
    transactions.push({ id: Date.now(), title, amount, date, type, category });
  }

  resetTxForm();
  renderAll();
});

// Cancel edit
cancelEditBtn.addEventListener("click", () => {
  resetTxForm();
});

// Events: add category
addCatBtn.addEventListener("click", () => {
  const name = newCatInput.value.trim();
  if (!name) return;
  if (categories.includes(name)) return;

  categories.push(name);
  newCatInput.value = "";
  renderAll();
});

// Delegated click handling for lists
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;

  // Transaction actions
  if (action === "edit") {
    const id = Number(btn.dataset.id);
    const t = transactions.find(x => x.id === id);
    if (!t) return;

    editingId = id;
    txFormTitle.textContent = "Edit Transaction";
    submitTxBtn.textContent = "Save";
    cancelEditBtn.style.display = "inline-block";

    titleInput.value = t.title;
    amountInput.value = String(t.amount);
    dateInput.value = t.date;
    typeInput.value = t.type;
    categoryInput.value = t.category;
    clearError();
    return;
  }

  if (action === "delete") {
    const id = Number(btn.dataset.id);
    transactions = transactions.filter(t => t.id !== id);
    if (editingId === id) resetTxForm();
    renderAll();
    return;
  }

  // Category actions (simple prompt-based edit)
  if (action === "editCat") {
    const i = Number(btn.dataset.index);
    const oldName = categories[i];
    const newName = prompt("Rename category:", oldName);
    if (!newName) return;
    if (categories.includes(newName)) return;

    categories[i] = newName;
    transactions = transactions.map(t => (t.category === oldName ? { ...t, category: newName } : t));
    renderAll();
    return;
  }

  if (action === "deleteCat") {
    const i = Number(btn.dataset.index);
    const name = categories[i];
    const used = transactions.some(t => t.category === name);

    if (used) {
      alert("This category is used by a transaction. Change those transactions first.");
      return;
    }

    categories.splice(i, 1);
    renderAll();
    return;
  }
});

// First render
renderAll();
resetTxForm();