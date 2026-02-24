// ==================== GLOBAL STATE ====================
let currentChart = null;
let heatmapChart = null;
let trendChart = null;
let dashboardData = null;
let allInventory = [];

// Format numbers with commas
function formatNumber(num) {
    if (typeof num === 'string') {
        return num;
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Get trend color based on value
function getTrendColor(value) {
    if (value >= 10) return 'var(--accent-green)';
    if (value >= 0) return 'var(--accent-green)';
    if (value >= -10) return 'var(--accent-yellow)';
    return 'var(--critical)';
}

// Get status badge class
function getStatusClass(stock, reorderPoint) {
    if (stock <= reorderPoint * 0.5) return 'status-critical';
    if (stock <= reorderPoint) return 'status-warning';
    return 'status-good';
}

// ==================== TIME UPDATE ====================
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('time-display').textContent = timeStr;
}

setInterval(updateTime, 1000);
updateTime();

// ==================== TAB NAVIGATION ====================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        
        // Update active button
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update active tab
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        
        // Load data for specific tabs
        if (tabName === 'reorder') {
            loadReorderTracking();
        } else if (tabName === 'trends') {
            loadTrendAnalysis();
        } else if (tabName === 'inventory') {
            loadFullInventory();
        }
    });
});

// ==================== DASHBOARD TAB ====================
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        dashboardData = await response.json();
        
        // Update KPI Cards
        document.getElementById('kpi-inventory').textContent = dashboardData.summary.totalInventory;
        document.getElementById('kpi-reorder').textContent = dashboardData.summary.needsReorder;
        document.getElementById('kpi-critical').textContent = dashboardData.summary.criticalStock;
        document.getElementById('kpi-demand').textContent = dashboardData.summary.avgDemandDaily;
        
        // Update Top Movers
        updateTopMovers(dashboardData.analytics.topMovers);
        
        // Draw charts
        drawManufacturerChart(dashboardData.analytics.avgTrendByManufacturer);
        drawHeatmap(dashboardData.analytics.heatmapData);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateTopMovers(movers) {
    const tbody = document.getElementById('topMovers');
    tbody.innerHTML = movers.map(item => `
        <tr>
            <td><strong>${item.id}</strong></td>
            <td>${item.type}</td>
            <td>${formatNumber(item.avgDailyDemand)}</td>
            <td>${formatNumber(item.currentStock)}</td>
            <td><span class="status-badge ${getStatusClass(item.currentStock, item.reorderPoint)}">
                ${item.currentStock <= item.reorderPoint ? 'LOW' : 'HEALTHY'}
            </span></td>
        </tr>
    `).join('');
}

// Chart.js Configuration
const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            display: true,
            labels: {
                color: '#e4e8f1',
                font: { family: "'Segoe UI', monospace", size: 12, weight: '600' },
                padding: 15,
                usePointStyle: true
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(42, 63, 95, 0.3)' },
            ticks: { color: '#e4e8f1', font: { size: 11, weight: '600' } },
            title: { display: true, color: '#e4e8f1', font: { size: 12, weight: '600' } }
        },
        x: {
            grid: { color: 'rgba(42, 63, 95, 0.3)' },
            ticks: { color: '#e4e8f1', font: { size: 11, weight: '600' } },
            title: { display: true, color: '#e4e8f1', font: { size: 12, weight: '600' } }
        }
    }
};

function drawManufacturerChart(trendData) {
    const ctx = document.getElementById('manufacturerChart').getContext('2d');
    
    if (currentChart) currentChart.destroy();
    
    const labels = Object.keys(trendData);
    const data = Object.values(trendData);
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Demand Trend %',
                data: data,
                backgroundColor: data.map(v => v >= 0 ? 'rgba(0, 208, 132, 0.7)' : 'rgba(255, 56, 96, 0.7)'),
                borderColor: data.map(v => v >= 0 ? 'var(--accent-green)' : 'var(--critical)'),
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                legend: { display: false }
            }
        }
    });
}

function drawHeatmap(heatmapData) {
    const ctx = document.getElementById('heatmapChart').getContext('2d');
    
    if (heatmapChart) heatmapChart.destroy();
    
    // Prepare data for matrix chart
    const matrixData = heatmapData.map((item, idx) => ({
        x: item.coating,
        y: item.type,
        v: item.value,
        count: item.count
    }));
    
    heatmapChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Demand Trend by Type & Coating',
                data: matrixData.map(d => ({
                    x: matrixData.findIndex(m => m.coating === d.coating),
                    y: matrixData.findIndex(m => m.type === d.type),
                    r: Math.max(5, Math.min(15, Math.abs(d.v) / 5))
                })),
                backgroundColor: matrixData.map(d => 
                    d.v >= 5 ? 'rgba(0, 208, 132, 0.7)' : 
                    d.v >= 0 ? 'rgba(0, 153, 255, 0.7)' :
                    'rgba(255, 165, 0, 0.7)'
                ),
                borderColor: matrixData.map(d => 
                    d.v >= 5 ? 'var(--accent-green)' : 
                    d.v >= 0 ? 'var(--accent-blue)' :
                    'var(--alert)'
                ),
                borderWidth: 2
            }]
        },
        options: chartOptions
    });
}

// ==================== REORDER TRACKING TAB ====================
async function loadReorderTracking() {
    try {
        const response = await fetch('/api/reorder-status');
        const data = await response.json();
        
        document.getElementById('reorder-count').textContent = data.totalItems;
        document.getElementById('totalReorderCost').textContent = data.estimatedTotalCost;
        
        updateReorderTable(data.reorderItems);
    } catch (error) {
        console.error('Error loading reorder data:', error);
    }
}

function updateReorderTable(items) {
    const tbody = document.getElementById('reorderTable');
    
    // Filter by urgency if selected
    const urgencyFilter = document.getElementById('urgency-filter')?.value || 'all';
    let filtered = items;
    
    if (urgencyFilter === 'CRITICAL') {
        filtered = items.filter(item => item.urgency === 'CRITICAL');
    } else if (urgencyFilter === 'HIGH') {
        filtered = items.filter(item => item.urgency === 'CRITICAL' || item.urgency === 'HIGH');
    }
    
    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td><strong>${item.id}</strong></td>
            <td>${item.manufacturer}</td>
            <td>${item.type}</td>
            <td>${formatNumber(item.currentStock)}</td>
            <td>${formatNumber(item.reorderPoint)}</td>
            <td>${item.daysToStockout}</td>
            <td><span class="status-badge status-${item.urgency === 'CRITICAL' ? 'critical' : item.urgency === 'HIGH' ? 'warning' : 'good'}">
                ${item.urgency}
            </span></td>
            <td>${formatNumber(item.recommendedQty)}</td>
            <td>$${formatNumber(Math.round(item.estimatedCost))}</td>
        </tr>
    `).join('');
}

// Urgency filter listener
document.getElementById('urgency-filter')?.addEventListener('change', (e) => {
    if (dashboardData?.analytics?.criticalItems) {
        loadReorderTracking();
    }
});

function exportReorderList() {
    const table = document.getElementById('reorderTable');
    let csv = 'SKU,Manufacturer,Type,Current Stock,Reorder Point,Days to Stockout,Urgency,Recommended Qty,Est. Cost\n';
    
    table.querySelectorAll('tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => cell.textContent.trim()).join(',');
        csv += rowData + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reorder-list-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// ==================== TREND ANALYSIS TAB ====================
async function loadTrendAnalysis() {
    try {
        const response = await fetch('/api/trends');
        const data = await response.json();
        
        // Update trend cards
        updateTrendList('trendManufacturer', data.trendData.byManufacturer);
        updateTrendList('trendLensType', data.trendData.byLensType);
        updateTrendList('trendCoating', data.trendData.byCoating);
        
        // Draw trend index chart
        drawTrendIndexChart(data.trendData);
        
    } catch (error) {
        console.error('Error loading trend analysis:', error);
    }
}

function updateTrendList(elementId, trendData) {
    const container = document.getElementById(elementId);
    
    const html = Object.entries(trendData)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => `
            <div class="trend-item">
                <strong>${label}</strong>
                <span class="trend-value trend-${value >= 0 ? 'positive' : 'negative'}">
                    ${value >= 0 ? '+' : ''}${value}%
                </span>
            </div>
        `).join('');
    
    container.innerHTML = html;
}

function drawTrendIndexChart(trendData) {
    const ctx = document.getElementById('trendIndexChart').getContext('2d');
    
    if (trendChart) trendChart.destroy();
    
    const labels = [
        ...Object.keys(trendData.byManufacturer),
        ...Object.keys(trendData.byLensType),
        ...Object.keys(trendData.byCoating)
    ];
    
    const data = [
        ...Object.values(trendData.byManufacturer),
        ...Object.values(trendData.byLensType),
        ...Object.values(trendData.byCoating)
    ];
    
    const colors = data.map(v => v >= 5 ? '#00d084' : v >= 0 ? '#0099ff' : '#ffa500');
    const borderColors = data.map(v => v >= 5 ? '#00d084' : v >= 0 ? '#0099ff' : '#ff5c58');
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Demand Index',
                data: data,
                borderColor: '#0099ff',
                backgroundColor: 'rgba(0, 153, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: borderColors,
                pointBorderColor: borderColors,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBorderWidth: 2
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                legend: { display: true }
            }
        }
    });
}

// ==================== INVENTORY TAB ====================
async function loadFullInventory() {
    try {
        const response = await fetch('/api/inventory');
        const data = await response.json();
        allInventory = data.data;
        updateInventoryTable(allInventory);
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function updateInventoryTable(items) {
    const tbody = document.getElementById('inventoryTable');
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td><strong>${item.id}</strong></td>
            <td>${item.manufacturer}</td>
            <td>${item.type}</td>
            <td>${item.coating}</td>
            <td>${formatNumber(item.currentStock)}</td>
            <td>${formatNumber(item.avgDailyDemand)}</td>
            <td><span style="color: ${item.trend >= 0 ? 'var(--accent-green)' : 'var(--critical)'}">
                ${item.trend >= 0 ? '+' : ''}${item.trend}%
            </span></td>
            <td>${item.daysToStockout}</td>
        </tr>
    `).join('');
}

// Search functionality
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allInventory.filter(item =>
        item.id.toLowerCase().includes(query) ||
        item.manufacturer.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.coating.toLowerCase().includes(query)
    );
    updateInventoryTable(filtered);
});

// Sort functionality
document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    const sortType = e.target.value;
    let sorted = [...allInventory];
    
    switch(sortType) {
        case 'stock':
            sorted.sort((a, b) => a.currentStock - b.currentStock);
            break;
        case 'demand':
            sorted.sort((a, b) => b.avgDailyDemand - a.avgDailyDemand);
            break;
        default:
            sorted.sort((a, b) => a.id.localeCompare(b.id));
    }
    
    updateInventoryTable(sorted);
});

// ==================== INITIAL LOAD ====================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    // Refresh dashboard every 30 seconds
    setInterval(loadDashboard, 30000);
});
