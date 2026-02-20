const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load data from Excel file
let allData = [];
let cachedOptions = null;

function loadInventoryData() {
  try {
    let filePath = path.join(process.env.HOME || '/home/node', '.openclaw/workspace/inventory/Global_SKUs_with_Inventory.xlsx');
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'data', 'Global_SKUs_with_Inventory.xlsx');
    }
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'Global_SKUs_with_Inventory.xlsx');
    }

    if (!fs.existsSync(filePath)) {
      console.error('Excel file not found at:', filePath);
      return false;
    }

    console.log('Loading inventory from:', filePath);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    allData = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Loaded ${allData.length} SKU records`);
    
    // Cache options on load
    console.log('Pre-computing filter options...');
    cachedOptions = getUniqueValuesForAllFilters();
    console.log('Options cached successfully');
    
    return true;
  } catch (error) {
    console.error('Error loading inventory data:', error.message);
    return false;
  }
}

// Get unique values for dropdowns (optimized)
function getUniqueValuesForAllFilters() {
  const uniqueSets = {
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
    if (item.Base !== undefined) uniqueSets.bases.add(String(item.Base).trim());
    if (item.Add !== undefined) uniqueSets.adds.add(String(item.Add).trim());
    if (item['Seg Type']) uniqueSets.segTypes.add(String(item['Seg Type']).trim());
    if (item['Seg Lens']) uniqueSets.segLenses.add(String(item['Seg Lens']).trim());
    if (item.Coating) uniqueSets.coatings.add(String(item.Coating).trim());
    if (item.Color) uniqueSets.colors.add(String(item.Color).trim());
    if (item.Diameter !== undefined) uniqueSets.diameters.add(String(item.Diameter).trim());
    if (item.MFG) uniqueSets.manufacturers.add(String(item.MFG).trim());
    if (item.Brand) uniqueSets.brands.add(String(item.Brand).trim());
    if (item['Country Origin']) uniqueSets.countries.add(String(item['Country Origin']).trim());
  });

  // Convert sets to sorted arrays
  return {
    bases: Array.from(uniqueSets.bases).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return isNaN(numA) ? a.localeCompare(b) : numA - numB;
    }),
    adds: Array.from(uniqueSets.adds).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return isNaN(numA) ? a.localeCompare(b) : numA - numB;
    }),
    segTypes: Array.from(uniqueSets.segTypes).sort(),
    segLenses: Array.from(uniqueSets.segLenses).sort(),
    coatings: Array.from(uniqueSets.coatings).sort(),
    colors: Array.from(uniqueSets.colors).sort(),
    diameters: Array.from(uniqueSets.diameters).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return isNaN(numA) ? a.localeCompare(b) : numA - numB;
    }),
    manufacturers: Array.from(uniqueSets.manufacturers).sort(),
    brands: Array.from(uniqueSets.brands).sort(),
    countries: Array.from(uniqueSets.countries).sort()
  };
}

// Filter API endpoint
app.get('/api/filter', (req, res) => {
  try {
    const filters = req.query;
    const inventoryKey = 'Current Inventory (02/19/26)';

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

    // Group by ItemNumber and sum inventory
    const groupedResults = {};
    results.forEach(item => {
      const sku = item.ItemNumber;
      if (!groupedResults[sku]) {
        groupedResults[sku] = {
          sku: sku,
          description: item.ItemDesc,
          totalInventory: 0
        };
      }
      groupedResults[sku].totalInventory += (item[inventoryKey] || 0);
    });

    const finalResults = Object.values(groupedResults)
      .sort((a, b) => b.totalInventory - a.totalInventory);

    res.json({
      count: finalResults.length,
      totalInventory: finalResults.reduce((sum, item) => sum + item.totalInventory, 0),
      results: finalResults.slice(0, 500)
    });
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get filter options (use cached version)
app.get('/api/options', (req, res) => {
  try {
    if (!cachedOptions) {
      return res.status(503).json({ error: 'Options not yet cached' });
    }
    res.json(cachedOptions);
  } catch (error) {
    console.error('Options error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dataLoaded: allData.length > 0,
    totalSKUs: allData.length
  });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  const dataLoaded = loadInventoryData();
  if (!dataLoaded) {
    console.warn('⚠️  Warning: Inventory data not loaded. Please ensure the Excel file is accessible.');
  }
});
