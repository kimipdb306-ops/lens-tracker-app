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
 * API: /api/demand - Calculate demand over time period with optional filter breakdown
 */
app.get('/api/demand', (req, res) => {
  try {
    if (!allData.length) {
      return res.json({ 
        period: 'unknown',
        demand: [],
        summary: { totalDemand: 0, skusWithDemand: 0, topMovers: [] }
      });
    }

    // Parse period parameter (24h, 7d, 1mo, 12mo, or custom dates)
    const period = req.query.period || '24h';
    let startDate, endDate;
    const now = new Date();

    // Calculate date range
    if (period === '24h') {
      endDate = new Date(now);
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      endDate = new Date(now);
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '1mo') {
      endDate = new Date(now);
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '12mo') {
      endDate = new Date(now);
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
    } else {
      return res.status(400).json({ error: 'Invalid period or date range' });
    }

    // Parse multi-select filters (comma-separated values)
    const selectedManufacturers = req.query.manufacturers ? req.query.manufacturers.split(',') : [];
    const selectedSegTypes = req.query.segTypes ? req.query.segTypes.split(',') : [];
    const selectedSegLenses = req.query.segLenses ? req.query.segLenses.split(',') : [];
    const selectedCoatings = req.query.coatings ? req.query.coatings.split(',') : [];
    const selectedColors = req.query.colors ? req.query.colors.split(',') : [];
    const selectedBases = req.query.bases ? req.query.bases.split(',') : [];
    const selectedAdds = req.query.adds ? req.query.adds.split(',') : [];
    const selectedDiameters = req.query.diameters ? req.query.diameters.split(',') : [];
    const selectedMaterials = req.query.materials ? req.query.materials.split(',') : [];
    const selectedLensForms = req.query.lensForms ? req.query.lensForms.split(',') : [];
    const selectedBrands = req.query.brands ? req.query.brands.split(',') : [];
    const selectedCountries = req.query.countries ? req.query.countries.split(',') : [];

    // For now, estimate demand based on current inventory vs baseline
    // Real demand would require historical snapshots
    const demandData = [];
    const aggregations = {
      manufacturer: {},
      segType: {},
      segLens: {},
      coating: {},
      color: {},
      base: {},
      add: {},
      diameter: {},
      material: {},
      lensForm: {},
      brand: {},
      country: {}
    };
    let totalDemand = 0;

    allData.forEach(item => {
      const currentInv = item['Current Inventory'] || 0;
      // Estimate baseline (assume 50% less than current = demand)
      const estimatedBaseline = currentInv * 1.5;
      const demand = Math.max(0, estimatedBaseline - currentInv);
      
      if (demand > 0) {
        demandData.push({
          sku: item.ItemNumber,
          description: item.ItemDesc,
          manufacturer: item.MFG,
          segType: item['Seg Type'] || 'N/A',
          segLens: item['Seg Lens'] || 'N/A',
          coating: item.Coating || 'N/A',
          color: item.Color || 'N/A',
          base: String(item.Base || ''),
          add: String(item.Add || ''),
          diameter: String(item.Diameter || ''),
          material: item.Material || 'N/A',
          lensForm: item['Seg Type'] || 'N/A', // Using Seg Type as proxy
          brand: item.Brand || 'N/A',
          country: item['Country Origin'] || 'N/A',
          demand: Math.round(demand),
          currentInventory: currentInv
        });
        
        totalDemand += demand;
        
        // Aggregate by all dimensions
        aggregations.manufacturer[item.MFG] = (aggregations.manufacturer[item.MFG] || 0) + demand;
        const st = String(item['Seg Type'] || 'N/A').trim();
        aggregations.segType[st] = (aggregations.segType[st] || 0) + demand;
        const sl = String(item['Seg Lens'] || 'N/A').trim();
        aggregations.segLens[sl] = (aggregations.segLens[sl] || 0) + demand;
        const coating = String(item.Coating || 'N/A').trim();
        aggregations.coating[coating] = (aggregations.coating[coating] || 0) + demand;
        const color = String(item.Color || 'N/A').trim();
        aggregations.color[color] = (aggregations.color[color] || 0) + demand;
        const base = String(item.Base || '').trim();
        aggregations.base[base] = (aggregations.base[base] || 0) + demand;
        const add = String(item.Add || '').trim();
        aggregations.add[add] = (aggregations.add[add] || 0) + demand;
        const dia = String(item.Diameter || '').trim();
        aggregations.diameter[dia] = (aggregations.diameter[dia] || 0) + demand;
        const mat = String(item.Material || 'N/A').trim();
        aggregations.material[mat] = (aggregations.material[mat] || 0) + demand;
        const br = String(item.Brand || 'N/A').trim();
        aggregations.brand[br] = (aggregations.brand[br] || 0) + demand;
        const cty = String(item['Country Origin'] || 'N/A').trim();
        aggregations.country[cty] = (aggregations.country[cty] || 0) + demand;
      }
    });

    // If filters selected, filter the demand data
    let filteredDemandData = demandData;
    const hasFilters = selectedManufacturers.length > 0 || selectedSegTypes.length > 0 || selectedSegLenses.length > 0 || 
                       selectedCoatings.length > 0 || selectedColors.length > 0 || selectedBases.length > 0 ||
                       selectedAdds.length > 0 || selectedDiameters.length > 0 || selectedMaterials.length > 0 ||
                       selectedLensForms.length > 0 || selectedBrands.length > 0 || selectedCountries.length > 0;
    
    if (hasFilters) {
      filteredDemandData = demandData.filter(item => {
        if (selectedManufacturers.length > 0 && !selectedManufacturers.includes(item.manufacturer)) return false;
        if (selectedSegTypes.length > 0 && !selectedSegTypes.includes(item.segType)) return false;
        if (selectedSegLenses.length > 0 && !selectedSegLenses.includes(item.segLens)) return false;
        if (selectedCoatings.length > 0 && !selectedCoatings.includes(item.coating)) return false;
        if (selectedColors.length > 0 && !selectedColors.includes(item.color)) return false;
        if (selectedBases.length > 0 && !selectedBases.includes(item.base)) return false;
        if (selectedAdds.length > 0 && !selectedAdds.includes(item.add)) return false;
        if (selectedDiameters.length > 0 && !selectedDiameters.includes(item.diameter)) return false;
        if (selectedMaterials.length > 0 && !selectedMaterials.includes(item.material)) return false;
        if (selectedLensForms.length > 0 && !selectedLensForms.includes(item.lensForm)) return false;
        if (selectedBrands.length > 0 && !selectedBrands.includes(item.brand)) return false;
        if (selectedCountries.length > 0 && !selectedCountries.includes(item.country)) return false;
        return true;
      });
    }

    // Sort by demand
    filteredDemandData.sort((a, b) => b.demand - a.demand);

    // Get top movers
    const topMovers = filteredDemandData.slice(0, 10);
    
    // Get top manufacturers by demand
    const topMfgs = Object.entries(manufacturerDemand)
      .map(([mfg, demand]) => ({ manufacturer: mfg, demand: Math.round(demand) }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 10);

    // Build breakdown objects for selected filters
    const breakdowns = {};

    if (selectedManufacturers.length > 0) {
      breakdowns.byManufacturer = selectedManufacturers.map(mfg => ({
        name: mfg,
        demand: Math.round(aggregations.manufacturer[mfg] || 0),
        skus: filteredDemandData.filter(x => x.manufacturer === mfg).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedSegTypes.length > 0) {
      breakdowns.byLensType = selectedSegTypes.map(st => ({
        name: st,
        demand: Math.round(aggregations.segType[st] || 0),
        skus: filteredDemandData.filter(x => x.segType === st).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedSegLenses.length > 0) {
      breakdowns.byLensSubtype = selectedSegLenses.map(sl => ({
        name: sl,
        demand: Math.round(aggregations.segLens[sl] || 0),
        skus: filteredDemandData.filter(x => x.segLens === sl).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedCoatings.length > 0) {
      breakdowns.byCoating = selectedCoatings.map(c => ({
        name: c,
        demand: Math.round(aggregations.coating[c] || 0),
        skus: filteredDemandData.filter(x => x.coating === c).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedColors.length > 0) {
      breakdowns.byColor = selectedColors.map(c => ({
        name: c,
        demand: Math.round(aggregations.color[c] || 0),
        skus: filteredDemandData.filter(x => x.color === c).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedBases.length > 0) {
      breakdowns.byBase = selectedBases.map(b => ({
        name: b,
        demand: Math.round(aggregations.base[b] || 0),
        skus: filteredDemandData.filter(x => x.base === b).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedAdds.length > 0) {
      breakdowns.byAdd = selectedAdds.map(a => ({
        name: a,
        demand: Math.round(aggregations.add[a] || 0),
        skus: filteredDemandData.filter(x => x.add === a).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedDiameters.length > 0) {
      breakdowns.byDiameter = selectedDiameters.map(d => ({
        name: d,
        demand: Math.round(aggregations.diameter[d] || 0),
        skus: filteredDemandData.filter(x => x.diameter === d).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedMaterials.length > 0) {
      breakdowns.byMaterial = selectedMaterials.map(m => ({
        name: m,
        demand: Math.round(aggregations.material[m] || 0),
        skus: filteredDemandData.filter(x => x.material === m).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedLensForms.length > 0) {
      breakdowns.byLensForm = selectedLensForms.map(lf => ({
        name: lf,
        demand: Math.round(aggregations.lensForm[lf] || 0),
        skus: filteredDemandData.filter(x => x.lensForm === lf).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedBrands.length > 0) {
      breakdowns.byBrand = selectedBrands.map(br => ({
        name: br,
        demand: Math.round(aggregations.brand[br] || 0),
        skus: filteredDemandData.filter(x => x.brand === br).length
      })).sort((a, b) => b.demand - a.demand);
    }

    if (selectedCountries.length > 0) {
      breakdowns.byCountry = selectedCountries.map(c => ({
        name: c,
        demand: Math.round(aggregations.country[c] || 0),
        skus: filteredDemandData.filter(x => x.country === c).length
      })).sort((a, b) => b.demand - a.demand);
    }

    // Calculate total demand from filtered data
    const filteredTotalDemand = filteredDemandData.reduce((sum, item) => sum + item.demand, 0);

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      filters: {
        manufacturers: selectedManufacturers,
        segTypes: selectedSegTypes,
        coatings: selectedCoatings,
        bases: selectedBases
      },
      summary: {
        totalDemand: Math.round(filteredTotalDemand),
        skusWithDemand: filteredDemandData.length,
        topMovers,
        topManufacturers: topMfgs
      },
      breakdowns,
      demand: filteredDemandData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
