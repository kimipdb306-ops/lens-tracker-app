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

function loadInventoryData() {
  try {
    // Try to load from the workspace location first (local development)
    let filePath = path.join(process.env.HOME || '/home/node', '.openclaw/workspace/inventory/Global_SKUs_with_Inventory.xlsx');
    
    // If not found, try the uploaded file in the app directory
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'data', 'Global_SKUs_with_Inventory.xlsx');
    }
    
    // If still not found, try the root of the app
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
    return true;
  } catch (error) {
    console.error('Error loading inventory data:', error.message);
    return false;
  }
}

// Get unique values for dropdowns
function getUniqueValues(key) {
  const values = allData
    .map(item => item[key])
    .filter(val => val !== undefined && val !== null && val !== '')
    .map(val => String(val).trim())
    .filter((val, idx, arr) => arr.indexOf(val) === idx)
    .sort();
  
  return values;
}

// Filter API endpoint
app.get('/api/filter', (req, res) => {
  try {
    const filters = req.query;
    const inventoryKey = 'Current Inventory (02/19/26)';

    let results = allData.filter(item => {
      // Apply each filter
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
      results: finalResults.slice(0, 500) // Limit to 500 results
    });
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get filter options
app.get('/api/options', (req, res) => {
  try {
    res.json({
      bases: getUniqueValues('Base'),
      adds: getUniqueValues('Add'),
      segTypes: getUniqueValues('Seg Type'),
      segLenses: getUniqueValues('Seg Lens'),
      coatings: getUniqueValues('Coating'),
      colors: getUniqueValues('Color'),
      diameters: getUniqueValues('Diameter'),
      manufacturers: getUniqueValues('MFG'),
      brands: getUniqueValues('Brand'),
      countries: getUniqueValues('Country Origin')
    });
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
  
  // Load data on startup
  const dataLoaded = loadInventoryData();
  if (!dataLoaded) {
    console.warn('⚠️  Warning: Inventory data not loaded. Please ensure the Excel file is accessible.');
  }
});
