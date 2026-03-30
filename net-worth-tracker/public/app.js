// --- State Management ---
let state = {
    assets: [],
    liabilities: [],
    summary: null
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

        renderUI();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function addAsset(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const asset = Object.fromEntries(formData.entries());
    
    try {
        await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset)
        });
        event.target.reset();
        hideModal('assetModal');
        fetchData();
    } catch (error) {
        console.error('Error adding asset:', error);
    }
}

async function addLiability(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const liability = Object.fromEntries(formData.entries());
    
    try {
        await fetch('/api/liabilities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(liability)
        });
        event.target.reset();
        hideModal('liabilityModal');
        fetchData();
    } catch (error) {
        console.error('Error adding liability:', error);
    }
}

async function deleteItem(type, id) {
    try {
        await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
        fetchData();
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
    }
}

// --- UI Rendering ---
function renderUI() {
    if (!state.summary) return;

    // Update Stats
    document.getElementById('netWorthDisplay').textContent = formatCurrency(state.summary.netWorth);
    document.getElementById('totalAssetsDisplay').textContent = formatCurrency(state.summary.totalAssets);
    document.getElementById('totalLiabilitiesDisplay').textContent = formatCurrency(state.summary.totalLiabilities);
    document.getElementById('liquidityRatioDisplay').textContent = state.summary.ratios.liquidityRatio;

    // Render Tables
    renderAssetsTable();
    renderLiabilitiesTable();
    renderProjections();

    // Render Charts
    renderAllocationChart();
    renderTrendlineChart();
}

function renderAssetsTable() {
    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = state.assets.map(asset => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-medium text-slate-900">${asset.name} ${asset.subtype === 'LISA' ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded ml-1">+25% Bonus</span>' : ''}</td>
            <td class="px-6 py-4 text-slate-500">${asset.type}</td>
            <td class="px-6 py-4 text-right font-semibold mono text-emerald-600">${formatCurrency(Number(asset.value) + (Number(asset.lisaBonusPending) || 0))}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteItem('assets', '${asset.id}')" class="text-slate-300 hover:text-rose-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderLiabilitiesTable() {
    const tbody = document.getElementById('liabilitiesTableBody');
    tbody.innerHTML = state.liabilities.map(l => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-medium text-slate-900">${l.name}</td>
            <td class="px-6 py-4 text-slate-500">${l.interestRate}% APR</td>
            <td class="px-6 py-4 text-right font-semibold mono text-rose-600">${formatCurrency(l.balance)}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteItem('liabilities', '${l.id}')" class="text-slate-300 hover:text-rose-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderProjections() {
    const grid = document.getElementById('projectionsGrid');
    grid.innerHTML = state.summary.projections.map(p => `
        <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p class="text-xs text-slate-500 uppercase font-bold mb-2">${p.years} Year Projection</p>
            <h4 class="text-2xl font-bold mono text-slate-900">${formatCurrency(p.projectedNetWorth)}</h4>
            <p class="text-xs text-slate-400 mt-1">Based on 7% annual growth</p>
        </div>
    `).join('');
}

// --- D3 Charts ---
function renderAllocationChart() {
    const data = Object.entries(state.summary.allocation).map(([key, value]) => ({ key, value }));
    const container = document.getElementById('allocationChart');
    container.innerHTML = '';
    
    const width = 200, height = 200, margin = 10;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select("#allocationChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.key))
        .range(["#0f172a", "#10b981", "#f43f5e"]);

    const pie = d3.pie().value(d => d.value);
    const data_ready = pie(data);

    svg.selectAll('pieces')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', d3.arc().innerRadius(60).outerRadius(radius))
        .attr('fill', d => color(d.data.key))
        .attr("stroke", "white")
        .style("stroke-width", "2px");

    // Legend
    const legend = document.getElementById('allocationLegend');
    legend.innerHTML = data.map(d => `
        <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background: ${color(d.key)}"></div>
                <span class="text-slate-600">${d.key}</span>
            </div>
            <span class="font-semibold mono">${formatCurrency(d.value)}</span>
        </div>
    `).join('');
}

function renderTrendlineChart() {
    const data = state.summary.history;
    const container = document.getElementById('trendlineChart');
    const width = container.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };

    container.innerHTML = '';

    const svg = d3.select("#trendlineChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)))
        .range([0, width - margin.left - margin.right]);

    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.netWorth) * 1.1, d3.max(data, d => d.netWorth) * 1.1])
        .range([height - margin.top - margin.bottom, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %y")))
        .attr("class", "text-slate-400");

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => `£${d/1000}k`))
        .attr("class", "text-slate-400");

    const line = d3.line()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.netWorth))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 3)
        .attr("d", line);

    // Area
    const area = d3.area()
        .x(d => x(new Date(d.date)))
        .y0(height - margin.top - margin.bottom)
        .y1(d => y(d.netWorth))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(data)
        .attr("fill", "rgba(15, 23, 42, 0.05)")
        .attr("d", area);
}

// --- Helpers ---
function formatCurrency(value) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// --- Initialization ---
document.getElementById('assetForm').addEventListener('submit', addAsset);
document.getElementById('liabilityForm').addEventListener('submit', addLiability);

window.addEventListener('resize', renderTrendlineChart);

fetchData();
setInterval(fetchData, 30000); // Refresh every 30s
