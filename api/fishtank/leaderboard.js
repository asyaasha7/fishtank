// Vercel serverless function for leaderboard
export default function handler(req, res) {
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
    const limit = parseInt(req.query.limit) || 5;
    
    // For Vercel deployment, return mock leaderboard data
    // In production, this would call the actual contract
    const leaderboard = [
      {
        rank: 1,
        player: "0x742d35Cc6651Bc8e3aF8b4f2cFE41d8b7B7e9B3c",
        address: "0x742d35Cc6651Bc8e3aF8b4f2cFE41d8b7B7e9B3c",
        displayAddress: "0x742d...9B3c",
        score: 15750
      },
      {
        rank: 2,
        player: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", 
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        displayAddress: "0xd8dA...6045",
        score: 12340
      }
    ];
    
    console.log(`📊 Top5 Leaderboard requested (limit: ${limit}), found ${leaderboard.length} entries`);
    
    res.json({
      leaderboard: leaderboard.slice(0, limit),
      totalPlayers: leaderboard.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}
