# 🌊 Fishtank: Liquidity Hunter

A real-time 3D blockchain game where you play as a fish navigating through live cryptocurrency transactions, now with **Coinbase Developer Platform (CDP)** integration for seamless Base payments!

## 🎮 Game Overview

- **Game Data**: Powered by Katana blockchain transactions
- **Payments**: Base network USDC via Coinbase Developer Platform
- **Player**: 3D fish character with mouse controls
- **Objective**: Collect treasure, avoid dangers, survive the crypto seas

## 💰 Payment Features

### x402 Micro-tips: Health Refill
- **Cost**: $0.01 USDC on Base
- **Benefit**: +3 Health Points
- **Process**: 402 → Pay → Retry pattern


2. Start the development server
   ```bash
   npm run dev
   ```

### Onramp Integration
- **Purpose**: Buy USDC on Base directly
- **Provider**: Coinbase Pay
- **Prefilled**: Your wallet address, USDC, Base network


### Real-time Balances
- **Source**: CDP Token Balances API
- **Update**: Every 30 seconds
- **Display**: USDC balance in HUD

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **3D Graphics**: Three.js + React Three Fiber
- **Routing**: React Router DOM
- **Wallet**: EVM-compatible (MetaMask, etc.)

### Backend
- **Runtime**: Node.js 18+ + Express
- **Language**: TypeScript
- **APIs**: CDP Token Balances, Katana Etherscan
- **Payment**: x402 micro-payment protocol

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- EVM wallet (MetaMask, Coinbase Wallet, etc.)
- Base network USDC (optional, for refills)

### 1. Clone & Install
```bash
git clone <repository-url>
cd fishtank-liquidity-hunter
npm run install:all
```

### 2. Environment Setup
Create `.env` file in project root:
```env
# CDP – Token Balances (Base)
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_SECRET=your_cdp_api_secret

# x402 micro-tips (Base USDC)
X402_NETWORK=base
REFILL_RECEIVER=0x742a4a9F23E8C14e8C20320E6e0B3E9e2DF5A5F8
REFILL_AMOUNT_HP=3

# Explorer (Katana logs – Etherscan-like)
KATANA_ETHERSCAN_KEY=YOUR_KEY

# Server
PORT=4000

# Coinbase Onramp
COINBASE_PROJECT_ID=fishtank-liquidity-hunter
```

### 3. Get CDP API Credentials
1. Visit [Coinbase Developer Platform](https://developers.coinbase.com/)
2. Create account and project
3. Generate API Key ID and Secret
4. Update `.env` with your credentials

### 4. Run Development
```bash
npm run dev
```

This starts:
- **Client**: http://localhost:5173 (Vite dev server)
- **Server**: http://localhost:4000 (Express API)
- **Proxy**: `/api/*` routes to server automatically

## 🎯 Demo Flow

### 1. Connect Wallet
- Click "Connect Wallet" in HUD
- Approve connection in your wallet
- See address and USDC balance

### 2. Play Game
- Move mouse to control your fish
- Collect 🎐 **Treasure Jellyfish** for points
- Avoid 🦈 **Toxic Predators** (lose health)
- Navigate around obstacles

### 3. Health System
- Start with 9 HP (3 hearts)
- Lose 3 HP per toxic collision
- Game over at 0 HP

### 4. Refill Health (x402 Demo)
- Click "🛡️ Refill (+3 HP)" when health is low
- First call → 402 Payment Required modal
- Click "✅ I Paid (Demo)" for testing
- Health increases by 3 HP (capped at 9)

### 5. Add Funds (Onramp)
- Click "💳 Add Funds" to buy USDC
- Opens Coinbase Pay in new tab
- Prefilled for USDC on Base to your address

## 🔧 API Reference

### GET /api/balances?address=0x...
Returns Base token balances for address.

**Response:**
```json
{
  "balances": [
    {
      "symbol": "USDC",
      "network": "base",
      "value": "25.50",
      "valueUSD": 25.50,
      "contractAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    }
  ]
}
```

### POST /api/refill
x402 pattern for health refill.

**Headers:**
- `X-Current-Health`: Current player HP
- `X-Player-Address`: Wallet address
- `X-Payment`: Payment proof (retry only)

**Responses:**
- **402**: `{ "payment": { "price": "0.01", "currency": "USDC", ... } }`
- **200**: `{ "ok": true, "newHealth": 9 }`

### GET /api/onramp-url?address=0x...
Returns hosted Coinbase Pay URL.

**Response:**
```json
{
  "url": "https://pay.coinbase.com/buy/select-asset?...",
  "message": "Open this URL to buy USDC on Base"
}
```

### GET /api/katana/logs
Fetches Katana transaction logs for game objects.

## 🎨 Game Mechanics

### Marine Creatures (Transaction Types)

| Creature | Risk Level | Behavior | Effect |
|----------|------------|----------|---------|
| 🦈 **Toxic Predator** | High (>50) | Targets player | -3 Health |
| 🎐 **Treasure Jellyfish** | MEV/Sandwich | Rotates, glows | +10 Points |
| 🐡 **Pufferfish Trap** | Approval | Passive hazard | -3 Health, -10 Points |
| 🌊 **Turbulent Current** | High slippage | Pushes player | Random direction |
| ⚡ **Energy Cube** | Standard | Drifts peacefully | +5 Points |

### Health & Scoring
- **Max Health**: 9 HP (3 hearts × 3 HP each)
- **Refill Cost**: $0.01 USDC = +3 HP
- **Death**: 0 HP → Game Over screen
- **Scoring**: Points for collectibles, no negative points

## 🏗️ Project Structure

```
/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── HUD.tsx     # Main overlay UI
│   │   │   ├── PaymentModal.tsx
│   │   │   └── ...
│   │   ├── hooks/          # Custom hooks
│   │   │   ├── useWallet.ts
│   │   │   └── useBalances.ts
│   │   └── styles.css      # Component styles
│   └── vite.config.js      # Vite config with proxy
├── server/                 # Express backend
│   ├── index.ts            # Main server
│   ├── cdp.ts              # CDP API client
│   └── katana.ts           # Katana data fetcher
└── README.md               # This file
```

## 🔍 Development Commands

```bash
# Install all dependencies
npm run install:all

# Development (both client & server)
npm run dev

# Client only
npm --workspace=client run dev

# Server only
npm --workspace=server run dev

# Build for production
npm run build
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CDP_API_KEY_ID` | CDP API Key ID | Required |
| `CDP_API_SECRET` | CDP API Secret | Required |
| `X402_NETWORK` | Payment network | `base` |
| `REFILL_RECEIVER` | Payment receiver address | Demo address |
| `REFILL_AMOUNT_HP` | HP gained per refill | `3` |
| `KATANA_ETHERSCAN_KEY` | Katana API key | Demo mode |
| `PORT` | Server port | `4000` |

### Wallet Compatibility
- **MetaMask**: ✅ Full support
- **Coinbase Wallet**: ✅ Full support  
- **WalletConnect**: ✅ Via injected provider
- **Any EVM wallet**: ✅ Uses `window.ethereum`

## 🐛 Troubleshooting

### Common Issues

**"No wallet detected"**
- Install MetaMask or another Web3 wallet
- Refresh page after installation

**"Failed to fetch balances"**
- Check CDP API credentials
- Verify network connectivity
- Check browser console for errors

**"Payment failed"**
- Ensure sufficient USDC on Base
- Check wallet network (should be Base)
- Try demo mode first

**"Refill not working"**
- Connect wallet first
- Check health isn't already at maximum
- Verify server is running (`npm run dev`)

### Debug Mode
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Network tab shows API calls
4. Server logs in terminal

## 🚧 Known Limitations

### Demo Mode
- Payment verification is simplified
- Accepts `"demo-ok"` as valid payment
- Real verification would check on-chain transactions

### Katana Integration
- Currently uses mock data for development
- Real integration requires Katana Etherscan API
- Fallback to simulated transactions

### Production Considerations
- Add proper payment verification
- Implement rate limiting
- Add error monitoring
- Use environment-specific configs

## 🎯 Acceptance Criteria

### ✅ Build & Run
- [x] `npm run dev` starts both client and server
- [x] Vite proxy routes `/api/*` to Express server
- [x] Hot reload works for both frontend and backend

### ✅ HUD
- [x] Shows short wallet address within 1s of connection
- [x] Displays USDC (Base) balance with 30s refresh
- [x] Refill button: 402 → payment modal → retry → success
- [x] Health increases by 3 HP, capped at 9

### ✅ Onramp
- [x] "Add Funds" opens Coinbase Pay
- [x] Prefilled with USDC, Base network, user address

### ✅ Gameplay
- [x] Red cubes (Toxic Predators) reduce health
- [x] Purple cubes (Treasure Jellyfish) increase score  
- [x] Other cubes are pass-through or have unique effects
- [x] Maximum 18 cubes active, spawns every 10s
- [x] Game over at 0 HP with restart option

### ✅ Code Quality
- [x] Environment variables documented
- [x] No secrets in client bundles (server-only)
- [x] Error handling with user-friendly messages
- [x] TypeScript for type safety

## 🎉 What's Next?

### Stretch Goals
- **Real x402 Integration**: Auto-pay with retry
- **Payment Verification**: On-chain transaction checking  
- **Katana Game State**: Store scores on-chain
- **Enhanced Effects**: Sound, post-processing, particles
- **Multiplayer**: Real-time competition
- **NFT Integration**: Collectible fish characters

## 📝 License

MIT License - Feel free to fork and build upon this project!

---

**Built with 💙 for the future of blockchain gaming**

*Game: Katana · Payments: Base · Powered by CDP* 🌊