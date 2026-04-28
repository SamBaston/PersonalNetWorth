let data = null;
let wealthChart = null;
let pieChart = null;

async function simulateScenario() {
    const text = document.getElementById('intelligenceText');
    const original = text.innerHTML;
    text.innerHTML = '<span class="text-[#5A5A40] font-bold">Simulator Active:</span> Adjust individual entity parameters in more detail to stress-test your strategy.';
    setTimeout(() => { text.innerHTML = original; }, 4000);
}

async function exportData() {
    if (!data) return;
    const items = [];
    Object.entries(data.assets).forEach(([cat, list]) => {
        list.forEach(i => {
            const val = (i.balance ?? 0) + (i.base_balance ?? 0) + (i.pending_bonus ?? 0);
            items.push({ type: 'Asset', category: cat, name: i.name, value: val });
        });
    });
    Object.entries(data.liabilities).forEach(([cat, list]) => {
        list.forEach(i => {
            items.push({ type: 'Liability', category: cat, name: i.name, value: i.balance });
        });
    });
    
    const csv = 'Type,Category,Name,Value (GBP)\n' + items.map(i => `${i.type},${i.category},${i.name},${i.value}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

async function fetchData() {
    try {
        const res = await fetch('/api/wealth');
        data = await res.json();
        renderDashboard();
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

function fmt(amount, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', { 
        style: 'currency', 
        currency: currency,
        maximumFractionDigits: 0
    }).format(amount);
}

function abbreviate(v) {
    if (Math.abs(v) >= 1000000) return '£' + (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(v) >= 1000) return '£' + (v / 1000).toFixed(0) + 'k';
    return '£' + v;
}

function renderDashboard() {
    const { summary, assets, liabilities } = data;

    // Header
    document.getElementById('totalWorth').textContent = fmt(summary.netWorth);

    // Score
    document.getElementById('scoreText').textContent = Math.round(summary.responsibilityScore);
    document.getElementById('ltvLabel').textContent = `LTV (Excl. Education): ${(summary.ltv * 100).toFixed(0)}%`;
    const circle = document.getElementById('scoreCircle');
    // Visual score clamped for circle but text shows real value
    const visualScore = Math.max(0, Math.min(100, summary.responsibilityScore));
    const offset = 264 - (264 * visualScore / 100);
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = summary.responsibilityScore < 0 ? '#e11d48' : (summary.responsibilityScore < 50 ? '#A67C52' : '#5A5A40');

    // Assets List
    const assetsContainer = document.getElementById('assetsList');
    assetsContainer.innerHTML = '';
    Object.entries(assets).forEach(([category, items]) => {
        items.forEach(asset => {
            const val = (asset.balance ?? 0) + (asset.base_balance ?? 0) + (asset.pending_bonus ?? 0);
            const card = createItemCard(asset, category, val, true);
            assetsContainer.appendChild(card);
        });
    });

    // Liabilities List
    const libsContainer = document.getElementById('liabilitiesList');
    libsContainer.innerHTML = '';
    Object.entries(liabilities).forEach(([category, items]) => {
        items.forEach(liability => {
            const card = createItemCard(liability, category, liability.balance, false);
            libsContainer.appendChild(card);
        });
    });

    // Charts
    renderCharts(summary);

    // Insights
    document.getElementById('intelligenceText').innerHTML = `Your current loan-to-value ratio is <span class="text-[#2D2D2A] font-bold">${(summary.ltv * 100).toFixed(0)}%</span>. Algorithmic projections identify a potential appreciation cycle across your active assets.`;
    document.getElementById('objectiveText').innerHTML = `On current trajectory, you will reach your next significant wealth milestone of <span class="text-[#2D2D2A] font-bold">${fmt(summary.netWorth + 50000)}</span> by the next 24 months.`;

    lucide.createIcons();
}

function createItemCard(item, category, value, isAsset) {
    const div = document.createElement('div');
    div.className = `rounded-3xl p-5 flex items-center justify-between cursor-pointer transition-colors ${isAsset ? 'bg-[#E9E9DF] hover:bg-[#E2E2D5]' : 'bg-white border border-[#E0E0D0] hover:bg-[#F5F5F0]'}`;
    
    div.onclick = () => showModal(item, category, value, isAsset);

    div.innerHTML = `
        <div>
            <p class="text-[10px] uppercase tracking-widest text-[#7A7A6A] font-bold">${category.replace('_', ' ')}</p>
            <h4 class="text-lg font-serif text-[#4A4A3A]">${item.name}</h4>
        </div>
        <div class="text-right">
            <p class="text-sm font-bold ${isAsset ? 'text-[#5A5A40]' : 'text-[#A67C52]'}">${isAsset ? '' : '-'}${fmt(value, item.currency)}</p>
            <p class="text-[9px] text-[#9A9A8A] font-semibold">${isAsset ? 'EST. 5% YIELD' : `${item.annual_interest_rate}% APR`}</p>
        </div>
    `;
    return div;
}

function renderCharts(summary) {
    // Wealth Trajectory
    const ctx = document.getElementById('wealthChart').getContext('2d');
    if (wealthChart) wealthChart.destroy();

    const labels = summary.predictions.map(p => {
        const d = new Date(p.date);
        return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    });

    const isAllPredicted = summary.predictions.every(p => p.isPredicted);
    const splitIndex = summary.predictions.findIndex(p => p.isPredicted);

    wealthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net Worth',
                data: summary.predictions.map(p => p.netWorth),
                borderColor: '#5A5A40',
                backgroundColor: 'rgba(90, 90, 64, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 3,
                segment: {
                    borderDash: ctx => ctx.p0DataIndex >= (splitIndex - 1) && splitIndex !== -1 ? [6, 6] : undefined,
                    borderColor: ctx => ctx.p0DataIndex >= (splitIndex - 1) && splitIndex !== -1 ? '#A67C52' : '#5A5A40'
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0f172a',
                    padding: 12,
                    cornerRadius: 16,
                    titleFont: { size: 10, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        title: (items) => {
                            const index = items[0].dataIndex;
                            const isPredicted = summary.predictions[index].isPredicted;
                            return isPredicted ? 'Projected Milestone' : 'Historical Data';
                        },
                        label: (ctx) => `Net Worth: ${fmt(ctx.parsed.y)}`
                    }
                }
            },
            hover: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9A9A8A' } },
                y: { grid: { color: '#F0F0E0' }, ticks: { font: { size: 10 }, color: '#9A9A8A', callback: v => abbreviate(v) } }
            }
        }
    });

    // Pie Chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if (pieChart) pieChart.destroy();
    
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: summary.distribution.map(d => d.name),
            datasets: [{
                data: summary.distribution.map(d => d.value),
                backgroundColor: ['#5A5A40', '#A67C52', '#D1C9B8'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { display: false } }
        }
    });

    const dominant = [...summary.distribution].sort((a,b) => b.value - a.value)[0];
    document.getElementById('mixLabel').textContent = dominant ? `${dominant.name} Dominant` : '';
}

// Setup "Update Ledger" button
document.querySelector('[data-lucide="plus"]')?.parentElement?.addEventListener('click', () => showAddModal('asset'));

async function showAddModal(type, existingItem = null, existingCategory = null) {
    const modal = document.getElementById('modal');
    const container = document.getElementById('modalContainer');
    const templateId = type === 'asset' ? 'assetFormTemplate' : 'liabilityFormTemplate';
    const content = document.getElementById(templateId).content.cloneNode(true);
    
    container.innerHTML = '';
    container.appendChild(content);
    
    const form = container.querySelector('form');
    const title = container.querySelector('h2');
    const btn = form.querySelector('button[type="submit"]');

    if (existingItem) {
        title.textContent = `Edit ${type === 'asset' ? 'Asset' : 'Liability'}`;
        btn.textContent = 'Save Changes';
        
        // Pre-fill form
        form.category.value = existingCategory;
        form.category.disabled = true; // Don't allow changing category for existing items
        form.name.value = existingItem.name;
        form.balance.value = existingItem.balance;
        if (type === 'asset') {
            form.type.value = existingItem.type;
            form.currency.value = existingItem.currency;
        } else {
            form.annual_interest_rate.value = existingItem.annual_interest_rate;
            form.minimum_monthly_payment.value = existingItem.minimum_monthly_payment || 0;
        }
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const jsonData = Object.fromEntries(formData.entries());
        const category = existingCategory || jsonData.category;
        
        if (existingItem) jsonData.id = existingItem.id;

        // Convert number types
        if (jsonData.balance) jsonData.balance = parseFloat(jsonData.balance);
        if (jsonData.annual_interest_rate) jsonData.annual_interest_rate = parseFloat(jsonData.annual_interest_rate);
        if (jsonData.minimum_monthly_payment) jsonData.minimum_monthly_payment = parseFloat(jsonData.minimum_monthly_payment);

        const endpoint = type === 'asset' ? `/api/assets/${category}` : `/api/liabilities/${category}`;
        await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
        });
        
        closeModal();
        fetchData();
    };

    modal.classList.remove('hidden');
}

function showModal(item, category, value, isAsset) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContainer');
    
    const rate = isAsset ? (category === 'properties' ? 4 : 7) : item.annual_interest_rate;
    const monthlyRate = (rate / 100) / 12;
    
    // Generate 12 months history + 24 months projection
    const points = [];
    for (let i = -12; i <= 24; i++) {
        let val;
        if (i >= 0) {
            let pVal = value;
            for(let j=0; j<i; j++) {
                if (isAsset) pVal *= (1 + monthlyRate);
                else pVal = Math.max(0, pVal + (pVal * monthlyRate) - (item.minimum_monthly_payment || 0));
            }
            val = pVal;
        } else {
            let pVal = value;
            for(let j=0; j<Math.abs(i); j++) {
                if (isAsset) pVal /= (1 + monthlyRate);
                else pVal = (pVal + (item.minimum_monthly_payment || 0)) / (1 + monthlyRate);
            }
            val = pVal;
        }
        points.push({ value: val, isPredicted: i > 0, label: i === 0 ? 'Now' : (i < 0 ? `${Math.abs(i)}m ago` : `${i}m`) });
    }

    modalContent.innerHTML = `
        <div class="flex-grow p-6 md:p-10 space-y-8 overflow-y-auto w-full">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-[#9A9A8A] text-[10px] font-bold uppercase tracking-widest mb-1">${category.replace('_', ' ')}</div>
                <h2 class="text-3xl font-serif font-bold text-[#4A4A3A]">${item.name}</h2>
              </div>
              <div class="flex gap-2">
                <button onclick="showAddModal('${isAsset ? 'asset' : 'liability'}', ${JSON.stringify(item).replace(/"/g, '&quot;')}, '${category}')" class="p-2 hover:bg-[#F5F5F0] rounded-full text-[#9A9A8A] hover:text-[#5A5A40]">
                    <i data-lucide="edit-3" class="w-5 h-5"></i>
                </button>
                <button onclick="closeModal()" class="p-2 hover:bg-[#F5F5F0] rounded-full text-[#9A9A8A] hover:text-[#5A5A40]">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-[#F5F5F0] p-6 rounded-[32px] border border-[#E0E0D0]">
                <div class="text-[#9A9A8A] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mb-1">Current Balance</div>
                <div class="text-3xl font-serif font-bold ${isAsset ? 'text-[#5A5A40]' : 'text-rose-600'}">${fmt(value, item.currency)}</div>
              </div>
              <div class="bg-[#F5F5F0] p-6 rounded-[32px] border border-[#E0E0D0]">
                <div class="text-[#9A9A8A] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mb-1">24-Month Projected</div>
                <div class="text-3xl font-serif font-bold text-[#A67C52]">${fmt(points[points.length-1].value, item.currency)}</div>
              </div>
            </div>

            <div class="h-64 mt-8">
                <canvas id="itemChart"></canvas>
            </div>
        </div>
        <div class="w-full md:w-80 bg-[#E9E9DF] border-t md:border-t-0 md:border-l border-[#E0E0D0] p-10 space-y-8 flex flex-col">
            <div>
              <h4 class="text-[10px] font-bold text-[#7A7A6A] uppercase tracking-widest mb-6">Ledger Parameters</h4>
              <div class="space-y-4 text-xs">
                <div class="flex justify-between border-b border-[#E0E0D0] pb-2"><span>Growth/Interest</span><span class="font-bold">${rate}%</span></div>
                ${!isAsset ? `<div class="flex justify-between border-b border-[#E0E0D0] pb-2"><span>Installment</span><span class="font-bold">${fmt(item.minimum_monthly_payment || 0)}</span></div>` : ''}
              </div>
            </div>
            <div class="space-y-4">
                <p class="text-[10px] text-[#7A7A6A] italic leading-relaxed">Simulation uses standard linear growth modeling and fixed monthly payments.</p>
                <button onclick="deleteItem('${isAsset ? 'assets' : 'liabilities'}', '${category}', '${item.id}')" class="w-full border border-rose-200 text-rose-500 hover:bg-rose-50 p-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="trash-2" class="w-3 h-3"></i> Delete Entity
                </button>
            </div>
            <button onclick="closeModal()" class="w-full bg-[#5A5A40] text-white p-4 rounded-3xl text-[10px] font-bold uppercase tracking-widest shadow-md mt-auto">Close View</button>
        </div>
    `;

    modal.classList.remove('hidden');
    lucide.createIcons();
    renderItemChart(points, isAsset, item.currency);
}

function renderItemChart(points, isAsset, currency) {
    const ctx = document.getElementById('itemChart').getContext('2d');
    const splitIndex = points.findIndex(p => p.isPredicted);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: points.map(p => p.label),
            datasets: [{
                data: points.map(p => p.value),
                borderColor: isAsset ? '#5A5A40' : '#A67C52',
                backgroundColor: isAsset ? 'rgba(90, 90, 64, 0.05)' : 'rgba(166, 124, 82, 0.05)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                segment: {
                    borderDash: ctx => ctx.p0DataIndex >= (splitIndex - 1) && splitIndex !== -1 ? [5, 5] : undefined
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 10,
                    cornerRadius: 12,
                    callbacks: {
                        title: (items) => {
                            const p = points[items[0].dataIndex];
                            return p.isPredicted ? `Projected: ${p.label}` : `Historical: ${p.label}`;
                        },
                        label: (ctx) => `Value: ${fmt(ctx.parsed.y, currency)}`
                    }
                }
            },
            scales: {
                x: { ticks: { font: { size: 9 }, color: '#9A9A8A' }, grid: { display: false } },
                y: { ticks: { font: { size: 9 }, color: '#9A9A8A', callback: v => abbreviate(v) }, grid: { color: '#F0F0E0' } }
            }
        }
    });
}

async function deleteItem(collection, category, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    await fetch(`/api/${collection}/${category}/${id}`, { method: 'DELETE' });
    closeModal();
    fetchData();
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

fetchData();
