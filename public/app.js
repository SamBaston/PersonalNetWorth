// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = '/api';

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = {
  currency(amount, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  },
  date(dateStr) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(new Date(dateStr));
  },
  relativeDate(isoStr) {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)   return 'just now';
    if (diff < 60)  return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return fmt.date(isoStr);
  }
};

// ─── API ──────────────────────────────────────────────────────────────────────
const api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  async post(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
};

// ─── RENDER HELPERS ───────────────────────────────────────────────────────────
function setEl(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function showBanner(ok, msg) {
  setEl('api-status', `
    <div class="api-banner ${ok ? 'ok' : 'err'}">
      <span class="status-dot" style="${ok ? '' : 'background:var(--red);box-shadow:0 0 6px var(--red)'}"></span>
      ${msg}
    </div>
  `);
}

// ─── SECTIONS ─────────────────────────────────────────────────────────────────
async function loadSummary() {
  try {
    const data = await api.get('/summary');
    const parts = fmt.currency(data.netWorth, data.currency).replace(/[£$€]/, '').trim();
    setEl('net-worth-value', `
      <span class="currency-sym">£</span>${parts}
    `);
    setEl('net-worth-breakdown', `
      <div class="breakdown-item">
        <div class="breakdown-label">Cash</div>
        <div class="breakdown-value">${fmt.currency(data.byType.cash || 0, data.currency)}</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Savings</div>
        <div class="breakdown-value">${fmt.currency(data.byType.savings || 0, data.currency)}</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Investments</div>
        <div class="breakdown-value positive">${fmt.currency(data.byType.investment || 0, data.currency)}</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-label">Accounts</div>
        <div class="breakdown-value">${data.accountCount}</div>
      </div>
    `);
    showBanner(true, `Connected to local API &nbsp;·&nbsp; Last refreshed ${fmt.relativeDate(data.lastUpdated)}`);
  } catch (err) {
    showBanner(false, `Could not reach API — ensure the server is running with <code>npm start</code>`);
  }
}

async function loadAccounts() {
  try {
    const accounts = await api.get('/accounts');
    const html = accounts.map(acc => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${acc.name}</span>
          <span class="card-badge badge-${acc.type}">${acc.type}</span>
        </div>
        <div class="account-balance">${fmt.currency(acc.balance, acc.currency)}</div>
        <div class="account-institution">${acc.institution}</div>
        <div class="account-updated">Updated ${fmt.relativeDate(acc.lastUpdated)}</div>
      </div>
    `).join('');
    setEl('accounts-grid', html);
  } catch (err) {
    setEl('accounts-grid', `<p style="color:var(--text-muted);font-size:.8rem">Failed to load accounts.</p>`);
  }
}

async function loadTransactions() {
  try {
    const txns = await api.get('/transactions');
    const recent = txns.slice(-8).reverse();
    const rows = recent.map(t => `
      <tr>
        <td>${fmt.date(t.date)}</td>
        <td class="td-desc">${t.description}</td>
        <td><span class="category-tag">${t.category}</span></td>
        <td class="${t.amount >= 0 ? 'amount-positive' : 'amount-negative'}">
          ${t.amount >= 0 ? '+' : ''}${fmt.currency(t.amount)}
        </td>
      </tr>
    `).join('');
    setEl('transactions-body', rows || `<tr><td colspan="4" style="color:var(--text-muted);padding:24px 16px">No transactions yet.</td></tr>`);
  } catch (err) {
    setEl('transactions-body', `<tr><td colspan="4" style="color:var(--text-muted);padding:24px 16px">Failed to load transactions.</td></tr>`);
  }
}

// ─── HEADER DATE ──────────────────────────────────────────────────────────────
function setHeaderDate() {
  const el = document.getElementById('header-date');
  if (el) el.textContent = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setHeaderDate();
  loadSummary();
  loadAccounts();
  loadTransactions();

  // Refresh button
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    loadSummary();
    loadAccounts();
    loadTransactions();
  });
});
