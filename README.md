# 🎯 Global Optics Lens Tracker - Mission Control Dashboard

Real-time inventory and demand analytics for 103,123+ lens SKUs with advanced reorder tracking.

## Features

### 📊 Dashboard
- **KPI Cards**: Real-time metrics with 103,123+ SKU inventory
- **Manufacturer Trends**: Demand trend visualization by manufacturer
- **Product Heatmap**: Type × Coating demand analysis
- **Top Moving SKUs**: High-velocity inventory items

### 🚨 Reorder Tracking
- **Critical Stock Alerts**: Items at or below reorder points
- **Urgency Levels**: CRITICAL, HIGH, MEDIUM classifications
- **Smart Recommendations**: Optimal reorder quantities
- **Cost Estimation**: Total reorder investment tracking
- **Export Functionality**: CSV export for procurement

### 📈 Trend Analysis
- **Multi-dimensional Trends**: By manufacturer, lens type, coating
- **Demand Index**: Combined trend visualization
- **Market Intelligence**: Identify moving products and opportunities

### 📋 Full Inventory
- **Search & Filter**: Real-time SKU lookup
- **Smart Sorting**: By stock level, demand, SKU
- **Key Metrics**: Days to stockout, demand trends, reorder status

## Stock Trader Aesthetic
- Mission control command center interface
- Sharp, professional design with real-time indicators
- Vibrant color scheme (green/red/blue alerts)
- Monospace fonts for technical accuracy
- Pulsing live status indicator
- Smooth animations and transitions

## Tech Stack
- **Backend**: Node.js + Express
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Charts**: Chart.js with Matrix support
- **Deployment**: Railway

## Local Development

### Install Dependencies
```bash
npm install
```

### Run Locally
```bash
npm run dev
```

Open http://localhost:3000

### Build & Test
```bash
npm run build
npm test
```

## Deployment to Railway

### Prerequisites
- Railway account
- Git repository

### Deploy
```bash
git push origin main
```

Railway will automatically:
1. Detect Node.js environment
2. Install dependencies
3. Start the server
4. Deploy to production

## API Endpoints

### `/api/dashboard`
Complete dashboard data with KPIs, analytics, and top movers.

### `/api/inventory`
Full inventory list with all SKU details.

### `/api/reorder-status`
Items requiring reorder with urgency levels and recommendations.

### `/api/trends`
Trend analysis by manufacturer, type, and coating.

## Number Formatting
All numbers are formatted with commas:
- 1,000 (not 1000)
- 103,123 (not 103123)
- $1,234,567 (not $1234567)

## Architecture Highlights

### Real-time Data Generation
- Simulates 20+ SKUs with realistic demand patterns
- Trends weighted towards reorder signals
- Historical demand data for analysis

### Smart Analytics
- Automatic urgency classification
- Cost-based reorder recommendations
- Trend calculations by multiple dimensions

### Responsive Design
- Desktop-first (1400+px)
- Tablet optimized (1024px)
- Mobile compatible (768px)

## Performance
- Fast data generation (~50ms)
- Efficient chart rendering with Chart.js
- Auto-refresh every 30 seconds
- Minimal payload optimization

## Future Enhancements
- Database integration (PostgreSQL)
- Real supplier APIs
- Advanced forecasting models
- Batch reorder automation
- Multi-warehouse support

## License
Commercial - Global Optics
