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
    let cashTotal = 0;
    let investmentsTotal = 0;
    let propertyTotal = 0;
    let monthlyObligations = 0;

    // ── Assets ──
    const bankList    = document.getElementById('bank-accounts-list');
    const isasList    = document.getElementById('isas-list');
    const stocksList  = document.getElementById('stocks-list');
    [bankList, isasList, stocksList].forEach(el => el.innerHTML = '');

    if (data.assets.bank_accounts) {
        data.assets.bank_accounts.forEach((acc, i) => {
            const gbpVal = toGBP(acc.balance, acc.currency);
            totalAssets += gbpVal;
            cashTotal   += gbpVal;
            bankList.appendChild(createAssetItem(acc.name, acc.balance, acc.currency, i, false, 'bank_accounts', acc));
        });
    }

    let isaIdx = 0;
    if (data.assets.isas) {
        data.assets.isas.forEach(isa => {
            const gbpVal = toGBP(isa.balance, isa.currency);
            totalAssets       += gbpVal;
            investmentsTotal  += gbpVal;
            isasList.appendChild(createAssetItem(isa.name, isa.balance, isa.currency, isaIdx++, false, 'isas', isa));
        });
    }
    if (data.assets.lisas) {
        data.assets.lisas.forEach(lisa => {
            const base  = lisa.base_balance + (lisa.realized_bonus || 0);
            const bonus = lisa.pending_bonus || 0;
            const gbpVal = toGBP(base + bonus, lisa.currency);
            totalAssets       += gbpVal;
            investmentsTotal  += gbpVal;
            isasList.appendChild(createAssetItem(lisa.name, base, lisa.currency, isaIdx++, false, 'lisas', lisa));
            isasList.appendChild(createAssetItem('↳ Govt Bonus (25%)', bonus, lisa.currency, isaIdx++, true));
        });
    }

    let sIdx = 0;
    if (data.assets.stock_portfolios) {
        data.assets.stock_portfolios.forEach(port => {
            const gbpVal = toGBP(port.balance || 0, port.currency || 'GBP');
            totalAssets       += gbpVal;
            investmentsTotal  += gbpVal;
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
            if (debt.minimum_monthly_payment) {
                monthlyObligations += toGBP(parseFloat(debt.minimum_monthly_payment) || 0, 'GBP');
            }
            if (cat === 'mortgages' && debt.property_value) {
                propertyTotal += toGBP(parseFloat(debt.property_value) || 0, 'GBP');
            }
            ul.appendChild(createDebtItem(debt, cat, i));
        });
    });

    document.getElementById('total-assets').textContent     = fmt(totalAssets);
    document.getElementById('total-liabilities').textContent = fmt(totalLiabilities);
    const nw = totalAssets - totalLiabilities;
    const nwEl = document.getElementById('net-worth-amount');
    nwEl.textContent = fmt(nw);
    nwEl.style.color = nw >= 0 ? 'var(--positive)' : 'var(--negative)';

    renderAnalytics({ totalAssets, totalLiabilities, cashTotal, investmentsTotal, propertyTotal, monthlyObligations });
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

// ─── Analytics Renderers ──────────────────────────────────────────────────────

function renderAnalytics({ totalAssets, totalLiabilities, cashTotal, investmentsTotal, propertyTotal, monthlyObligations }) {
    renderAllocationPie(cashTotal, investmentsTotal, propertyTotal, totalAssets);
    renderDebtEquity(totalAssets, totalLiabilities);
    renderLiquidity(cashTotal, monthlyObligations);
}

// ── Asset Allocation Donut ────────────────────────────────────────────────────
function renderAllocationPie(cash, investments, property, total) {
    const svg     = document.getElementById('allocationPieChart');
    const legend  = document.getElementById('allocationLegend');
    svg.innerHTML = '';
    legend.innerHTML = '';

    const COLORS  = ['#3b82f6', '#10b981', '#a78bfa'];
    const LABELS  = ['Cash', 'Investments', 'Property'];
    const values  = [cash, investments, property];
    const sum     = values.reduce((a, b) => a + b, 0);

    if (sum === 0) {
        svg.innerHTML = `<text x="100" y="108" text-anchor="middle" fill="var(--text-tertiary)" font-size="13" font-family="Inter,sans-serif">No data</text>`;
        return;
    }

    const cx = 100, cy = 100, r = 80, innerR = 52;
    let cumAngle = -Math.PI / 2;

    values.forEach((val, idx) => {
        if (val <= 0) return;
        const frac  = val / sum;
        const angle = frac * 2 * Math.PI;
        const x1    = cx + r * Math.cos(cumAngle);
        const y1    = cy + r * Math.sin(cumAngle);
        cumAngle   += angle;
        const x2    = cx + r * Math.cos(cumAngle);
        const y2    = cy + r * Math.sin(cumAngle);
        const ix1   = cx + innerR * Math.cos(cumAngle - angle);
        const iy1   = cy + innerR * Math.sin(cumAngle - angle);
        const ix2   = cx + innerR * Math.cos(cumAngle);
        const iy2   = cy + innerR * Math.sin(cumAngle);
        const large = angle > Math.PI ? 1 : 0;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`);
        path.setAttribute('fill', COLORS[idx]);
        path.setAttribute('opacity', '0.9');
        path.style.transition = 'opacity 0.2s';
        path.addEventListener('mouseenter', () => path.setAttribute('opacity', '1'));
        path.addEventListener('mouseleave', () => path.setAttribute('opacity', '0.9'));
        svg.appendChild(path);

        // Legend row
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <span class="legend-dot" style="background:${COLORS[idx]}"></span>
            <span class="legend-label">${LABELS[idx]}</span>
            <span class="legend-value">${fmt(val)}</span>
            <span class="legend-pct">${(frac * 100).toFixed(1)}%</span>`;
        legend.appendChild(item);
    });

    // Centre label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', cx); label.setAttribute('y', cy - 8);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', 'var(--text-secondary)');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-family', 'Inter,sans-serif');
    label.textContent = 'Total';
    svg.appendChild(label);

    const amount = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    amount.setAttribute('x', cx); amount.setAttribute('y', cy + 10);
    amount.setAttribute('text-anchor', 'middle');
    amount.setAttribute('fill', 'var(--text-primary)');
    amount.setAttribute('font-size', '13');
    amount.setAttribute('font-weight', '700');
    amount.setAttribute('font-family', 'Inter,sans-serif');
    amount.textContent = fmt(total);
    svg.appendChild(amount);
}

// ── Debt-to-Equity ────────────────────────────────────────────────────────────
function renderDebtEquity(assets, liabilities) {
    const el = document.getElementById('debtEquityDisplay');
    const equity = assets - liabilities;
    let ratio, ratioStr, color, barPct, interpretation;

    if (equity <= 0) {
        ratioStr = fmt(equity);
        color = 'var(--negative)';
        barPct = 100;
        interpretation = 'Liabilities exceed assets — net negative equity.';
    } else {
        ratio = liabilities / equity;
        ratioStr = ratio.toFixed(2);
        color = ratio < 0.5 ? 'var(--positive)' : ratio < 1.5 ? 'var(--warning)' : 'var(--negative)';
        barPct = Math.min(100, (ratio / 3) * 100);
        interpretation = ratio < 0.5
            ? 'Low leverage — strong equity position.'
            : ratio < 1.5
            ? 'Moderate leverage — monitor debt levels.'
            : 'High leverage — consider reducing debt.';
    }

    el.innerHTML = `
        <div class="ratio-big" style="color:${color}">${ratioStr}</div>
        <div class="ratio-sub">${equity <= 0 ? 'Net Equity' : 'Debt ÷ Equity'}<br>${interpretation}</div>
        <div class="ratio-bar-track">
            <div class="ratio-bar-fill" style="width:${barPct}%;background:${color}"></div>
        </div>
        <div class="ratio-detail">
            <strong>Assets:</strong> ${fmt(assets)}<br>
            <strong>Liabilities:</strong> ${fmt(liabilities)}<br>
            <strong>Net Equity:</strong> ${fmt(equity)}
        </div>`;
}

// ── Liquidity Ratio ───────────────────────────────────────────────────────────
function renderLiquidity(cash, monthlyObligations) {
    const el = document.getElementById('liquidityDisplay');
    let ratioStr, color, barPct, interpretation;

    if (monthlyObligations <= 0) {
        ratioStr = '—';
        color = 'var(--text-secondary)';
        barPct = 0;
        interpretation = 'No monthly debt obligations recorded.';
    } else {
        const ratio = cash / monthlyObligations;
        ratioStr = ratio.toFixed(1) + 'x';
        // ≥6 months cash = healthy, 3–6 = okay, <3 = low
        color = ratio >= 6 ? 'var(--positive)' : ratio >= 3 ? 'var(--warning)' : 'var(--negative)';
        barPct = Math.min(100, (ratio / 12) * 100);
        interpretation = ratio >= 6
            ? 'Strong liquidity —' + ratio.toFixed(1) + ' months of obligations covered.'
            : ratio >= 3
            ? 'Adequate liquidity — consider building cash reserves.'
            : 'Low liquidity — less than 3 months of obligations in cash.';
    }

    el.innerHTML = `
        <div class="ratio-big" style="color:${color}">${ratioStr}</div>
        <div class="ratio-sub">Cash ÷ Monthly Obligations<br>${interpretation}</div>
        <div class="ratio-bar-track">
            <div class="ratio-bar-fill" style="width:${barPct}%;background:${color}"></div>
        </div>
        <div class="ratio-detail">
            <strong>Cash on hand:</strong> ${fmt(cash)}<br>
            <strong>Monthly obligations:</strong> ${monthlyObligations > 0 ? fmt(monthlyObligations) + '/mo' : '—'}
        </div>`;
}
