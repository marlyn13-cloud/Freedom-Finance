/* =========================
   STORAGE KEYS
========================= */
const TX_KEY  = "ff_transactions_v1";
const BUD_KEY = "ff_budgets_v1";
const CAT_KEY = "ff_categories_v1";

/* =========================
   APP STATE
========================= */
let searchTerm = "";
let editingTxId = null;
let editingBudId = null;

/* =========================
   HELPERS
========================= */
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function money(n){
  return n.toLocaleString(undefined, {
    style:"currency",
    currency:"USD"
  });
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================
   PAGE NAVIGATION
========================= */
function showPage(name){
  const pages = ["dashboard","transactions","budget","reports"];
  for(const p of pages){
    document.getElementById("page-" + p).classList.toggle("active", p === name);
    document.getElementById("tab-" + p).classList.toggle("active", p === name);
  }
  window.scrollTo({ top:0, behavior:"instant" });
}

function setSearch(v){
  searchTerm = (v || "").trim().toLowerCase();
  renderAll();
}

/* =========================
   MODAL HELPERS
========================= */
function openModal(id){
  document.getElementById(id).style.display = "flex";
}

function closeModal(id){
  document.getElementById(id).style.display = "none";
}

function backdropClose(e, id){
  if(e.target.id === id) closeModal(id);
}

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    closeModal("txModal");
    closeModal("budgetModal");
  }
});

/* =========================
   DATA LOAD / SAVE
========================= */
function loadTx(){
  try{
    return JSON.parse(localStorage.getItem(TX_KEY)) || [];
  }catch{
    return [];
  }
}

function saveTx(txs){
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
}

function loadBudgets(){
  try{
    const b = JSON.parse(localStorage.getItem(BUD_KEY));
    if(Array.isArray(b) && b.length) return b;
  }catch{}

  /* Placeholder budgets */
  const seed = [
    {id: uid(), category:"Food", limit:200},
    {id: uid(), category:"Entertainment", limit:100},
    {id: uid(), category:"Transport", limit:150},
    {id: uid(), category:"Utilities", limit:120},
    {id: uid(), category:"Shopping", limit:180},
    {id: uid(), category:"Dining Out", limit:160},
  ];

  localStorage.setItem(BUD_KEY, JSON.stringify(seed));
  return seed;
}

function saveBudgets(buds){
  localStorage.setItem(BUD_KEY, JSON.stringify(buds));
}

function loadCategories(){
  try{
    const c = JSON.parse(localStorage.getItem(CAT_KEY));
    if(Array.isArray(c) && c.length) return c;
  }catch{}

  const defaults = ["Other","Salary"];
  localStorage.setItem(CAT_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveCategories(cats){
  localStorage.setItem(CAT_KEY, JSON.stringify(cats));
}

/* =========================
   CATEGORY MERGING
========================= */
function getAllCategoryOptions(){
  const set = new Map();

  for(const c of loadCategories()) set.set(c.toLowerCase(), c);
  for(const b of loadBudgets()) set.set(String(b.category).toLowerCase(), b.category);

  for(const t of loadTx()){
    if(t.category) set.set(String(t.category).toLowerCase(), t.category);
  }

  return Array.from(set.values()).sort((a,b)=>a.localeCompare(b));
}

/* =========================
   CALCULATIONS
========================= */
function computeTotals(txs){
  let income = 0;
  let expenses = 0;
  let savings = 0;
  let investment = 0;

  for(const t of txs){
    const amt = Number(t.amount || 0);

    if(t.type === "income") income += amt;
    if(t.type === "expense") expenses += Math.abs(amt);
    if(t.type === "savings") savings += amt;
    if(t.type === "investment") investment += amt;
  }

  const balance = income - expenses + savings + investment;
  return { income, expenses, savings, investment, balance };
}

function expenseByCategory(txs){
  const m = new Map();

  for(const t of txs){
    if(t.type !== "expense") continue;
    const cat = t.category || "Other";
    const amt = Math.abs(Number(t.amount || 0));
    m.set(cat, (m.get(cat) || 0) + amt);
  }

  return m;
}

/* =========================
   TRANSACTIONS UI HELPERS
========================= */
function clearTxError(){
  const b = document.getElementById("txError");
  b.style.display = "none";
  b.textContent = "";
}

function txError(msg){
  const b = document.getElementById("txError");
  b.style.display = "block";
  b.textContent = msg;
}

function populateTxCategoryDropdown(selected){
  const sel = document.getElementById("txCategory");
  const cats = getAllCategoryOptions();
  sel.innerHTML = "";

  for(const c of cats){
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

function onTxCategoryChange(){
  const v = document.getElementById("txCategory").value;
  const input = document.getElementById("txNewCategory");

  if(v === "__new__"){
    input.classList.remove("hidden");
    input.value = "";
    input.focus();
  }else{
    input.classList.add("hidden");
    input.value = "";
  }
}

function openTxModalAdd(){
  editingTxId = null;
  clearTxError();

  document.getElementById("txModalTitle").textContent = "Add Transaction";
  document.getElementById("txSaveBtn").textContent = "Save";
  document.getElementById("txType").value = "expense";
  document.getElementById("txDate").value = new Date().toISOString().slice(0,10);
  document.getElementById("txDesc").value = "";
  document.getElementById("txAmount").value = "";

  populateTxCategoryDropdown("Food");
  openModal("txModal");
}

function openTxModalEdit(id){
  const txs = loadTx();
  const t = txs.find(x => x.id === id);
  if(!t) return;

  editingTxId = id;
  clearTxError();

  document.getElementById("txModalTitle").textContent = "Edit Transaction";
  document.getElementById("txSaveBtn").textContent = "Update";
  document.getElementById("txType").value = t.type;
  document.getElementById("txDate").value = t.date || new Date().toISOString().slice(0,10);
  document.getElementById("txDesc").value = t.desc || "";

  const amt = Number(t.amount || 0);
  document.getElementById("txAmount").value = Math.abs(amt);

  populateTxCategoryDropdown(t.category || "Other");
  openModal("txModal");
}

function saveTransaction(){
  clearTxError();

  const type = document.getElementById("txType").value;
  const date = document.getElementById("txDate").value;
  const desc = (document.getElementById("txDesc").value || "").trim();
  const amountRaw = Number(document.getElementById("txAmount").value);

  if(!date) return txError("Pick a date.");
  if(!desc) return txError("Enter a description.");
  if(!Number.isFinite(amountRaw) || amountRaw <= 0) return txError("Amount must be a positive number.");

  let category = document.getElementById("txCategory").value;
  const newCat = (document.getElementById("txNewCategory").value || "").trim();

  if(category === "__new__"){
    if(!newCat) return txError("Enter a new category name.");
    category = newCat;

    const cats = loadCategories();
    if(!cats.some(c => c.toLowerCase() === newCat.toLowerCase())){
      cats.push(newCat);
      saveCategories(cats);
    }
  }

  const storedAmount = (type === "expense") ? -Math.abs(amountRaw) : Math.abs(amountRaw);
  const txs = loadTx();

  if(editingTxId){
    const idx = txs.findIndex(x => x.id === editingTxId);
    if(idx >= 0){
      txs[idx] = {
        id: editingTxId,
        type,
        date,
        desc,
        amount: storedAmount,
        category
      };
    }
  }else{
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

function deleteTransaction(id){
  const txs = loadTx().filter(t => t.id !== id);
  saveTx(txs);
  renderAll();
}

function txRow(t, showActions){
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

function filteredTransactions(txs){
  if(!searchTerm) return txs;

  return txs.filter(t => {
    const hay = `${t.desc || ""} ${t.category || ""} ${t.type || ""}`.toLowerCase();
    return hay.includes(searchTerm);
  });
}

/* =========================
   BUDGET UI HELPERS
========================= */
function clearBudError(){
  const b = document.getElementById("budError");
  b.style.display = "none";
  b.textContent = "";
}

function budError(msg){
  const b = document.getElementById("budError");
  b.style.display = "block";
  b.textContent = msg;
}

function openBudgetModalAdd(){
  editingBudId = null;
  clearBudError();

  document.getElementById("budgetModalTitle").textContent = "New Budget";
  document.getElementById("budSaveBtn").textContent = "Save";
  document.getElementById("budCategory").value = "";
  document.getElementById("budLimit").value = "";

  openModal("budgetModal");
  document.getElementById("budCategory").focus();
}

function openBudgetModalEdit(id){
  const buds = loadBudgets();
  const b = buds.find(x => x.id === id);
  if(!b) return;

  editingBudId = id;
  clearBudError();

  document.getElementById("budgetModalTitle").textContent = "Edit Budget";
  document.getElementById("budSaveBtn").textContent = "Update";
  document.getElementById("budCategory").value = b.category;
  document.getElementById("budLimit").value = b.limit;

  openModal("budgetModal");
  document.getElementById("budCategory").focus();
}

function saveBudget(){
  clearBudError();

  const cat = (document.getElementById("budCategory").value || "").trim();
  const lim = Number(document.getElementById("budLimit").value);

  if(!cat) return budError("Enter a category.");
  if(!Number.isFinite(lim) || lim < 0) return budError("Limit must be 0 or more.");

  const buds = loadBudgets();

  const dup = buds.find(x => x.category.toLowerCase() === cat.toLowerCase() && x.id !== editingBudId);
  if(dup) return budError("That category already exists. Edit it instead.");

  if(editingBudId){
    const idx = buds.findIndex(x => x.id === editingBudId);
    if(idx >= 0) buds[idx] = { id: editingBudId, category: cat, limit: lim };
  }else{
    buds.push({ id: uid(), category: cat, limit: lim });
  }

  saveBudgets(buds);

  const cats = loadCategories();
  if(!cats.some(c => c.toLowerCase() === cat.toLowerCase())){
    cats.push(cat);
    saveCategories(cats);
  }

  closeModal("budgetModal");
  renderAll();
}

function deleteBudget(id){
  const buds = loadBudgets().filter(b => b.id !== id);
  saveBudgets(buds);
  renderAll();
}

function budgetStatus(spent, limit){
  if(limit <= 0) return {label:"On Track", cls:"good"};
  const pct = spent / limit;
  if(pct >= 1) return {label:"Over Budget", cls:"bad"};
  if(pct >= 0.9) return {label:"Almost There", cls:"warn"};
  return {label:"On Track", cls:"good"};
}

/* =========================
   RENDERING
========================= */
function renderSummary(){
  const txs = loadTx();
  const {income, expenses, savings, balance} = computeTotals(txs);

  document.getElementById("sum-income").textContent = money(income);
  document.getElementById("sum-expenses").textContent = money(expenses);
  document.getElementById("sum-savings").textContent = money(savings);
  document.getElementById("sum-balance").textContent = money(balance);
}

function renderChart(){
  const txs = loadTx();
  const map = expenseByCategory(txs);
  const rows = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const wrap = document.getElementById("chartWrap");
  wrap.innerHTML = "";

  if(rows.length === 0){
    wrap.innerHTML = `<div class="chart-empty">No expenses yet. Add an&nbsp;<b>Expense</b>&nbsp;to see the chart.</div>`;
    return;
  }

  const colors = ['#00c853', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];
  const total = rows.reduce((sum, row) => sum + row[1], 0);

  let gradientStops = [];
  let currentPct = 0;
  let legendHtml = "";

  for(let i = 0; i < rows.length; i++){
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

  const conicGradient = `conic-gradient(${gradientStops.join(', ')})`;

  wrap.innerHTML = `
    <div class="pie-container">
      <div class="pie-chart" style="background: ${conicGradient}"></div>
      <div class="pie-legend">
        ${legendHtml}
      </div>
    </div>
  `;
}

function renderRecent(){
  const txs = loadTx().slice().sort((a,b)=>(b.date || "").localeCompare(a.date || ""));
  const recent = txs.slice(0,6);
  const wrap = document.getElementById("recentList");
  wrap.innerHTML = "";

  if(recent.length === 0){
    wrap.innerHTML = `<div class="chart-empty">Nothing yet. Click&nbsp;<b> + Add Transaction</b>&nbsp;to start.</div>`;
    return;
  }

  for(const t of recent){
    wrap.appendChild(txRow(t,false));
  }
}

function renderAllTransactions(){
  const txs = loadTx().slice().sort((a,b)=>(b.date || "").localeCompare(a.date || ""));
  const list = filteredTransactions(txs);

  const wrap = document.getElementById("allList");
  wrap.innerHTML = "";

  if(list.length === 0){
    wrap.innerHTML = `<div class="chart-empty">No matching transactions.</div>`;
    return;
  }

  for(const t of list){
    wrap.appendChild(txRow(t,true));
  }
}

function renderBudgets(){
  const txs = loadTx();
  const buds = loadBudgets();
  const spentMap = expenseByCategory(txs);

  const totalBudget = buds.reduce((s,b)=>s + Number(b.limit || 0), 0);
  let totalSpent = 0;

  for(const b of buds){
    totalSpent += (spentMap.get(b.category) || 0);
  }

  const remaining = totalBudget - totalSpent;
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  document.getElementById("bud-total").textContent  = "$" + Math.round(totalBudget).toLocaleString();
  document.getElementById("bud-spent").textContent  = "$" + Math.round(totalSpent).toLocaleString();
  document.getElementById("bud-remain").textContent = "$" + Math.round(remaining).toLocaleString();
  document.getElementById("bud-fill").style.width = pct + "%";
  document.getElementById("bud-pct").textContent = pct + "%";

  const grid = document.getElementById("budgetGrid");
  grid.innerHTML = "";

  if(buds.length === 0){
    grid.innerHTML = `<div class="chart-empty">No budgets. Click <b>+ New Budget</b> to add one.</div>`;
    return;
  }

  for(const b of buds){
    const limit = Number(b.limit || 0);
    const spent = spentMap.get(b.category) || 0;
    const ratio = (limit > 0) ? Math.min(1, spent / limit) : 0;
    const width = Math.round(ratio * 100);

    const status = budgetStatus(spent, limit);

    let rightText = "";
    if(limit <= 0) rightText = `<span class="right">$0 left</span>`;
    else if(spent > limit) rightText = `<span class="right red-text">$${Math.round(spent - limit)} over</span>`;
    else rightText = `<span class="right">$${Math.round(limit - spent)} left</span>`;

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
      <div class="bar-container">
        <div class="bar-fill2" style="width:${width}%; background:${status.cls === 'bad' ? 'var(--bad)' : (status.cls === 'warn' ? 'var(--warn)' : '#3b82f6')};"></div>
      </div>
      <p class="details">
        ${limit > 0 ? Math.round((spent / limit) * 100) : 0}% used
        ${rightText}
      </p>
    `;
    grid.appendChild(card);
  }
}

function renderAll(){
  renderSummary();
  renderChart();
  renderRecent();
  renderAllTransactions();
  renderBudgets();
}

/* =========================
   INIT
========================= */
(function init(){
  loadBudgets();
  loadCategories();
  renderAll();
})();