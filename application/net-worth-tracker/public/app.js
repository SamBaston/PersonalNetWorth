// State
let currentTab = 'dashboard';
let dashboardData = null;
let assets = [];
let debts = [];
let projections = null;
let growthRate = 7;
let projectionYears = 10;
let editingAssetId = null;
let editingDebtId = null;

// API Base URL
const API_BASE = '/api';

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format percentage
function formatPercent(value) {
    return value.toFixed(1) + '%';
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric'
    });
}

// Fetch all data
async function fetchData() {
    showLoading();
    hideError();

    try {
        const [dashRes, assetsRes, debtsRes, projRes] = await Promise.all([
            fetch(`${API_BASE}/dashboard`),
            fetch(`${API_BASE}/assets`),
            fetch(`${API_BASE}/debts`),
            fetch(`${API_BASE}/projections?years=${projectionYears}&growthRate=${growthRate}`)
        ]);

        if (!dashRes.ok || !assetsRes.ok || !debtsRes.ok || !projRes.ok) {
            throw new Error('Failed to fetch data');
        }

        dashboardData = await dashRes.json();
        assets = await assetsRes.json();
        debts = await debtsRes.json();
        projections = await projRes.json();

        hideLoading();
        renderCurrentTab();
    } catch (error) {
        console.error('Error fetching data:', error);
        hideLoading();
        showError('Unable to connect to server. Please try again.');
    }
}

// Loading and error states
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

// Tab navigation
function switchTab(tab) {
    currentTab = tab;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Show correct tab content
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    renderCurrentTab();
}

function renderCurrentTab() {
    switch (currentTab) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'assets':
            renderAssets();
            break;
        case 'debts':
            renderDebts();
            break;
        case 'projections':
            renderProjections();
            break;
    }
}

// Render Dashboard
function renderDashboard() {
    if (!dashboardData) return;

    const { summary, assetAllocation, ratios, counts } = dashboardData;

    // Hero section
    document.getElementById('net-worth').textContent = formatCurrency(summary.totalNetWorth);
    document.getElementById('total-assets').textContent = formatCurrency(summary.totalAssets);
    document.getElementById('total-debts').textContent = formatCurrency(summary.totalDebts);
    document.getElementById('lisa-bonus').textContent = formatCurrency(summary.lisaBonusTotal);

    // Stats
    document.getElementById('debt-equity-ratio').textContent = formatPercent(ratios.debtToEquity * 100);
    document.getElementById('liquidity-ratio').textContent = 
        ratios.liquidity === 'Infinity' ? '∞' : ratios.liquidity.toFixed(2);
    document.getElementById('monthly-payments').textContent = formatCurrency(summary.totalMonthlyPayments);
    document.getElementById('debt-free-date').textContent = formatDate(dashboardData.debtFreeDate);
    
    if (dashboardData.monthsToDebtFree) {
        document.getElementById('debt-free-years').textContent = 
            Math.round(dashboardData.monthsToDebtFree / 12) + ' years';
    } else {
        document.getElementById('debt-free-years').textContent = '-';
    }

    // Asset allocation chart
    renderPieChart('allocation-chart', 'allocation-legend', [
        { label: 'Cash', value: assetAllocation.cash, color: '#10b981' },
        { label: 'Investments', value: assetAllocation.investments, color: '#3b82f6' },
        { label: 'Property', value: assetAllocation.property, color: '#f59e0b' },
        { label: 'Other', value: assetAllocation.other, color: '#6b7280' }
    ]);

    // Net worth trend
    if (projections) {
        renderLineChart('trend-chart', projections.projections.slice(0, 6).map(p => ({
            label: 'Year ' + p.year,
            value: p.netWorth
        })), summary.totalNetWorth >= 0 ? '#10b981' : '#ef4444');
    }

    // Debt list
    const debtList = document.getElementById('debt-list');
    debtList.innerHTML = debts.map(debt => `
        <div class="list-item">
            <div style="display: flex; align-items: center;">
                <div class="list-item-icon" style="background: #fee2e2;">
                    <span>!</span>
                </div>
                <div class="list-item-info">
                    <h4>${debt.name}</h4>
                    <p>${formatDebtType(debt.type)}${debt.planType ? ' (' + formatPlanType(debt.planType) + ')' : ''}</p>
                </div>
            </div>
            <div class="list-item-value">
                <p>${formatCurrency(debt.balance)}</p>
                <p>${debt.interestRate}% APR</p>
            </div>
        </div>
    `).join('');
}

// Render Assets
function renderAssets() {
    document.getElementById('asset-count').textContent = assets.length + ' assets tracked';
    
    const list = document.getElementById('assets-list');
    
    if (assets.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <p>No assets yet. Add your first asset to get started.</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = assets.map(asset => `
        <div class="list-card">
            <div class="list-card-header">
                <div class="list-card-info">
                    <div class="list-card-icon" style="background: ${getAssetIconBg(asset.type)}">
                        ${getAssetIcon(asset.type)}
                    </div>
                    <div>
                        <h4 class="list-card-title">${asset.name}</h4>
                        <div class="list-card-badges">
                            <span class="badge ${getAssetBadgeClass(asset.type)}">${formatAssetType(asset.type)}</span>
                            ${asset.isLISA ? '<span class="badge badge-purple">+25% Gov Bonus</span>' : ''}
                            ${asset.subType ? '<span class="badge badge-blue">' + asset.subType + '</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="list-card-value">
                    <p>${formatCurrency(asset.balance)}</p>
                    ${asset.interestRate ? '<p style="font-size: 12px; color: #059669;">' + asset.interestRate + '% interest</p>' : ''}
                </div>
            </div>
            ${asset.type === 'stock_portfolio' && asset.ticker ? `
            <div class="list-card-details" style="grid-template-columns: repeat(4, 1fr);">
                <div><p>Ticker</p><p>${asset.ticker}</p></div>
                ${asset.quantity ? '<div><p>Qty</p><p>' + asset.quantity + '</p></div>' : ''}
                ${asset.purchasePrice ? '<div><p>Buy</p><p>' + formatCurrency(asset.purchasePrice) + '</p></div>' : ''}
                ${asset.currentPrice ? '<div><p>Current</p><p>' + formatCurrency(asset.currentPrice) + '</p></div>' : ''}
            </div>
            ` : ''}
            <div class="list-card-actions">
                <button class="btn btn-outline btn-sm" onclick="editAsset('${asset.id}')">Edit</button>
                <button class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="deleteAsset('${asset.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render Debts
function renderDebts() {
    document.getElementById('debt-count').textContent = debts.length + ' debts tracked';
    
    const list = document.getElementById('debts-list');
    
    if (debts.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <p>No debts tracked. Great job! Or add a debt to start tracking.</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = debts.map(debt => `
        <div class="list-card">
            <div class="list-card-header">
                <div class="list-card-info">
                    <div class="list-card-icon" style="background: ${getDebtIconBg(debt.type)}">
                        ${getDebtIcon(debt.type)}
                    </div>
                    <div>
                        <h4 class="list-card-title">${debt.name}</h4>
                        <div class="list-card-badges">
                            <span class="badge ${getDebtBadgeClass(debt.type)}">${formatDebtType(debt.type)}</span>
                            ${debt.planType ? '<span class="badge badge-indigo">' + formatPlanType(debt.planType) + '</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="list-card-value">
                    <p style="color: #dc2626;">${formatCurrency(debt.balance)}</p>
                    <p style="font-size: 12px; color: #718096;">${debt.interestRate}% APR</p>
                </div>
            </div>
            <div class="list-card-details">
                ${debt.minimumPayment ? '<div><p>Min Payment</p><p>' + formatCurrency(debt.minimumPayment) + '/mo</p></div>' : ''}
                ${debt.creditLimit ? '<div><p>Credit Limit</p><p>' + formatCurrency(debt.creditLimit) + '</p></div>' : ''}
                ${debt.termMonths ? '<div><p>Term</p><p>' + debt.termMonths + ' months</p></div>' : ''}
            </div>
            <div class="list-card-actions">
                <button class="btn btn-outline btn-sm" onclick="editDebt('${debt.id}')">Edit</button>
                <button class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="deleteDebt('${debt.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render Projections
function renderProjections() {
    if (!projections) return;

    document.getElementById('projection-title').textContent = 
        `Net Worth Projection (${growthRate}% annual growth)`;

    // Main chart
    renderLineChart('projection-chart', projections.projections.map(p => ({
        label: 'Y' + p.year,
        value: p.netWorth
    })), projections.current.netWorth >= 0 ? '#10b981' : '#ef4444');

    // Scenario cards
    const scenarioCards = document.getElementById('scenario-cards');
    scenarioCards.innerHTML = projections.scenarios.map(s => `
        <div class="scenario-card ${s.rate === growthRate ? 'active' : ''}">
            <p class="scenario-label">${s.rate}% Growth Rate</p>
            <p class="scenario-value">${formatCurrency(s.finalNetWorth)}</p>
            <p style="font-size: 12px; color: #718096; margin-top: 0.5rem;">
                after ${projectionYears} years
            </p>
        </div>
    `).join('');

    // Projection table
    const tbody = document.getElementById('projection-tbody');
    tbody.innerHTML = projections.projections.map(p => `
        <tr>
            <td>Year ${p.year}</td>
            <td>${formatCurrency(p.totalAssets)}</td>
            <td>${formatCurrency(p.totalDebts)}</td>
            <td style="font-weight: 600; color: ${p.netWorth >= 0 ? '#059669' : '#dc2626'};">
                ${formatCurrency(p.netWorth)}
            </td>
        </tr>
    `).join('');
}

// Pie Chart (SVG)
function renderPieChart(containerId, legendId, data) {
    const container = document.getElementById(containerId);
    const legend = document.getElementById(legendId);
    
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    if (total === 0) {
        container.innerHTML = '<p style="color: #718096;">No data available</p>';
        legend.innerHTML = '';
        return;
    }

    let currentAngle = 0;
    const segments = data.map(d => {
        const angle = (d.value / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        return { ...d, startAngle, angle };
    });

    const svg = `
        <svg viewBox="0 0 200 200" style="max-width: 200px;">
            ${segments.map((s, i) => {
                const startRad = (s.startAngle - 90) * (Math.PI / 180);
                const endRad = (s.startAngle + s.angle - 90) * (Math.PI / 180);
                const x1 = 100 + 80 * Math.cos(startRad);
                const y1 = 100 + 80 * Math.sin(startRad);
                const x2 = 100 + 80 * Math.cos(endRad);
                const y2 = 100 + 80 * Math.sin(endRad);
                const largeArc = s.angle > 180 ? 1 : 0;
                
                return `<path d="M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z" 
                    fill="${s.color}" style="opacity: 0.85;">`;
            }).join('')}
            <circle cx="100" cy="100" r="40" fill="white"/>
            <text x="100" y="105" text-anchor="middle" style="font-size: 14px; font-weight: 600; fill: #1a202c;">
                ${formatCurrency(total)}
            </text>
        </svg>
    `;
    
    container.innerHTML = svg;
    
    legend.innerHTML = data.map(d => `
        <div class="legend-item">
            <div class="legend-color" style="background: ${d.color};"></div>
            <span>${d.label}: ${formatCurrency(d.value)}</span>
        </div>
    `).join('');
}

// Line Chart (SVG)
function renderLineChart(containerId, data, color = '#10b981') {
    const container = document.getElementById(containerId);
    
    if (data.length === 0) {
        container.innerHTML = '<p style="color: #718096;">No data</p>';
        return;
    }

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 280 + 10;
        const y = 150 - ((d.value - minValue) / range) * 130;
        return `${x},${y}`;
    });

    const svg = `
        <svg viewBox="0 0 300 180" style="width: 100%; max-width: 400px;">
            ${[0, 0.25, 0.5, 0.75, 1].map(p => 
                `<line x1="10" y1="${20 + p * 130}" x2="290" y2="${20 + p * 130}" 
                    stroke="#e5e7eb" stroke-width="1"/>`
            ).join('')}
            
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
                </linearGradient>
            </defs>
            
            <polygon fill="url(#grad)" points="10,150 ${points.join(' ')} 290,150"/>
            
            <polyline fill="none" stroke="${color}" stroke-width="3" 
                points="${points.join(' ')}" stroke-linecap="round" stroke-linejoin="round"/>
            
            ${data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map(d => {
                const idx = data.indexOf(d);
                const x = (idx / (data.length - 1)) * 280 + 10;
                return `<text x="${x}" y="170" text-anchor="middle" style="font-size: 10px; fill: #718096;">${d.label}</text>`;
            }).join('')}
        </svg>
    `;
    
    container.innerHTML = svg;
}

// Helper functions for formatting
function formatAssetType(type) {
    const labels = {
        'bank_account': 'Bank Account',
        'isa': 'ISA',
        'lisa': 'LISA',
        'stock_portfolio': 'Stock Portfolio'
    };
    return labels[type] || type;
}

function formatDebtType(type) {
    const labels = {
        'student_loan': 'Student Loan',
        'credit_card': 'Credit Card',
        'personal_loan': 'Personal Loan',
        'mortgage': 'Mortgage'
    };
    return labels[type] || type;
}

function formatPlanType(planType) {
    const labels = {
        'plan1': 'Plan 1',
        'plan2': 'Plan 2',
        'plan4': 'Plan 4',
        'plan5': 'Plan 5'
    };
    return labels[planType] || planType;
}

function getAssetIcon(type) {
    const icons = {
        'bank_account': '🏦',
        'isa': '📈',
        'lisa': '🏠',
        'stock_portfolio': '📊'
    };
    return icons[type] || '💰';
}

function getAssetIconBg(type) {
    const bgs = {
        'bank_account': '#dbeafe',
        'isa': '#d1fae5',
        'lisa': '#ede9fe',
        'stock_portfolio': '#fef3c7'
    };
    return bgs[type] || '#f1f5f9';
}

function getAssetBadgeClass(type) {
    const classes = {
        'bank_account': 'badge-blue',
        'isa': 'badge-green',
        'lisa': 'badge-purple',
        'stock_portfolio': 'badge-amber'
    };
    return classes[type] || 'badge-blue';
}

function getDebtIcon(type) {
    const icons = {
        'student_loan': '🎓',
        'credit_card': '💳',
        'personal_loan': '📄',
        'mortgage': '🏠'
    };
    return icons[type] || '📋';
}

function getDebtIconBg(type) {
    const bgs = {
        'student_loan': '#e0e7ff',
        'credit_card': '#fee2e2',
        'personal_loan': '#fef3c7',
        'mortgage': '#dbeafe'
    };
    return bgs[type] || '#f1f5f9';
}

function getDebtBadgeClass(type) {
    const classes = {
        'student_loan': 'badge-indigo',
        'credit_card': 'badge-red',
        'personal_loan': 'badge-amber',
        'mortgage': 'badge-blue'
    };
    return classes[type] || 'badge-blue';
}

// Asset Modal Functions
function openAssetModal() {
    editingAssetId = null;
    document.getElementById('asset-modal-title').textContent = 'Add Asset';
    document.getElementById('asset-form').reset();
    document.getElementById('asset-id').value = '';
    updateAssetFields();
    document.getElementById('asset-modal').classList.remove('hidden');
}

function closeAssetModal() {
    document.getElementById('asset-modal').classList.add('hidden');
    editingAssetId = null;
}

function updateAssetFields() {
    const type = document.getElementById('asset-type').value;
    const subtypeGroup = document.getElementById('asset-subtype-group');
    const stockFields = document.getElementById('stock-fields');
    const interestGroup = document.getElementById('asset-interest-group');
    
    // Show/hide fields based on type
    subtypeGroup.style.display = type === 'bank_account' ? 'block' : 'none';
    stockFields.classList.toggle('hidden', type !== 'stock_portfolio');
    interestGroup.style.display = type !== 'stock_portfolio' ? 'block' : 'none';
}

async function editAsset(id) {
    try {
        const res = await fetch(`${API_BASE}/assets/${id}`);
        if (!res.ok) throw new Error('Failed to fetch asset');
        
        const asset = await res.json();
        editingAssetId = id;
        
        document.getElementById('asset-modal-title').textContent = 'Edit Asset';
        document.getElementById('asset-id').value = asset.id;
        document.getElementById('asset-name').value = asset.name;
        document.getElementById('asset-type').value = asset.type;
        document.getElementById('asset-subtype').value = asset.subType || 'current';
        document.getElementById('asset-balance').value = asset.balance;
        document.getElementById('asset-interest').value = asset.interestRate || '';
        document.getElementById('asset-ticker').value = asset.ticker || '';
        document.getElementById('asset-quantity').value = asset.quantity || '';
        document.getElementById('asset-purchase-price').value = asset.purchasePrice || '';
        document.getElementById('asset-current-price').value = asset.currentPrice || '';
        
        updateAssetFields();
        document.getElementById('asset-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching asset:', error);
        alert('Failed to load asset details');
    }
}

async function deleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete asset');
        fetchData();
    } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Failed to delete asset');
    }
}

// Debt Modal Functions
function openDebtModal() {
    editingDebtId = null;
    document.getElementById('debt-modal-title').textContent = 'Add Debt';
    document.getElementById('debt-form').reset();
    document.getElementById('debt-id').value = '';
    document.getElementById('debt-interest').value = '6.25';
    updateDebtFields();
    document.getElementById('debt-modal').classList.remove('hidden');
}

function closeDebtModal() {
    document.getElementById('debt-modal').classList.add('hidden');
    editingDebtId = null;
}

function updateDebtFields() {
    const type = document.getElementById('debt-type').value;
    const planGroup = document.getElementById('plan-type-group');
    const creditGroup = document.getElementById('credit-limit-group');
    const termGroup = document.getElementById('term-group');
    
    planGroup.style.display = type === 'student_loan' ? 'block' : 'none';
    creditGroup.classList.toggle('hidden', type !== 'credit_card');
    termGroup.classList.toggle('hidden', type !== 'personal_loan' && type !== 'mortgage');
}

async function editDebt(id) {
    try {
        const res = await fetch(`${API_BASE}/debts/${id}`);
        if (!res.ok) throw new Error('Failed to fetch debt');
        
        const debt = await res.json();
        editingDebtId = id;
        
        document.getElementById('debt-modal-title').textContent = 'Edit Debt';
        document.getElementById('debt-id').value = debt.id;
        document.getElementById('debt-name').value = debt.name;
        document.getElementById('debt-type').value = debt.type;
        document.getElementById('debt-plan-type').value = debt.planType || 'plan2';
        document.getElementById('debt-balance').value = debt.balance;
        document.getElementById('debt-interest').value = debt.interestRate;
        document.getElementById('debt-min-payment').value = debt.minimumPayment || '';
        document.getElementById('debt-credit-limit').value = debt.creditLimit || '';
        document.getElementById('debt-term').value = debt.termMonths || '';
        
        updateDebtFields();
        document.getElementById('debt-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching debt:', error);
        alert('Failed to load debt details');
    }
}

async function deleteDebt(id) {
    if (!confirm('Are you sure you want to delete this debt?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/debts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete debt');
        fetchData();
    } catch (error) {
        console.error('Error deleting debt:', error);
        alert('Failed to delete debt');
    }
}

// Form Submissions
document.getElementById('asset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const assetData = {
        name: document.getElementById('asset-name').value,
        type: document.getElementById('asset-type').value,
        subType: document.getElementById('asset-subtype').value,
        balance: parseFloat(document.getElementById('asset-balance').value),
        interestRate: parseFloat(document.getElementById('asset-interest').value) || undefined,
        ticker: document.getElementById('asset-ticker').value || undefined,
        quantity: parseFloat(document.getElementById('asset-quantity').value) || undefined,
        purchasePrice: parseFloat(document.getElementById('asset-purchase-price').value) || undefined,
        currentPrice: parseFloat(document.getElementById('asset-current-price').value) || undefined
    };
    
    try {
        let res;
        if (editingAssetId) {
            res = await fetch(`${API_BASE}/assets/${editingAssetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData)
            });
        } else {
            res = await fetch(`${API_BASE}/assets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetData)
            });
        }
        
        if (!res.ok) throw new Error('Failed to save asset');
        
        closeAssetModal();
        fetchData();
    } catch (error) {
        console.error('Error saving asset:', error);
        alert('Failed to save asset');
    }
});

document.getElementById('debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const debtData = {
        name: document.getElementById('debt-name').value,
        type: document.getElementById('debt-type').value,
        planType: document.getElementById('debt-plan-type').value,
        balance: parseFloat(document.getElementById('debt-balance').value),
        interestRate: parseFloat(document.getElementById('debt-interest').value),
        minimumPayment: parseFloat(document.getElementById('debt-min-payment').value) || undefined,
        creditLimit: parseFloat(document.getElementById('debt-credit-limit').value) || undefined,
        termMonths: parseInt(document.getElementById('debt-term').value) || undefined
    };
    
    try {
        let res;
        if (editingDebtId) {
            res = await fetch(`${API_BASE}/debts/${editingDebtId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(debtData)
            });
        } else {
            res = await fetch(`${API_BASE}/debts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(debtData)
            });
        }
        
        if (!res.ok) throw new Error('Failed to save debt');
        
        closeDebtModal();
        fetchData();
    } catch (error) {
        console.error('Error saving debt:', error);
        alert('Failed to save debt');
    }
});

// Event Listeners
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        growthRate = parseInt(btn.dataset.rate);
        
        try {
            const res = await fetch(`${API_BASE}/projections?years=${projectionYears}&growthRate=${growthRate}`);
            projections = await res.json();
            renderProjections();
        } catch (error) {
            console.error('Error updating projections:', error);
        }
    });
});

document.getElementById('projection-years').addEventListener('change', async (e) => {
    projectionYears = parseInt(e.target.value);
    
    try {
        const res = await fetch(`${API_BASE}/projections?years=${projectionYears}&growthRate=${growthRate}`);
        projections = await res.json();
        renderProjections();
    } catch (error) {
        console.error('Error updating projections:', error);
    }
});

// Close modals on outside click
document.getElementById('asset-modal').addEventListener('click', (e) => {
    if (e.target.id === 'asset-modal') closeAssetModal();
});

document.getElementById('debt-modal').addEventListener('click', (e) => {
    if (e.target.id === 'debt-modal') closeDebtModal();
});

// Initialize
fetchData();
