import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createCDPClient } from './cdp.js';
import { createKatanaClient } from './katana.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize clients
const cdpClient = createCDPClient(
  process.env.CDP_API_KEY_ID,
  process.env.CDP_API_SECRET
);
const katanaClient = createKatanaClient(process.env.KATANA_ETHERSCAN_KEY);

// Game state for health tracking
const playerHealth = new Map<string, number>();
const MAX_HEALTH = 9;

// API Routes

// GET /api/balances?address=0x... → CDP Token Balances (Base)
app.get('/api/balances', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    console.log(`Fetching balances for address: ${address}`);
    const balances = await cdpClient.getTokenBalances(address, 'base');
    
    res.json(balances);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

// POST /api/refill → x402 pattern: 402 on first call, 200 after paid retry
app.post('/api/refill', async (req, res) => {
  try {
    const paymentHeader = req.headers['x-payment'] as string;
    const currentHealth = parseInt(req.headers['x-current-health'] as string) || MAX_HEALTH;
    const playerAddress = req.headers['x-player-address'] as string;
    
    console.log('Refill request:', { paymentHeader, currentHealth, playerAddress });

    // If no payment proof, return 402 Payment Required
    if (!paymentHeader) {
      return res.status(402).json({
        payment: {
          price: '0.01',
          currency: 'USDC',
          network: process.env.X402_NETWORK || 'base',
          receiver: process.env.REFILL_RECEIVER || '0x742a4a9F23E8C14e8C20320E6e0B3E9e2DF5A5F8',
          memo: 'Refill +3 HP'
        }
      });
    }

    // Validate payment (simplified for demo)
    let paymentValid = false;
    
    if (paymentHeader === 'demo-ok' || paymentHeader.startsWith('0x')) {
      // For demo: accept "demo-ok" or any hex string as valid payment
      paymentValid = true;
      console.log('Payment accepted (demo mode)');
    }

    if (!paymentValid) {
      return res.status(400).json({ error: 'Invalid payment proof' });
    }

    // Calculate new health
    const healthIncrease = parseInt(process.env.REFILL_AMOUNT_HP || '3');
    const newHealth = Math.min(currentHealth + healthIncrease, MAX_HEALTH);
    
    // Store player health if address provided
    if (playerAddress) {
      playerHealth.set(playerAddress, newHealth);
    }

    console.log(`Health refilled: ${currentHealth} → ${newHealth}`);

    res.json({
      ok: true,
      newHealth,
      healthIncrease,
      message: `Health refilled! +${healthIncrease} HP`
    });
  } catch (error) {
    console.error('Refill error:', error);
    res.status(500).json({ error: 'Refill failed' });
  }
});

// GET /api/katana/logs?fromBlock&toBlock → Katana transaction logs
app.get('/api/katana/logs', async (req, res) => {
  try {
    const { fromBlock, toBlock, page = '1', offset = '200' } = req.query;
    
    console.log('Fetching Katana logs:', { fromBlock, toBlock, page, offset });
    
    const logs = await katanaClient.getLogs(
      fromBlock as string,
      toBlock as string,
      parseInt(page as string),
      parseInt(offset as string)
    );
    
    res.json(logs);
  } catch (error) {
    console.error('Katana logs error:', error);
    res.status(500).json({ error: 'Failed to fetch Katana logs' });
  }
});

// GET /api/onramp-url?address=0x... → returns hosted Onramp URL
app.get('/api/onramp-url', (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    // Updated Coinbase Onramp URL with new API parameters
    const onrampUrl = new URL('https://pay.coinbase.com/buy/select-asset');
    
    // Use new API parameters (addresses and assets instead of destinationWallets)
    onrampUrl.searchParams.set('addresses', JSON.stringify({
      [address]: ['base']
    }));
    onrampUrl.searchParams.set('assets', JSON.stringify(['USDC']));
    onrampUrl.searchParams.set('defaultAsset', 'USDC');
    onrampUrl.searchParams.set('defaultNetwork', 'base');
    onrampUrl.searchParams.set('defaultPaymentMethod', 'CARD');
    
    // Add appId (Project ID) from environment variables
    onrampUrl.searchParams.set('appId', process.env.COINBASE_PROJECT_ID || 'fishtank-liquidity-hunter');

    res.json({
      url: onrampUrl.toString(),
      message: 'Open this URL to buy USDC on Base'
    });
  } catch (error) {
    console.error('Onramp URL error:', error);
    res.status(500).json({ error: 'Failed to generate onramp URL' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: {
      cdp_configured: !!(process.env.CDP_API_KEY_ID && process.env.CDP_API_SECRET),
      katana_configured: !!process.env.KATANA_ETHERSCAN_KEY,
      refill_receiver: process.env.REFILL_RECEIVER
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🐟 Fishtank Server running on http://localhost:${PORT}`);
  console.log('Environment:');
  console.log(`  - CDP configured: ${!!(process.env.CDP_API_KEY_ID && process.env.CDP_API_SECRET)}`);
  console.log(`  - Katana configured: ${!!process.env.KATANA_ETHERSCAN_KEY}`);
  console.log(`  - Refill receiver: ${process.env.REFILL_RECEIVER}`);
  console.log(`  - Network: ${process.env.X402_NETWORK}`);
});
