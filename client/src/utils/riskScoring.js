const UINT256_MAX = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export function scoreRisk(e) {
  let risk = 0;
  const reasons = [];

  // Global fast paths
  if (e.lists?.addressOnBlocklist) {
    return { risk: 99, label: "BAD", reasons: ["Blocklisted address"] };
  }

  // Allowlist easing (applied at the end)
  const allowlistEase =
    (e.lists?.protocolAllowlisted ? 20 : 0) +
    (e.token?.verified && e.token?.contractAgeDays > 90 ? 10 : 0) +
    (e.lists?.tokenAllowlisted ? 10 : 0);

  // BT1: Newly deployed scam token transfer
  if (e.typeHints?.includes("Transfer") && e.token?.notAllowlisted) {
    if (
      (e.token.contractAgeDays ?? 999) < 7 ||
      !e.token.verified ||
      e.token.liquidityUSD < 10000 ||
      (e.token.topHoldersPct ?? 0) > 90
    ) {
      if ((e.token.contractAgeDays ?? 999) < 7) { risk += 20; reasons.push("New token (<7d)"); }
      if (!e.token.verified) { risk += 15; reasons.push("Unverified token"); }
      if (e.token.notAllowlisted) { risk += 20; reasons.push("Token not allowlisted"); }
      if (e.token.liquidityUSD < 10000) { risk += 15; reasons.push("Low liquidity"); }
      if ((e.token.topHoldersPct ?? 0) > 90) { risk += 15; reasons.push("Holder concentration"); }
    }
  }

  // BT2: Suspicious infinite approval
  if (e.approval?.method === "approve") {
    if (e.approval.amount === UINT256_MAX) { risk += 25; reasons.push("Infinite approval"); }
    if (e.approval.spenderAllowlisted === false) { risk += 20; reasons.push("Unknown spender"); }
    if (e.approval.spenderVerified === false) { risk += 15; reasons.push("Unverified spender"); }
  }

  // BT3: DEX swap with extreme slippage
  if (e.typeHints?.includes("Swap") || e.dex?.name) {
    if ((e.dex?.slippagePct ?? 0) > 15) { risk += 25; reasons.push("High slippage"); }
    if ((e.dex?.poolLiquidityUSD ?? Infinity) < 50000) { risk += 15; reasons.push("Thin liquidity pool"); }
    if (e.token?.notAllowlisted) { risk += 15; reasons.push("Exotic token"); }
    if (e.gas?.overP99_1h) { risk += 10; reasons.push("Anomalous gas"); }
  }

  // BT4: MEV sandwich leg
  if (e.mev?.isSandwichLeg) {
    if (e.mev.samePool) { risk += 25; reasons.push("Same pool/block pattern"); }
    if (["FRONT-RUN", "BACK-RUN"].includes(e.mev.role)) { risk += 20; reasons.push(`MEV ${e.mev.role}`); }
    if ((e.mev.profitUSD ?? 0) > 0) { risk += 10; reasons.push("Positive MEV profit"); }
  }

  // Apply allowlist easing (but don't go below 0)
  risk = Math.max(0, risk - allowlistEase);

  // Decide label using per-pattern thresholds
  const BAD =
    risk >= 40 || // strict patterns (BT2/BT4)
    (risk >= 35 && (e.typeHints?.includes("Swap") || e.dex)) || // BT3
    (risk >= 30 && e.typeHints?.includes("Transfer")); // BT1

  return { risk, label: BAD ? "BAD" : "GOOD", reasons };
}

// Mock transaction data generator
export function generateMockTransactions() {
  return [
    // BT1: Newly deployed scam token transfer
    {
      id: 1,
      hash: "0x4e8f0a...ab7c",
      from: "0x21e9...c8f1",
      to: "0x1234...beef",
      typeHints: ["Transfer"],
      token: {
        name: "ShibaMoonV2",
        address: "0x9fd8...11aa",
        contractAgeDays: 2,
        verified: false,
        liquidityUSD: 4800,
        topHoldersPct: 94,
        notAllowlisted: true
      },
      amount: "250000000",
      contractCreationDate: "2025-08-13T15:00:00Z",
      category: "Scam Token Transfer"
    },
    
    // BT2: Suspicious approval
    {
      id: 2,
      hash: "0xa9c4f...88ee",
      from: "0x78c3...b1a4",
      to: "0xUnverifiedContract",
      approval: {
        method: "approve",
        amount: UINT256_MAX,
        spenderAllowlisted: false,
        spenderVerified: false
      },
      token: {
        name: "USDC",
        verified: true
      },
      category: "Suspicious Approval"
    },
    
    // BT3: DEX swap with extreme slippage
    {
      id: 3,
      hash: "0x7bc1a...94f0",
      from: "0x4c22...eaf9",
      typeHints: ["Swap"],
      dex: {
        name: "UniswapV3",
        slippagePct: 28.4,
        poolLiquidityUSD: 31000
      },
      token: {
        notAllowlisted: true
      },
      tokenIn: "WETH",
      tokenOut: "DOGEAI",
      amountIn: "0.5",
      amountOut: "2500000",
      category: "Extreme Slippage Swap"
    },
    
    // BT4: MEV sandwich attack
    {
      id: 4,
      hash: "0x9d8c...77fe",
      from: "0xBotAddress",
      mev: {
        isSandwichLeg: true,
        samePool: true,
        role: "FRONT-RUN",
        profitUSD: 42.15
      },
      victimTxHash: "0xab1f...fe10",
      blockNumber: 19837421,
      pool: "WETH/USDC",
      category: "MEV Sandwich Attack"
    }
  ];
}

// New risk scoring system for Blockscout transaction data
export function scoreBlockscoutTransaction(tx) {
  let risk = 0;
  const reasons = [];
  const category = categorizeBlockscoutTransaction(tx);

  // Risk scoring based on contract types and transaction patterns
  if (tx.from?.is_scam || tx.to?.is_scam) {
    risk += 80;
    reasons.push("Scam contract detected");
  }

  if (!tx.success) {
    risk += 15;
    reasons.push("Failed transaction");
  }

  // Gas-based risk (high gas usage can indicate complex operations)
  const gasLimit = parseInt(tx.gas_limit || 0);
  if (gasLimit > 500000) {
    risk += 20;
    reasons.push("High gas usage");
  } else if (gasLimit > 200000) {
    risk += 10;
    reasons.push("Moderate gas usage");
  }

  // Contract verification risk
  if (tx.from?.is_contract && !tx.from?.is_verified) {
    risk += 15;
    reasons.push("Unverified source contract");
  }
  if (tx.to?.is_contract && !tx.to?.is_verified) {
    risk += 15;
    reasons.push("Unverified target contract");
  }

  // Transaction type risk
  if (tx.type === 'delegatecall') {
    risk += 25;
    reasons.push("Delegate call (potential proxy risk)");
  }

  // Special contract patterns
  if (tx.from?.name && tx.from.name.toLowerCase().includes('router')) {
    risk += 10;
    reasons.push("Router interaction");
  }

  // Large value transactions get moderate risk
  if (tx.value && parseFloat(tx.value) > 0) {
    risk += 5;
    reasons.push("Value transfer");
  }

  const riskLevel = risk >= 60 ? "CRITICAL" : 
                   risk >= 40 ? "HIGH" : 
                   risk >= 20 ? "MODERATE" : "LOW";

  return {
    risk,
    label: risk >= 40 ? "BAD" : "GOOD",
    level: riskLevel,
    reasons,
    category
  };
}

// Helper function to safely parse numeric values
function safeParseFloat(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to detect system/infrastructure transactions
function isSystemTransaction(tx) {
  const toAddress = (tx.to?.hash && typeof tx.to.hash === 'string' ? tx.to.hash.toLowerCase() : '');
  const fromAddress = (tx.from?.hash && typeof tx.from.hash === 'string' ? tx.from.hash.toLowerCase() : '');
  const methodCall = (tx.decoded_input?.method_call && typeof tx.decoded_input.method_call === 'string' ? tx.decoded_input.method_call.toLowerCase() : '');
  
  // System addresses
  if (toAddress === '0x4200000000000000000000000000000000000015') return true; // L1Block proxy
  if (fromAddress === '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001') return true; // System address
  
  // System method calls
  if (methodCall.startsWith('setl1blockvalues')) return true;
  if (methodCall.includes('transmit(')) return true;
  
  // System transaction characteristics
  if (tx.type === 126 && tx.gas_price === '0') return true;
  
  return false;
}

// Categorize Blockscout transactions based on contract names and types
export function categorizeBlockscoutTransaction(tx) {
  const fromName = (tx.from?.name && typeof tx.from.name === 'string' ? tx.from.name.toLowerCase() : '');
  const toName = (tx.to?.name && typeof tx.to.name === 'string' ? tx.to.name.toLowerCase() : '');
  const txType = (tx.type && typeof tx.type === 'string' ? tx.type.toLowerCase() : String(tx.type || '').toLowerCase());
  const methodCall = (tx.decoded_input?.method_call && typeof tx.decoded_input.method_call === 'string' ? tx.decoded_input.method_call.toLowerCase() : '');
  const methodId = (tx.decoded_input?.method_id && typeof tx.decoded_input.method_id === 'string' ? tx.decoded_input.method_id.toLowerCase() : '');

  // HIGH-RISK CATEGORIES (these show up when detected)
  
  if (tx.from?.is_scam || tx.to?.is_scam) {
    return {
      name: "Toxic Predator",
      description: "Malicious contract attempting to steal funds or data",
      avatar: "☠️",
      background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
      riskLevel: "CRITICAL",
      category: "Malicious Activity"
    };
  }

  if (!tx.success) {
    return {
      name: "Pufferfish Trap",
      description: "Failed transaction that could indicate a trap or error",
      avatar: "🐡",
      background: "linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)",
      riskLevel: "HIGH",
      category: "Failed Transaction"
    };
  }

  if (txType === 'delegatecall' || fromName.includes('proxy') || toName.includes('proxy')) {
    return {
      name: "Proxy Operator",
      description: "Executes operations through proxy contracts",
      avatar: "🔗",
      background: "linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)",
      riskLevel: "HIGH",
      category: "Proxy Operation"
    };
  }

  // SYSTEM/INFRASTRUCTURE CATEGORIES (always interesting)
  
  if (isSystemTransaction(tx)) {
    const toAddress = tx.to?.hash?.toLowerCase() || '';
    const fromAddress = tx.from?.hash?.toLowerCase() || '';
    const methodCall = tx.decoded_input?.method_call?.toLowerCase() || '';
    
    // L1 Sync Beacon
    if (toAddress === '0x4200000000000000000000000000000000000015' || 
        methodCall.startsWith('setl1blockvalues')) {
      return {
        name: "L1 Sync Beacon",
        description: "L1→L2 state synchronization keeping the network in sync",
        avatar: "🔮",
        background: "linear-gradient(135deg, #00cec9 0%, #55a3ff 100%)",
        riskLevel: "LOW",
        category: "Network Infrastructure"
      };
    }
    
    // Oracle Pulse
    if ((tx.to?.name || '').toLowerCase().includes('commitstore') || 
        methodCall.includes('transmit(')) {
      return {
        name: "Oracle Pulse",
        description: "Oracle reporting real-world data to the blockchain",
        avatar: "📡",
        background: "linear-gradient(135deg, #fd79a8 0%, #e84393 100%)",
        riskLevel: "LOW",
        category: "Oracle Network"
      };
    }
    
    // System Keeper
    if (fromAddress === '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001' || 
        (tx.type === 126 && tx.gas_price === '0')) {
      return {
        name: "System Keeper",
        description: "Network maintenance keeping the blockchain healthy",
        avatar: "🔧",
        background: "linear-gradient(135deg, #636e72 0%, #2d3436 100%)",
        riskLevel: "LOW",
        category: "System Maintenance"
      };
    }
  }

  // MODERATE-RISK CATEGORIES (common DeFi activity)
  
  if (fromName.includes('uniswap') || toName.includes('uniswap') || 
      fromName.includes('router') || toName.includes('router')) {
    return {
      name: "DeFi Trader",
      description: "Engaged in decentralized exchange operations and trading",
      avatar: "🔄",
      background: "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)",
      riskLevel: "MODERATE",
      category: "DeFi Trading"
    };
  }

  // Token approval detection
  if (methodId === '0x095ea7b3' || methodCall.includes('approve(')) {
    const isInfinite = tx.decoded_input?.parameters?.some(p => 
      p.name?.toLowerCase().includes('value') && 
      /^0x?f{60,}$/i.test(String(p.value))
    );
    return {
      name: isInfinite ? "Infinite Approver" : "Token Approver",
      description: isInfinite ? 
        "Granting unlimited token spending permissions - use caution!" :
        "Setting controlled token spending limits",
      avatar: isInfinite ? "⚠️" : "✅",
      background: isInfinite ? 
        "linear-gradient(135deg, #ff7675 0%, #d63031 100%)" :
        "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
      riskLevel: isInfinite ? "HIGH" : "LOW",
      category: "Token Approval"
    };
  }

  // MODERATE-RISK CATEGORIES (DeFi and complex operations)
  
  // Bridge transactions  
  if (fromName.includes('bridge') || toName.includes('bridge') ||
      fromName.includes('spoke') || toName.includes('spoke')) {
    return {
      name: "Bridge Navigator",
      description: "Cross-chain asset transfers connecting different networks",
      avatar: "🌉",
      background: "linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)",
      riskLevel: "MODERATE",
      category: "Cross-chain Bridge"
    };
  }

  // Contract creation
  if (tx.created_contract) {
    return {
      name: "Contract Creator",
      description: "Deploying new smart contracts to the blockchain",
      avatar: "🏗️",
      background: "linear-gradient(135deg, #e17055 0%, #f39c12 100%)",
      riskLevel: "MODERATE",
      category: "Contract Deployment"
    };
  }

  // Lending/Borrowing protocols
  if (fromName.includes('aave') || toName.includes('aave') ||
      fromName.includes('compound') || toName.includes('compound') ||
      methodCall.includes('borrow') || methodCall.includes('lend') ||
      methodCall.includes('repay') || methodCall.includes('supply')) {
    return {
      name: "DeFi Banker",
      description: "Managing loans and lending protocols",
      avatar: "🏦",
      background: "linear-gradient(135deg, #00cec9 0%, #0984e3 100%)",
      riskLevel: "MODERATE",
      category: "DeFi Lending"
    };
  }

  // Yield farming and liquidity providing
  if (methodCall.includes('stake') || methodCall.includes('unstake') ||
      methodCall.includes('addliquidity') || methodCall.includes('removeliquidity') ||
      fromName.includes('pool') || toName.includes('pool') ||
      fromName.includes('farm') || toName.includes('farm')) {
    return {
      name: "Yield Farmer",
      description: "Cultivating profits through liquidity provision and staking",
      avatar: "🌾",
      background: "linear-gradient(135deg, #55a3ff 0%, #003d82 100%)",
      riskLevel: "MODERATE",
      category: "Yield Farming"
    };
  }

  // LOW-RISK CATEGORIES (safe and common)
  
  // Stablecoin operations with more variety
  if (fromName.includes('usdc') || toName.includes('usdc')) {
    return {
      name: "USDC Custodian", 
      description: "Managing USD Coin - the reliable digital dollar",
      avatar: "🏛️",
      background: "linear-gradient(135deg, #0052ff 0%, #0041cc 100%)",
      riskLevel: "LOW",
      category: "Stablecoin"
    };
  }

  if (fromName.includes('tether') || toName.includes('tether') ||
      fromName.includes('usdt') || toName.includes('usdt')) {
    return {
      name: "Tether Guardian", 
      description: "Handling USDT - the most traded stablecoin",
      avatar: "🛡️",
      background: "linear-gradient(135deg, #50a150 0%, #3d8b3d 100%)",
      riskLevel: "LOW",
      category: "Stablecoin"
    };
  }

  if (fromName.includes('weth') || toName.includes('weth')) {
    return {
      name: "ETH Wrapper",
      description: "Converting between ETH and WETH for DeFi compatibility",
      avatar: "🎁",
      background: "linear-gradient(135deg, #627eea 0%, #4e63d2 100%)",
      riskLevel: "LOW",
      category: "Token Wrapping"
    };
  }

  // MEV and arbitrage detection
  if (tx.value && safeParseFloat(tx.value) === 0 && tx.gas_price && 
      safeParseFloat(tx.gas_price) > 100000000000) { // High gas price, no value = likely MEV
    return {
      name: "MEV Hunter",
      description: "Extracting maximal extractable value through arbitrage",
      avatar: "🎯",
      background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
      riskLevel: "MODERATE",
      category: "MEV Activity"
    };
  }

  // NFT marketplace activity
  if (fromName.includes('opensea') || toName.includes('opensea') ||
      fromName.includes('nft') || toName.includes('nft') ||
      methodCall.includes('safetransferfrom') && methodCall.includes('721')) {
    return {
      name: "NFT Collector",
      description: "Trading unique digital assets and collectibles",
      avatar: "🖼️",
      background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
      riskLevel: "LOW",
      category: "NFT Trading"
    };
  }

  // Multi-signature wallet operations
  if (fromName.includes('multisig') || toName.includes('multisig') ||
      fromName.includes('gnosis') || toName.includes('gnosis') ||
      methodCall.includes('confirmt') || methodCall.includes('executet')) {
    return {
      name: "Multi-Sig Coordinator",
      description: "Managing multi-signature wallet operations",
      avatar: "🔐",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      riskLevel: "LOW",
      category: "Multi-Signature"
    };
  }

  // Large value transfers (whales)
  const txValue = safeParseFloat(tx.value);
  if (txValue > 10000000000000000000) { // > 10 ETH
    return {
      name: "Whale Trader",
      description: "High-value transactions moving significant capital",
      avatar: "🐋",
      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      riskLevel: "MODERATE",
      category: "High Value"
    };
  }

  // Gas optimization patterns
  if (tx.gas_price && safeParseFloat(tx.gas_price) < 10000000000) { // Very low gas
    return {
      name: "Gas Optimizer",
      description: "Smart trader minimizing transaction costs",
      avatar: "⚡",
      background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
      riskLevel: "LOW",
      category: "Gas Optimization"
    };
  }

  // Internal transaction patterns
  if (tx.internal_transaction || tx.type === 'call' && !tx.input) {
    return {
      name: "Internal Navigator",
      description: "Contract-to-contract communication and internal calls",
      avatar: "🔄",
      background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      riskLevel: "LOW",
      category: "Internal Transaction"
    };
  }

  // ERC-20 transfer with more specific categorization
  if (methodId === '0xa9059cbb' || tx.token_transfers?.length || 
      methodCall.includes('transfer(')) {
    
    // Check if it's a batch transfer
    if (tx.token_transfers?.length > 1) {
      return {
        name: "Batch Distributor",
        description: "Efficiently distributing tokens to multiple recipients",
        avatar: "📊",
        background: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
        riskLevel: "LOW",
        category: "Batch Transfer"
      };
    }
    
    return {
      name: "Token Courier",
      description: "Moving tokens between addresses across the network",
      avatar: "📦",
      background: "linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)",
      riskLevel: "LOW",
      category: "Token Transfer"
    };
  }

  // Contract interaction without specific pattern
  if (tx.to?.is_contract && !methodCall) {
    return {
      name: "Contract Whisperer",
      description: "Mysterious interactions with smart contracts",
      avatar: "🔮",
      background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      riskLevel: "LOW",
      category: "Contract Interaction"
    };
  }

  // Default for normal transactions
  return {
    name: "Transaction Miner",
    description: "Standard blockchain transaction processing",
    avatar: "⚡",
    background: "linear-gradient(135deg, #81ecec 0%, #74b9ff 100%)",
    riskLevel: "LOW",
    category: "Standard Current"
  };
}

// Legacy function for compatibility
export function categorizeTransaction(transaction) {
  if (transaction.category) {
    // Old format transaction
    const riskAnalysis = scoreRisk(transaction);
    
    const categories = {
      "Scam Token Transfer": {
        name: "Scam Token Hunter",
        description: "Specializes in detecting newly deployed scam tokens with suspicious characteristics",
        avatar: "🕵️‍♂️",
        background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
        riskLevel: "EXTREME"
      },
      "Suspicious Approval": {
        name: "Approval Guardian", 
        description: "Monitors infinite approvals to unknown or unverified contracts",
        avatar: "🛡️",
        background: "linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)",
        riskLevel: "HIGH"
      },
      "Extreme Slippage Swap": {
        name: "Slippage Sentinel",
        description: "Identifies DEX swaps with extreme slippage and thin liquidity pools", 
        avatar: "⚡",
        background: "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)",
        riskLevel: "HIGH"
      },
      "MEV Sandwich Attack": {
        name: "MEV Detective",
        description: "Tracks MEV sandwich attacks and front-running patterns",
        avatar: "🤖",
        background: "linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)",
        riskLevel: "CRITICAL"
      }
    };

    return {
      ...categories[transaction.category],
      transaction,
      riskAnalysis
    };
  } else {
    // New Blockscout format
    return scoreBlockscoutTransaction(transaction);
  }
}
