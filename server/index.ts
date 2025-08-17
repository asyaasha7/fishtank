import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers, keccak256, toUtf8Bytes } from 'ethers';
import FishtankGameStateABI from './abi/FishtankGameState.json';

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

// Submit score using simplified contract method (players call directly)
app.post('/api/fishtank/score/submit', async (req, res) => {
  try {
    const { player, score } = req.body;

    if (!ethers.isAddress(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    console.log(`🏆 Submitting score: ${player}, score: ${score}`);

    // Create timestamps
    const now = Math.floor(Date.now() / 1000);
    const startedAt = now - 60; // Assume game started 1 minute ago
    const endedAt = now;

    // Generate unique runId based on player and timestamp
    const runId = keccak256(toUtf8Bytes(`run:${player}:${Date.now()}`));
    console.log(`🎮 Run ID: ${runId}`);

    // Submit score directly to the contract using the reporterWallet
    // Note: In production, players would call this directly from their wallets
    const gasLimit = 200000; // Gas limit for the simple submitScore call
    const tx = await fishtankContract.submitScore(
      BigInt(score),
      runId,
      BigInt(startedAt),
      BigInt(endedAt),
      { gasLimit: gasLimit }
    );
    console.log(`📡 Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed: ${receipt.hash} (block: ${receipt.blockNumber})`);

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      runId: runId,
      score: score,
      startedAt: startedAt,
      endedAt: endedAt
    });
  } catch (error: any) {
    console.error('💥 Error submitting score:', error);
    
    // Provide more specific error messages for the simplified contract
    let errorMessage = 'Failed to submit score';
    if (error?.message?.includes('score>max')) {
      errorMessage = 'Score exceeds maximum allowed value';
    } else if (error?.message?.includes('bad time')) {
      errorMessage = 'Invalid game time range';
    } else if (error?.message?.includes('runId used')) {
      errorMessage = 'This run ID has already been used';
    } else if (error?.message?.includes('cooldown')) {
      errorMessage = 'Player is still in cooldown period';
    } else if (error?.message?.includes('paused')) {
      errorMessage = 'Contract is currently paused';
    } else if (error?.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error?.message || error 
    });
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