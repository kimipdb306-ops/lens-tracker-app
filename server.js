const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 'ok',
      port: PORT,
      uptime: process.uptime()
    }));
  } else if (req.url === '/api/options') {
    res.writeHead(200);
    res.end(JSON.stringify({
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
    }));
  } else if (req.url === '/api/filter') {
    res.writeHead(200);
    res.end(JSON.stringify({
      count: 0,
      totalInventory: 0,
      results: []
    }));
  } else if (req.url === '/' || req.url === '') {
    // Serve index.html
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end('<h1>Lens Tracker</h1><p>App is running. Index.html not found.</p>');
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
