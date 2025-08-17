# Vercel Deployment Guide

## Overview
This project is configured for Vercel deployment with:
- **Client**: React + Vite frontend (static files)
- **API**: Serverless functions for backend functionality

## API Endpoints (Serverless Functions)

### Coinbase Integration
- `GET /api/onramp-url?address=0x...` - Generate Coinbase Pay URL
- `GET /api/balances?address=0x...` - Get token balances (mock data)
- `POST /api/refill` - Health refill with x402 pattern

### Game API (Fishtank)
- `GET /api/fishtank/difficulty` - Get game difficulty  
- `GET /api/fishtank/player/[addr]` - Get player state
- `GET /api/fishtank/leaderboard` - Get leaderboard data
- `POST /api/fishtank/event/risk` - Record risk events
- `POST /api/fishtank/event/health` - Record health refills

## Environment Variables

Add these to your Vercel project settings:

```env
# Coinbase Integration
COINBASE_PROJECT_ID=fishtank-liquidity-hunter
REFILL_RECEIVER=0x742a4a9F23E8C14e8C20320E6e0B3E9e2DF5A5F8
REFILL_AMOUNT_HP=3

# Optional: CDP API (for real balance data)
CDP_API_KEY_ID=your_cdp_api_key_id  
CDP_API_SECRET=your_cdp_api_secret
```

## Deployment Commands

```bash
# Deploy to Vercel
vercel --prod

# Preview deployment
vercel
```

## Common Issues & Fixes

### Function Runtime Error
If you see `Error: Function Runtimes must have a valid version`, the serverless functions are using CommonJS exports (`module.exports`) instead of ES modules (`export default`).

### Missing API Endpoints
All serverless functions are located in the `/api` directory and use CommonJS format:
```javascript
module.exports = function handler(req, res) {
  // function implementation
}
```

## File Structure

```
/
├── api/                    # Vercel serverless functions
│   ├── balances.js
│   ├── onramp-url.js
│   ├── refill.js
│   └── fishtank/
│       ├── difficulty.js
│       ├── leaderboard.js
│       ├── player/[addr].js
│       └── event/
│           ├── risk.js
│           └── health.js
├── client/                 # React frontend
│   └── dist/              # Build output
├── vercel.json            # Vercel configuration
└── package.json           # Root dependencies
```

## Notes

- The serverless functions return mock data by default
- For production, integrate with real CDP API and blockchain contracts
- All functions include CORS headers for frontend access
- Client-side score submission works directly with MetaMask (no server needed)
