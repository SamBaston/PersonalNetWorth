const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

async function fetchNetWorth() {
    try {
        const response = await fetch('/api/net-worth');
        const data = await response.json();
        
        const assetsList = document.getElementById('assets-list');
        const liabilitiesList = document.getElementById('liabilities-list');
        
        assetsList.innerHTML = '';
        liabilitiesList.innerHTML = '';

        let totalAssets = 0;
        let totalLiabilities = 0;

        // Process Assets
        data.assets.forEach(item => {
            totalAssets += item.value;
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-category">${item.category}</span>
                </div>
                <span class="item-value text-green">${formatCurrency(item.value)}</span>
            `;
            assetsList.appendChild(li);
        });

        // Process Liabilities
        data.liabilities.forEach(item => {
            totalLiabilities += item.value;
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-category">${item.category}</span>
                </div>
                <span class="item-value text-red">${formatCurrency(item.value)}</span>
            `;
            liabilitiesList.appendChild(li);
        });

        const netWorth = totalAssets - totalLiabilities;

        // Update UI
        document.getElementById('total-assets').textContent = `+${formatCurrency(totalAssets)}`;
        document.getElementById('total-liabilities').textContent = `-${formatCurrency(totalLiabilities)}`;
        document.getElementById('total-net-worth').textContent = formatCurrency(netWorth);
        
        // Color net worth based on value
        const netWorthEl = document.getElementById('total-net-worth');
        if (netWorth < 0) {
            netWorthEl.classList.add('text-red');
        } else {
            netWorthEl.classList.remove('text-red');
        }

    } catch (error) {
        console.error('Error fetching net worth data:', error);
        document.querySelector('.dashboard').innerHTML = '<p style="text-align:center; padding: 2rem;">Error loading financial data. Please try again later.</p>';
    }
}

fetchNetWorth();
