document.addEventListener('DOMContentLoaded', () => {
    fetchWealthData();
    setupEventListeners();
});

let wealthData = { assets: [] };
const ISA_LIMIT = 20000;
const LISA_ANNUAL_LIMIT = 4000;
const LISA_BONUS_RATE = 0.25;

async function fetchWealthData() {
    try {
        const response = await fetch('/api/wealth');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        wealthData.assets = data.assets || [];
        updateDashboard();
    } catch (error) {
        console.error('Error fetching wealth data:', error);
        showError();
    }
}

async function saveWealthData() {
    try {
        const response = await fetch('/api/wealth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assets: wealthData.assets })
        });
        if (!response.ok) throw new Error('Failed to save data');
        updateDashboard();
    } catch (error) {
        console.error('Error saving wealth data:', error);
    }
}

function updateDashboard() {
    const assetsList = document.getElementById('assets-list');
    
    let totalAssets = 0;
    let totalISAContribution = 0;
    let totalLISAContribution = 0;
    let projectedGrowth = 0;

    assetsList.innerHTML = '';

    // Process Assets
    wealthData.assets.forEach((asset, index) => {
        totalAssets += asset.value;
        
        // ISA Tracking
        if (asset.type === 'isa' || asset.type === 'lisa') {
            totalISAContribution += (asset.contributionThisYear || 0);
            if (asset.type === 'lisa') {
                totalLISAContribution += (asset.contributionThisYear || 0);
            }
        }

        // Growth Projection (12 months)
        const rate = (asset.type === 'stock' ? asset.estimatedReturn : asset.interestRate) || 0;
        const monthlyRate = rate / 100 / 12;
        const projectedValue = asset.value * Math.pow(1 + monthlyRate, 12);
        projectedGrowth += projectedValue;

        assetsList.appendChild(createAssetItem(asset, index));
    });

    const netWorth = totalAssets;

    // Update UI
    document.getElementById('net-worth-amount').textContent = formatCurrency(netWorth);
    document.getElementById('projected-amount').textContent = formatCurrency(projectedGrowth);

    // ISA Progress
    const isaProgress = document.getElementById('isa-progress');
    const isaUsed = document.getElementById('isa-used');
    const isaRemaining = document.getElementById('isa-remaining');
    const lisaWarning = document.getElementById('lisa-limit-warning');
    
    const percentage = Math.min((totalISAContribution / ISA_LIMIT) * 100, 100);
    isaProgress.style.width = `${percentage}%`;
    isaUsed.textContent = `${formatCurrency(totalISAContribution)} used`;
    isaRemaining.textContent = `${formatCurrency(Math.max(0, ISA_LIMIT - totalISAContribution))} left`;

    if (totalISAContribution > ISA_LIMIT) {
        isaProgress.style.background = 'var(--negative)';
    } else {
        isaProgress.style.background = 'linear-gradient(to right, #a78bfa, #8b5cf6)';
    }

    // LISA Warning
    if (totalLISAContribution >= LISA_ANNUAL_LIMIT) {
        lisaWarning.style.display = 'block';
    } else {
        lisaWarning.style.display = 'none';
    }

    // Net worth color
    const netWorthElement = document.getElementById('net-worth-amount');
    if (netWorth > 0) {
        netWorthElement.style.color = 'var(--positive)';
    } else if (netWorth < 0) {
        netWorthElement.style.color = 'var(--negative)';
    }
}

function createAssetItem(asset, index) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;

    const main = document.createElement('div');
    main.className = 'item-main';
    main.innerHTML = `
        <span class="item-name">${asset.name}</span>
        <span class="item-value positive">${formatCurrency(asset.value)}</span>
    `;

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    if (asset.type === 'stock') {
        meta.innerHTML = `<span>${asset.ticker || 'STOCK'} • ${asset.estimatedReturn}% return</span>`;
    } else {
        meta.innerHTML = `<span>${asset.type.toUpperCase()} • ${asset.interestRate || 0}% interest</span>`;
    }

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const adjustBtn = document.createElement('button');
    adjustBtn.className = 'btn-action';
    adjustBtn.textContent = 'Adjust Balance';
    adjustBtn.onclick = () => openBalanceModal(asset.id);

    actions.appendChild(adjustBtn);

    if (asset.type === 'stock') {
        const refresh = document.createElement('button');
        refresh.className = 'btn-action';
        refresh.innerHTML = 'Refresh Price';
        refresh.onclick = () => refreshStock(asset.id);
        actions.appendChild(refresh);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteAsset(asset.id);
    actions.appendChild(deleteBtn);

    li.appendChild(main);
    li.appendChild(meta);
    li.appendChild(actions);
    return li;
}

async function deleteAsset(id) {
    const asset = wealthData.assets.find(a => a.id === id);
    if (!asset) return;

    showConfirm(`Are you sure you want to delete "${asset.name}"? This action cannot be undone.`, async () => {
        wealthData.assets = wealthData.assets.filter(a => a.id !== id);
        await saveWealthData();
        showNotification(`Asset "${asset.name}" deleted.`);
    });
}

function openBalanceModal(id) {
    const asset = wealthData.assets.find(a => a.id === id);
    if (!asset) return;

    document.getElementById('balance-asset-id').value = id;
    document.getElementById('balance-modal-title').textContent = `Adjust Balance: ${asset.name}`;
    document.getElementById('balance-amount').value = '';
    document.getElementById('balance-modal').style.display = 'block';
}

async function handleBalanceAdjustment(type) {
    const id = document.getElementById('balance-asset-id').value;
    const amount = parseFloat(document.getElementById('balance-amount').value);
    const asset = wealthData.assets.find(a => a.id === id);

    if (!asset || isNaN(amount) || amount <= 0) return;

    if (type === 'deposit') {
        // Check LISA limit
        if (asset.type === 'lisa') {
            const currentLISAContribution = wealthData.assets
                .filter(a => a.type === 'lisa')
                .reduce((sum, a) => sum + (a.contributionThisYear || 0), 0);
            
            if (currentLISAContribution + amount > LISA_ANNUAL_LIMIT) {
                const allowed = LISA_ANNUAL_LIMIT - currentLISAContribution;
                showNotification(`LISA contribution limit exceeded (£4,000). You can only add ${formatCurrency(allowed)} more this year.`);
                return;
            }
        }

        // Check overall ISA limit
        if (asset.type === 'isa' || asset.type === 'lisa') {
            const currentISAContribution = wealthData.assets
                .filter(a => a.type === 'isa' || a.type === 'lisa')
                .reduce((sum, a) => sum + (a.contributionThisYear || 0), 0);
            
            if (currentISAContribution + amount > ISA_LIMIT) {
                const allowed = ISA_LIMIT - currentISAContribution;
                showNotification(`Total ISA contribution limit exceeded (£20,000). You can only add ${formatCurrency(allowed)} more this year.`);
                return;
            }
        }

        let addedValue = amount;
        if (asset.type === 'lisa') {
            const bonus = amount * LISA_BONUS_RATE;
            addedValue += bonus;
        }

        asset.value += addedValue;
        if (asset.type === 'isa' || asset.type === 'lisa') {
            asset.contributionThisYear = (asset.contributionThisYear || 0) + amount;
        }
    } else {
        // Withdraw
        if (asset.value < amount) {
            showNotification('Insufficient funds.');
            return;
        }
        asset.value -= amount;
    }

    await saveWealthData();
    document.getElementById('balance-modal').style.display = 'none';
}

async function refreshStock(id) {
    const asset = wealthData.assets.find(a => a.id === id);
    if (!asset || asset.type !== 'stock') return;

    const fluctuation = (Math.random() - 0.45) * 0.02;
    asset.value = asset.value * (1 + fluctuation);
    
    await saveWealthData();
}

function setupEventListeners() {
    const assetModal = document.getElementById('asset-modal');
    const addAssetBtn = document.getElementById('add-asset-btn');
    const closeModal = document.querySelector('.close-modal');
    const assetForm = document.getElementById('asset-form');
    const assetType = document.getElementById('asset-type');

    const balanceModal = document.getElementById('balance-modal');
    const closeBalanceModal = document.querySelector('.close-balance-modal');
    const btnDeposit = document.getElementById('btn-deposit');
    const btnWithdraw = document.getElementById('btn-withdraw');

    addAssetBtn.onclick = () => assetModal.style.display = 'block';
    closeModal.onclick = () => assetModal.style.display = 'none';
    
    closeBalanceModal.onclick = () => balanceModal.style.display = 'none';

    window.onclick = (event) => {
        if (event.target == assetModal) assetModal.style.display = 'none';
        if (event.target == balanceModal) balanceModal.style.display = 'none';
    };

    btnDeposit.onclick = () => handleBalanceAdjustment('deposit');
    btnWithdraw.onclick = () => handleBalanceAdjustment('withdraw');

    assetType.onchange = () => {
        const type = assetType.value;
        document.getElementById('bank-fields').style.display = (type === 'bank' || type === 'isa' || type === 'lisa') ? 'block' : 'none';
        document.getElementById('stock-fields').style.display = (type === 'stock') ? 'block' : 'none';
        document.getElementById('isa-fields').style.display = (type === 'isa' || type === 'lisa') ? 'block' : 'none';
    };

    assetForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const type = assetType.value;
        const initialValue = parseFloat(document.getElementById('asset-value').value);
        const contribution = parseFloat(document.getElementById('asset-contribution').value || 0);

        // Validation for new ISA/LISA
        if (type === 'lisa') {
            const currentLISAContribution = wealthData.assets
                .filter(a => a.type === 'lisa')
                .reduce((sum, a) => sum + (a.contributionThisYear || 0), 0);
            
            if (currentLISAContribution + contribution > LISA_ANNUAL_LIMIT) {
                const allowed = LISA_ANNUAL_LIMIT - currentLISAContribution;
                showNotification(`LISA contribution limit exceeded (£4,000). You can only add ${formatCurrency(allowed)} more this year.`);
                return;
            }
        }
        
        if (type === 'isa' || type === 'lisa') {
            const currentISAContribution = wealthData.assets
                .filter(a => a.type === 'isa' || a.type === 'lisa')
                .reduce((sum, a) => sum + (a.contributionThisYear || 0), 0);
            
            if (currentISAContribution + contribution > ISA_LIMIT) {
                const allowed = ISA_LIMIT - currentISAContribution;
                showNotification(`Total ISA contribution limit exceeded (£20,000). You can only add ${formatCurrency(allowed)} more this year.`);
                return;
            }
        }

        const newAsset = {
            id: Date.now().toString(),
            name: document.getElementById('asset-name').value,
            value: initialValue,
            type: type,
            interestRate: parseFloat(document.getElementById('asset-interest').value || 0),
            ticker: document.getElementById('asset-ticker').value,
            estimatedReturn: parseFloat(document.getElementById('asset-return').value || 0),
            contributionThisYear: contribution
        };

        if (type === 'lisa' && contribution > 0) {
            newAsset.value += (contribution * LISA_BONUS_RATE);
        }

        wealthData.assets.push(newAsset);
        await saveWealthData();
        
        assetForm.reset();
        assetModal.style.display = 'none';
    };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
    }).format(amount);
}

function showNotification(message) {
    const toast = document.getElementById('notification-toast');
    const msgEl = document.getElementById('notification-message');
    msgEl.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function showConfirm(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('btn-confirm-action');
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const closeBtn = document.querySelector('.close-confirm-modal');

    msgEl.textContent = message;
    modal.style.display = 'block';

    const cleanUp = () => {
        modal.style.display = 'none';
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        closeBtn.onclick = null;
    };

    confirmBtn.onclick = () => {
        onConfirm();
        cleanUp();
    };

    cancelBtn.onclick = cleanUp;
    closeBtn.onclick = cleanUp;
}

function showError() {
    document.getElementById('net-worth-amount').textContent = 'Error';
    document.getElementById('assets-list').innerHTML = '<li><span class="item-name negative">Failed to load data</span></li>';
}
