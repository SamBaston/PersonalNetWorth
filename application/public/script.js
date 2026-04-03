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
    
    // Parse Bank Accounts
    if (data.assets.bank_accounts && data.assets.bank_accounts.length > 0) {
        data.assets.bank_accounts.forEach((acc, i) => {
            totalAssets += getGBPValue(acc.balance, acc.currency);
            bankList.appendChild(createListItem(`${acc.name}`, acc.balance, acc.currency, i, false, 'bank_accounts', acc));
        });
    }

    // Parse ISAs & LISAs
    let isaIndex = 0;
    if (data.assets.isas && data.assets.isas.length > 0) {
        data.assets.isas.forEach(isa => {
            totalAssets += getGBPValue(isa.balance, isa.currency);
            isasList.appendChild(createListItem(isa.name, isa.balance, isa.currency, isaIndex++, false, 'isas', isa));
        });
    }
    if (data.assets.lisas && data.assets.lisas.length > 0) {
        data.assets.lisas.forEach(lisa => {
            const baseBalance = lisa.base_balance + (lisa.realized_bonus || 0);
            const pendingBonus = lisa.pending_bonus || 0;
            const totalLisa = baseBalance + pendingBonus;
            totalAssets += getGBPValue(totalLisa, lisa.currency);
            
            // Show base LISA logic
            isasList.appendChild(createListItem(lisa.name, baseBalance, lisa.currency, isaIndex++, false, 'lisas', lisa));
            // Show bonus logic as nested
            isasList.appendChild(createListItem(`↳ Govt Bonus (25%)`, pendingBonus, lisa.currency, isaIndex++, true));
        });
    }

    // Parse Stocks
    let stockIndex = 0;
    if (data.assets.stock_portfolios && data.assets.stock_portfolios.length > 0) {
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

    // Parse Liabilities
    if (data.liabilities && data.liabilities.length > 0) {
        data.liabilities.forEach((liability, i) => {
            const val = liability.balance || liability.value; 
            totalLiabilities += getGBPValue(val, liability.currency);
            liabilitiesList.appendChild(createListItem(liability.name, val, liability.currency, i, false, 'liabilities', liability));
        });
    }

    const netWorth = totalAssets - totalLiabilities;

    document.getElementById('total-assets').textContent = formatCurrency(totalAssets, 'GBP');
    document.getElementById('total-liabilities').textContent = formatCurrency(totalLiabilities, 'GBP');
    
    const netWorthElement = document.getElementById('net-worth-amount');
    netWorthElement.textContent = formatCurrency(netWorth, 'GBP');
    
    if (netWorth > 0) {
        netWorthElement.style.color = 'var(--positive)';
    } else if (netWorth < 0) {
        netWorthElement.style.color = 'var(--negative)';
    }
}

function createListItem(name, value, currency, index, isSubitem = false, category = null, fullAsset = null) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;
    
    const mainDiv = document.createElement('div');
    mainDiv.className = 'item-main';
    
    if (isSubitem) {
        li.style.paddingLeft = '1.5rem';
        li.style.fontSize = '0.9em';
        li.style.borderBottom = 'none';
        li.style.paddingTop = '0.2rem';
        li.style.paddingBottom = '0.2rem';
        
        const nameSpanObj = document.createElement('span');
        nameSpanObj.className = 'item-name';
        nameSpanObj.style.color = 'var(--text-tertiary)';
        nameSpanObj.textContent = name;
        mainDiv.appendChild(nameSpanObj);
        
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

    // Hover UI for editing and deleting
    if (fullAsset && category !== 'liabilities') { // (we skipped liable crud for now)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';

        const viewHistoryBtn = document.createElement('button');
        viewHistoryBtn.className = 'action-btn';
        viewHistoryBtn.innerHTML = '📈';
        viewHistoryBtn.title = 'View historical value points';
        viewHistoryBtn.onclick = () => {
            const historyData = JSON.stringify(fullAsset.history, null, 2);
            alert(`History saved in backend (Dashboards coming later!):\n\n${historyData}`);
        };

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = () => openModal(category, fullAsset);

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn';
        delBtn.innerHTML = '🗑️';
        delBtn.onclick = () => deleteAsset(category, fullAsset.id);

        actionsDiv.appendChild(viewHistoryBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);
        li.appendChild(actionsDiv);
    }
    
    return li;
}

function formatCurrency(amount, currencyCode = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currencyCode || 'GBP'
    }).format(amount);
}

// ---- CRUD Logic ----

function openModal(category, asset = null) {
    const modal = document.getElementById('assetModal');
    const form = document.getElementById('assetForm');
    modal.style.display = 'flex';
    document.getElementById('assetCategory').value = category;
    
    // Toggle LISA specific inputs
    const lisaGroup = document.getElementById('lisaGroup');
    const balanceGroup = document.getElementById('balanceGroup');
    
    if (category === 'lisas') {
        lisaGroup.style.display = 'block';
        balanceGroup.style.display = 'none';
        document.getElementById('lisaBaseBalance').required = true;
        document.getElementById('assetBalance').required = false;
    } else {
        lisaGroup.style.display = 'none';
        balanceGroup.style.display = 'block';
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
        form.reset();
        document.getElementById('assetCategory').value = category;
    }
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
        payload.type = 'Cash';
    } else if (category === 'stock_portfolios') {
        payload.balance = parseFloat(document.getElementById('assetBalance').value);
        payload.type = 'manual'; // Simplified CRUD for MVP
    } else {
        payload.balance = parseFloat(document.getElementById('assetBalance').value);
        payload.type = 'Custom';
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/assets/${category}/${id}` : `/api/assets/${category}`;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal();
            fetchWealthData(); // Reload UI
        } else {
            alert('Failed to save asset. Backend error.');
        }
    } catch (err) {
        console.error('Save error:', err);
    }
});

async function deleteAsset(category, id) {
    if (!confirm('Are you sure you want to permanently delete this asset?')) return;
    try {
        const res = await fetch(`/api/assets/${category}/${id}`, { method: 'DELETE' });
        if (res.ok) fetchWealthData();
    } catch (err) {
        console.error('Delete error:', err);
    }
}
