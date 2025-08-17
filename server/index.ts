import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Blockchain setup
const provider = new ethers.JsonRpcProvider(process.env.KATANA_RPC);

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

const fishtankContract = new ethers.Contract(
  process.env.FISHTANK_ADDR!,
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

// Get token balances
app.get('/api/balances', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address parameter is required' });
    }
    
    const addressStr = address as string;
    
    // More lenient address validation - check format and length
    if (!addressStr.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Valid address parameter is required' });
    }
    
    // Normalize address to checksum format for consistency
    const normalizedAddress = ethers.getAddress(addressStr.toLowerCase());

    // Check if CDP credentials are available
    const cdpKeyId = process.env.CDP_API_KEY_ID;
    const cdpSecret = process.env.CDP_API_SECRET;
    
    if (!cdpKeyId || !cdpSecret) {
      console.log('CDP credentials not found, returning mock data');
      // Return mock data when CDP is not configured
      return res.json({
        balances: [
          {
            symbol: 'USDC',
            network: 'base',
            value: '25.50',
            valueUSD: 25.50,
            contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
          },
          {
            symbol: 'ETH',
            network: 'base',
            value: '0.0123',
            valueUSD: 40.25
          }
        ]
      });
    }

    const cdpClient = createCDPClient(cdpKeyId, cdpSecret);
    const balances = await cdpClient.getTokenBalances(normalizedAddress, 'base');
    
    res.json(balances);
  } catch (error: any) {
    console.error('Error fetching balances:', error?.message || error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

// Get Coinbase onramp URL
app.get('/api/onramp-url', async (req, res) => {
  try {
    const { address } = req.query;
    console.log('📍 Onramp request received:', { address, query: req.query });
    
    if (!address) {
      console.log('❌ No address provided');
      return res.status(400).json({ error: 'Address parameter is required' });
    }
    
    const addressStr = address as string;
    
    // More lenient address validation - check format and length
    if (!addressStr.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.log('❌ Invalid address format:', addressStr);
      return res.status(400).json({ error: 'Valid address parameter is required' });
    }
    
    // Normalize address to checksum format for consistency
    const normalizedAddress = ethers.getAddress(addressStr.toLowerCase());
    console.log('✅ Normalized address:', normalizedAddress);

    const projectId = process.env.COINBASE_PROJECT_ID || 'fishtank-liquidity-hunter';
    
    // Build Coinbase Pay URL with prefilled parameters
    const onrampUrl = new URL('https://pay.coinbase.com/buy/select-asset');
    onrampUrl.searchParams.set('appId', projectId);
    onrampUrl.searchParams.set('destinationWallet', normalizedAddress);
    onrampUrl.searchParams.set('assets', 'USDC');
    onrampUrl.searchParams.set('networks', 'base');
    onrampUrl.searchParams.set('defaultAsset', 'USDC');
    onrampUrl.searchParams.set('defaultNetwork', 'base');
    onrampUrl.searchParams.set('defaultPaymentMethod', 'ACH_BANK_ACCOUNT,DEBIT_CARD');

    console.log(`🏦 Generated onramp URL for ${normalizedAddress}`);
    
    res.json({
      url: onrampUrl.toString(),
      message: 'Open this URL to buy USDC on Base'
    });
  } catch (error: any) {
    console.error('Error generating onramp URL:', error?.message || error);
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