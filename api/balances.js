// Vercel serverless function for token balances
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
    const { address } = req.query;
    
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    console.log(`Fetching balances for address: ${address}`);
    
    // For Vercel deployment, return mock data since we don't have CDP credentials
    // In production, you would integrate with CDP API here
    const balances = {
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
    };
    
    res.json(balances);
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
}
