// Vercel serverless function for Blockscout transactions proxy
module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const limit = parseInt(req.query.limit) || 10;
    // Use the working Blockscout API endpoint
    const blockscoutApiUrl = `https://eth.blockscout.com/api/v2/internal-transactions`;
    
    console.log(`🗡️ Vercel: Proxying Blockscout API request: ${blockscoutApiUrl}`);
    
    const response = await fetch(blockscoutApiUrl, {
      headers: {
        'accept': 'application/json'
      }
    });
    
    console.log(`📡 Vercel: Blockscout API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Vercel: Blockscout API error response: ${errorText}`);
      throw new Error(`Blockscout API responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Vercel: Blockscout API proxy successful, got ${data.items ? data.items.length : 'unknown'} transactions`);
    
    // Extract the items array and limit to requested count
    let transactionData = data.items || data;
    if (Array.isArray(transactionData) && limit) {
      transactionData = transactionData.slice(0, limit);
    }
    
    res.status(200).json(transactionData);
  } catch (error) {
    console.error('❌ Vercel: Blockscout API proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch transactions from Blockscout', 
      details: error.message 
    });
  }
};
