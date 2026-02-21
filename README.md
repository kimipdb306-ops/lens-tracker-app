# Global Optics Lens Tracker

A Node.js/Express application for searching and filtering optical lens SKU inventory by various specifications.

## Features

- **Fast SKU Search**: Search 100,000+ SKU records with responsive UI
- **Multiple Filter Dimensions**: Filter by Base, Add, Seg Type, Seg Lens, Coating, Color, Diameter, Manufacturer, Brand, and Country of Origin
- **Real-time Inventory**: View total inventory counts for matching SKUs
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **RESTful API**: JSON API endpoints for programmatic access

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Data**: XLSX (Excel file parsing)
- **Deployment**: Railway.app

## Installation & Local Development

### Prerequisites
- Node.js 18.x or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd lens-tracker-app
```

2. Install dependencies:
```bash
npm install
```

3. Ensure the Excel file exists at:
```
data/Global_SKUs_with_Inventory.xlsx
```

4. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### GET `/api/options`
Returns available filter values for all dimensions.

**Response:**
```json
{
  "bases": ["1", "2", "3", ...],
  "adds": ["0", "1", "2", ...],
  "segTypes": ["SV", "DV", ...],
  ...
}
```

### GET `/api/filter`
Filters SKUs based on query parameters.

**Query Parameters:**
- `base` - Base value
- `add` - Add value
- `segType` - Segment type
- `segLens` - Segment lens type
- `coating` - Coating type
- `color` - Color
- `diameter` - Diameter (numeric)
- `manufacturer` - Manufacturer code
- `brand` - Brand name
- `country` - Country of origin

**Example:**
```
GET /api/filter?base=2&coating=UC&diameter=80
```

**Response:**
```json
{
  "count": 45,
  "totalInventory": 320,
  "results": [
    {
      "sku": "0406206714",
      "description": "KB 2.00 80MM CR39 SFSV UE POLARIZED GRY/GRN UC",
      "totalInventory": 2
    },
    ...
  ]
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "dataLoaded": true,
  "totalSKUs": 103123
}
```

## Deployment to Railway

### Method 1: Using Railway Dashboard (Recommended)

1. Visit [Railway.app](https://railway.app)
2. Sign up or log in
3. Click "New Project" → "Deploy from GitHub"
4. Connect your GitHub repository
5. Railway will automatically detect the Node.js project and deploy it
6. The app will be available at `https://[project-name].up.railway.app`

### Method 2: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
cd lens-tracker-app
railway init

# Deploy
railway up
```

## File Structure

```
lens-tracker-app/
├── server.js              # Express server with API endpoints
├── package.json           # Dependencies and scripts
├── Procfile               # Process file for Railway
├── railway.json           # Railway configuration
├── public/
│   └── index.html         # Frontend UI (HTML, CSS, JS)
├── data/
│   └── Global_SKUs_with_Inventory.xlsx  # Inventory data
└── README.md             # This file
```

## Performance Notes

- The application loads all 103,000+ SKU records into memory for fast filtering
- Initial load may take 2-3 seconds depending on server speed
- Results are limited to 500 SKUs per query (refine filters for more specific results)
- Excel file is read once at server startup for optimal performance

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Node environment (development/production)

## Troubleshooting

### Excel file not found
Ensure `Global_SKUs_with_Inventory.xlsx` is in the `data/` directory.

### Server not starting
Check that all dependencies are installed:
```bash
npm install
```

### Slow filter results
- This is normal for the first query after startup
- Refine your filters to reduce result set
- Results are capped at 500 items

## Future Enhancements

- [ ] Database integration for better scalability
- [ ] Advanced search with regex/fuzzy matching
- [ ] CSV export functionality
- [ ] User authentication and saved filters
- [ ] Real-time inventory updates from ERP system

## License

All rights reserved. Global Optics inventory system.

## Support

For issues or questions, please contact the development team.
# Force rebuild at Fri Feb 20 22:18:07 EST 2026
# Rebuild trigger Fri Feb 20 22:46:05 EST 2026
