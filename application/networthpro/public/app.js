// --- State Management ---
let state = {
    assets: [],
    liabilities: [],
    summary: {}
};

// --- API Calls ---
async function fetchData() {
    try {
        const [assetsRes, liabilitiesRes, summaryRes] = await Promise.all([
            fetch('/api/assets'),
            fetch('/api/liabilities'),
            fetch('/api/summary')
        ]);

        state.assets = await assetsRes.json();
        state.liabilities = await liabilitiesRes.json();
        state.summary = await summaryRes.json();

        renderAll();
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to connect to server. Please ensure the server is running.');
    }
}

async function addItem(type, data) {
    const endpoint = type === 'asset' ? '/api/assets' : '/api/liabilities';
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            await fetchData();
            closeModal();
        }
    } catch (error) {
        console.error('Error adding item:', error);
    }
}

// --- Rendering Logic ---
function renderAll() {
    renderDashboard();
    renderAssets();
    renderLiabilities();
    renderProjections();
}

function renderDashboard() {
    const s = state.summary;
    document.getElementById('stat-net-worth').textContent = formatCurrency(s.netWorth);
    document.getElementById('stat-assets').textContent = formatCurrency(s.totalAssets);
    document.getElementById('stat-liabilities').textContent = formatCurrency(s.totalLiabilities);

    document.getElementById('stat-liquidity-ratio').textContent = s.liquidityRatio.toFixed(2);
    document.getElementById('bar-liquidity').style.width = Math.min(100, (s.liquidityRatio / 6) * 100) + '%';

    document.getElementById('stat-debt-equity').textContent = s.debtToEquity.toFixed(2);
    document.getElementById('bar-debt-equity').style.width = Math.min(100, s.debtToEquity * 100) + '%';

    renderAllocationChart(s.allocation);
}

function renderAssets() {
    const list = document.getElementById('assets-list');
    list.innerHTML = state.assets.map(a => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-medium">${a.name}</td>
            <td class="px-6 py-4 text-slate-500">${a.type}</td>
            <td class="px-6 py-4 text-right font-semibold">${formatCurrency(a.value)}</td>
            <td class="px-6 py-4 text-right text-emerald-600 font-medium">${a.bonus ? '+' + formatCurrency(a.bonus) : '-'}</td>
        </tr>
    `).join('');
}

function renderLiabilities() {
    const list = document.getElementById('liabilities-list');
    list.innerHTML = state.liabilities.map(l => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-medium">${l.name}</td>
            <td class="px-6 py-4 text-slate-500">${l.type}</td>
            <td class="px-6 py-4 text-right text-rose-500">${l.interestRate}%</td>
            <td class="px-6 py-4 text-right font-semibold text-rose-600">${formatCurrency(l.balance)}</td>
        </tr>
    `).join('');
}

function renderAllocationChart(data) {
    const container = document.getElementById('allocation-chart');
    const legend = document.getElementById('allocation-legend');
    container.innerHTML = '';
    legend.innerHTML = '';

    const width = 200, height = 200, margin = 10;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select("#allocation-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal()
        .domain(Object.keys(data))
        .range(['#0f172a', '#334155', '#64748b']);

    const pie = d3.pie().value(d => d[1]);
    const data_ready = pie(Object.entries(data));

    svg.selectAll('pieces')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', d3.arc().innerRadius(60).outerRadius(radius))
        .attr('fill', d => color(d.data[0]))
        .attr("stroke", "white")
        .style("stroke-width", "2px");

    Object.entries(data).forEach(([key, value]) => {
        legend.innerHTML += `
            <div>
                <div class="text-xs font-semibold text-slate-500 uppercase">${key}</div>
                <div class="text-sm font-bold">${formatCurrency(value)}</div>
            </div>
        `;
    });
}

function renderProjections() {
    const growthRate = parseFloat(document.getElementById('growth-rate').value);
    const years = 10;
    const data = [];
    let currentNW = state.summary.netWorth;
    let currentAssets = state.summary.totalAssets;
    let currentDebt = state.summary.totalLiabilities;

    // Simplified projection logic
    for (let i = 0; i <= years; i++) {
        data.push({ year: i, value: currentNW });
        currentAssets *= (1 + growthRate);
        // Assume debt reduces by 5% of assets each year for simplicity in this demo
        currentDebt = Math.max(0, currentDebt - (currentAssets * 0.02));
        currentNW = currentAssets - currentDebt;
    }

    document.getElementById('projected-net-worth').textContent = formatCurrency(data[years].value);

    // Debt free date estimation
    const totalMinPayment = state.liabilities.reduce((sum, l) => sum + l.minPayment, 0);
    if (totalMinPayment > 0) {
        const months = state.summary.totalLiabilities / totalMinPayment;
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        document.getElementById('debt-free-date').textContent = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    } else {
        document.getElementById('debt-free-date').textContent = 'N/A (No payments)';
    }

    renderProjectionChart(data);
}

function renderProjectionChart(data) {
    const container = document.getElementById('projection-chart');
    container.innerHTML = '';

    const margin = { top: 20, right: 30, bottom: 30, left: 60 },
        width = container.offsetWidth - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    const svg = d3.select("#projection-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 10]).range([0, width]);
    const y = d3.scaleLinear().domain([d3.min(data, d => d.value), d3.max(data, d => d.value)]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y).tickFormat(d => '£' + d3.format(".2s")(d)));

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(d => x(d.year))
            .y(d => y(d.value))
        );
}

// --- UI Helpers ---
function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('section-' + id).classList.remove('hidden');

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active-tab'));
    document.getElementById('tab-' + id).classList.add('active-tab');
}

function openModal(type) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const category = document.getElementById('input-category');
    const extraField = document.getElementById('field-extra');
    const extraLabel = document.getElementById('label-extra');

    document.getElementById('modal-type').value = type;
    modal.classList.remove('hidden');

    if (type === 'asset') {
        title.textContent = 'Add New Asset';
        category.innerHTML = `
            <option value="Savings">Savings Account</option>
            <option value="Current">Current Account</option>
            <option value="ISA">ISA</option>
            <option value="LISA">LISA (Lifetime ISA)</option>
            <option value="Stock">Stock Portfolio</option>
            <option value="Property">Property</option>
        `;
        extraField.classList.add('hidden');
    } else {
        title.textContent = 'Add New Liability';
        category.innerHTML = `
            <option value="Student Loan">Student Loan</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Personal Loan">Personal Loan</option>
            <option value="Mortgage">Mortgage</option>
        `;
        extraField.classList.remove('hidden');
        extraLabel.textContent = 'Interest Rate (%)';
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal-form').reset();
}

function handleFormSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('modal-type').value;
    const data = {
        name: document.getElementById('input-name').value,
        type: document.getElementById('input-category').value,
    };

    if (type === 'asset') {
        data.value = parseFloat(document.getElementById('input-value').value);
        if (data.type === 'LISA') data.bonus = data.value * 0.25;
    } else {
        data.balance = parseFloat(document.getElementById('input-value').value);
        data.interestRate = parseFloat(document.getElementById('input-extra').value);
        data.minPayment = data.balance * 0.02; // Default 2% min payment
    }

    addItem(type, data);
}

function formatCurrency(val) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
}

function updateProjections() {
    renderProjections();
}

// Initialize
fetchData();
window.addEventListener('resize', renderProjections);
