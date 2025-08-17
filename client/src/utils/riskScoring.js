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

// Categorize transaction based on risk analysis
export function categorizeTransaction(transaction) {
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
}
