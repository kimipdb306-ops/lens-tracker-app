const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple data store
let allData = [];
let cachedOptions = null;
let dataLoaded = false;

// Health endpoint (minimal, no file dependency)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    uptime: process.uptime()
  });
});

// Options endpoint (returns empty if no data)
app.get('/api/options', (req, res) => {
  res.json({ 
    bases: [],
    adds: [],
    segTypes: [],
    segLenses: [],
    coatings: [],
    colors: [],
    diameters: [],
    manufacturers: [],
    brands: [],
    countries: []
  });
});

// Filter endpoint (returns empty if no data)
app.get('/api/filter', (req, res) => {
  res.json({
    count: 0,
    totalInventory: 0,
    results: []
  });
});

// Serve root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
