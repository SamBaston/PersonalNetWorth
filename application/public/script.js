document.addEventListener('DOMContentLoaded', () => {
    fetchWealthData();
    
    // Modal background close
    document.getElementById('assetModal').addEventListener('click', (e) => {
        if(e.target === document.getElementById('assetModal')) {
            closeModal();
        }
    });
});

async function fetchWealthData() {
    try {
        const response = await fetch('/api/wealth');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        updateDashboard(data);
        
        // Update footer sync time
        const now = new Date();
        document.getElementById('last-updated').textContent = `Last synced: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (error) {
        console.error('Error fetching wealth data:', error);
        document.getElementById('net-worth-amount').textContent = 'Error';
    }
}

function updateDashboard(data) {
    const bankList = document.getElementById('bank-accounts-list');
    const isasList = document.getElementById('isas-list');
    const stocksList = document.getElementById('stocks-list');
    const liabilitiesList = document.getElementById('liabilities-list');
    
    let totalAssets = 0;
    let totalLiabilities = 0;

    bankList.innerHTML = '';
    isasList.innerHTML = '';
    stocksList.innerHTML = '';
    liabilitiesList.innerHTML = '';

    const fxRateUsdToGbp = 0.79;

    function getGBPValue(amount, currency) {
        if (currency === 'USD') return amount * fxRateUsdToGbp;
        return amount;
    }
    
    // Assets
    if (data.assets.bank_accounts) {
        data.assets.bank_accounts.forEach((acc, i) => {
            totalAssets += getGBPValue(acc.balance, acc.currency);
            bankList.appendChild(createListItem(acc.name, acc.balance, acc.currency, i, false, 'bank_accounts', acc));
        });
    }

    let isaIndex = 0;
    if (data.assets.isas) {
        data.assets.isas.forEach(isa => {
            totalAssets += getGBPValue(isa.balance, isa.currency);
            isasList.appendChild(createListItem(isa.name, isa.balance, isa.currency, isaIndex++, false, 'isas', isa));
        });
    }
    if (data.assets.lisas) {
        data.assets.lisas.forEach(lisa => {
            const baseBalance = lisa.base_balance + (lisa.realized_bonus || 0);
            const pendingBonus = lisa.pending_bonus || 0;
            const totalLisa = baseBalance + pendingBonus;
            totalAssets += getGBPValue(totalLisa, lisa.currency);
            isasList.appendChild(createListItem(lisa.name, baseBalance, lisa.currency, isaIndex++, false, 'lisas', lisa));
            isasList.appendChild(createListItem(`↳ Govt Bonus (25%)`, pendingBonus, lisa.currency, isaIndex++, true));
        });
    }

    let stockIndex = 0;
    if (data.assets.stock_portfolios) {
        data.assets.stock_portfolios.forEach(port => {
            totalAssets += getGBPValue(port.balance, port.currency || 'GBP');
            stocksList.appendChild(createListItem(port.name, port.balance, port.currency || 'GBP', stockIndex++, false, 'stock_portfolios', port));
            if (port.type === 'tickers' && port.tickers) {
                port.tickers.forEach(ticker => {
                    stocksList.appendChild(createListItem(`↳ ${ticker.quantity}x ${ticker.symbol}`, ticker.value, ticker.currency, stockIndex++, true));
                });
            }
        });
    }

    // Liabilities
    if (data.liabilities) {
        data.liabilities.forEach((liability, i) => {
            totalLiabilities += getGBPValue(liability.balance, liability.currency);
            
            // Calculate interest accrual monthly estimate
            const monthlyInterest = (liability.balance * ((liability.interest_rate || 0) / 100)) / 12;
            const meta = [
                liability.type ? liability.type.replace('_', ' ').toUpperCase() : 'DEBT',
                liability.interest_rate ? `${liability.interest_rate}% APR (Est. £${monthlyInterest.toFixed(2)}/mo interest)` : null,
                liability.plan_type ? `PLAN: ${liability.plan_type.toUpperCase()}` : null,
                liability.min_payment ? `Min Pay: £${liability.min_payment}` : null
            ].filter(Boolean).join(' • ');

            liabilitiesList.appendChild(createListItem(liability.name, liability.balance, liability.currency, i, false, 'liabilities', liability, meta));
        });
    }

    const netWorth = totalAssets - totalLiabilities;
    document.getElementById('total-assets').textContent = formatCurrency(totalAssets, 'GBP');
    document.getElementById('total-liabilities').textContent = formatCurrency(totalLiabilities, 'GBP');
    const netWorthElement = document.getElementById('net-worth-amount');
    netWorthElement.textContent = formatCurrency(netWorth, 'GBP');
    
    if (netWorth > 0) netWorthElement.style.color = 'var(--positive)';
    else if (netWorth < 0) netWorthElement.style.color = 'var(--negative)';
}

function createListItem(name, value, currency, index, isSubitem = false, category = null, item = null, meta = null) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;
    
    const mainDiv = document.createElement('div');
    mainDiv.className = 'item-main';
    
    if (isSubitem) {
        li.style.paddingLeft = '1.5rem';
        li.style.fontSize = '0.9em';
        li.style.borderBottom = 'none';
        
        const nameSpan = document.createElement('span');
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

    if (meta) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'item-meta';
        metaDiv.textContent = meta;
        li.appendChild(metaDiv);
    }

    if (item && category) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const historyBtn = document.createElement('button');
        historyBtn.className = 'action-btn';
        historyBtn.innerHTML = '📈';
        historyBtn.onclick = () => alert(`History Log:\n${JSON.stringify(item.history, null, 2)}`);

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = () => openModal(category, item);

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn';
        delBtn.innerHTML = '🗑️';
        delBtn.onclick = () => deleteItem(category, item.id);

        actionsDiv.appendChild(historyBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);
        li.appendChild(actionsDiv);
    }
    
    return li;
}

function formatCurrency(amount, currencyCode = 'GBP') {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode }).format(amount);
}

function openModal(category, item = null) {
    const modal = document.getElementById('assetModal');
    const form = document.getElementById('assetForm');
    modal.style.display = 'flex';
    document.getElementById('assetCategory').value = category;
    
    const lisaGroup = document.getElementById('lisaGroup');
    const balanceGroup = document.getElementById('balanceGroup');
    const debtFields = document.getElementById('debtFields');
    
    lisaGroup.style.display = category === 'lisas' ? 'block' : 'none';
    balanceGroup.style.display = category === 'lisas' ? 'none' : 'block';
    debtFields.style.display = category === 'liabilities' ? 'block' : 'none';

    if (item) {
        document.getElementById('modalTitle').textContent = 'Edit Item';
        document.getElementById('assetId').value = item.id;
        document.getElementById('assetName').value = item.name || '';
        document.getElementById('assetCurrency').value = item.currency || 'GBP';
        
        if (category === 'lisas') {
            document.getElementById('lisaBaseBalance').value = item.base_balance || 0;
            document.getElementById('lisaPendingBonus').value = item.pending_bonus || 0;
        } else {
            document.getElementById('assetBalance').value = item.balance || 0;
        }

        if (category === 'liabilities') {
            document.getElementById('debtType').value = item.type || 'credit_card';
            document.getElementById('interestRate').value = item.interest_rate || '';
            document.getElementById('minPayment').value = item.min_payment || '';
            document.getElementById('studentLoanPlan').value = item.plan_type || 'plan_2';
            toggleDebtDetails();
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add Item';
        document.getElementById('assetId').value = '';
        form.reset();
        document.getElementById('assetCategory').value = category;
        toggleDebtDetails();
    }
}

function toggleDebtDetails() {
    const debtType = document.getElementById('debtType').value;
    const planGroup = document.getElementById('studentLoanPlanGroup');
    const balanceLabel = document.getElementById('balanceLabel');
    
    planGroup.style.display = debtType === 'student_loan' ? 'block' : 'none';
    balanceLabel.textContent = debtType === 'student_loan' ? 'Outstanding Principal' : 'Total Balance';
}

function closeModal() {
    document.getElementById('assetModal').style.display = 'none';
}

document.getElementById('assetForm').addEventListener('submit', async (e) => {
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
    } else {
        payload.balance = parseFloat(document.getElementById('assetBalance').value);
    }

    if (category === 'liabilities') {
        payload.type = document.getElementById('debtType').value;
        payload.interest_rate = parseFloat(document.getElementById('interestRate').value) || 0;
        payload.min_payment = parseFloat(document.getElementById('minPayment').value) || 0;
        if (payload.type === 'student_loan') {
            payload.plan_type = document.getElementById('studentLoanPlan').value;
        }
    }

    const method = id ? 'PUT' : 'POST';
    const baseUrl = category === 'liabilities' ? '/api/liabilities' : `/api/assets/${category}`;
    const url = id ? `${baseUrl}/${id}` : baseUrl;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal();
            fetchWealthData();
        } else {
            alert('Error saving item');
        }
    } catch (err) {
        console.error('Save error:', err);
    }
});

async function deleteItem(category, id) {
    if (!confirm('Confirm delete?')) return;
    const baseUrl = category === 'liabilities' ? '/api/liabilities' : `/api/assets/${category}`;
    try {
        const res = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
        if (res.ok) fetchWealthData();
    } catch (err) {
        console.error('Delete error:', err);
    }
}
