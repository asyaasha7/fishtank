import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
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
  } catch (error) {
    console.warn('⚠️  Initial setup check failed:', error.message);
  }
})();

const fishtankContract = new ethers.Contract(
  process.env.FISHTANK_ADDR!,
  FishtankGameStateABI,
  reporterWallet
);

// EIP-712 Domain for signature verification
const domain = {
  name: "FishtankGameState",
  version: "1",
  chainId: parseInt(process.env.KATANA_CHAIN_ID!),
  verifyingContract: process.env.FISHTANK_ADDR!
};

const types = {
  ScoreSubmission: [
    { name: "player", type: "address" },
    { name: "score", type: "uint256" },
    { name: "health", type: "uint256" },
    { name: "lives", type: "uint256" }
  ]
};

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

    const playerState = await fishtankContract.playerStates(addr);
    const difficulty = await fishtankContract.difficulty();

    res.json({
      player: addr,
      state: {
        score: playerState.score.toString(),
        health: playerState.health.toString(),
        lives: playerState.lives.toString(),
        level: playerState.level.toString()
      },
      difficulty: difficulty.toString()
    });
  } catch (error) {
    console.error('Error fetching player state:', error.message);
    
    // Handle specific contract errors gracefully
    if (error.message.includes('missing revert data') || error.message.includes('execution reverted')) {
      // Player likely doesn't exist in contract yet, return default state
      const { addr } = req.params;
      res.json({
        player: addr,
        state: {
          score: '0',
          health: '0',
          lives: '0',
          level: '0'
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
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get all ScoreSubmitted events from the contract
    const filter = fishtankContract.filters.ScoreSubmitted();
    const events = await fishtankContract.queryFilter(filter, -10000); // Last 10k blocks
    
    // Process events to create leaderboard
    const playerScores = new Map();
    
    events.forEach(event => {
      const { player, score, health, lives } = event.args;
      const playerAddr = player.toLowerCase();
      const scoreValue = parseInt(score.toString());
      
      // Keep the highest score for each player
      if (!playerScores.has(playerAddr) || playerScores.get(playerAddr).score < scoreValue) {
        playerScores.set(playerAddr, {
          player: player,
          score: scoreValue,
          health: parseInt(health.toString()),
          lives: parseInt(lives.toString()),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });
      }
    });
    
    // Convert to array and sort by score (descending)
    const leaderboard = Array.from(playerScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
        address: entry.player,
        displayAddress: `${entry.player.slice(0, 6)}...${entry.player.slice(-4)}`
      }));
    
    res.json({
      leaderboard,
      totalPlayers: playerScores.size,
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

// Submit score with EIP-712 signature
app.post('/api/fishtank/score/submit', async (req, res) => {
  try {
    const { player, score, health, lives } = req.body;

    if (!ethers.isAddress(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    if (typeof health !== 'number' || health < 0) {
      return res.status(400).json({ error: 'Invalid health' });
    }

    if (typeof lives !== 'number' || lives < 0) {
      return res.status(400).json({ error: 'Invalid lives' });
    }

    // Create EIP-712 signature
    const message = {
      player,
      score: BigInt(score),
      health: BigInt(health),
      lives: BigInt(lives)
    };

    const signature = await signerWallet.signTypedData(domain, types, message);

    console.log(`Submitting score: ${player}, score: ${score}, health: ${health}, lives: ${lives}`);
    
    // Check if signer has required role (for debugging)
    try {
      const signerRole = await fishtankContract.SIGNER_ROLE();
      const hasSignerRole = await fishtankContract.hasRole(signerRole, signerWallet.address);
      console.log(`🔐 Signer role check: ${signerWallet.address} has SIGNER_ROLE: ${hasSignerRole}`);
      
      if (!hasSignerRole) {
        console.warn(`⚠️  Warning: Signer wallet ${signerWallet.address} does not have SIGNER_ROLE`);
      }
    } catch (roleError) {
      console.log(`🔍 Role check failed (contract might not support roles):`, roleError.message);
    }

    // Submit to contract with manual gas settings
    const gasLimit = 200000; // Set a reasonable gas limit
    const tx = await fishtankContract.submitScore(player, score, health, lives, signature, {
      gasLimit: gasLimit
    });
    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      signature
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to submit score';
    if (error.message.includes('missing revert data') || error.message.includes('execution reverted')) {
      errorMessage = 'Contract execution failed - check if signer has proper roles and contract state is valid';
    } else if (error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for transaction';
    } else if (error.message.includes('nonce')) {
      errorMessage = 'Transaction nonce issue';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message 
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