// Vercel serverless function for Coinbase onramp URL generation
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

    // Build Coinbase Pay URL with new API parameters
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
}
