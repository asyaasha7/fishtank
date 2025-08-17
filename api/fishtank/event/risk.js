// Vercel serverless function for recording risk events
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
    const { player, riskScore, eventType } = req.body;

    // Validate inputs
    if (!player || !/^0x[a-fA-F0-9]{40}$/.test(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (typeof riskScore !== 'number' || riskScore < 0) {
      return res.status(400).json({ error: 'Invalid risk score' });
    }

    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    console.log(`Recording risk event: ${player}, risk: ${riskScore}, type: ${eventType}`);

    // For Vercel deployment, just log and return success
    // In production, this would call the actual contract
    res.json({
      success: true,
      txHash: '0x' + Math.random().toString(16).substring(2, 66), // Mock tx hash
      blockNumber: Math.floor(Math.random() * 1000000)
    });
  } catch (error) {
    console.error('Error recording risk event:', error);
    res.status(500).json({ error: 'Failed to record risk event' });
  }
}
