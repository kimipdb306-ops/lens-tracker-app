# Deployment Instructions for Global Optics Lens Tracker

## Quick Deploy to Railway

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/lens-tracker-app.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Railway.app**
   - Go to https://railway.app
   - Sign in (create account if needed)
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Authorize and select the `lens-tracker-app` repository
   - Railway will automatically detect and deploy the Node.js app

3. **Access your deployment**
   - After deployment completes, you'll see your service URL
   - Format: `https://[project-name].up.railway.app`
   - The app will be live with full functionality

### Option 2: Deploy via Railway CLI

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to project directory
cd lens-tracker-app

# Initialize Railway project
railway init

# Deploy
railway up
```

### Option 3: Deploy Using Railway Token (CI/CD)

If using GitHub Actions or another CI/CD system:

```bash
export RAILWAY_TOKEN=your_railway_api_token_here
railway up
```

## Post-Deployment Verification

After deployment, verify the application is working:

```bash
# Replace with your actual Railway domain
curl https://[project-name].up.railway.app/api/health

# You should see:
# {"status":"ok","dataLoaded":true,"totalSKUs":103123}
```

## Environment Variables

No additional environment variables are required for basic operation. The app will use:
- `PORT`: Automatically set by Railway (default 3000)
- `NODE_ENV`: Automatically set to `production`

## Performance Notes

- First deployment may take 2-3 minutes as Railway builds the Node.js image
- Initial data load (Excel parsing) takes ~2-3 seconds
- Subsequent queries are instant (data cached in memory)
- Application can handle 100,000+ concurrent SKU searches efficiently

## Troubleshooting Deployment Issues

### Build Fails
- Ensure all dependencies are listed in `package.json`
- Check that the Excel file is included in the git repository
- Run `npm install` locally to test before deploying

### Data Not Loading
- Verify `data/Global_SKUs_with_Inventory.xlsx` is in the repository
- Check Railway logs for errors using `railway logs`

### App Crashes
- Check Railway logs: `railway logs`
- Ensure at least 512MB RAM is allocated (usually default)
- Try redeploying: `railway up`

## Monitoring

Monitor your deployment using Railway Dashboard:
- View logs: `railway logs -f`
- Check metrics: Visit railway.app dashboard
- Set up alerts for errors

## Scaling (Future)

If you need to scale beyond a single instance:
1. Go to Railway Dashboard
2. Increase replicas in service settings
3. Consider migrating to a database for better scalability

## Support Resources

- Railway Docs: https://docs.railway.app
- Node.js Deployment Guide: https://docs.railway.app/guides/nodejs
- API Reference: See README.md for full API documentation

---

**Estimated Deployment Time**: 3-5 minutes from GitHub push to live URL
