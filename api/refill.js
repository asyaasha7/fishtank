// Vercel serverless function for health refill (x402 pattern)
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Payment, X-Current-Health, X-Player-Address');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const paymentHeader = req.headers['x-payment'];
    const currentHealth = parseInt(req.headers['x-current-health']) || 9;
    const playerAddress = req.headers['x-player-address'];
    
    console.log('Refill request:', { paymentHeader, currentHealth, playerAddress });

    // If no payment proof, return 402 Payment Required
    if (!paymentHeader) {
      return res.status(402).json({
        payment: {
          price: '0.01',
          currency: 'USDC',
          network: 'base',
          receiver: process.env.REFILL_RECEIVER || '0x742a4a9F23E8C14e8C20320E6e0B3E9e2DF5A5F8',
          memo: 'Refill +3 HP'
        }
      });
    }

    // Validate payment (simplified for demo)
    let paymentValid = false;
    
    if (paymentHeader === 'demo-ok' || (typeof paymentHeader === 'string' && paymentHeader.startsWith('0x'))) {
      // For demo: accept "demo-ok" or any hex string as valid payment
      paymentValid = true;
      console.log('Payment accepted (demo mode)');
    }

    if (!paymentValid) {
      return res.status(400).json({ error: 'Invalid payment proof' });
    }

    // Calculate new health
    const healthIncrease = parseInt(process.env.REFILL_AMOUNT_HP || '3');
    const newHealth = Math.min(currentHealth + healthIncrease, 9); // Cap at 9 HP
    
    console.log(`Health refilled: ${currentHealth} → ${newHealth}`);

    res.json({
      ok: true,
      newHealth,
      healthIncrease,
      message: `Health refilled! +${healthIncrease} HP`
    });
  } catch (error) {
    console.error('Refill error:', error);
    res.status(500).json({ error: 'Refill failed' });
  }
}
