const express = require('express');
const cors = require('cors');
const path = require('path');

// Load pre-processed data
let allData = [];
try {
  allData = require('./data.js');
  console.log(`✅ Loaded ${allData.length} records from data.js`);
} catch (err) {
  console.warn('⚠️  data.js not found, running in demo mode');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Pre-compute filter options
let cachedOptions = null;
function computeFilterOptions() {
  if (!allData.length) return null;
  
  const sets = {
    bases: new Set(),
    adds: new Set(),
    segTypes: new Set(),
    segLenses: new Set(),
    coatings: new Set(),
    colors: new Set(),
    diameters: new Set(),
    manufacturers: new Set(),
    brands: new Set(),
    countries: new Set()
  };

  allData.forEach(item => {
    if (item.Base !== undefined) sets.bases.add(String(item.Base).trim());
    if (item.Add !== undefined) sets.adds.add(String(item.Add).trim());
    if (item['Seg Type']) sets.segTypes.add(String(item['Seg Type']).trim());
    if (item['Seg Lens']) sets.segLenses.add(String(item['Seg Lens']).trim());
    if (item.Coating) sets.coatings.add(String(item.Coating).trim());
    if (item.Color) sets.colors.add(String(item.Color).trim());
    if (item.Diameter !== undefined) sets.diameters.add(String(item.Diameter).trim());
    if (item.MFG) sets.manufacturers.add(String(item.MFG).trim());
    if (item.Brand) sets.brands.add(String(item.Brand).trim());
    if (item['Country Origin']) sets.countries.add(String(item['Country Origin']).trim());
  });

  const sortNumeric = (a, b) => {
    const numA = parseFloat(a), numB = parseFloat(b);
    return isNaN(numA) ? a.localeCompare(b) : numA - numB;
  };

  return {
    bases: Array.from(sets.bases).sort(sortNumeric),
    adds: Array.from(sets.adds).sort(sortNumeric),
    segTypes: Array.from(sets.segTypes).sort(),
    segLenses: Array.from(sets.segLenses).sort(),
    coatings: Array.from(sets.coatings).sort(),
    colors: Array.from(sets.colors).sort(),
    diameters: Array.from(sets.diameters).sort(sortNumeric),
    manufacturers: Array.from(sets.manufacturers).sort(),
    brands: Array.from(sets.brands).sort(),
    countries: Array.from(sets.countries).sort()
  };
}

// Compute on startup
if (allData.length > 0) {
  cachedOptions = computeFilterOptions();
  console.log('✅ Filter options cached');
}

/**
 * API: /api/filter - Filter lenses
 */
app.get('/api/filter', (req, res) => {
  try {
    if (!allData.length) {
      return res.json({ count: 0, totalInventory: 0, results: [] });
    }

    const filters = req.query;
    const inventoryKey = 'Current Inventory';

    let results = allData.filter(item => {
      if (filters.base && String(item.Base || '') !== filters.base) return false;
      if (filters.add && String(item.Add || '') !== filters.add) return false;
      if (filters.segType && String(item['Seg Type'] || '').trim() !== filters.segType.trim()) return false;
      if (filters.segLens && String(item['Seg Lens'] || '').trim() !== filters.segLens.trim()) return false;
      if (filters.coating && String(item.Coating || '').trim() !== filters.coating.trim()) return false;
      if (filters.color && String(item.Color || '').trim() !== filters.color.trim()) return false;
      if (filters.diameter && String(item.Diameter || '') !== filters.diameter) return false;
      if (filters.manufacturer && String(item.MFG || '').trim() !== filters.manufacturer.trim()) return false;
      if (filters.brand && String(item.Brand || '').trim() !== filters.brand.trim()) return false;
      if (filters.country && String(item['Country Origin'] || '').trim() !== filters.country.trim()) return false;
      return true;
    });

    const grouped = {};
    results.forEach(item => {
      const sku = item.ItemNumber;
      if (!grouped[sku]) {
        grouped[sku] = { sku, description: item.ItemDesc, totalInventory: 0 };
      }
      grouped[sku].totalInventory += (item[inventoryKey] || 0);
    });

    const final = Object.values(grouped).sort((a, b) => b.totalInventory - a.totalInventory);

    res.json({
      count: final.length,
      totalInventory: final.reduce((sum, item) => sum + item.totalInventory, 0),
      results: final.slice(0, 500)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: /api/options - Get filter dropdowns
 */
app.get('/api/options', (req, res) => {
  if (!cachedOptions) {
    return res.json({
      bases: [], adds: [], segTypes: [], segLenses: [], coatings: [],
      colors: [], diameters: [], manufacturers: [], brands: [], countries: []
    });
  }
  res.json(cachedOptions);
});

/**
 * API: /api/health - Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dataLoaded: allData.length > 0,
    totalSKUs: allData.length,
    port: PORT
  });
});

/**
 * Serve index.html
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`🔗 Lens Tracker - LIVE (v2)`);
  console.log(`=================================`);
  console.log(`✅ Server on port ${PORT}`);
  if (allData.length > 0) {
    console.log(`📊 ${allData.length} SKUs loaded`);
    const apolloInv = allData
      .filter(x => x.MFG === 'Apollo')
      .reduce((s, x) => s + (x['Current Inventory'] || 0), 0);
    console.log(`📊 Apollo inventory: ${apolloInv} units`);
  } else {
    console.log(`⚠️  No data loaded`);
  }
  console.log(`📍 https://web-production-c5c4b.up.railway.app`);
  console.log(`=================================\n`);
});
