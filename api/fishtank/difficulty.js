// Vercel serverless function for game difficulty
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
    // For Vercel deployment, return default difficulty
    // In production, this would call the actual contract
    res.json({ difficulty: '4' });
  } catch (error) {
    console.error('Error fetching difficulty:', error);
    res.status(500).json({ error: 'Failed to fetch difficulty' });
  }
}
