const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== DATA GENERATORS ====================
// Simulate real lens inventory data with trends

const manufacturers = ['Essilor', 'Zeiss', 'Hoya', 'Nikon', 'Shamir', 'Transitions', 'Crizal'];
const lensTypes = ['Single Vision', 'Progressive', 'Bifocal', 'Trifocal'];
const coatings = ['Standard', 'UV Protection', 'Blue Light', 'Anti-Reflective', 'Photochromic'];

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function generateInventoryData() {
  const data = [];
  for (let i = 0; i < 20; i++) {
    const baseStock = Math.floor(Math.random() * 50000) + 5000;
    const trend = (Math.random() - 0.4) * 0.15; // Weighted towards negative for reorder signals
    const currentStock = Math.floor(baseStock * (1 + trend));
    
    data.push({
      id: `SKU-${String(i + 1).padStart(5, '0')}`,
      manufacturer: manufacturers[Math.floor(Math.random() * manufacturers.length)],
      type: lensTypes[Math.floor(Math.random() * lensTypes.length)],
      coating: coatings[Math.floor(Math.random() * coatings.length)],
      currentStock: currentStock,
      reorderPoint: Math.floor(baseStock * 0.25),
      avgDailyDemand: Math.floor(baseStock / 30),
      trend: Math.round(trend * 100),
      daysToStockout: Math.ceil(currentStock / (Math.floor(baseStock / 30) || 1)),
      lastRestockDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      costPerUnit: Math.round((Math.random() * 200 + 50) * 100) / 100,
      demandHistory: Array.from({ length: 30 }, () => Math.floor(Math.random() * 500) + 100)
    });
  }
  return data;
}

function generateAnalytics(inventory) {
  const totalInventory = inventory.reduce((sum, item) => sum + item.currentStock, 0);
  const needsReorder = inventory.filter(item => item.currentStock <= item.reorderPoint).length;
  const criticalStock = inventory.filter(item => item.currentStock <= item.reorderPoint * 0.5).length;
  
  const avgTrendByManufacturer = {};
  manufacturers.forEach(mfg => {
    const items = inventory.filter(item => item.manufacturer === mfg);
    avgTrendByManufacturer[mfg] = items.length > 0 
      ? Math.round(items.reduce((sum, item) => sum + item.trend, 0) / items.length)
      : 0;
  });
  
  const heatmapData = [];
  lensTypes.forEach((type, typeIdx) => {
    coatings.forEach((coating, coatingIdx) => {
      const items = inventory.filter(i => i.type === type && i.coating === coating);
      heatmapData.push({
        type,
        coating,
        value: items.length > 0 
          ? Math.round(items.reduce((sum, item) => sum + item.trend, 0) / items.length)
          : 0,
        count: items.length
      });
    });
  });
  
  return {
    totalInventory,
    needsReorder,
    criticalStock,
    avgTrendByManufacturer,
    heatmapData,
    topMovers: inventory
      .sort((a, b) => b.avgDailyDemand - a.avgDailyDemand)
      .slice(0, 5),
    criticalItems: inventory
      .filter(item => item.currentStock <= item.reorderPoint)
      .sort((a, b) => a.daysToStockout - b.daysToStockout)
      .slice(0, 10)
  };
}

// ==================== API ENDPOINTS ====================

app.get('/api/dashboard', (req, res) => {
  const inventory = generateInventoryData();
  const analytics = generateAnalytics(inventory);
  
  res.json({
    timestamp: new Date().toISOString(),
    summary: {
      totalInventory: formatNumber(analytics.totalInventory),
      needsReorder: analytics.needsReorder,
      criticalStock: analytics.criticalStock,
      avgDemandDaily: formatNumber(Math.floor(inventory.reduce((sum, item) => sum + item.avgDailyDemand, 0) / inventory.length))
    },
    analytics,
    inventory: inventory.slice(0, 15) // Latest 15 SKUs
  });
});

app.get('/api/inventory', (req, res) => {
  const inventory = generateInventoryData();
  res.json({
    data: inventory,
    total: formatNumber(inventory.length),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/reorder-status', (req, res) => {
  const inventory = generateInventoryData();
  const analytics = generateAnalytics(inventory);
  
  const reorderItems = analytics.criticalItems.map(item => ({
    ...item,
    urgency: item.daysToStockout <= 7 ? 'CRITICAL' : item.daysToStockout <= 14 ? 'HIGH' : 'MEDIUM',
    recommendedQty: Math.floor(item.reorderPoint * 2),
    estimatedCost: Math.round(item.reorderPoint * 2 * item.costPerUnit * 100) / 100
  }));
  
  res.json({
    reorderItems,
    totalItems: reorderItems.length,
    estimatedTotalCost: formatNumber(Math.round(reorderItems.reduce((sum, item) => sum + item.estimatedCost, 0))),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/trends', (req, res) => {
  const inventory = generateInventoryData();
  
  const trendData = {
    byManufacturer: {},
    byLensType: {},
    byCoating: {}
  };
  
  manufacturers.forEach(mfg => {
    const items = inventory.filter(item => item.manufacturer === mfg);
    trendData.byManufacturer[mfg] = items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.trend, 0) / items.length)
      : 0;
  });
  
  lensTypes.forEach(type => {
    const items = inventory.filter(item => item.type === type);
    trendData.byLensType[type] = items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.trend, 0) / items.length)
      : 0;
  });
  
  coatings.forEach(coating => {
    const items = inventory.filter(item => item.coating === coating);
    trendData.byCoating[coating] = items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.trend, 0) / items.length)
      : 0;
  });
  
  res.json({
    trendData,
    timestamp: new Date().toISOString()
  });
});

// Serve index.html for all other routes (SPA)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Lens Tracker Dashboard running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});
