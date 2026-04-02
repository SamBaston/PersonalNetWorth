document.addEventListener('DOMContentLoaded', () => {
    fetchWealthData();
    setupEventListeners();
});

let wealthData = { assets: [], liabilities: [] };
const ISA_LIMIT = 20000;
const LISA_BONUS_RATE = 0.25;

async function fetchWealthData() {
    try {
        const response = await fetch('/api/wealth');
        if (!response.ok) throw new Error('Network response was not ok');
        wealthData = await response.json();
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
            body: JSON.stringify(wealthData)
        });
        if (!response.ok) throw new Error('Failed to save data');
        updateDashboard();
    } catch (error) {
        console.error('Error saving wealth data:', error);
    }
}

function updateDashboard() {
    const assetsList = document.getElementById('assets-list');
    const liabilitiesList = document.getElementById('liabilities-list');
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalISAContribution = 0;
    let projectedGrowth = 0;

    assetsList.innerHTML = '';
    liabilitiesList.innerHTML = '';

    // Process Assets
    wealthData.assets.forEach((asset, index) => {
        totalAssets += asset.value;
        
        // ISA Tracking
        if (asset.type === 'isa' || asset.type === 'lisa') {
            totalISAContribution += (asset.contributionThisYear || 0);
        }

        // Growth Projection (12 months)
        const rate = (asset.type === 'stock' ? asset.estimatedReturn : asset.interestRate) || 0;
        const monthlyRate = rate / 100 / 12;
        const projectedValue = asset.value * Math.pow(1 + monthlyRate, 12);
        projectedGrowth += projectedValue;

        assetsList.appendChild(createAssetItem(asset, index));
    });

    // Process Liabilities
    wealthData.liabilities.forEach((liability, index) => {
        totalLiabilities += liability.value;
        liabilitiesList.appendChild(createLiabilityItem(liability, index));
    });

    const netWorth = totalAssets - totalLiabilities;

    // Update UI
    document.getElementById('total-assets').textContent = formatCurrency(totalAssets);
    document.getElementById('total-liabilities').textContent = formatCurrency(totalLiabilities);
    document.getElementById('net-worth-amount').textContent = formatCurrency(netWorth);
    document.getElementById('projected-amount').textContent = formatCurrency(projectedGrowth - totalLiabilities);

    // ISA Progress
    const isaProgress = document.getElementById('isa-progress');
    const isaUsed = document.getElementById('isa-used');
    const isaRemaining = document.getElementById('isa-remaining');
    
    const percentage = Math.min((totalISAContribution / ISA_LIMIT) * 100, 100);
    isaProgress.style.width = `${percentage}%`;
    isaUsed.textContent = `${formatCurrency(totalISAContribution)} used`;
    isaRemaining.textContent = `${formatCurrency(Math.max(0, ISA_LIMIT - totalISAContribution))} left`;

    if (totalISAContribution > ISA_LIMIT) {
        isaProgress.style.background = 'var(--negative)';
    } else {
        isaProgress.style.background = 'linear-gradient(to right, #a78bfa, #8b5cf6)';
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
    let metaText = '';
    if (asset.type === 'stock') {
        metaText = `<span>${asset.ticker || 'STOCK'} • ${asset.estimatedReturn}% return</span>`;
    } else {
        metaText = `<span>${asset.type.toUpperCase()} • ${asset.interestRate || 0}% interest</span>`;
    }
    meta.innerHTML = metaText;

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const add100 = document.createElement('button');
    add100.className = 'btn-action';
    add100.textContent = '+£100';
    add100.onclick = () => addBalance(asset.id, 100);

    const add1k = document.createElement('button');
    add1k.className = 'btn-action';
    add1k.textContent = '+£1k';
    add1k.onclick = () => addBalance(asset.id, 1000);

    actions.appendChild(add100);
    actions.appendChild(add1k);

    if (asset.type === 'stock') {
        const refresh = document.createElement('button');
        refresh.className = 'btn-action';
        refresh.innerHTML = 'Refresh';
        refresh.onclick = () => refreshStock(asset.id);
        actions.appendChild(refresh);
    }

    li.appendChild(main);
    li.appendChild(meta);
    li.appendChild(actions);
    return li;
}

function createLiabilityItem(liability, index) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.05}s`;
    li.innerHTML = `
        <div class="item-main">
            <span class="item-name">${liability.name}</span>
            <span class="item-value negative">${formatCurrency(liability.value)}</span>
        </div>
    `;
    return li;
}

async function addBalance(id, amount) {
    const asset = wealthData.assets.find(a => a.id === id);
    if (!asset) return;

    let addedValue = amount;
    if (asset.type === 'lisa') {
        const bonus = amount * LISA_BONUS_RATE;
        addedValue += bonus;
        console.log(`LISA Bonus added: ${formatCurrency(bonus)}`);
    }

    asset.value += addedValue;
    if (asset.type === 'isa' || asset.type === 'lisa') {
        asset.contributionThisYear = (asset.contributionThisYear || 0) + amount;
    }

    await saveWealthData();
}

async function refreshStock(id) {
    const asset = wealthData.assets.find(a => a.id === id);
    if (!asset || asset.type !== 'stock') return;

    // Simulate real-time fetching with a small random fluctuation
    const fluctuation = (Math.random() - 0.45) * 0.02; // -0.9% to +1.1%
    asset.value = asset.value * (1 + fluctuation);
    
    await saveWealthData();
}

function setupEventListeners() {
    const assetModal = document.getElementById('asset-modal');
    const addAssetBtn = document.getElementById('add-asset-btn');
    const closeModal = document.querySelector('.close-modal');
    const assetForm = document.getElementById('asset-form');
    const assetType = document.getElementById('asset-type');

    addAssetBtn.onclick = () => assetModal.style.display = 'block';
    closeModal.onclick = () => assetModal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == assetModal) assetModal.style.display = 'none';
    };

    assetType.onchange = () => {
        const type = assetType.value;
        document.getElementById('bank-fields').style.display = (type === 'bank' || type === 'isa' || type === 'lisa') ? 'block' : 'none';
        document.getElementById('stock-fields').style.display = (type === 'stock') ? 'block' : 'none';
        document.getElementById('isa-fields').style.display = (type === 'isa' || type === 'lisa') ? 'block' : 'none';
    };

    assetForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const type = assetType.value;
        const newAsset = {
            id: Date.now().toString(),
            name: document.getElementById('asset-name').value,
            value: parseFloat(document.getElementById('asset-value').value),
            type: type,
            interestRate: parseFloat(document.getElementById('asset-interest').value || 0),
            ticker: document.getElementById('asset-ticker').value,
            estimatedReturn: parseFloat(document.getElementById('asset-return').value || 0),
            contributionThisYear: parseFloat(document.getElementById('asset-contribution').value || 0)
        };

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

function showError() {
    document.getElementById('net-worth-amount').textContent = 'Error';
    document.getElementById('assets-list').innerHTML = '<li><span class="item-name negative">Failed to load data</span></li>';
}
