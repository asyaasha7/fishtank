// Vercel serverless function for recording health refill events
module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { player, newHealth } = req.body;

    // Validate inputs
    if (!player || !/^0x[a-fA-F0-9]{40}$/.test(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (typeof newHealth !== 'number' || newHealth < 0) {
      return res.status(400).json({ error: 'Invalid health value' });
    }

    console.log(`Recording health refill: ${player}, health: ${newHealth}`);

    // For Vercel deployment, just log and return success
    // In production, this would call the actual contract
    res.json({
      success: true,
      txHash: '0x' + Math.random().toString(16).substring(2, 66), // Mock tx hash
      blockNumber: Math.floor(Math.random() * 1000000)
    });
  } catch (error) {
    console.error('Error recording health refill:', error);
    res.status(500).json({ error: 'Failed to record health refill' });
  }
}
