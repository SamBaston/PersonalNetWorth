// ── Default interest rates by student loan plan type ─────────────────────────
// These reflect UK rates as of the 2025–26 tax year. Users can override them.
const PLAN_DEFAULTS = {
    'Plan 1':       { rate: 6.25, hint: 'Plan 1: Bank of England base rate + 1%, capped at RPI. Currently ~6.25% p.a.' },
    'Plan 2':       { rate: 7.3,  hint: 'Plan 2: RPI + up to 3% depending on income. Below £28k → RPI only; above £52k → RPI + 3%. Currently ~7.3% p.a.' },
    'Plan 4':       { rate: 6.25, hint: 'Plan 4 (Scotland): Same formula as Plan 1. Currently ~6.25% p.a.' },
    'Postgraduate': { rate: 7.3,  hint: 'Postgraduate Loan: RPI + 3%. Currently ~7.3% p.a.' }
};

const DEBT_TYPE_LABELS = {
    credit_card:   'Credit Card',
    personal_loan: 'Personal Loan',
    mortgage:      'Mortgage'
};

// ── Initialise ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    fetchWealthData();

    // Close modals on backdrop click
    document.getElementById('assetModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('assetModal')) closeModal();
    });
    document.getElementById('liabilityModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('liabilityModal')) closeLiabilityModal();
    });
    document.getElementById('historyModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('historyModal')) closeHistoryModal();
    });

    // Set initial plan-type hint
    onPlanTypeChange();
});

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchWealthData() {
    try {
        const response = await fetch('/api/wealth');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching wealth data:', error);
        document.getElementById('net-worth-amount').textContent = 'Error';
    }
}

// ── Dashboard rendering ───────────────────────────────────────────────────────

function updateDashboard(data) {
    const bankList        = document.getElementById('bank-accounts-list');
    const isasList        = document.getElementById('isas-list');
    const stocksList      = document.getElementById('stocks-list');
    const studentLoanList = document.getElementById('student-loans-list');
    const generalDebtList = document.getElementById('general-debts-list');

    bankList.innerHTML        = '';
    isasList.innerHTML        = '';
    stocksList.innerHTML      = '';
    studentLoanList.innerHTML = '';
    generalDebtList.innerHTML = '';

    let totalAssets      = 0;
    let totalLiabilities = 0;

    const fxRateUsdToGbp = 0.79;
    const toGBP = (amount, currency) => currency === 'USD' ? amount * fxRateUsdToGbp : amount;

    // ── Bank accounts ─────────────────────────────────────────────────────────
    (data.assets.bank_accounts || []).forEach((acc, i) => {
        totalAssets += toGBP(acc.balance, acc.currency);
        bankList.appendChild(createListItem(acc.name, acc.balance, acc.currency, i, false, 'bank_accounts', acc));
    });

    // ── ISAs & LISAs ─────────────────────────────────────────────────────────
    let isaIndex = 0;
    (data.assets.isas || []).forEach(isa => {
        totalAssets += toGBP(isa.balance, isa.currency);
        isasList.appendChild(createListItem(isa.name, isa.balance, isa.currency, isaIndex++, false, 'isas', isa));
    });
    (data.assets.lisas || []).forEach(lisa => {
        const baseBalance  = lisa.base_balance + (lisa.realized_bonus || 0);
        const pendingBonus = lisa.pending_bonus || 0;
        totalAssets += toGBP(baseBalance + pendingBonus, lisa.currency);
        isasList.appendChild(createListItem(lisa.name, baseBalance, lisa.currency, isaIndex++, false, 'lisas', lisa));
        isasList.appendChild(createListItem('↳ Govt Bonus (25%)', pendingBonus, lisa.currency, isaIndex++, true));
    });

    // ── Stock portfolios ──────────────────────────────────────────────────────
    let stockIndex = 0;
    (data.assets.stock_portfolios || []).forEach(port => {
        totalAssets += toGBP(port.balance, port.currency || 'GBP');
        stocksList.appendChild(createListItem(port.name, port.balance, port.currency || 'GBP', stockIndex++, false, 'stock_portfolios', port));
        if (port.type === 'tickers' && port.tickers) {
            port.tickers.forEach(ticker => {
                stocksList.appendChild(createListItem(`↳ ${ticker.quantity}x ${ticker.symbol}`, ticker.value, ticker.currency, stockIndex++, true));
            });
        }
    });

    // ── Student loans ─────────────────────────────────────────────────────────
    const liabilities = data.liabilities || {};
    (liabilities.student_loans || []).forEach((loan, i) => {
        totalLiabilities += toGBP(loan.balance, loan.currency);
        studentLoanList.appendChild(createLiabilityItem(loan, 'student_loans', i));
    });

    // ── General debts ─────────────────────────────────────────────────────────
    (liabilities.general_debts || []).forEach((debt, i) => {
        totalLiabilities += toGBP(debt.balance, debt.currency);
        generalDebtList.appendChild(createLiabilityItem(debt, 'general_debts', i));
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    const netWorth = totalAssets - totalLiabilities;

    document.getElementById('total-assets').textContent      = formatCurrency(totalAssets, 'GBP');
    document.getElementById('total-liabilities').textContent = formatCurrency(totalLiabilities, 'GBP');

    const netWorthEl = document.getElementById('net-worth-amount');
    netWorthEl.textContent = formatCurrency(netWorth, 'GBP');
    netWorthEl.style.color = netWorth >= 0 ? 'var(--positive)' : 'var(--negative)';
}

// ── List item builders ────────────────────────────────────────────────────────

/**
 * Existing asset list item (unchanged behaviour).
 */
function createListItem(name, value, currency, index, isSubitem = false, category = null, fullAsset = null) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;

    const mainDiv = document.createElement('div');
    mainDiv.className = 'item-main';

    if (isSubitem) {
        li.style.paddingLeft  = '1.5rem';
        li.style.fontSize     = '0.9em';
        li.style.borderBottom = 'none';
        li.style.paddingTop   = '0.2rem';
        li.style.paddingBottom = '0.2rem';

        const nameSpan  = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.style.color = 'var(--text-tertiary)';
        nameSpan.textContent = name;
        mainDiv.appendChild(nameSpan);

        const valueSpan = document.createElement('span');
        valueSpan.className = 'item-value';
        valueSpan.style.color = 'var(--text-tertiary)';
        valueSpan.textContent = formatCurrency(value, currency);
        mainDiv.appendChild(valueSpan);

        li.appendChild(mainDiv);
        return li;
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = name;
    mainDiv.appendChild(nameSpan);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'item-value';
    valueSpan.textContent = formatCurrency(value, currency);
    mainDiv.appendChild(valueSpan);

    li.appendChild(mainDiv);

    if (fullAsset && category) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const histBtn = document.createElement('button');
        histBtn.className = 'action-btn';
        histBtn.innerHTML = '📈';
        histBtn.title = 'View historical value points';
        histBtn.onclick = () => showHistoryModal(fullAsset.name, fullAsset.history, fullAsset.currency);

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = () => openModal(category, fullAsset);

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn';
        delBtn.innerHTML = '🗑️';
        delBtn.onclick = () => deleteAsset(category, fullAsset.id);

        actionsDiv.appendChild(histBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);
        li.appendChild(actionsDiv);
    }

    return li;
}

/**
 * Liability list item — shows balance in red, plus a metadata sub-line with
 * interest rate, monthly cost, and (for general debts) minimum payment.
 */
function createLiabilityItem(item, category, index) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;
    li.classList.add('liability-item');

    // ── Main row ──────────────────────────────────────────────────────────────
    const mainDiv = document.createElement('div');
    mainDiv.className = 'item-main';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';

    if (category === 'student_loans' && item.plan_type) {
        nameSpan.textContent = `${item.name}`;
        const badge = document.createElement('span');
        badge.className = 'plan-badge';
        badge.textContent = item.plan_type;
        nameSpan.appendChild(badge);
    } else {
        nameSpan.textContent = item.name;
    }
    mainDiv.appendChild(nameSpan);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'item-value negative';
    valueSpan.textContent = formatCurrency(item.balance, item.currency);
    mainDiv.appendChild(valueSpan);

    li.appendChild(mainDiv);

    // ── Meta sub-line ─────────────────────────────────────────────────────────
    const metaParts = [];

    if (item.interest_rate) {
        const annualRate  = item.interest_rate;
        const monthlyGBP  = (item.balance * (annualRate / 100)) / 12;
        metaParts.push(`${annualRate}% p.a.`);
        metaParts.push(`~${formatCurrency(monthlyGBP, item.currency)}/mo interest`);
    }

    if (category === 'general_debts') {
        if (item.type) metaParts.unshift(DEBT_TYPE_LABELS[item.type] || item.type);
        if (item.minimum_payment && item.minimum_payment > 0) {
            metaParts.push(`min. ${formatCurrency(item.minimum_payment, item.currency)}/mo`);
        }
    }

    if (metaParts.length > 0) {
        const meta = document.createElement('div');
        meta.className = 'debt-meta';
        meta.textContent = metaParts.join('  ·  ');
        li.appendChild(meta);
    }

    // ── Actions ───────────────────────────────────────────────────────────────
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';

    const histBtn = document.createElement('button');
    histBtn.className = 'action-btn';
    histBtn.innerHTML = '📈';
    histBtn.title = 'View balance history';
    histBtn.onclick = () => showHistoryModal(item.name, item.history, item.currency);

    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.innerHTML = '✏️';
    editBtn.onclick = () => openLiabilityModal(category, item);

    const delBtn = document.createElement('button');
    delBtn.className = 'action-btn';
    delBtn.innerHTML = '🗑️';
    delBtn.onclick = () => deleteLiability(category, item.id);

    actionsDiv.appendChild(histBtn);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);
    li.appendChild(actionsDiv);

    return li;
}

// ── History modal ─────────────────────────────────────────────────────────────

/**
 * Opens the history modal and renders a formatted table of balance snapshots.
 * Handles both standard { date, balance } entries and LISA-style
 * { date, base_balance, pending_bonus } entries.
 *
 * @param {string}   name     - Display name of the asset/liability
 * @param {Array}    history  - Array of history snapshot objects
 * @param {string}   currency - ISO currency code for formatting
 */
function showHistoryModal(name, history, currency) {
    document.getElementById('historyModalTitle').textContent = `${name} — Balance History`;

    const body = document.getElementById('historyModalBody');
    body.innerHTML = '';

    if (!history || history.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'history-empty';
        empty.textContent = 'No history snapshots recorded yet.';
        body.appendChild(empty);
        document.getElementById('historyModal').style.display = 'flex';
        return;
    }

    // Detect whether entries use LISA-style keys
    const isLisa = history.some(e => 'base_balance' in e);

    const table = document.createElement('table');
    table.className = 'history-table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = isLisa
        ? ['Date', 'Base Balance', 'Govt Bonus', 'Total']
        : ['Date', 'Balance'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Rows — newest first
    const tbody = document.createElement('tbody');
    [...history].reverse().forEach(entry => {
        const tr = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(entry.date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        tr.appendChild(dateCell);

        if (isLisa) {
            const base    = entry.base_balance ?? 0;
            const bonus   = entry.pending_bonus ?? 0;
            const total   = base + bonus;
            [base, bonus, total].forEach((val, idx) => {
                const td = document.createElement('td');
                td.textContent = formatCurrency(val, currency);
                if (idx === 2) td.classList.add('history-total');
                tr.appendChild(td);
            });
        } else {
            const td = document.createElement('td');
            td.textContent = formatCurrency(entry.balance ?? 0, currency);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);

    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatCurrency(amount, currencyCode = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currencyCode || 'GBP'
    }).format(amount || 0);
}

// ── Asset modal ───────────────────────────────────────────────────────────────

function openModal(category, asset = null) {
    const modal = document.getElementById('assetModal');
    modal.style.display = 'flex';
    document.getElementById('assetCategory').value = category;

    const lisaGroup    = document.getElementById('lisaGroup');
    const balanceGroup = document.getElementById('balanceGroup');

    if (category === 'lisas') {
        lisaGroup.style.display    = 'block';
        balanceGroup.style.display = 'none';
        document.getElementById('lisaBaseBalance').required = true;
        document.getElementById('assetBalance').required   = false;
    } else {
        lisaGroup.style.display    = 'none';
        balanceGroup.style.display = 'block';
        document.getElementById('assetBalance').required   = true;
        document.getElementById('lisaBaseBalance').required = false;
    }

    if (asset) {
        document.getElementById('modalTitle').textContent  = 'Edit Asset';
        document.getElementById('assetId').value           = asset.id;
        document.getElementById('assetName').value         = asset.name || '';
        document.getElementById('assetCurrency').value     = asset.currency || 'GBP';
        if (category === 'lisas') {
            document.getElementById('lisaBaseBalance').value  = asset.base_balance || 0;
            document.getElementById('lisaPendingBonus').value = asset.pending_bonus || 0;
        } else {
            document.getElementById('assetBalance').value = asset.balance || 0;
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add Asset';
        document.getElementById('assetId').value = '';
        document.getElementById('assetForm').reset();
        document.getElementById('assetCategory').value = category;
    }
}

function closeModal() {
    document.getElementById('assetModal').style.display = 'none';
}

document.getElementById('assetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id       = document.getElementById('assetId').value;
    const category = document.getElementById('assetCategory').value;

    const payload = {
        name:     document.getElementById('assetName').value,
        currency: document.getElementById('assetCurrency').value
    };

    if (category === 'lisas') {
        payload.base_balance   = parseFloat(document.getElementById('lisaBaseBalance').value);
        payload.pending_bonus  = parseFloat(document.getElementById('lisaPendingBonus').value) || 0;
        payload.type           = 'Cash';
    } else if (category === 'stock_portfolios') {
        payload.balance = parseFloat(document.getElementById('assetBalance').value);
        payload.type    = 'manual';
    } else {
        payload.balance = parseFloat(document.getElementById('assetBalance').value);
        payload.type    = 'Custom';
    }

    const method = id ? 'PUT' : 'POST';
    const url    = id ? `/api/assets/${category}/${id}` : `/api/assets/${category}`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) { closeModal(); fetchWealthData(); }
        else alert('Failed to save asset.');
    } catch (err) {
        console.error('Save error:', err);
    }
});

async function deleteAsset(category, id) {
    if (!confirm('Permanently delete this asset?')) return;
    try {
        const res = await fetch(`/api/assets/${category}/${id}`, { method: 'DELETE' });
        if (res.ok) fetchWealthData();
    } catch (err) {
        console.error('Delete error:', err);
    }
}

// ── Liability modal ───────────────────────────────────────────────────────────

/**
 * Opens the liability modal.
 * @param {'student_loans'|'general_debts'} category
 * @param {object|null} liability  - Existing record for edit, null for create
 */
function openLiabilityModal(category, liability = null) {
    const modal = document.getElementById('liabilityModal');
    modal.style.display = 'flex';
    document.getElementById('liabilityCategory').value = category;

    const studentLoanFields = document.getElementById('studentLoanFields');
    const generalDebtFields = document.getElementById('generalDebtFields');

    if (category === 'student_loans') {
        studentLoanFields.style.display = 'block';
        generalDebtFields.style.display = 'none';
    } else {
        studentLoanFields.style.display = 'none';
        generalDebtFields.style.display = 'block';
    }

    if (liability) {
        document.getElementById('liabilityModalTitle').textContent = 'Edit Liability';
        document.getElementById('liabilityId').value       = liability.id;
        document.getElementById('liabilityName').value     = liability.name || '';
        document.getElementById('liabilityBalance').value  = liability.balance || 0;
        document.getElementById('liabilityCurrency').value = liability.currency || 'GBP';

        if (category === 'student_loans') {
            document.getElementById('loanPlanType').value      = liability.plan_type || 'Plan 2';
            document.getElementById('loanInterestRate').value  = liability.interest_rate || '';
            onPlanTypeChange(false); // update hint without overwriting user-stored rate
        } else {
            document.getElementById('debtType').value          = liability.type || 'credit_card';
            document.getElementById('debtInterestRate').value  = liability.interest_rate || '';
            document.getElementById('debtMinPayment').value    = liability.minimum_payment || '';
        }
    } else {
        document.getElementById('liabilityModalTitle').textContent = 'Add Liability';
        document.getElementById('liabilityId').value = '';
        document.getElementById('liabilityForm').reset();
        document.getElementById('liabilityCategory').value = category;

        if (category === 'student_loans') {
            onPlanTypeChange(true); // pre-fill default rate for Plan 2
        }
    }
}

function closeLiabilityModal() {
    document.getElementById('liabilityModal').style.display = 'none';
}

/**
 * Triggered when the plan-type <select> changes.
 * @param {boolean} prefillRate - Whether to overwrite the rate field with the default.
 */
function onPlanTypeChange(prefillRate = true) {
    const planType = document.getElementById('loanPlanType').value;
    const defaults = PLAN_DEFAULTS[planType] || { rate: 0, hint: '' };

    document.getElementById('planRateHint').textContent = defaults.hint;

    if (prefillRate) {
        document.getElementById('loanInterestRate').value = defaults.rate;
    }
}

document.getElementById('liabilityForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id       = document.getElementById('liabilityId').value;
    const category = document.getElementById('liabilityCategory').value;

    const payload = {
        name:     document.getElementById('liabilityName').value,
        balance:  parseFloat(document.getElementById('liabilityBalance').value),
        currency: document.getElementById('liabilityCurrency').value
    };

    if (category === 'student_loans') {
        payload.plan_type     = document.getElementById('loanPlanType').value;
        payload.interest_rate = parseFloat(document.getElementById('loanInterestRate').value) || 0;
    } else {
        payload.type          = document.getElementById('debtType').value;
        payload.interest_rate = parseFloat(document.getElementById('debtInterestRate').value) || 0;
        const minPay = parseFloat(document.getElementById('debtMinPayment').value);
        if (!isNaN(minPay)) payload.minimum_payment = minPay;
    }

    const method = id ? 'PUT' : 'POST';
    const url    = id
        ? `/api/liabilities/${category}/${id}`
        : `/api/liabilities/${category}`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) { closeLiabilityModal(); fetchWealthData(); }
        else alert('Failed to save liability.');
    } catch (err) {
        console.error('Save error:', err);
    }
});

async function deleteLiability(category, id) {
    if (!confirm('Permanently delete this liability?')) return;
    try {
        const res = await fetch(`/api/liabilities/${category}/${id}`, { method: 'DELETE' });
        if (res.ok) fetchWealthData();
    } catch (err) {
        console.error('Delete error:', err);
    }
}
