#!/usr/bin/env node

/**
 * Seed script to load inventory data from Excel into PostgreSQL
 * 
 * Usage: node seed.js [excel-file-path]
 */

const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

  try {
    // Find Excel file
    let excelPath = process.argv[2];

    if (!excelPath) {
      // Try default locations
      const defaultPaths = [
        path.join(process.env.HOME || '/home/node', '.openclaw/workspace/inventory/Global_SKUs_with_Inventory.xlsx'),
        path.join(__dirname, 'data', 'Global_SKUs_with_Inventory.xlsx'),
        path.join(__dirname, 'Global_SKUs_with_Inventory.xlsx')
      ];

      for (const p of defaultPaths) {
        if (fs.existsSync(p)) {
          excelPath = p;
          break;
        }
      }
    }

    if (!excelPath || !fs.existsSync(excelPath)) {
      console.error('❌ Excel file not found');
      console.error('Please provide path: node seed.js /path/to/Excel');
      process.exit(1);
    }

    console.log(`📖 Reading Excel file: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`✅ Loaded ${data.length} records from Excel`);

    // Create table
    console.log('📋 Creating lenses table...');
    await pool.query(`
      DROP TABLE IF EXISTS lenses CASCADE;
      
      CREATE TABLE lenses (
        id SERIAL PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        description TEXT,
        base FLOAT,
        add FLOAT,
        seg_type TEXT,
        seg_lens TEXT,
        coating TEXT,
        color TEXT,
        diameter FLOAT,
        manufacturer TEXT,
        brand TEXT,
        country_origin TEXT,
        inventory INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_base ON lenses(base);
      CREATE INDEX idx_add ON lenses(add);
      CREATE INDEX idx_diameter ON lenses(diameter);
      CREATE INDEX idx_manufacturer ON lenses(manufacturer);
      CREATE INDEX idx_sku ON lenses(sku);
    `);

    console.log('✅ Tables created');

    // Parse inventory column name (find the one that contains current inventory)
    let inventoryColumn = null;
    for (const col of Object.keys(data[0] || {})) {
      if (col.includes('Inventory') || col.includes('inventory')) {
        inventoryColumn = col;
        break;
      }
    }

    if (!inventoryColumn) {
      console.warn('⚠️  No inventory column found, will use 0');
    } else {
      console.log(`📊 Using inventory column: ${inventoryColumn}`);
    }

    // Insert data
    console.log(`🚀 Inserting ${data.length} records...`);
    
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const sql = `
          INSERT INTO lenses (sku, description, base, add, seg_type, seg_lens, coating, color, diameter, manufacturer, brand, country_origin, inventory)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (sku) DO UPDATE SET 
            inventory = EXCLUDED.inventory,
            updated_at = CURRENT_TIMESTAMP
        `;

        const inventory = inventoryColumn ? parseInt(row[inventoryColumn]) || 0 : 0;

        await pool.query(sql, [
          row.ItemNumber || row.sku,
          row.ItemDesc || row.description,
          parseFloat(row.Base) || null,
          parseFloat(row.Add) || null,
          row['Seg Type'] || null,
          row['Seg Lens'] || null,
          row.Coating || null,
          row.Color || null,
          parseFloat(row.Diameter) || null,
          row.MFG || row.manufacturer || null,
          row.Brand || null,
          row['Country Origin'] || null,
          inventory
        ]);

        inserted++;

        // Progress indicator
        if ((i + 1) % 10000 === 0) {
          console.log(`  ${i + 1}/${data.length} records inserted...`);
        }
      } catch (err) {
        failed++;
        if (failed <= 5) {
          console.error(`  ❌ Error on row ${i + 1}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Seed complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Failed: ${failed}`);

    // Get final count
    const result = await pool.query('SELECT COUNT(*) as count FROM lenses');
    const totalRecords = result.rows[0].count;
    console.log(`   Total in database: ${totalRecords}`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    await pool.end();
    process.exit(1);
  }
}

seed();
