import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import FishtankGameStateABI from './abi/FishtankGameState.json';
import { createCDPClient } from './cdp';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize CDP client (optional)
let cdpClient = null;
try {
  cdpClient = createCDPClient(
    process.env.CDP_API_KEY_ID,
    process.env.CDP_API_SECRET
  );
} catch (error) {
  console.log('⚠️ CDP client not initialized (missing credentials) - Some features will be disabled');
}

// Blockchain setup with fallback values
const rpcUrl = process.env.KATANA_RPC || 'https://rpc.tatara.katanarpc.com/';
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Generate random private keys if not provided (for demo purposes)
const defaultPrivateKey = '0x' + '1'.repeat(64); // Valid format private key for demo

const reporterPrivateKey = process.env.REPORTER_PK && process.env.REPORTER_PK.length === 66 
  ? process.env.REPORTER_PK 
  : defaultPrivateKey;

const signerPrivateKey = process.env.SIGNER_PK && process.env.SIGNER_PK.length === 66 
  ? process.env.SIGNER_PK 
  : defaultPrivateKey;

const reporterWallet = new ethers.Wallet(reporterPrivateKey, provider);
const signerWallet = new ethers.Wallet(signerPrivateKey, provider);

// Note: The ABI file should contain just the ABI array, not the full Remix output
// For now, we'll handle the ABI format gracefully
let contractABI: any;
try {
  // Try to extract ABI from the imported JSON
  contractABI = FishtankGameStateABI.abi || FishtankGameStateABI;
} catch {
  // Fallback to a minimal ABI for the simplified contract
  contractABI = [
    "function difficulty() view returns (uint8)",
    "function getPlayer(address) view returns (tuple(uint64 bestScore, uint64 lastScore, uint32 runs, uint64 lastPlayedAt, bytes32 lastRunId))",
    "function getTop5() view returns (address[5], uint64[5])",
    "function submitScore(uint64 score, bytes32 runId, uint64 startedAt, uint64 endedAt)"
  ];
}

// Use fallback contract address if environment variable is missing
const contractAddress = process.env.FISHTANK_ADDR || '0x467397d1d298c1a4ca9bfe87565ef04486c25c0f';

const fishtankContract = new ethers.Contract(
  contractAddress,
  contractABI,
  reporterWallet
);

console.log('🔧 Server setup:');
console.log('📡 RPC:', process.env.KATANA_RPC);
console.log('🏠 Contract:', process.env.FISHTANK_ADDR);
console.log('👤 Reporter:', reporterWallet.address);
console.log('✍️ Signer:', signerWallet.address);

// Check balances and contract connectivity
(async () => {
  try {
    const signerBalance = await provider.getBalance(signerWallet.address);
    const reporterBalance = await provider.getBalance(reporterWallet.address);
    console.log('💰 Signer balance:', ethers.formatEther(signerBalance), 'ETH');
    console.log('💰 Reporter balance:', ethers.formatEther(reporterBalance), 'ETH');
    
    // Test contract connectivity
    const difficulty = await fishtankContract.difficulty();
    console.log('🎯 Contract difficulty:', difficulty.toString());
  } catch (error: any) {
    console.warn('⚠️  Initial setup check failed:', error?.message || error);
  }
})();

// No more EIP-712 signatures needed for the simplified contract

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});



// Get player state (read-only)
app.get('/api/fishtank/player/:addr', async (req, res) => {
  try {
    const { addr } = req.params;
    
    if (!ethers.isAddress(addr)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const playerData = await fishtankContract.getPlayer(addr);
    const difficulty = await fishtankContract.difficulty();

    res.json({
      player: addr,
      state: {
        bestScore: playerData.bestScore.toString(),
        lastScore: playerData.lastScore.toString(),
        runs: playerData.runs.toString(),
        lastPlayedAt: playerData.lastPlayedAt.toString(),
        lastRunId: playerData.lastRunId
      },
      difficulty: difficulty.toString()
    });
  } catch (error: any) {
    console.error('Error fetching player state:', error?.message || error);
    
    // Handle specific contract errors gracefully
    if (error?.message?.includes('missing revert data') || error?.message?.includes('execution reverted')) {
      // Player likely doesn't exist in contract yet, return default state
      const { addr } = req.params;
      res.json({
        player: addr,
        state: {
          bestScore: "0",
          lastScore: "0",
          runs: "0",
          lastPlayedAt: "0",
          lastRunId: "0x0000000000000000000000000000000000000000000000000000000000000000"
        },
        difficulty: '2' // Default difficulty
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch player state' });
    }
  }
});

// Get difficulty (read-only)
app.get('/api/fishtank/difficulty', async (req, res) => {
  try {
    const difficulty = await fishtankContract.difficulty();
    res.json({ difficulty: difficulty.toString() });
  } catch (error) {
    console.error('Error fetching difficulty:', error);
    res.status(500).json({ error: 'Failed to fetch difficulty' });
  }
});

// Get leaderboard data
app.get('/api/fishtank/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5; // Max 5 for Top5 contract
    
    // Get Top5 leaderboard directly from contract
    const [addresses, scores] = await fishtankContract.getTop5();
    
    // Build leaderboard array, filtering out empty slots
    const leaderboard = [];
    for (let i = 0; i < Math.min(addresses.length, limit); i++) {
      if (addresses[i] !== ethers.ZeroAddress && scores[i] > 0) {
        leaderboard.push({
          rank: i + 1,
          player: addresses[i],
          address: addresses[i],
          displayAddress: `${addresses[i].slice(0, 6)}...${addresses[i].slice(-4)}`,
          score: parseInt(scores[i].toString())
        });
      }
    }
    
    console.log(`📊 Top5 Leaderboard requested (limit: ${limit}), found ${leaderboard.length} entries`);
    
    res.json({
      leaderboard,
      totalPlayers: leaderboard.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Record risk event
app.post('/api/fishtank/event/risk', async (req, res) => {
  try {
    const { player, riskScore, eventType } = req.body;

    if (!ethers.isAddress(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (typeof riskScore !== 'number' || riskScore < 0) {
      return res.status(400).json({ error: 'Invalid risk score' });
    }

    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    console.log(`Recording risk event: ${player}, risk: ${riskScore}, type: ${eventType}`);

    const tx = await fishtankContract.recordRiskEvent(player, riskScore, eventType);
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    console.error('Error recording risk event:', error);
    res.status(500).json({ error: 'Failed to record risk event' });
  }
});

// Record health refill
app.post('/api/fishtank/event/health', async (req, res) => {
  try {
    const { player, newHealth } = req.body;

    if (!ethers.isAddress(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (typeof newHealth !== 'number' || newHealth < 0) {
      return res.status(400).json({ error: 'Invalid health value' });
    }

    console.log(`Recording health refill: ${player}, health: ${newHealth}`);

    const tx = await fishtankContract.recordHealthRefill(player, newHealth);
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    console.error('Error recording health refill:', error);
    res.status(500).json({ error: 'Failed to record health refill' });
  }
});

// DEPRECATED: Score submission now happens directly from user wallet
// This endpoint is kept for backwards compatibility but should not be used
app.post('/api/fishtank/score/submit', async (req, res) => {
  res.status(400).json({ 
    error: 'Score submission has moved to client-side. Please update your game client.',
    message: 'Scores should now be submitted directly from the user wallet to the smart contract.'
  });
  return;

  // [Removed deprecated server-side submission code - now handled client-side]
});

// Coinbase CDP integration endpoints

// GET /api/katana/stats → Test simpler Katana explorer API endpoint
app.get('/api/katana/stats', async (req, res) => {
  try {
    const katanaApiUrl = `https://explorer-tatara-s4atxtv7sq.t.conduit.xyz/api/v2/stats`;
    
    console.log(`🗡️ Proxying Katana stats request: ${katanaApiUrl}`);
    
    const response = await fetch(katanaApiUrl);
    console.log(`📡 Katana API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Katana API error response: ${errorText}`);
      throw new Error(`Katana API responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Katana stats API successful:`, data);
    
    res.json(data);
  } catch (error: any) {
    console.error('❌ Katana stats API proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Katana stats', details: error.message });
  }
});

// GET /api/transactions?limit=10 → Proxy to Blockscout API to bypass CORS
app.get('/api/transactions', async (req, res) => {
  try {
    const limit = req.query.limit || '10';
    // Use the working Blockscout API endpoint instead of Katana
    const blockscoutApiUrl = `https://eth.blockscout.com/api/v2/internal-transactions`;
    
    console.log(`🗡️ Proxying Blockscout API request: ${blockscoutApiUrl}`);
    
    const response = await fetch(blockscoutApiUrl, {
      headers: {
        'accept': 'application/json'
      }
    });
    console.log(`📡 Blockscout API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Blockscout API error response: ${errorText}`);
      throw new Error(`Blockscout API responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Blockscout API proxy successful, got ${data.items ? data.items.length : 'unknown'} transactions`);
    
    // Extract the items array and limit to requested count
    let transactionData = data.items || data;
    const limitNum = parseInt(limit as string);
    if (Array.isArray(transactionData) && limitNum) {
      transactionData = transactionData.slice(0, limitNum);
    }
    
    res.json(transactionData);
  } catch (error: any) {
    console.error('❌ Blockscout API proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch transactions from Blockscout', 
      details: error.message 
    });
  }
});

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
    if (!cdpClient) {
      return res.status(503).json({ error: 'CDP service unavailable - missing credentials' });
    }
    const balances = await cdpClient.getTokenBalances(address, 'base');
    
    res.json(balances);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
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

// Health refill with x402 pattern
app.post('/api/refill', async (req, res) => {
  try {
    const currentHealth = parseInt(req.headers['x-current-health'] as string);
    const playerAddress = req.headers['x-player-address'] as string;
    const paymentProof = req.headers['x-payment'] as string;

    if (!playerAddress || !ethers.isAddress(playerAddress)) {
      return res.status(400).json({ error: 'Valid X-Player-Address header is required' });
    }

    if (isNaN(currentHealth) || currentHealth < 0) {
      return res.status(400).json({ error: 'Valid X-Current-Health header is required' });
    }

    // If no payment proof, return 402 Payment Required
    if (!paymentProof) {
      return res.status(402).json({
        payment: {
          price: '0.01',
          currency: 'USDC',
          network: 'base',
          receiver: process.env.REFILL_RECEIVER || '0x742a4a9F23E8C14e8C20320E6e0B3E9e2DF5A5F8',
          message: 'Pay 0.01 USDC on Base to refill health (+3 HP)'
        }
      });
    }

    // Verify payment (simplified for demo)
    console.log(`💊 Health refill requested by ${playerAddress} (current: ${currentHealth}HP, proof: ${paymentProof})`);
    
    const newHealth = Math.min(currentHealth + 3, 9); // Cap at 9 HP
    
    res.json({
      ok: true,
      newHealth,
      message: `Health refilled to ${newHealth} HP`
    });
  } catch (error: any) {
    console.error('Error processing refill:', error?.message || error);
    res.status(500).json({ error: 'Failed to process health refill' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fishtank server running on port ${PORT}`);
  console.log(`📡 Connected to Katana RPC: ${process.env.KATANA_RPC}`);
  console.log(`🎯 Contract address: ${process.env.FISHTANK_ADDR}`);
  console.log(`🔗 Chain ID: ${process.env.KATANA_CHAIN_ID}`);
});

export default app;