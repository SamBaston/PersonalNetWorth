document.addEventListener('DOMContentLoaded', () => {
    fetchWealthData();
});

async function fetchWealthData() {
    try {
        const response = await fetch('/api/wealth');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching wealth data:', error);
        document.getElementById('net-worth-amount').textContent = 'Error';
        document.getElementById('assets-list').innerHTML = `<li><span class="item-name" style="color: var(--negative)">Failed to load data</span></li>`;
        document.getElementById('liabilities-list').innerHTML = `<li><span class="item-name" style="color: var(--negative)">Failed to load data</span></li>`;
    }
}

function updateDashboard(data) {
    const assetsList = document.getElementById('assets-list');
    const liabilitiesList = document.getElementById('liabilities-list');
    
    let totalAssets = 0;
    let totalLiabilities = 0;

    // Clear loading states
    assetsList.innerHTML = '';
    liabilitiesList.innerHTML = '';

    // Populate Assets
    if (data.assets && data.assets.length > 0) {
        data.assets.forEach((asset, index) => {
            totalAssets += asset.value;
            assetsList.appendChild(createListItem(asset.name, asset.value, index));
        });
    } else {
        assetsList.innerHTML = '<li><span class="item-name">No assets found</span></li>';
    }

    // Populate Liabilities
    if (data.liabilities && data.liabilities.length > 0) {
        data.liabilities.forEach((liability, index) => {
            totalLiabilities += liability.value;
            liabilitiesList.appendChild(createListItem(liability.name, liability.value, index));
        });
    } else {
        liabilitiesList.innerHTML = '<li><span class="item-name">No liabilities found</span></li>';
    }

    const netWorth = totalAssets - totalLiabilities;

    // Update Totals UI
    document.getElementById('total-assets').textContent = formatCurrency(totalAssets);
    document.getElementById('total-liabilities').textContent = formatCurrency(totalLiabilities);
    
    const netWorthElement = document.getElementById('net-worth-amount');
    netWorthElement.textContent = formatCurrency(netWorth);
    
    // Add subtle color indication for net worth
    if (netWorth > 0) {
        netWorthElement.style.color = 'var(--positive)';
    } else if (netWorth < 0) {
        netWorthElement.style.color = 'var(--negative)';
    }
}

function createListItem(name, value, index) {
    const li = document.createElement('li');
    li.style.animationDelay = `${index * 0.1}s`; // Staggered animation
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = name;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'item-value';
    valueSpan.textContent = formatCurrency(value);
    
    li.appendChild(nameSpan);
    li.appendChild(valueSpan);
    
    return li;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}
