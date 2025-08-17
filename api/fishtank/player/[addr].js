// Vercel serverless function for player state
module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { addr } = req.query;
    
    if (!addr || typeof addr !== 'string') {
      return res.status(400).json({ error: 'Invalid address' });
    }

    // More lenient validation - just check if it looks like an Ethereum address
    if (!addr.startsWith('0x') || addr.length !== 42) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    // For Vercel deployment, return default player state
    // In production, this would call the actual contract
    res.json({
      player: addr,
      state: {
        bestScore: "0",
        lastScore: "0", 
        runs: "0",
        lastPlayedAt: "0",
        lastRunId: "0x0000000000000000000000000000000000000000000000000000000000000000"
      },
      difficulty: '4'
    });
  } catch (error) {
    console.error('Error fetching player state:', error);
    res.status(500).json({ error: 'Failed to fetch player state' });
  }
}
