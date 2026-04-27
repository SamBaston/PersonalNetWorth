// ─── Student Loan Plan Info ───────────────────────────────────────────────────
const PLAN_INFO = {
    plan1: { label: 'Plan 1', defaultRate: 6.25, threshold: 24990, repayPct: 9,  writeOffYears: 25, note: 'Repay 9% above £24,990/yr. Written off after 25 years.' },
    plan2: { label: 'Plan 2', defaultRate: 7.3,  threshold: 27295, repayPct: 9,  writeOffYears: 30, note: 'Repay 9% above £27,295/yr. Written off after 30 years.' },
    plan4: { label: 'Plan 4', defaultRate: 6.25, threshold: 31395, repayPct: 9,  writeOffYears: 30, note: 'Repay 9% above £31,395/yr (Scotland). Written off after 30 years.' },
    plan5: { label: 'Plan 5', defaultRate: 7.3,  threshold: 25000, repayPct: 9,  writeOffYears: 40, note: 'Repay 9% above £25,000/yr. Written off after 40 years.' },
    postgrad: { label: 'Postgraduate', defaultRate: 7.3, threshold: 21000, repayPct: 6, writeOffYears: 30, note: 'Repay 6% above £21,000/yr. Written off after 30 years.' }
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetchWealthData();

    document.getElementById('assetModal').addEventListener('click', e => {
        if (e.target === document.getElementById('assetModal')) closeModal();
    });
    document.getElementById('debtModal').addEventListener('click', e => {
        if (e.target === document.getElementById('debtModal')) closeDebtModal();
    });
    document.getElementById('historyModal').addEventListener('click', e => {
        if (e.target === document.getElementById('historyModal')) closeHistoryModal();
    });

    // Live credit utilisation preview
    ['debtBalance','creditLimit'].forEach(id =>
        document.getElementById(id).addEventListener('input', updateUtilisation)
    );
    // Live LTV preview
    ['debtBalance','mortgagePropertyValue'].forEach(id =>
        document.getElementById(id).addEventListener('input', updateLTV)
    );
    // Live payoff preview
    ['debtBalance','debtRate','ccMinPayment','loanMinPayment','mortgageMinPayment'].forEach(id =>
        document.getElementById(id).addEventListener('input', updatePayoffPreview)
    );
    // Student loan plan info box
    document.getElementById('studentPlanType').addEventListener('change', updatePlanInfoBox);
});

// ─── Fetch & Render ───────────────────────────────────────────────────────────
async function fetchWealthData() {
    try {
        const res = await fetch('/api/wealth');
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        updateDashboard(data);
    } catch (err) {
        console.error('Fetch error:', err);
        document.getElementById('net-worth-amount').textContent = 'Error';
    }
}

function updateDashboard(data) {
    const fxRateUsdToGbp = 0.79;
    function toGBP(amount, currency) {
        return currency === 'USD' ? amount * fxRateUsdToGbp : amount;
    }

    let totalAssets = 0;
    let totalLiabilities = 0;

    // ── Assets ──
    const bankList    = document.getElementById('bank-accounts-list');
    const isasList    = document.getElementById('isas-list');
    const stocksList  = document.getElementById('stocks-list');
    [bankList, isasList, stocksList].forEach(el => el.innerHTML = '');

    if (data.assets.bank_accounts) {
        data.assets.bank_accounts.forEach((acc, i) => {
            totalAssets += toGBP(acc.balance, acc.currency);
            bankList.appendChild(createAssetItem(acc.name, acc.balance, acc.currency, i, false, 'bank_accounts', acc));
        });
    }

    let isaIdx = 0;
    if (data.assets.isas) {
        data.assets.isas.forEach(isa => {
            totalAssets += toGBP(isa.balance, isa.currency);
            isasList.appendChild(createAssetItem(isa.name, isa.balance, isa.currency, isaIdx++, false, 'isas', isa));
        });
    }
    if (data.assets.lisas) {
        data.assets.lisas.forEach(lisa => {
            const base = lisa.base_balance + (lisa.realized_bonus || 0);
            const bonus = lisa.pending_bonus || 0;
            totalAssets += toGBP(base + bonus, lisa.currency);
            isasList.appendChild(createAssetItem(lisa.name, base, lisa.currency, isaIdx++, false, 'lisas', lisa));
            isasList.appendChild(createAssetItem('↳ Govt Bonus (25%)', bonus, lisa.currency, isaIdx++, true));
        });
    }

    let sIdx = 0;
    if (data.assets.stock_portfolios) {
        data.assets.stock_portfolios.forEach(port => {
            totalAssets += toGBP(port.balance || 0, port.currency || 'GBP');
            stocksList.appendChild(createAssetItem(port.name, port.balance, port.currency || 'GBP', sIdx++, false, 'stock_portfolios', port));
            if (port.type === 'tickers' && port.tickers) {
                port.tickers.forEach(t => {
                    stocksList.appendChild(createAssetItem(`↳ ${t.quantity}x ${t.symbol}`, t.value, t.currency, sIdx++, true));
                });
            }
        });
    }

    // ── Liabilities ──
    const categories = ['student_loans', 'credit_cards', 'personal_loans', 'mortgages'];
    const listIds    = { student_loans: 'student-loans-list', credit_cards: 'credit-cards-list', personal_loans: 'personal-loans-list', mortgages: 'mortgages-list' };
    const sections   = { student_loans: 'student-loans-section', credit_cards: 'credit-cards-section', personal_loans: 'personal-loans-section', mortgages: 'mortgages-section' };

    categories.forEach(cat => {
        const ul = document.getElementById(listIds[cat]);
        ul.innerHTML = '';
        const debts = data.liabilities && data.liabilities[cat] ? data.liabilities[cat] : [];
        document.getElementById(sections[cat]).style.display = debts.length ? 'block' : 'none';
        debts.forEach((debt, i) => {
            totalLiabilities += toGBP(debt.balance, debt.currency || 'GBP');
            ul.appendChild(createDebtItem(debt, cat, i));
        });
    });

    document.getElementById('total-assets').textContent     = fmt(totalAssets);
    document.getElementById('total-liabilities').textContent = fmt(totalLiabilities);
    const nw = totalAssets - totalLiabilities;
    const nwEl = document.getElementById('net-worth-amount');
    nwEl.textContent = fmt(nw);
    nwEl.style.color = nw >= 0 ? 'var(--positive)' : 'var(--negative)';

    // Update the analytics tab charts and metrics
    updateAnalytics(data, totalAssets, totalLiabilities);
}

// ─── Asset List Item ──────────────────────────────────────────────────────────
function createAssetItem(name, value, currency, index, isSubitem = false, category = null, fullAsset = null) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;

    const mainDiv = document.createElement('div');
    mainDiv.className = 'item-main';

    if (isSubitem) {
        li.style.cssText = 'padding-left:1.5rem;font-size:0.9em;border-bottom:none;padding-top:0.2rem;padding-bottom:0.2rem;';
        const ns = document.createElement('span'); ns.className = 'item-name'; ns.style.color = 'var(--text-tertiary)'; ns.textContent = name;
        const vs = document.createElement('span'); vs.className = 'item-value'; vs.style.color = 'var(--text-tertiary)'; vs.textContent = fmt(value, currency);
        mainDiv.appendChild(ns); mainDiv.appendChild(vs); li.appendChild(mainDiv);
        return li;
    }

    const ns = document.createElement('span'); ns.className = 'item-name'; ns.textContent = name;
    const vs = document.createElement('span'); vs.className = 'item-value'; vs.textContent = fmt(value, currency);
    mainDiv.appendChild(ns); mainDiv.appendChild(vs); li.appendChild(mainDiv);

    if (fullAsset && category) {
        const actions = document.createElement('div'); actions.className = 'item-actions';
        const hBtn = makeBtn('📈', 'View history', () => openHistoryModal(fullAsset, name));
        const eBtn = makeBtn('✏️', 'Edit', () => openModal(category, fullAsset));
        const dBtn = makeBtn('🗑️', 'Delete', () => deleteAsset(category, fullAsset.id));
        actions.append(hBtn, eBtn, dBtn); li.appendChild(actions);
    }
    return li;
}

// ─── Debt List Item ───────────────────────────────────────────────────────────
function createDebtItem(debt, category, index) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;

    const mainDiv = document.createElement('div'); mainDiv.className = 'item-main';
    const ns = document.createElement('span'); ns.className = 'item-name';

    // Badge for debt subtype
    const badge = document.createElement('span');
    badge.className = 'debt-badge';
    if (category === 'student_loans' && debt.plan_type) {
        badge.textContent = PLAN_INFO[debt.plan_type]?.label || debt.plan_type;
    } else if (debt.annual_interest_rate) {
        badge.textContent = `${parseFloat(debt.annual_interest_rate).toFixed(1)}% APR`;
    }
    ns.textContent = debt.name;
    if (badge.textContent) ns.appendChild(badge);

    const vs = document.createElement('span'); vs.className = 'item-value negative'; vs.textContent = fmt(debt.balance, debt.currency || 'GBP');
    mainDiv.appendChild(ns); mainDiv.appendChild(vs); li.appendChild(mainDiv);

    // Sub-info row
    if (debt.minimum_monthly_payment || debt.accrued_since_last_update) {
        const sub = document.createElement('div'); sub.className = 'debt-subinfo';
        if (debt.minimum_monthly_payment) sub.innerHTML += `<span>Min. payment: ${fmt(debt.minimum_monthly_payment)}/mo</span>`;
        if (debt.accrued_since_last_update && debt.accrued_since_last_update > 0)
            sub.innerHTML += `<span class="accrued-tag">+${fmt(debt.accrued_since_last_update)} accrued</span>`;
        li.appendChild(sub);
    }

    const actions = document.createElement('div'); actions.className = 'item-actions';
    const hBtn = makeBtn('📈', 'View history', () => openHistoryModal(debt, debt.name));
    const eBtn = makeBtn('✏️', 'Edit', () => openDebtModal(category, debt));
    const dBtn = makeBtn('🗑️', 'Delete', () => deleteDebt(category, debt.id));
    actions.append(hBtn, eBtn, dBtn); li.appendChild(actions);

    return li;
}

function makeBtn(icon, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'action-btn'; btn.innerHTML = icon; btn.title = title; btn.onclick = onClick;
    return btn;
}

function fmt(amount, currency = 'GBP') {
    if (amount == null || isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(amount);
}

// ─── Asset Modal ──────────────────────────────────────────────────────────────
function openModal(category, asset = null) {
    const modal = document.getElementById('assetModal');
    modal.style.display = 'flex';
    document.getElementById('assetCategory').value = category;

    const lisaGroup    = document.getElementById('lisaGroup');
    const balanceGroup = document.getElementById('balanceGroup');

    if (category === 'lisas') {
        lisaGroup.style.display = 'block'; balanceGroup.style.display = 'none';
        document.getElementById('lisaBaseBalance').required = true;
        document.getElementById('assetBalance').required = false;
    } else {
        lisaGroup.style.display = 'none'; balanceGroup.style.display = 'block';
        document.getElementById('assetBalance').required = true;
        document.getElementById('lisaBaseBalance').required = false;
    }

    if (asset) {
        document.getElementById('modalTitle').textContent = 'Edit Asset';
        document.getElementById('assetId').value = asset.id;
        document.getElementById('assetName').value = asset.name || '';
        document.getElementById('assetCurrency').value = asset.currency || 'GBP';
        if (category === 'lisas') {
            document.getElementById('lisaBaseBalance').value = asset.base_balance || 0;
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

function closeModal() { document.getElementById('assetModal').style.display = 'none'; }

document.getElementById('assetForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('assetId').value;
    const category = document.getElementById('assetCategory').value;
    const payload = {
        name: document.getElementById('assetName').value,
        currency: document.getElementById('assetCurrency').value
    };
    if (category === 'lisas') {
        payload.base_balance = parseFloat(document.getElementById('lisaBaseBalance').value);
        payload.pending_bonus = parseFloat(document.getElementById('lisaPendingBonus').value) || 0;
        payload.type = 'Cash';
    } else if (category === 'stock_portfolios') {
        payload.balance = parseFloat(document.getElementById('assetBalance').value);
        payload.type = 'manual';
    } else {
        payload.balance = parseFloat(document.getElementById('assetBalance').value);
        payload.type = 'Custom';
    }
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/assets/${category}/${id}` : `/api/assets/${category}`;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { closeModal(); fetchWealthData(); }
    else alert('Failed to save asset.');
});

async function deleteAsset(category, id) {
    if (!confirm('Delete this asset permanently?')) return;
    const res = await fetch(`/api/assets/${category}/${id}`, { method: 'DELETE' });
    if (res.ok) fetchWealthData();
}

// ─── Debt Modal ───────────────────────────────────────────────────────────────
const DEBT_FIELD_GROUPS = {
    student_loans:  'studentLoanFields',
    credit_cards:   'creditCardFields',
    personal_loans: 'personalLoanFields',
    mortgages:      'mortgageFields'
};

function openDebtModal(category, debt = null) {
    const modal = document.getElementById('debtModal');
    modal.style.display = 'flex';
    document.getElementById('debtCategory').value = category;
    document.getElementById('debtErrors').style.display = 'none';

    // Hide all category-specific groups
    Object.values(DEBT_FIELD_GROUPS).forEach(gId => {
        document.getElementById(gId).style.display = 'none';
    });
    // Show the relevant one
    if (DEBT_FIELD_GROUPS[category]) {
        document.getElementById(DEBT_FIELD_GROUPS[category]).style.display = 'block';
    }

    const titles = { student_loans: 'Student Loan', credit_cards: 'Credit Card', personal_loans: 'Personal Loan', mortgages: 'Mortgage' };

    if (debt) {
        document.getElementById('debtModalTitle').textContent = `Edit ${titles[category]}`;
        document.getElementById('debtId').value = debt.id;
        document.getElementById('debtName').value = debt.name || '';
        document.getElementById('debtBalance').value = debt.balance || 0;
        document.getElementById('debtRate').value = debt.annual_interest_rate || 0;
        document.getElementById('debtNotes').value = debt.notes || '';

        if (category === 'student_loans') {
            document.getElementById('studentPlanType').value = debt.plan_type || 'plan2';
            updatePlanInfoBox();
        }
        if (category === 'credit_cards') {
            document.getElementById('creditLimit').value = debt.credit_limit || '';
            document.getElementById('ccMinPayment').value = debt.minimum_monthly_payment || '';
            updateUtilisation();
        }
        if (category === 'personal_loans') {
            document.getElementById('loanMinPayment').value = debt.minimum_monthly_payment || '';
            document.getElementById('loanOriginalAmount').value = debt.original_amount || '';
            document.getElementById('loanTermMonths').value = debt.term_months || '';
            document.getElementById('loanStartDate').value = debt.start_date ? debt.start_date.substring(0,10) : '';
        }
        if (category === 'mortgages') {
            document.getElementById('mortgageMinPayment').value = debt.minimum_monthly_payment || '';
            document.getElementById('mortgagePropertyValue').value = debt.property_value || '';
            document.getElementById('mortgageTermMonths').value = debt.term_months || '';
            document.getElementById('mortgageMortgageType').value = debt.mortgage_type || 'repayment';
            updateLTV();
        }
    } else {
        document.getElementById('debtModalTitle').textContent = `Add ${titles[category]}`;
        document.getElementById('debtId').value = '';
        document.getElementById('debtForm').reset();
        document.getElementById('debtCategory').value = category;

        if (category === 'student_loans') {
            document.getElementById('debtRate').value = PLAN_INFO.plan2.defaultRate;
            updatePlanInfoBox();
        }
    }

    updatePayoffPreview();
}

function closeDebtModal() { document.getElementById('debtModal').style.display = 'none'; }

document.getElementById('debtForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('debtId').value;
    const category = document.getElementById('debtCategory').value;
    const errEl = document.getElementById('debtErrors');

    const payload = {
        name: document.getElementById('debtName').value.trim(),
        balance: document.getElementById('debtBalance').value,
        annual_interest_rate: document.getElementById('debtRate').value,
        notes: document.getElementById('debtNotes').value.trim(),
        currency: 'GBP'
    };

    if (category === 'student_loans') {
        payload.plan_type = document.getElementById('studentPlanType').value;
    }
    if (category === 'credit_cards') {
        payload.credit_limit = document.getElementById('creditLimit').value;
        payload.minimum_monthly_payment = document.getElementById('ccMinPayment').value;
    }
    if (category === 'personal_loans') {
        payload.minimum_monthly_payment = document.getElementById('loanMinPayment').value;
        payload.original_amount = document.getElementById('loanOriginalAmount').value;
        payload.term_months = document.getElementById('loanTermMonths').value;
        payload.start_date = document.getElementById('loanStartDate').value;
    }
    if (category === 'mortgages') {
        payload.minimum_monthly_payment = document.getElementById('mortgageMinPayment').value;
        payload.property_value = document.getElementById('mortgagePropertyValue').value;
        payload.term_months = document.getElementById('mortgageTermMonths').value;
        payload.mortgage_type = document.getElementById('mortgageMortgageType').value;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/debts/${category}/${id}` : `/api/debts/${category}`;

    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (res.ok) {
            closeDebtModal();
            fetchWealthData();
        } else {
            const msgs = json.errors ? json.errors.join('<br>') : (json.error || 'Unknown error');
            errEl.innerHTML = msgs;
            errEl.style.display = 'block';
        }
    } catch (err) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
    }
});

async function deleteDebt(category, id) {
    if (!confirm('Delete this debt permanently?')) return;
    const res = await fetch(`/api/debts/${category}/${id}`, { method: 'DELETE' });
    if (res.ok) fetchWealthData();
}

// ─── Live UI Helpers ──────────────────────────────────────────────────────────
function updatePlanInfoBox() {
    const plan = document.getElementById('studentPlanType').value;
    const box  = document.getElementById('planInfoBox');
    const info = PLAN_INFO[plan];
    if (info) {
        box.textContent = info.note;
        box.style.display = 'block';
        // Auto-fill default interest rate
        document.getElementById('debtRate').value = info.defaultRate;
        updatePayoffPreview();
    }
}

function updateUtilisation() {
    const balance = parseFloat(document.getElementById('debtBalance').value) || 0;
    const limit   = parseFloat(document.getElementById('creditLimit').value) || 0;
    const wrapper = document.getElementById('utilisationWrapper');
    if (limit > 0) {
        wrapper.style.display = 'block';
        const pct = Math.min(100, (balance / limit) * 100);
        document.getElementById('utilisationPct').textContent = `${pct.toFixed(1)}%`;
        const fill = document.getElementById('utilisationFill');
        fill.style.width = `${pct}%`;
        fill.style.background = pct > 75 ? 'var(--negative)' : pct > 40 ? '#f59e0b' : 'var(--positive)';
    } else {
        wrapper.style.display = 'none';
    }
}

function updateLTV() {
    const balance  = parseFloat(document.getElementById('debtBalance').value) || 0;
    const propVal  = parseFloat(document.getElementById('mortgagePropertyValue').value) || 0;
    const wrapper  = document.getElementById('ltvWrapper');
    if (propVal > 0) {
        wrapper.style.display = 'block';
        const pct = Math.min(100, (balance / propVal) * 100);
        document.getElementById('ltvPct').textContent = `${pct.toFixed(1)}%`;
        const fill = document.getElementById('ltvFill');
        fill.style.width = `${pct}%`;
        fill.style.background = pct > 80 ? 'var(--negative)' : pct > 60 ? '#f59e0b' : 'var(--positive)';
    } else {
        wrapper.style.display = 'none';
    }
}

function updatePayoffPreview() {
    const cat     = document.getElementById('debtCategory').value;
    const balance = parseFloat(document.getElementById('debtBalance').value) || 0;
    const rate    = parseFloat(document.getElementById('debtRate').value) || 0;
    const preview = document.getElementById('payoffPreview');
    const content = document.getElementById('payoffContent');

    let monthlyPayment = 0;
    if (cat === 'credit_cards')   monthlyPayment = parseFloat(document.getElementById('ccMinPayment').value) || 0;
    if (cat === 'personal_loans') monthlyPayment = parseFloat(document.getElementById('loanMinPayment').value) || 0;
    if (cat === 'mortgages')      monthlyPayment = parseFloat(document.getElementById('mortgageMinPayment').value) || 0;

    if (balance <= 0 || monthlyPayment <= 0) { preview.style.display = 'none'; return; }

    const monthlyRate = rate / 100 / 12;
    let months = 0, totalInterest = 0, remaining = balance;

    if (monthlyRate === 0) {
        months = Math.ceil(balance / monthlyPayment);
        totalInterest = 0;
    } else {
        // Simulate month by month (cap at 600 months = 50 years)
        while (remaining > 0 && months < 600) {
            const interest = remaining * monthlyRate;
            totalInterest += interest;
            remaining = remaining + interest - monthlyPayment;
            months++;
            if (remaining < 0) remaining = 0;
        }
        if (months >= 600) { preview.style.display = 'none'; return; }
    }

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const duration = years > 0 ? `${years}yr ${remMonths}mo` : `${remMonths}mo`;

    preview.style.display = 'block';
    content.innerHTML = `
        <div class="payoff-grid">
            <div><span class="payoff-label">Paid off by</span><span class="payoff-val">${payoffDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span></div>
            <div><span class="payoff-label">Duration</span><span class="payoff-val">${duration}</span></div>
            <div><span class="payoff-label">Total interest</span><span class="payoff-val negative">${fmt(totalInterest)}</span></div>
            <div><span class="payoff-label">Total repaid</span><span class="payoff-val">${fmt(balance + totalInterest)}</span></div>
        </div>`;
}

// ─── History Modal ────────────────────────────────────────────────────────────
function openHistoryModal(item, name) {
    document.getElementById('historyModalTitle').textContent = `History — ${name}`;
    const content = document.getElementById('historyContent');
    const history = item.history;

    if (!history || history.length === 0) {
        content.innerHTML = '<p style="color:var(--text-secondary)">No history recorded yet.</p>';
    } else {
        const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        content.innerHTML = `
            <table class="history-table">
                <thead><tr><th>Date</th><th>Balance</th><th>Notes</th></tr></thead>
                <tbody>
                    ${sorted.map(h => {
                        const bal = h.balance ?? (h.base_balance != null ? `${fmt(h.base_balance)} + ${fmt(h.pending_bonus)} bonus` : '—');
                        const balStr = typeof bal === 'number' ? fmt(bal) : bal;
                        const note  = h.manual_update ? 'Manual update' : h.accrued_interest > 0 ? `+${fmt(h.accrued_interest)} interest` : '';
                        return `<tr>
                            <td>${new Date(h.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
                            <td>${balStr}</td>
                            <td style="color:var(--text-tertiary);font-size:0.85em">${note}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    }
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistoryModal() { document.getElementById('historyModal').style.display = 'none'; }

// ─── Tab Switching ────────────────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');
    const btn = document.getElementById(`tab-btn-${tab}`);
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────
const _charts = {};

function _destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

const C = {
    blue:   '#3b82f6', purple: '#8b5cf6', green:  '#10b981',
    orange: '#f59e0b', red:    '#ef4444', teal:   '#06b6d4',
    indigo: '#6366f1', pink:   '#ec4899'
};

const TOOLTIP_DEFAULTS = {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    titleColor: '#f8fafc',
    bodyColor: '#94a3b8',
    padding: 12,
    cornerRadius: 8,
    displayColors: true
};

// Called from updateDashboard after totals are computed
function updateAnalytics(data, totalAssets, totalLiabilities) {
    const FX = 0.79;
    const toGBP = (v, cur) => cur === 'USD' ? v * FX : v;

    // ── Asset class buckets ──────────────────────────────────────
    let cash = 0, investments = 0, property = 0;

    (data.assets?.bank_accounts || []).forEach(a => cash += toGBP(a.balance, a.currency));
    (data.assets?.isas || []).forEach(a => cash += toGBP(a.balance, a.currency));
    (data.assets?.lisas || []).forEach(a => {
        cash += toGBP((a.base_balance + (a.realized_bonus || 0)) + (a.pending_bonus || 0), a.currency);
    });
    (data.assets?.stock_portfolios || []).forEach(a => investments += toGBP(a.balance || 0, a.currency || 'GBP'));
    (data.liabilities?.mortgages || []).forEach(m => {
        if (m.property_value) property += toGBP(parseFloat(m.property_value), 'GBP');
    });

    // ── Monthly debt obligations ─────────────────────────────────
    let monthlyObligations = 0;
    ['credit_cards', 'personal_loans', 'mortgages'].forEach(cat => {
        (data.liabilities?.[cat] || []).forEach(d =>
            monthlyObligations += toGBP(parseFloat(d.minimum_monthly_payment) || 0, d.currency || 'GBP')
        );
    });

    // ── Liability breakdown ───────────────────────────────────────
    const liabBreakdown = { student_loans: 0, credit_cards: 0, personal_loans: 0, mortgages: 0 };
    Object.keys(liabBreakdown).forEach(cat => {
        (data.liabilities?.[cat] || []).forEach(d =>
            liabBreakdown[cat] += toGBP(d.balance, d.currency || 'GBP')
        );
    });

    const netWorth = totalAssets - totalLiabilities;

    // ── KPI strip ────────────────────────────────────────────────
    const nwEl = document.getElementById('kpi-net-worth');
    nwEl.textContent = fmt(netWorth);
    nwEl.style.color = netWorth >= 0 ? 'var(--positive)' : 'var(--negative)';
    document.getElementById('kpi-nw-sub').textContent =
        totalAssets > 0 ? `${((netWorth / totalAssets) * 100).toFixed(1)}% solvency` : '–';

    document.getElementById('kpi-assets').textContent = fmt(totalAssets);
    document.getElementById('kpi-assets-sub').textContent =
        `${(cash > 0 ? ((cash / totalAssets) * 100).toFixed(0) : 0)}% cash`;

    document.getElementById('kpi-liabilities').textContent = fmt(totalLiabilities);
    document.getElementById('kpi-liab-sub').textContent =
        totalAssets > 0 ? `${((totalLiabilities / totalAssets) * 100).toFixed(1)}% of assets` : '–';

    document.getElementById('kpi-monthly').textContent = fmt(monthlyObligations);
    document.getElementById('kpi-monthly-sub').textContent =
        monthlyObligations > 0 ? `${fmt(monthlyObligations * 12)}/yr` : 'No payments tracked';

    // ── Render charts ────────────────────────────────────────────
    _renderAllocationChart(cash, investments, property, totalAssets);
    _renderDTEChart(totalAssets, totalLiabilities);
    _renderLiquidityChart(cash, monthlyObligations);
    _renderLiabilityBreakdown(liabBreakdown);
    _renderNetWorthHistoryChart(data, netWorth);

    // ── Metric cards ─────────────────────────────────────────────
    _updateMetrics(cash, monthlyObligations, totalAssets, totalLiabilities, investments);
}

function _renderAllocationChart(cash, investments, property, total) {
    _destroyChart('allocation');
    const canvas = document.getElementById('chart-allocation');
    if (!canvas) return;
    if (total === 0) {
        canvas.parentElement.innerHTML = '<div class="chart-empty">Add some assets to see allocation.</div>';
        return;
    }
    _charts['allocation'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Cash & Savings', 'Investments', 'Property'],
            datasets: [{ data: [cash, investments, property],
                backgroundColor: [C.blue, C.purple, C.green],
                borderColor: '#1e293b', borderWidth: 3, hoverOffset: 8 }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8',
                    font: { family: 'Inter', size: 11 }, padding: 14,
                    usePointStyle: true, pointStyleWidth: 9 } },
                tooltip: { ...TOOLTIP_DEFAULTS, callbacks: {
                    label: ctx => {
                        const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                        return `  ${fmt(ctx.parsed)}  (${pct}%)`;
                    }
                }}
            }
        }
    });
}

function _renderDTEChart(totalAssets, totalLiabilities) {
    _destroyChart('dte');
    const canvas = document.getElementById('chart-dte');
    if (!canvas) return;
    const equity = Math.max(0, totalAssets - totalLiabilities);
    const dteRatio = totalAssets > 0 ? (totalLiabilities / totalAssets).toFixed(2) : '∞';
    const debtPct = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0;
    const rating = parseFloat(debtPct) < 30
        ? { text: '🟢 Low Leverage', color: 'var(--positive)' }
        : parseFloat(debtPct) < 60
        ? { text: '🟡 Moderate Leverage', color: 'var(--warning)' }
        : { text: '🔴 High Leverage', color: 'var(--negative)' };

    if (totalAssets === 0 && totalLiabilities === 0) {
        canvas.parentElement.innerHTML = '<div class="chart-empty">No data to display yet.</div>';
        return;
    }
    _charts['dte'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Equity (Owned)', 'Liabilities (Owed)'],
            datasets: [{ data: [equity, totalLiabilities],
                backgroundColor: [C.green, C.red],
                borderColor: '#1e293b', borderWidth: 3, hoverOffset: 8 }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8',
                    font: { family: 'Inter', size: 11 }, padding: 14,
                    usePointStyle: true, pointStyleWidth: 9 } },
                tooltip: { ...TOOLTIP_DEFAULTS, callbacks: { label: ctx => `  ${fmt(ctx.parsed)}` } }
            }
        }
    });

    document.getElementById('dte-metrics').innerHTML = `
        <div class="dte-stat"><span class="dte-label">D/E Ratio</span><span class="dte-value">${dteRatio}</span></div>
        <div class="dte-stat"><span class="dte-label">Debt %</span><span class="dte-value">${debtPct}%</span></div>
        <div class="dte-stat"><span class="dte-label">Equity</span><span class="dte-value">${fmt(equity)}</span></div>
        <div class="dte-rating" style="color:${rating.color};width:100%;text-align:center">${rating.text}</div>`;
}

function _renderLiquidityChart(cash, monthlyObligations) {
    _destroyChart('liquidity');
    const canvas = document.getElementById('chart-liquidity');
    const display = document.getElementById('liquidity-display');
    if (!canvas || !display) return;

    const ratio = monthlyObligations > 0 ? cash / monthlyObligations : (cash > 0 ? 99 : 0);
    const months = ratio >= 99 ? '∞' : ratio.toFixed(1);
    const r = ratio >= 6 ? { label: 'Excellent', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: '#10b981' }
        : ratio >= 3    ? { label: 'Good',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: '#3b82f6' }
        : ratio >= 1    ? { label: 'Fair',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: '#f59e0b' }
        :                 { label: 'Critical',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: '#ef4444' };

    display.innerHTML = `
        <div class="liquidity-ratio-display" style="background:${r.bg};border-color:${r.border}">
            <div class="liquidity-months" style="color:${r.color}">${months}</div>
            <div class="liquidity-label">months of obligations covered by cash</div>
            <div class="liquidity-rating" style="color:${r.color}">${r.label}</div>
        </div>`;

    if (cash === 0 && monthlyObligations === 0) { canvas.style.display = 'none'; return; }

    _charts['liquidity'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Cash & Savings', '6-Month Target'],
            datasets: [{ data: [cash, monthlyObligations * 6],
                backgroundColor: [C.blue, C.orange],
                borderRadius: 8, borderSkipped: false }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { ...TOOLTIP_DEFAULTS, callbacks: { label: ctx => `  ${fmt(ctx.parsed.x)}` } }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' },
                     ticks: { color: '#64748b', callback: v => '£' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
            }
        }
    });
}

function _renderLiabilityBreakdown(breakdown) {
    _destroyChart('liabilities');
    const canvas = document.getElementById('chart-liabilities');
    if (!canvas) return;
    const labels  = ['Student Loans', 'Credit Cards', 'Personal Loans', 'Mortgages'];
    const values  = [breakdown.student_loans, breakdown.credit_cards, breakdown.personal_loans, breakdown.mortgages];
    const colors  = [C.indigo, C.red, C.orange, C.purple];
    const total   = values.reduce((a, b) => a + b, 0);
    if (total === 0) {
        canvas.parentElement.innerHTML = '<div class="chart-empty">No liabilities recorded yet.</div>';
        return;
    }
    _charts['liabilities'] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: colors,
                borderRadius: 8, borderSkipped: false }] },
        options: {
            responsive: true, maintainAspectRatio: true, indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: { ...TOOLTIP_DEFAULTS, callbacks: {
                    label: ctx => {
                        const pct = total > 0 ? ((ctx.parsed.x / total) * 100).toFixed(1) : 0;
                        return `  ${fmt(ctx.parsed.x)}  (${pct}%)`;
                    }
                }}
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' },
                     ticks: { color: '#64748b', callback: v => '£' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
            }
        }
    });
}

function _updateMetrics(cash, monthlyObligs, totalAssets, totalLiabilities, investments) {
    // Emergency Fund (target: 6 months)
    const emergencyMonths = monthlyObligs > 0 ? cash / monthlyObligs : (cash > 0 ? 12 : 0);
    const emergencyPct = Math.min(100, (emergencyMonths / 6) * 100);
    const emergencyEl = document.getElementById('metric-emergency');
    if (emergencyEl) {
        emergencyEl.textContent = emergencyMonths >= 12 ? '12+ mo' : `${emergencyMonths.toFixed(1)} mo`;
        emergencyEl.style.color = emergencyMonths >= 6 ? 'var(--positive)'
            : emergencyMonths >= 3 ? 'var(--warning)' : 'var(--negative)';
        const bar = document.getElementById('metric-emergency-bar');
        if (bar) { bar.style.width = `${emergencyPct}%`;
            bar.style.background = emergencyMonths >= 6 ? '#10b981' : emergencyMonths >= 3 ? '#f59e0b' : '#ef4444'; }
    }

    // Solvency Ratio
    const solvencyPct = totalAssets > 0 ? Math.max(0, ((totalAssets - totalLiabilities) / totalAssets) * 100) : 0;
    const solvencyEl = document.getElementById('metric-solvency');
    if (solvencyEl) {
        solvencyEl.textContent = `${solvencyPct.toFixed(1)}%`;
        solvencyEl.style.color = solvencyPct >= 70 ? 'var(--positive)'
            : solvencyPct >= 40 ? 'var(--warning)' : 'var(--negative)';
        const bar = document.getElementById('metric-solvency-bar');
        if (bar) { bar.style.width = `${solvencyPct}%`;
            bar.style.background = solvencyPct >= 70 ? '#10b981' : solvencyPct >= 40 ? '#f59e0b' : '#ef4444'; }
    }

    // Investment Ratio
    const investPct = totalAssets > 0 ? (investments / totalAssets) * 100 : 0;
    const investEl = document.getElementById('metric-invest');
    if (investEl) {
        investEl.textContent = `${investPct.toFixed(1)}%`;
        investEl.style.color = investPct >= 30 ? 'var(--positive)'
            : investPct >= 10 ? 'var(--warning)' : 'var(--text-secondary)';
        const bar = document.getElementById('metric-invest-bar');
        if (bar) { bar.style.width = `${Math.min(100, investPct)}%`;
            bar.style.background = 'linear-gradient(90deg, #8b5cf6, #3b82f6)'; }
    }
}

function _renderNetWorthHistoryChart(data, currentNetWorth) {
    _destroyChart('netWorthHistory');
    const canvas = document.getElementById('chart-net-worth-history');
    if (!canvas) return;

    const FX = 0.79;
    const toGBP = (v, cur) => cur === 'USD' ? (v * FX) : v;
    
    let allDates = new Set();
    const assets = [];
    const debts = [];

    // Extract all items into flat lists
    ['bank_accounts', 'isas', 'lisas', 'stock_portfolios'].forEach(cat => {
        if (data.assets && data.assets[cat]) {
            data.assets[cat].forEach(a => assets.push(a));
        }
    });
    
    ['student_loans', 'credit_cards', 'personal_loans', 'mortgages'].forEach(cat => {
        if (data.liabilities && data.liabilities[cat]) {
            data.liabilities[cat].forEach(d => debts.push(d));
        }
    });

    // Add today to ensure current data is plotted
    const today = new Date().toISOString().split('T')[0];
    allDates.add(today);

    // Add dates from history
    assets.forEach(a => {
        if (a.history) a.history.forEach(h => allDates.add(h.date.split('T')[0]));
    });
    debts.forEach(d => {
        if (d.history) d.history.forEach(h => allDates.add(h.date.split('T')[0]));
    });

    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    // Compute Net Worth at each date
    const historyPoints = [];
    
    sortedDates.forEach(date => {
        let dateAssets = 0;
        let dateDebts = 0;
        
        assets.forEach(a => {
            // Find the last history entry on or before this date
            const h = [...(a.history || [])].reverse().find(x => x.date.split('T')[0] <= date);
            if (h) {
                let bal = h.balance || 0;
                if (h.base_balance !== undefined) {
                    bal = h.base_balance + (h.pending_bonus || 0);
                }
                dateAssets += toGBP(bal, a.currency || 'GBP');
            }
        });
        
        debts.forEach(d => {
             const h = [...(d.history || [])].reverse().find(x => x.date.split('T')[0] <= date);
             if (h) {
                 dateDebts += toGBP(h.balance || 0, d.currency || 'GBP');
             }
        });
        
        const nw = dateAssets - dateDebts;
        historyPoints.push({ x: date, y: nw });
    });

    // Compute simple average daily growth for projection
    let dailyGrowth = 0;
    if (historyPoints.length > 1) {
        const first = historyPoints[0];
        const last = historyPoints[historyPoints.length - 1];
        const days = (new Date(last.x) - new Date(first.x)) / (1000 * 60 * 60 * 24);
        if (days > 0) {
            dailyGrowth = (last.y - first.y) / days;
        }
    }
    
    // Project 6 months into the future
    const projectionPoints = [];
    // Start projection from current net worth
    projectionPoints.push({ x: today, y: currentNetWorth });
    
    const futureMonths = 6;
    for (let i = 1; i <= futureMonths; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() + i);
        const futDate = d.toISOString().split('T')[0];
        
        const daysFromNow = (d - new Date(today)) / (1000 * 60 * 60 * 24);
        const projectedNW = currentNetWorth + (dailyGrowth * daysFromNow);
        
        projectionPoints.push({ x: futDate, y: projectedNW });
    }

    if (historyPoints.length === 0) {
        canvas.parentElement.innerHTML = '<div class="chart-empty">No history recorded yet.</div>';
        return;
    }

    const allLabels = [...sortedDates];
    for (let i = 1; i < projectionPoints.length; i++) {
        allLabels.push(projectionPoints[i].x);
    }
    
    const histData = allLabels.map(l => {
        const pt = historyPoints.find(p => p.x === l);
        return pt ? pt.y : null;
    });
    
    const projData = allLabels.map(l => {
        const pt = projectionPoints.find(p => p.x === l);
        return pt ? pt.y : null;
    });

    _charts['netWorthHistory'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: allLabels.map(d => new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })),
            datasets: [
                {
                    label: 'Historic Net Worth',
                    data: histData,
                    borderColor: C.blue,
                    backgroundColor: 'rgba(59,130,246,0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: C.blue,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: 'Projected Net Worth',
                    data: projData,
                    borderColor: C.pink,
                    borderDash: [5, 5],
                    borderWidth: 3,
                    pointBackgroundColor: C.pink,
                    pointRadius: 4,
                    fill: false,
                    tension: 0.3,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter' } } },
                tooltip: {
                    ...TOOLTIP_DEFAULTS,
                    callbacks: {
                        label: ctx => `  ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', callback: v => '£' + (v >= 1000 || v <= -1000 ? (v/1000).toFixed(0)+'k' : v) }
                }
            }
        }
    });
}
