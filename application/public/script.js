/* ═══════════════════════════════════════════════════════════════════════════
   Wealth Tracker — Client Script
   ═══════════════════════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────────────────────

let state = {
    bankAccounts:  [],
    isaAccounts:   [],
    lisaAccounts:  [],
    stockHoldings: [],
    liabilities:   []
};

let editingId   = null;
let editingType = null;

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadData();
});

async function loadData() {
    try {
        const res  = await fetch('/api/wealth');
        const data = await res.json();

        state.bankAccounts  = data.bankAccounts  || [];
        state.isaAccounts   = data.isaAccounts   || [];
        state.lisaAccounts  = data.lisaAccounts  || [];
        state.stockHoldings = data.stockHoldings || [];
        state.liabilities   = data.liabilities   || [];

        render();
    } catch (e) {
        toast('Failed to load data from server.', 'error');
        console.error(e);
    }
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
    renderSummary();
    renderBankAccounts();
    renderISAs();
    renderLISAs();
    renderStocks();
    renderLiabilities();
}

function renderSummary() {
    const bankTotal  = state.bankAccounts.reduce((s, a) => s + (a.balance || 0), 0);
    const isaTotal   = state.isaAccounts.reduce((s, a)  => s + (a.balance || 0), 0);
    // LISA total includes balance + pending bonus
    const lisaTotal  = state.lisaAccounts.reduce((s, a) => s + (a.balance || 0) + (a.bonusPending || 0), 0);
    // Stocks in native currency — warn user via note, sum as-is
    const stockTotal = state.stockHoldings.reduce((s, h) => {
        if (h.lastPrice && h.shares) return s + (h.lastPrice * h.shares);
        return s;
    }, 0);
    const liabTotal  = state.liabilities.reduce((s, l) => s + (l.value || 0), 0);
    const totalAssets = bankTotal + isaTotal + lisaTotal + stockTotal;
    const netWorth   = totalAssets - liabTotal;

    // Header
    const nwEl = document.getElementById('net-worth-amount');
    animateValue(nwEl, netWorth, 'GBP');

    // Summary bar
    document.getElementById('sum-assets').textContent      = fmt(totalAssets, 'GBP');
    document.getElementById('sum-liabilities').textContent  = fmt(liabTotal,  'GBP');
    document.getElementById('sum-bank').textContent         = fmt(bankTotal,  'GBP');
    document.getElementById('sum-isa').textContent          = fmt(isaTotal,   'GBP');
    document.getElementById('sum-lisa').textContent         = fmt(lisaTotal,  'GBP');
    document.getElementById('sum-stocks').textContent       = stockTotal > 0
        ? fmt(stockTotal)
        : '—';

    const nwClass = netWorth >= 0 ? 'positive' : 'negative';
    nwEl.className = `nw-value ${nwClass}`;
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────

function renderBankAccounts() {
    const list  = document.getElementById('bank-list');
    const empty = document.getElementById('bank-empty');

    if (!state.bankAccounts.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = state.bankAccounts.map((a, i) => {
        const typeLabel = a.type === 'current' ? 'Current Account' : 'Savings Account';
        const typeClass = a.type === 'savings'  ? 'badge-savings'  : 'badge-bank';
        const cardClass = a.type === 'savings'  ? 'bank-savings'   : 'bank-current';

        return `
        <div class="account-card ${cardClass}" style="animation-delay:${i * 0.05}s">
            <div class="card-actions">
                <button class="btn-edit" onclick="editItem('bank','${a.id}')" title="Edit">✎</button>
                <button class="btn-danger" onclick="deleteItem('bank','${a.id}')" title="Delete">✕</button>
            </div>
            <span class="card-type-badge ${typeClass}">${typeLabel}</span>
            <div class="card-name">${esc(a.name)}</div>
            <div class="card-balance">
                <span class="card-currency-tag">${a.currency || 'GBP'}</span>${fmt(a.balance, a.currency)}
            </div>
        </div>`;
    }).join('');
}

// ── ISAs ──────────────────────────────────────────────────────────────────────

function renderISAs() {
    const list  = document.getElementById('isa-list');
    const empty = document.getElementById('isa-empty');

    // ISA Allowance Banner
    const totalYear = state.isaAccounts.reduce((s, a) => s + (a.yearContribution || 0), 0);
    const limit = 20000;
    const pct   = Math.min((totalYear / limit) * 100, 100);
    document.getElementById('allowance-detail').textContent = `${fmt(totalYear, 'GBP')} used of ${fmt(limit, 'GBP')}`;
    document.getElementById('allowance-pct').textContent    = `${Math.round(pct)}%`;
    const fillEl = document.getElementById('allowance-fill');
    setTimeout(() => { fillEl.style.width = pct + '%'; }, 50);
    if (pct > 80) fillEl.classList.add('warn'); else fillEl.classList.remove('warn');

    if (!state.isaAccounts.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    const isaTypeMap = {
        'cash':            { label: 'Cash ISA',              cls: 'badge-isa', cardCls: 'isa-cash'   },
        'stocks_shares':   { label: 'Stocks & Shares ISA',   cls: 'badge-isa', cardCls: 'isa-stocks' },
        'innovative_finance': { label: 'Innovative Finance ISA', cls: 'badge-isa', cardCls: 'isa-if' }
    };

    list.innerHTML = state.isaAccounts.map((a, i) => {
        const meta     = isaTypeMap[a.type] || isaTypeMap.cash;
        const contrib  = a.yearContribution || 0;
        const annLimit = a.annualLimit || 20000;
        const pct      = Math.min((contrib / annLimit) * 100, 100);
        const remaining = annLimit - contrib;

        return `
        <div class="account-card ${meta.cardCls}" style="animation-delay:${i * 0.05}s">
            <div class="card-actions">
                <button class="btn-edit" onclick="editItem('isa','${a.id}')" title="Edit">✎</button>
                <button class="btn-danger" onclick="deleteItem('isa','${a.id}')" title="Delete">✕</button>
            </div>
            <span class="card-type-badge ${meta.cls}">${meta.label}</span>
            <div class="card-name">${esc(a.name)}</div>
            ${a.provider ? `<div class="card-provider">via ${esc(a.provider)} · ${a.taxYear || '2024–25'}</div>` : ''}
            <div class="card-balance">
                <span class="card-currency-tag">${a.currency || 'GBP'}</span>${fmt(a.balance, a.currency)}
            </div>
            <div class="contribution-meta">
                <div class="contribution-row">
                    <span class="contribution-label">Contributed this year</span>
                    <span class="contribution-value">${fmt(contrib, 'GBP')}</span>
                </div>
                <div class="progress-bar" style="margin-bottom:0.4rem">
                    <div class="progress-fill${pct > 80 ? ' warn' : ''}" style="width:${pct}%"></div>
                </div>
                <div class="contribution-row" style="margin-top:0.3rem">
                    <span class="contribution-label" style="color:var(--text-3)">Remaining allowance</span>
                    <span class="contribution-value" style="color:var(--emerald)">${fmt(remaining, 'GBP')}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── LISAs ─────────────────────────────────────────────────────────────────────

function renderLISAs() {
    const list  = document.getElementById('lisa-list');
    const empty = document.getElementById('lisa-empty');

    if (!state.lisaAccounts.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = state.lisaAccounts.map((a, i) => {
        const pending  = a.bonusPending  || 0;
        const received = a.bonusReceived || 0;
        const total    = (a.balance || 0) + pending;
        const contrib  = a.yearContribution || 0;
        const maxContrib = 4000;
        const pct      = Math.min((contrib / maxContrib) * 100, 100);
        // Max bonus for the year: 25% of contribution, capped at £1,000
        const maxBonus = Math.min(contrib * 0.25, 1000);

        return `
        <div class="account-card lisa-card" style="animation-delay:${i * 0.05}s">
            <div class="card-actions">
                <button class="btn-edit" onclick="editItem('lisa','${a.id}')" title="Edit">✎</button>
                <button class="btn-danger" onclick="deleteItem('lisa','${a.id}')" title="Delete">✕</button>
            </div>
            <span class="card-type-badge badge-lisa">Lifetime ISA</span>
            <div class="card-name">${esc(a.name)}</div>
            ${a.provider ? `<div class="card-provider">via ${esc(a.provider)}</div>` : ''}
            <div class="card-balance">
                <span class="card-currency-tag">GBP</span>${fmt(a.balance || 0, 'GBP')}
            </div>

            <div class="contribution-meta">
                <div class="contribution-row">
                    <span class="contribution-label">Contributed this year</span>
                    <span class="contribution-value">${fmt(contrib, 'GBP')} / £4,000</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--purple),var(--gold))"></div>
                </div>
            </div>

            <div class="lisa-bonus-row">
                <div class="bonus-chip pending">
                    <span class="bonus-chip-label">⏳ Govt Bonus Pending</span>
                    <span class="bonus-chip-value">${fmt(pending, 'GBP')}</span>
                </div>
                <div class="bonus-chip">
                    <span class="bonus-chip-label">✓ Bonus Received</span>
                    <span class="bonus-chip-value">${fmt(received, 'GBP')}</span>
                </div>
            </div>

            <div class="lisa-total-row">
                <span class="lisa-total-label">Total Value incl. Pending Bonus</span>
                <span class="lisa-total-value">${fmt(total, 'GBP')}</span>
            </div>
        </div>`;
    }).join('');
}

// ── Stock Holdings ────────────────────────────────────────────────────────────

function renderStocks() {
    const tbody  = document.getElementById('stocks-tbody');
    const tfoot  = document.getElementById('stocks-tfoot');
    const empty  = document.getElementById('stocks-empty');
    const wrap   = document.getElementById('stocks-table-wrap');
    const meta   = document.getElementById('stock-prices-meta');

    if (!state.stockHoldings.length) {
        wrap.classList.add('hidden');
        meta.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    wrap.classList.remove('hidden');

    let totalValue = 0;
    let anyFetched = false;
    let lastFetchTime = null;

    const rows = state.stockHoldings.map((h, i) => {
        const value  = h.lastPrice && h.shares ? h.lastPrice * h.shares : null;
        if (value) totalValue += value;

        const chgPct = h.changePercent;
        const chgCls = chgPct > 0 ? 'change-positive' : chgPct < 0 ? 'change-negative' : 'change-neutral';
        const chgStr = chgPct !== null && chgPct !== undefined
            ? `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%`
            : '—';

        if (h.lastFetched) {
            anyFetched = true;
            if (!lastFetchTime || h.lastFetched > lastFetchTime) lastFetchTime = h.lastFetched;
        }

        return `
        <tr style="animation-delay:${i * 0.04}s">
            <td><span class="ticker-badge">${esc(h.ticker)}</span></td>
            <td><div class="holding-name" title="${esc(h.name || h.ticker)}">${esc(h.name || h.ticker)}</div></td>
            <td class="text-right">${h.shares}</td>
            <td class="text-right">
                ${h.lastPrice
                    ? `<span style="font-family:'Cormorant Garamond',serif;font-size:1.05rem">${fmtStock(h.lastPrice, h.currency)}</span>`
                    : `<span class="price-loading">—</span>`}
            </td>
            <td class="text-right ${chgCls}">${chgStr}</td>
            <td class="text-right">
                <span class="holding-value">
                    ${value !== null ? fmtStock(value, h.currency) : '<span class="price-loading">—</span>'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editItem('stock','${h.id}')" title="Edit">✎</button>
                    <button class="btn-danger" onclick="deleteItem('stock','${h.id}')" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    tbody.innerHTML = rows;

    tfoot.innerHTML = `
        <tr>
            <td colspan="5" style="color:var(--text-3);font-size:0.72rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">
                Portfolio Total
            </td>
            <td class="text-right">
                <span class="total-portfolio-value">${totalValue > 0 ? fmtStock(totalValue) : '—'}</span>
            </td>
            <td></td>
        </tr>`;

    if (anyFetched && lastFetchTime) {
        meta.classList.remove('hidden');
        document.getElementById('prices-fetched-at').textContent = relativeTime(lastFetchTime);
    }
}

// ── Liabilities ───────────────────────────────────────────────────────────────

function renderLiabilities() {
    const list  = document.getElementById('liability-list');
    const empty = document.getElementById('liability-empty');

    if (!state.liabilities.length) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    list.innerHTML = state.liabilities.map((l, i) => `
        <div class="account-card liability-card" style="animation-delay:${i * 0.05}s">
            <div class="card-actions">
                <button class="btn-edit" onclick="editItem('liability','${l.id}')" title="Edit">✎</button>
                <button class="btn-danger" onclick="deleteItem('liability','${l.id}')" title="Delete">✕</button>
            </div>
            <span class="card-type-badge badge-debt">Liability</span>
            <div class="card-name">${esc(l.name)}</div>
            <div class="card-balance">
                <span class="card-currency-tag">${l.currency || 'GBP'}</span>${fmt(l.value, l.currency)}
            </div>
        </div>`).join('');
}

// ── Stock Price Refresh ───────────────────────────────────────────────────────

async function refreshPrices() {
    if (!state.stockHoldings.length) { toast('No holdings to refresh.', 'info'); return; }

    const btn = document.getElementById('refresh-btn');
    btn.classList.add('spinning');
    btn.disabled = true;

    try {
        const res  = await fetch('/api/stocks/refresh', { method: 'POST' });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Refresh failed');

        state.stockHoldings = data.holdings;
        renderStocks();
        renderSummary();
        toast(`Updated ${data.updated} of ${state.stockHoldings.length} holdings.`, 'success');
    } catch (e) {
        toast('Failed to refresh prices: ' + e.message, 'error');
    } finally {
        btn.classList.remove('spinning');
        btn.disabled = false;
    }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function deleteItem(type, id) {
    if (!confirm('Remove this item?')) return;
    try {
        const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json()).error);

        if (type === 'bank')      state.bankAccounts  = state.bankAccounts.filter(a => a.id !== id);
        if (type === 'isa')       state.isaAccounts   = state.isaAccounts.filter(a => a.id !== id);
        if (type === 'lisa')      state.lisaAccounts  = state.lisaAccounts.filter(a => a.id !== id);
        if (type === 'stock')     state.stockHoldings = state.stockHoldings.filter(h => h.id !== id);
        if (type === 'liability') state.liabilities   = state.liabilities.filter(l => l.id !== id);

        render();
        toast('Removed successfully.', 'success');
    } catch (e) {
        toast('Delete failed: ' + e.message, 'error');
    }
}

function editItem(type, id) {
    editingId   = id;
    editingType = type;

    let item;
    if (type === 'bank')      item = state.bankAccounts.find(a  => a.id === id);
    if (type === 'isa')       item = state.isaAccounts.find(a   => a.id === id);
    if (type === 'lisa')      item = state.lisaAccounts.find(a  => a.id === id);
    if (type === 'stock')     item = state.stockHoldings.find(h => h.id === id);
    if (type === 'liability') item = state.liabilities.find(l   => l.id === id);

    if (!item) return;
    openModal(type, item);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(type, prefill = null) {
    if (!prefill) { editingId = null; editingType = null; }

    const content = document.getElementById('modal-content');

    switch (type) {
        case 'bank':      content.innerHTML = bankForm(prefill);      break;
        case 'isa':       content.innerHTML = isaForm(prefill);       break;
        case 'lisa':      content.innerHTML = lisaForm(prefill);      break;
        case 'stock':     content.innerHTML = stockForm(prefill);     break;
        case 'liability': content.innerHTML = liabilityForm(prefill); break;
    }

    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    editingId   = null;
    editingType = null;
}

function handleOverlayClick(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ── Form HTML ─────────────────────────────────────────────────────────────────

function bankForm(d) {
    const title = d ? 'Edit Account' : 'Add Bank Account';
    return `
    <h2 class="modal-title">${title}</h2>
    <p class="modal-subtitle">Enter your account details below.</p>
    <form onsubmit="submitBank(event)">
        <div class="form-group">
            <label class="form-label">Account Name</label>
            <input class="form-input" name="name" placeholder="e.g. Barclays Current" value="${d?.name || ''}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Account Type</label>
                <select class="form-select" name="type">
                    <option value="current"  ${d?.type === 'current'  ? 'selected' : ''}>Current</option>
                    <option value="savings"  ${d?.type === 'savings'  ? 'selected' : ''}>Savings</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Currency</label>
                <select class="form-select" name="currency">
                    ${currencyOptions(d?.currency || 'GBP')}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Balance</label>
            <input class="form-input" type="number" name="balance" step="0.01" min="0"
                   placeholder="0.00" value="${d?.balance ?? ''}" required>
        </div>
        <div class="form-actions">
            <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-submit">${d ? 'Save Changes' : 'Add Account'}</button>
        </div>
    </form>`;
}

function isaForm(d) {
    const title = d ? 'Edit ISA' : 'Add ISA Account';
    return `
    <h2 class="modal-title">${title}</h2>
    <p class="modal-subtitle">UK Individual Savings Account — annual limit £20,000.</p>
    <form onsubmit="submitISA(event)">
        <div class="form-group">
            <label class="form-label">Account Name</label>
            <input class="form-input" name="name" placeholder="e.g. Vanguard S&S ISA" value="${d?.name || ''}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">ISA Type</label>
                <select class="form-select" name="type">
                    <option value="cash"               ${d?.type === 'cash'               ? 'selected' : ''}>Cash ISA</option>
                    <option value="stocks_shares"      ${d?.type === 'stocks_shares'      ? 'selected' : ''}>Stocks &amp; Shares ISA</option>
                    <option value="innovative_finance" ${d?.type === 'innovative_finance' ? 'selected' : ''}>Innovative Finance ISA</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Provider</label>
                <input class="form-input" name="provider" placeholder="e.g. Vanguard" value="${d?.provider || ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Current Balance</label>
                <input class="form-input" type="number" name="balance" step="0.01" min="0"
                       placeholder="0.00" value="${d?.balance ?? ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">This Tax Year Contribution</label>
                <input class="form-input" type="number" name="yearContribution" step="0.01" min="0" max="20000"
                       placeholder="0.00" value="${d?.yearContribution ?? ''}">
                <p class="form-hint">2024–25 allowance: £20,000</p>
            </div>
        </div>
        <div class="form-actions">
            <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-submit">${d ? 'Save Changes' : 'Add ISA'}</button>
        </div>
    </form>`;
}

function lisaForm(d) {
    const title = d ? 'Edit LISA' : 'Add Lifetime ISA';
    return `
    <h2 class="modal-title">${title}</h2>
    <p class="modal-subtitle">Government adds 25% on up to £4,000/year. Max bonus: £1,000/year.</p>
    <form onsubmit="submitLISA(event)">
        <div class="form-group">
            <label class="form-label">Account Name</label>
            <input class="form-input" name="name" placeholder="e.g. Moneybox LISA" value="${d?.name || ''}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Provider</label>
            <input class="form-input" name="provider" placeholder="e.g. Moneybox, AJ Bell" value="${d?.provider || ''}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Current Balance</label>
                <input class="form-input" type="number" name="balance" step="0.01" min="0"
                       placeholder="0.00" value="${d?.balance ?? ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Contributed This Year</label>
                <input class="form-input" type="number" name="yearContribution" id="lisa-contrib"
                       step="0.01" min="0" max="4000" placeholder="0.00" value="${d?.yearContribution ?? ''}"
                       oninput="updateLisaBonusPreview(this.value)">
                <p class="form-hint">Max £4,000/year</p>
            </div>
        </div>
        <div id="lisa-bonus-preview" class="stock-preview" style="${d?.yearContribution ? '' : 'display:none'}">
            <span class="preview-name">Estimated Government Bonus:</span>
            <span class="preview-price" id="lisa-bonus-val">${d?.yearContribution ? fmt(Math.min((d.yearContribution || 0) * 0.25, 1000), 'GBP') : ''}</span>
        </div>
        <div class="form-row" style="margin-top:1rem">
            <div class="form-group">
                <label class="form-label">Bonus Pending (not yet received)</label>
                <input class="form-input" type="number" name="bonusPending" step="0.01" min="0"
                       placeholder="0.00" value="${d?.bonusPending ?? ''}">
                <p class="form-hint">Govt bonus awaiting payment</p>
            </div>
            <div class="form-group">
                <label class="form-label">Total Bonus Received (lifetime)</label>
                <input class="form-input" type="number" name="bonusReceived" step="0.01" min="0"
                       placeholder="0.00" value="${d?.bonusReceived ?? ''}">
            </div>
        </div>
        <div class="form-actions">
            <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-submit">${d ? 'Save Changes' : 'Add LISA'}</button>
        </div>
    </form>`;
}

function stockForm(d) {
    const title = d ? 'Edit Holding' : 'Add Stock Holding';
    return `
    <h2 class="modal-title">${title}</h2>
    <p class="modal-subtitle">Enter a ticker symbol — we'll fetch the latest price automatically.</p>
    <form onsubmit="submitStock(event)">
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Ticker Symbol</label>
                <input class="form-input" name="ticker" placeholder="AAPL, TSLA, LGEN.L…"
                       value="${d?.ticker || ''}" style="text-transform:uppercase"
                       oninput="this.value=this.value.toUpperCase()"
                       onblur="lookupTickerPreview(this.value)"
                       ${d ? 'readonly' : ''} required>
                <p class="form-hint">Use .L suffix for LSE stocks (e.g. LGEN.L)</p>
            </div>
            <div class="form-group">
                <label class="form-label">Number of Shares</label>
                <input class="form-input" type="number" name="shares" step="any" min="0.001"
                       placeholder="0" value="${d?.shares ?? ''}" required>
            </div>
        </div>

        <div id="ticker-preview" class="stock-preview" style="display:${d?.lastPrice ? 'block' : 'none'}">
            ${d?.lastPrice
                ? `<span class="preview-name">${esc(d.name || d.ticker)}</span> &nbsp;
                   <span class="preview-price">${fmtStock(d.lastPrice, d.currency)}</span>
                   <span style="font-size:0.72rem;color:var(--text-3)"> ${d.currency}</span>`
                : ''}
        </div>

        <div class="form-group" style="margin-top:1rem">
            <label class="form-label">Manual Price Override (optional)</label>
            <input class="form-input" type="number" name="manualPrice" step="0.01" min="0"
                   placeholder="Leave blank to auto-fetch" value="${d?.manualPrice || ''}">
            <p class="form-hint">Only used if live price fetch fails.</p>
        </div>
        <div class="form-actions">
            <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-submit" id="stock-submit-btn">
                ${d ? 'Save Changes' : 'Add Holding'}
            </button>
        </div>
    </form>`;
}

function liabilityForm(d) {
    const title = d ? 'Edit Liability' : 'Add Liability';
    return `
    <h2 class="modal-title">${title}</h2>
    <p class="modal-subtitle">Record a debt, loan, or outstanding balance.</p>
    <form onsubmit="submitLiability(event)">
        <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-input" name="name" placeholder="e.g. Credit Card, Mortgage" value="${d?.name || ''}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Amount Owed</label>
                <input class="form-input" type="number" name="value" step="0.01" min="0"
                       placeholder="0.00" value="${d?.value ?? ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Currency</label>
                <select class="form-select" name="currency">
                    ${currencyOptions(d?.currency || 'GBP')}
                </select>
            </div>
        </div>
        <div class="form-actions">
            <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
            <button type="submit" class="btn-submit">${d ? 'Save Changes' : 'Add Liability'}</button>
        </div>
    </form>`;
}

function currencyOptions(selected) {
    const currencies = ['GBP', 'USD', 'EUR', 'CHF', 'JPY', 'AUD', 'CAD'];
    return currencies.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
}

// ── Form Submission ───────────────────────────────────────────────────────────

async function submitBank(e) {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const body = { name: fd.get('name'), type: fd.get('type'), currency: fd.get('currency'), balance: parseFloat(fd.get('balance')) };
    await submitForm('bank', body, e.target);
}

async function submitISA(e) {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const body = {
        name: fd.get('name'), type: fd.get('type'),
        provider: fd.get('provider'), currency: 'GBP',
        balance: parseFloat(fd.get('balance')),
        yearContribution: parseFloat(fd.get('yearContribution') || '0'),
        annualLimit: 20000, taxYear: '2024-25'
    };
    await submitForm('isa', body, e.target);
}

async function submitLISA(e) {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const contrib = parseFloat(fd.get('yearContribution') || '0');
    const body = {
        name: fd.get('name'), provider: fd.get('provider'), currency: 'GBP',
        balance: parseFloat(fd.get('balance') || '0'),
        yearContribution: contrib,
        bonusPending:  parseFloat(fd.get('bonusPending')  || Math.min(contrib * 0.25, 1000)),
        bonusReceived: parseFloat(fd.get('bonusReceived') || '0')
    };
    await submitForm('lisa', body, e.target);
}

async function submitStock(e) {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const btn = document.getElementById('stock-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Fetching price…';

    const body = {
        ticker:      fd.get('ticker').toUpperCase(),
        shares:      parseFloat(fd.get('shares')),
        manualPrice: fd.get('manualPrice') || undefined
    };
    await submitForm('stock', body, e.target, btn);
}

async function submitLiability(e) {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const body = { name: fd.get('name'), currency: fd.get('currency'), value: parseFloat(fd.get('value')) };
    await submitForm('liability', body, e.target);
}

async function submitForm(type, body, form, btn = null) {
    const isEdit = !!editingId;
    const url    = isEdit ? `/api/${type}/${editingId}` : `/api/${type}`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');

        if (type === 'bank')      { isEdit ? updateInArr(state.bankAccounts,  data) : state.bankAccounts.push(data);  }
        if (type === 'isa')       { isEdit ? updateInArr(state.isaAccounts,   data) : state.isaAccounts.push(data);   }
        if (type === 'lisa')      { isEdit ? updateInArr(state.lisaAccounts,  data) : state.lisaAccounts.push(data);  }
        if (type === 'stock')     { isEdit ? updateInArr(state.stockHoldings, data) : state.stockHoldings.push(data); }
        if (type === 'liability') { isEdit ? updateInArr(state.liabilities,   data) : state.liabilities.push(data);   }

        render();
        closeModal();
        toast(`${isEdit ? 'Updated' : 'Added'} successfully!`, 'success');
    } catch (err) {
        toast(err.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Add Holding'; }
    }
}

function updateInArr(arr, updated) {
    const idx = arr.findIndex(i => i.id === updated.id);
    if (idx !== -1) arr[idx] = updated;
}

// ── Ticker Preview ────────────────────────────────────────────────────────────

let lookupTimer = null;

async function lookupTickerPreview(ticker) {
    if (!ticker || ticker.length < 1) return;
    clearTimeout(lookupTimer);
    const preview = document.getElementById('ticker-preview');
    if (!preview) return;

    preview.style.display = 'block';
    preview.innerHTML = `<span style="color:var(--text-3)">Looking up ${ticker}…</span>`;

    lookupTimer = setTimeout(async () => {
        try {
            const res  = await fetch(`/api/stock/price/${encodeURIComponent(ticker)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            preview.innerHTML = `
                <span class="preview-name">${esc(data.shortName)}</span>
                &nbsp;·&nbsp;
                <span class="preview-price">${fmtStock(data.price, data.currency)}</span>
                <span style="font-size:0.72rem;color:var(--text-3)"> ${data.currency}</span>
                <span style="font-size:0.72rem;color:${data.changePercent >= 0 ? 'var(--emerald)' : 'var(--crimson)'}">
                    &nbsp;${data.changePercent >= 0 ? '▲' : '▼'}${Math.abs(data.changePercent).toFixed(2)}%
                </span>`;
        } catch (err) {
            preview.innerHTML = `<span style="color:var(--crimson)">Ticker not found — will use manual price if set.</span>`;
        }
    }, 600);
}

function updateLisaBonusPreview(val) {
    const contrib = parseFloat(val) || 0;
    const bonus   = Math.min(contrib * 0.25, 1000);
    const preview = document.getElementById('lisa-bonus-preview');
    const bonusEl = document.getElementById('lisa-bonus-val');
    if (!preview) return;
    preview.style.display = contrib > 0 ? 'block' : 'none';
    if (bonusEl) bonusEl.textContent = fmt(bonus, 'GBP');
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });
}

// ── Toast Notifications ───────────────────────────────────────────────────────

function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// ── Formatting Helpers ────────────────────────────────────────────────────────

function fmt(amount, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

function fmtStock(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function relativeTime(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(isoStr).toLocaleDateString('en-GB');
}

// Animated counter for net worth headline
function animateValue(el, target, currency) {
    const start    = parseFloat(el.dataset.value || '0');
    const duration = 600;
    const startTs  = performance.now();

    el.dataset.value = target;

    function step(ts) {
        const pct     = Math.min((ts - startTs) / duration, 1);
        const eased   = 1 - Math.pow(1 - pct, 3);
        const current = start + (target - start) * eased;
        el.textContent = fmt(current, currency);
        if (pct < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}
