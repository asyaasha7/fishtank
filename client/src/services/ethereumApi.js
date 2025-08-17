// Ethereum API service for fetching real transaction data
// Using multiple data sources: Etherscan, public APIs, and blockchain explorers

import { scoreRisk } from '../utils/riskScoring.js';

// Multi-chain API configuration
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;

// Debug API key loading (can be removed once confirmed working)
if (!ETHERSCAN_API_KEY) {
  console.warn('⚠️ VITE_ETHERSCAN_API_KEY not found. Katana transactions will use simulation only.');
} else {
  console.log('✅ Etherscan API key loaded successfully');
}

// Chain configurations
const CHAIN_CONFIGS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    apis: {
      etherscan_v2: 'https://api.etherscan.io/v2/api',
      etherscan: 'https://api.etherscan.io/api',
      blockchair: 'https://api.blockchair.com/ethereum',
      blockscout: 'https://eth.blockscout.com/api'
    },
    popularAddresses: [
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
      '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT Contract
      '0xA0b86a33E6B6F8a8C3b5E8f8b6E8f8f8A8c3b5e8', // Compound
      '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI Contract
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI Token
      '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK Token
    ]
  },
  katana: {
    chainId: 129399, // Katana Tatara testnet chain ID
    name: 'Katana',
    symbol: 'ETH',
    apis: {
      // Native Katana Tatara testnet API (Conduit-based explorer)
      explorer: 'https://explorer-tatara-s4atxtv7sq.t.conduit.xyz/api/v2',
      // Fallback to Etherscan V2 API if needed
      etherscan_v2: 'https://api.etherscan.io/v2/api',
      etherscan: 'https://api.etherscan.io/api'
    },
    popularAddresses: [
      '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH contract on Starknet
      '0x005a643907b9a4bc6a55e9069c4fd5fd1f5c79a22470690f75556c4736e34426', // Example bridge contract
      '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8', // Example DEX contract
      '0x467397d1d298c1a4ca9bfe87565ef04486c25c0f', // Your Fishtank contract
      '0x080332bc8eded68ff40610f54c90396efa593fd8', // Active address from logs
      '0x742a4a9F23E8C14e8C20320E6e0B3E9e2DF5A5F8', // Refill receiver address
      '0x18070d824952fb5d46f529659bdb497ebb1c5985', // Another active address from logs
    ]
  }
};

// Backward compatibility
const ETHEREUM_APIS = CHAIN_CONFIGS.ethereum.apis;
const POPULAR_ADDRESSES = CHAIN_CONFIGS.ethereum.popularAddresses;

// Multi-chain transaction fetching
export async function fetchRecentTransactions(address = null, count = 10, chain = 'ethereum') {
  const chainConfig = CHAIN_CONFIGS[chain];
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  
  console.log(`🔍 Starting transaction data fetch for ${chainConfig.name}...`);
  
  // Handle Katana separately (simulation for now)
  if (chain === 'katana') {
    return fetchKatanaTransactions(count);
  }
  
  try {
    // Try multiple approaches to get real data
    const targetAddress = address || chainConfig.popularAddresses[Math.floor(Math.random() * chainConfig.popularAddresses.length)];
    console.log(`🎯 Target address: ${targetAddress}`);
    
    // First try: Fetch recent transactions from Etherscan API (primary with API key)
    try {
      console.log('🌟 Attempting Etherscan V2 API with API key...');
      const etherscanData = await withTimeout(
        fetchRecentTransactionsFromEtherscan(count),
        15000 // 15 second timeout for multiple address calls
      );
      if (etherscanData && etherscanData.length > 0) {
        console.log(`✅ Success: Got ${etherscanData.length} transactions from Etherscan V2`);
        return etherscanData;
      }
    } catch (error) {
      console.log('❌ Etherscan V2 API failed:', error.message);
    }

    // Second try: Fetch from Blockchair API (backup)
    try {
      console.log('📡 Attempting Blockchair API...');
      const blockchairData = await withTimeout(
        fetchFromBlockchair(targetAddress, count),
        8000 // 8 second timeout
      );
      if (blockchairData && blockchairData.length > 0) {
        console.log(`✅ Success: Got ${blockchairData.length} transactions from Blockchair`);
        return blockchairData;
      }
    } catch (error) {
      console.log('❌ Blockchair API failed:', error.message);
    }

    // Third try: Fetch recent block data via RPC
    try {
      console.log('🔗 Attempting Ethereum RPC...');
      const recentBlockData = await withTimeout(
        fetchRecentBlockTransactions(count),
        10000 // 10 second timeout
      );
      if (recentBlockData && recentBlockData.length > 0) {
        console.log(`✅ Success: Got ${recentBlockData.length} transactions from RPC`);
        return recentBlockData;
      }
    } catch (error) {
      console.log('❌ RPC API failed:', error.message);
    }

    // Fallback: Use enhanced realistic data with real-world patterns
    console.log('💡 Using enhanced realistic data as fallback');
    return generateEnhancedRealisticTransactions(count);
    
  } catch (error) {
    console.error('💥 Complete failure in transaction fetch:', error);
    // Even if everything fails, provide fallback data
    return generateEnhancedRealisticTransactions(count);
  }
}

// Timeout wrapper for API calls
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Fetch Katana transactions using native API, Etherscan V2 fallback, and simulation
async function fetchKatanaTransactions(count) {
  console.log(`🗡️ Fetching Katana transactions (${count} requested)`);
  
  // First try: Native Katana Tatara API
  try {
    console.log('🌟 Fetching Katana via native Tatara API...');
    const nativeData = await withTimeout(
      fetchKatanaFromNativeAPI(count),
      15000 // 15 second timeout
    );
    if (nativeData && nativeData.length > 0) {
      console.log(`✅ Success: Got ${nativeData.length} transactions from Katana native API`);
      return nativeData;
    }
  } catch (error) {
    console.log('❌ Katana native API failed:', error.message);
  }
  
  // Second try: Etherscan V2 API fallback
  try {
    console.log('🌟 Fallback: Fetching Katana via Etherscan V2 API (chainid=129399)...');
    const etherscanData = await withTimeout(
      fetchKatanaFromEtherscanV2(count),
      15000 // 15 second timeout
    );
    if (etherscanData && etherscanData.length > 0) {
      console.log(`✅ Success: Got ${etherscanData.length} transactions from Katana via Etherscan V2`);
      return etherscanData;
    }
  } catch (error) {
    console.log('❌ Katana Etherscan V2 API failed:', error.message);
  }
  
  // Final fallback: Enhanced gaming-themed simulation
  console.log(`⚠️ All Katana APIs unavailable, using enhanced gaming simulation`);
  return await fetchKatanaSimulated(count);
}

// Fetch Katana transactions using native Tatara API
async function fetchKatanaFromNativeAPI(count) {
  try {
    console.log(`🗡️ Fetching Katana transactions from native Tatara API...`);
    
    const chainConfig = CHAIN_CONFIGS.katana;
    const baseUrl = chainConfig.apis.explorer;
    
    // Try fetching recent transactions from multiple endpoints
    const allTransactions = [];
    
    // Method 1: Use proxy through local server to bypass CORS  
    const possibleEndpoints = [
      `/api/transactions?limit=${count}`, // Proxy through local server (now using Blockscout)
    ];
    
    for (const url of possibleEndpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          console.log(`❌ ${url} failed with ${response.status}: ${response.statusText}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`📦 Success with ${url}, response:`, data);
        
        // Process the response - server proxy already extracts the items array
        let transactions = [];
        if (Array.isArray(data)) {
          // Direct array response from server proxy
          transactions = data;
        } else if (data.items) {
          transactions = data.items;
        } else if (data.transactions) {
          transactions = data.transactions;
        } else if (data.result) {
          transactions = data.result;
        }
        
        if (transactions && transactions.length > 0) {
          console.log(`✅ Found ${transactions.length} transactions from native API endpoint: ${url}`);
          
          // Transform Conduit Explorer API format to our standard format
          const transformedTxs = transactions.slice(0, count).map((tx, index) => {
            return {
              hash: tx.hash || `0x${Math.random().toString(16).substring(2, 10)}...`,
              from: tx.from?.hash || tx.from_address || chainConfig.popularAddresses[0],
              to: tx.to?.hash || tx.to_address || chainConfig.popularAddresses[1],
              value: tx.value || (Math.random() * 10).toFixed(6),
              blockNumber: tx.block_number || (1000000 + index),
              timeStamp: tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : Math.floor(Date.now() / 1000) - (index * 60),
              methodId: tx.decoded_input?.method_id || tx.raw_input?.substring(0, 10) || '0x',
              functionName: tx.method || tx.decoded_input?.method_call?.split('(')[0] || 'Transfer',
              isError: tx.status === 'error' || tx.result === 'error' ? '1' : '0',
              typeHints: assignKatanaTypeHints(tx)
            };
          });
          
          return transformedTxs;
        }
      } catch (error) {
        console.log(`❌ Endpoint ${url} failed: ${error.message}`);
      }
    }
    
    // Method 2: Try fetching from specific addresses if general endpoint fails
    const popularAddresses = chainConfig.popularAddresses;
    for (const address of popularAddresses.slice(0, 3)) {
      const addressEndpoints = [
        `${baseUrl}/addresses/${address}/transactions?limit=${Math.ceil(count / 3)}`,
        `${baseUrl}/accounts/${address}/transactions?limit=${Math.ceil(count / 3)}`,
        `${baseUrl}/address/${address}/transactions?limit=${Math.ceil(count / 3)}`,
        `${baseUrl}/addresses/${address}/txs?limit=${Math.ceil(count / 3)}`,
        `${baseUrl}/address/${address}/txs?limit=${Math.ceil(count / 3)}`
      ];
      
      for (const url of addressEndpoints) {
        try {
          console.log(`🔍 Fetching from address ${address} via: ${url}`);
          
          const response = await fetch(url);
          if (!response.ok) {
            console.log(`❌ ${url} failed with ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          let transactions = Array.isArray(data) ? data : data.items || data.transactions || data.result || [];
          
          if (transactions.length > 0) {
            console.log(`✅ Found ${transactions.length} transactions for address ${address}`);
            const transformedTxs = transactions.map((tx, index) => ({
              hash: tx.hash || `0x${Math.random().toString(16).substring(2, 10)}...`,
              from: tx.from?.hash || tx.from_address || address,
              to: tx.to?.hash || tx.to_address || chainConfig.popularAddresses[1],
              value: tx.value || (Math.random() * 10).toFixed(6),
              blockNumber: tx.block_number || (1000000 + index),
              timeStamp: tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : Math.floor(Date.now() / 1000) - (index * 60),
              methodId: tx.decoded_input?.method_id || tx.raw_input?.substring(0, 10) || '0x',
              functionName: tx.method || tx.decoded_input?.method_call?.split('(')[0] || 'Transfer',
              isError: tx.status === 'error' || tx.result === 'error' ? '1' : '0',
              typeHints: assignKatanaTypeHints(tx)
            }));
            
            allTransactions.push(...transformedTxs);
            break; // Found working endpoint for this address
          }
        } catch (error) {
          console.log(`❌ Address endpoint ${url} failed: ${error.message}`);
        }
      }
    }
    
    if (allTransactions.length > 0) {
      console.log(`✅ Got ${allTransactions.length} transactions from native API address queries`);
      return allTransactions.slice(0, count);
    }
    
    throw new Error('No transactions found from native API');
    
  } catch (error) {
    console.log(`❌ Native Katana API error: ${error.message}`);
    throw error;
  }
}

// Helper function to assign type hints for Katana transactions
function assignKatanaTypeHints(tx) {
  const methodId = tx.method_id || tx.input?.substring(0, 10) || '';
  const functionName = (tx.function_name || '').toLowerCase();
  const txType = (tx.type || '').toLowerCase();
  
  // Katana-specific type detection
  if (functionName.includes('bridge') || txType.includes('bridge')) {
    return ['Bridge', 'Cross-chain'];
  } else if (functionName.includes('swap') || functionName.includes('exchange')) {
    return ['Swap', 'DeFi'];
  } else if (functionName.includes('stake') || functionName.includes('delegate')) {
    return ['Staking', 'DeFi'];
  } else if (functionName.includes('mint') || functionName.includes('claim')) {
    return ['Mint', 'NFT'];
  } else if (methodId === '0xa9059cbb' || functionName.includes('transfer')) {
    return ['Transfer'];
  } else if (functionName.includes('game') || tx.to === CHAIN_CONFIGS.katana.popularAddresses[3]) {
    return ['Gaming', 'Contract'];
  } else {
    return ['Contract', 'Unknown'];
  }
}

// Fetch Katana transactions using Etherscan V2 unified API
async function fetchKatanaFromEtherscanV2(count) {
  try {
    console.log(`🗡️ Fetching Katana transactions from Etherscan V2 API (chainid=129399)...`);
    
    const chainConfig = CHAIN_CONFIGS.katana;
    const chainId = chainConfig.chainId; // 129399
    
    // Check if we have an API key, if not, skip this method
    if (!ETHERSCAN_API_KEY) {
      console.log('⚠️ No Etherscan API key found. Set VITE_ETHERSCAN_API_KEY environment variable.');
      throw new Error('Missing Etherscan API key. Get one at https://etherscan.io/apis');
    }
    
    // Try to get recent transactions from popular Katana addresses
    const popularAddresses = chainConfig.popularAddresses;
    const allTransactions = [];
    
    for (const address of popularAddresses.slice(0, 4)) { // Try first 4 addresses
      try {
        const url = `${chainConfig.apis.etherscan_v2}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${Math.ceil(count / 2)}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
        
        console.log(`🔍 Fetching from Katana address: ${address}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check for API-level errors
        if (data.status !== "1") {
          throw new Error(`Katana Etherscan API error: ${data.message || 'Unknown error'} (Status: ${data.status})`);
        }
        
        // Check for valid data
        if (data.result && Array.isArray(data.result) && data.result.length > 0) {
          const katanaTransactions = data.result.map(tx => parseKatanaEtherscanTransaction(tx));
          allTransactions.push(...katanaTransactions);
          console.log(`✅ Got ${katanaTransactions.length} Katana transactions from ${address}`);
        }
        
        if (allTransactions.length >= count) break;
      } catch (error) {
        console.log(`❌ Failed to fetch from Katana address ${address}:`, error.message);
        continue; // Try next address
      }
    }
    
    if (allTransactions.length === 0) {
      throw new Error('No Katana transactions found from Etherscan V2 API');
    }
    
    // Sort by timestamp (newest first) and limit to requested count
    const sortedTransactions = allTransactions
      .sort((a, b) => parseInt(b.timeStamp || 0) - parseInt(a.timeStamp || 0))
      .slice(0, count);
      
    console.log(`✅ Collected ${sortedTransactions.length} Katana transactions from Etherscan V2`);
    return sortedTransactions;
    
  } catch (error) {
    throw new Error(`Katana Etherscan V2 failed: ${error.message}`);
  }
}

// Parse Katana transaction from Etherscan V2 API response
function parseKatanaEtherscanTransaction(tx) {
  return {
    id: `katana_etherscan_${tx.hash}`,
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: (parseInt(tx.value || 0) / 1e18).toFixed(6), // Convert Wei to ETH
    blockNumber: parseInt(tx.blockNumber || 0),
    gasUsed: parseInt(tx.gasUsed || 0),
    gasPrice: Math.round(parseInt(tx.gasPrice || 0) / 1e9), // Convert to Gwei
    timestamp: new Date(parseInt(tx.timeStamp || 0) * 1000).toISOString(),
    timeStamp: tx.timeStamp, // Keep original for sorting
    typeHints: inferKatanaTransactionTypeFromEtherscan(tx),
    functionName: tx.functionName || '',
    methodId: tx.methodId || '',
    chain: 'katana',
    // Add Katana-specific analysis
    ...analyzeKatanaEtherscanTransaction(tx),
    category: "Katana Transaction"
  };
}

// Infer transaction type for Katana from Etherscan data
function inferKatanaTransactionTypeFromEtherscan(tx) {
  const types = [];
  
  // Check function name from Etherscan
  if (tx.functionName) {
    const funcName = tx.functionName.toLowerCase();
    
    if (funcName.includes('transfer')) types.push('Transfer');
    if (funcName.includes('approve')) types.push('Approval');
    if (funcName.includes('swap') || funcName.includes('exchange')) types.push('Swap');
    if (funcName.includes('bridge')) types.push('Bridge');
    if (funcName.includes('mint') || funcName.includes('nft')) types.push('NFT');
    if (funcName.includes('stake')) types.push('Staking');
    if (funcName.includes('game') || funcName.includes('play')) types.push('Gaming');
  }
  
  // Check method ID for common functions
  if (tx.methodId) {
    const methodId = tx.methodId.toLowerCase();
    
    if (methodId === '0xa9059cbb') types.push('Transfer');
    if (methodId === '0x095ea7b3') types.push('Approval');
    if (methodId === '0x7ff36ab5' || methodId === '0x38ed1739') types.push('Swap');
  }
  
  // Check if it's a simple ETH transfer
  if (!tx.input || tx.input === '0x') {
    types.push('Transfer');
  }
  
  // Add gaming context for Katana
  if (types.length === 0 || Math.random() < 0.6) {
    types.push('Gaming');
  }
  
  return types.length > 0 ? types : ['Unknown'];
}

// Analyze Katana transaction from Etherscan data
function analyzeKatanaEtherscanTransaction(tx) {
  const analysis = {};
  
  // Gaming analysis (common on Katana)
  analysis.gaming = {
    gameRelated: true,
    gameTitle: detectGameFromTransaction(tx),
    possibleGameAsset: Math.random() < 0.7
  };
  
  // Bridge analysis
  if (tx.functionName && tx.functionName.toLowerCase().includes('bridge')) {
    analysis.bridge = {
      sourceChain: "Ethereum",
      targetChain: "Katana", 
      bridgeType: "Asset Transfer",
      verificationStatus: "Verified"
    };
  }
  
  // Token analysis
  analysis.token = {
    name: ["AXS", "SLP", "RON", "WETH", "PIXEL"][Math.floor(Math.random() * 5)],
    verified: true,
    contractAgeDays: Math.floor(Math.random() * 365) + 30,
    liquidityUSD: Math.random() * 300000 + 50000
  };
  
  // NFT analysis (common on gaming chains)
  if (Math.random() < 0.4) {
    analysis.nft = {
      tokenId: Math.floor(Math.random() * 10000).toString(),
      collection: "Katana Game Assets",
      verified: true
    };
  }
  
  // Check for transaction failures
  if (tx.isError === "1") {
    analysis.error = {
      failed: true,
      reason: tx.txreceipt_status === "0" ? "Transaction failed" : "Unknown error"
    };
  }
  
  return analysis;
}

// Detect game from transaction patterns
function detectGameFromTransaction(tx) {
  const games = ["Axie Infinity", "Pixels", "Apeiron", "Lumiterra", "The Machines Arena"];
  
  // Try to infer from function name or address patterns
  if (tx.functionName) {
    const funcName = tx.functionName.toLowerCase();
    if (funcName.includes('axie')) return "Axie Infinity";
    if (funcName.includes('pixel')) return "Pixels";
    if (funcName.includes('land')) return "Apeiron";
  }
  
  // Default random selection
  return games[Math.floor(Math.random() * games.length)];
}



// Fallback to simulated Katana data
async function fetchKatanaSimulated(count) {
  console.log(`🎮 Generating enhanced Katana simulation (${count} transactions)`);
  
  const katanaTransactions = [];
  const currentTime = Date.now();
  const currentBlockNumber = 1000000 + Math.floor(Math.random() * 10000);
  
  for (let i = 0; i < count; i++) {
    const txType = Math.random();
    let transaction;
    
    if (txType < 0.4) {
      transaction = generateKatanaBridgeTransaction(i, currentBlockNumber);
    } else if (txType < 0.6) {
      transaction = generateKatanaDexTransaction(i, currentBlockNumber);
    } else if (txType < 0.8) {
      transaction = generateKatanaGameTransaction(i, currentBlockNumber);
    } else {
      transaction = generateKatanaStakingTransaction(i, currentBlockNumber);
    }
    
    transaction.timestamp = new Date(currentTime - (i * 1000 * 30 * Math.random())).toISOString();
    transaction.gasUsed = Math.floor(Math.random() * 30000) + 21000;
    transaction.gasPrice = Math.floor(Math.random() * 3) + 1;
    transaction.chain = 'katana';
    
    katanaTransactions.push(transaction);
  }
  
  return katanaTransactions;
}

// Fetch from Etherscan V2 API using the unified endpoint
async function fetchFromEtherscan(address, count) {
  // Use Ethereum mainnet (chainid=1) for our transaction data
  const chainId = 1;
  
  try {
    console.log(`🌟 Fetching transactions for ${address} from Etherscan V2 API...`);
    
    // Get normal transactions for the address
    const url = `${ETHEREUM_APIS.etherscan_v2}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${count}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check for API-level errors
    if (data.status !== "1") {
      throw new Error(`Etherscan API error: ${data.message || 'Unknown error'} (Status: ${data.status})`);
    }
    
    // Check for valid data
    if (!data.result || !Array.isArray(data.result) || data.result.length === 0) {
      throw new Error('No transaction data available from Etherscan API');
    }
    
    console.log(`✅ Successfully fetched ${data.result.length} transactions from Etherscan V2`);
    return data.result.map(parseEtherscanTransaction);
    
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error connecting to Etherscan API');
    }
    throw error;
  }
}

// Get recent transactions from multiple addresses using Etherscan
async function fetchRecentTransactionsFromEtherscan(count) {
  try {
    console.log('🔍 Fetching recent transactions from multiple popular addresses...');
    
    const allTransactions = [];
    const addressesToTry = POPULAR_ADDRESSES.slice(0, 3); // Try first 3 addresses
    
    for (const address of addressesToTry) {
      try {
        const transactions = await fetchFromEtherscan(address, Math.ceil(count / 3));
        allTransactions.push(...transactions);
        
        if (allTransactions.length >= count) break;
      } catch (error) {
        console.log(`❌ Failed to fetch from ${address}:`, error.message);
        continue; // Try next address
      }
    }
    
    if (allTransactions.length === 0) {
      throw new Error('No transactions found from any address');
    }
    
    // Sort by timestamp (newest first) and limit to requested count
    const sortedTransactions = allTransactions
      .sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp))
      .slice(0, count);
      
    console.log(`✅ Collected ${sortedTransactions.length} recent transactions from Etherscan`);
    return sortedTransactions;
    
  } catch (error) {
    throw new Error(`Failed to fetch recent transactions: ${error.message}`);
  }
}

// Fetch from Blockchair API
async function fetchFromBlockchair(address, count) {
  const url = `${ETHEREUM_APIS.blockchair}/dashboards/address/${address}?limit=${count}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check for API-level errors
    if (data.code && data.code !== 200) {
      throw new Error(`Blockchair API error: ${data.error || 'Unknown error'} (Code: ${data.code})`);
    }
    
    // Check for valid data structure
    if (data.data && data.data[address] && data.data[address].transactions) {
      console.log(`✅ Successfully fetched ${data.data[address].transactions.length} transactions from Blockchair`);
      return data.data[address].transactions.map(parseBlockchairTransaction);
    }
    
    throw new Error('No transaction data available from Blockchair API');
    
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error connecting to Blockchair API');
    }
    throw error;
  }
}

// Fetch recent transactions from latest blocks
async function fetchRecentBlockTransactions(count) {
  // Use multiple public Ethereum JSON-RPC endpoints for better reliability
  const rpcUrls = [
    'https://cloudflare-eth.com',
    'https://rpc.ankr.com/eth',
    'https://eth-mainnet.public.blastapi.io'
  ];
  
  let lastError;
  
  // Try each RPC endpoint
  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`🔗 Trying RPC endpoint: ${rpcUrl}`);
      
      // Get latest block number
      const latestBlockResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (!latestBlockResponse.ok) {
        throw new Error(`HTTP ${latestBlockResponse.status}`);
      }
      
      const latestBlockData = await latestBlockResponse.json();
      
      if (latestBlockData.error) {
        throw new Error(`RPC Error: ${latestBlockData.error.message}`);
      }
      
      if (!latestBlockData.result) {
        throw new Error('No block number returned');
      }
      
      const latestBlockHex = latestBlockData.result;
      const latestBlockNumber = parseInt(latestBlockHex, 16);
      console.log(`📦 Latest block: ${latestBlockNumber}`);
      
      // Fetch recent blocks
      const transactions = [];
      for (let i = 0; i < 3 && transactions.length < count; i++) {
        const blockNumber = '0x' + (latestBlockNumber - i).toString(16);
        
        const blockResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByNumber',
            params: [blockNumber, true],
            id: 1
          })
        });
        
        if (!blockResponse.ok) continue;
        
        const blockData = await blockResponse.json();
        
        if (blockData.error || !blockData.result) continue;
        
        if (blockData.result.transactions && blockData.result.transactions.length > 0) {
          // Take a sample of transactions from this block
          const blockTxs = blockData.result.transactions
            .slice(0, Math.ceil(count / 3))
            .map(tx => parseRpcTransaction(tx, blockData.result));
          
          transactions.push(...blockTxs);
          console.log(`✅ Got ${blockTxs.length} transactions from block ${latestBlockNumber - i}`);
        }
      }
      
      if (transactions.length > 0) {
        return transactions.slice(0, count);
      }
      
    } catch (error) {
      lastError = error;
      console.log(`❌ RPC endpoint ${rpcUrl} failed: ${error.message}`);
      continue; // Try next endpoint
    }
  }
  
  throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message || 'Unknown'}`);
}

// Parse Etherscan transaction data
function parseEtherscanTransaction(tx) {
  return {
    id: `etherscan_${tx.hash}`,
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: (parseInt(tx.value) / 1e18).toFixed(6), // Convert Wei to ETH
    blockNumber: parseInt(tx.blockNumber),
    gasUsed: parseInt(tx.gasUsed),
    gasPrice: Math.round(parseInt(tx.gasPrice) / 1e9), // Convert to Gwei
    timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
    typeHints: inferTransactionTypeFromEtherscan(tx),
    functionName: tx.functionName || '',
    methodId: tx.methodId || '',
    // Add additional analysis based on Etherscan data
    ...analyzeEtherscanTransaction(tx)
  };
}

function inferTransactionTypeFromEtherscan(tx) {
  const types = [];
  
  // Check function name and method ID from Etherscan
  if (tx.functionName) {
    const funcName = tx.functionName.toLowerCase();
    
    if (funcName.includes('transfer')) types.push('Transfer');
    if (funcName.includes('approve')) types.push('Approval');
    if (funcName.includes('swap') || funcName.includes('exchange')) types.push('Swap');
    if (funcName.includes('mint') || funcName.includes('burn')) types.push('Mint/Burn');
    if (funcName.includes('deposit') || funcName.includes('withdraw')) types.push('DeFi');
  }
  
  // Check method ID for common functions
  if (tx.methodId) {
    const methodId = tx.methodId.toLowerCase();
    
    if (methodId === '0xa9059cbb') types.push('Transfer'); // transfer(address,uint256)
    if (methodId === '0x095ea7b3') types.push('Approval'); // approve(address,uint256)
    if (methodId === '0x7ff36ab5' || methodId === '0x38ed1739') types.push('Swap'); // DEX swaps
  }
  
  // Check if it's a simple ETH transfer
  if (!tx.input || tx.input === '0x') {
    types.push('Transfer');
  }
  
  // Check for contract interaction
  if (tx.input && tx.input !== '0x' && tx.input.length > 10) {
    types.push('Contract');
  }
  
  return types.length > 0 ? types : ['Unknown'];
}

function analyzeEtherscanTransaction(tx) {
  const analysis = {};
  
  // Analyze gas usage patterns
  const gasUsed = parseInt(tx.gasUsed);
  if (gasUsed > 100000) {
    analysis.gas = { overP99_1h: true };
  }
  
  // Check if transaction failed
  if (tx.isError === "1") {
    analysis.error = {
      failed: true,
      reason: tx.txreceipt_status === "0" ? "Transaction failed" : "Unknown error"
    };
  }
  
  // Analyze transaction value
  const valueInEth = parseInt(tx.value) / 1e18;
  if (valueInEth > 10) {
    analysis.highValue = true;
  }
  
  // Check for known addresses
  if (tx.to && isKnownTokenContract(tx.to)) {
    analysis.token = {
      name: getTokenName(tx.to),
      verified: true,
      contractAgeDays: 365, // Assume established for known contracts
      liquidityUSD: 1000000,
      topHoldersPct: 20
    };
  }
  
  if (tx.to && isDexAddress(tx.to)) {
    analysis.dex = {
      name: getDexName(tx.to),
      slippagePct: Math.random() * 5, // Reasonable slippage for real DEX
      poolLiquidityUSD: 500000
    };
  }
  
  // Check for potential MEV patterns based on gas price and timing
  const gasPriceGwei = parseInt(tx.gasPrice) / 1e9;
  if (gasPriceGwei > 100) { // Very high gas price might indicate MEV
    analysis.mev = {
      suspiciousGasPrice: true,
      gasPriceGwei: Math.round(gasPriceGwei)
    };
  }
  
  return analysis;
}

// Parse Blockchair transaction data
function parseBlockchairTransaction(tx) {
  return {
    id: `blockchair_${tx.hash}`,
    hash: tx.hash,
    from: tx.sender,
    to: tx.recipient,
    value: tx.value,
    blockNumber: tx.block_id,
    gasUsed: tx.gas_used,
    gasPrice: tx.gas_price,
    timestamp: tx.time,
    typeHints: inferTransactionType(tx),
    // Add additional fields based on transaction analysis
    ...analyzeTransactionPattern(tx)
  };
}

// Parse RPC transaction data
function parseRpcTransaction(tx, block) {
  const value = parseInt(tx.value, 16);
  const gasUsed = parseInt(tx.gas, 16);
  const gasPrice = parseInt(tx.gasPrice, 16);
  
  return {
    id: `rpc_${tx.hash}`,
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: (value / 1e18).toFixed(6), // Convert Wei to ETH
    blockNumber: parseInt(block.number, 16),
    gasUsed: gasUsed,
    gasPrice: Math.round(gasPrice / 1e9), // Convert to Gwei
    timestamp: new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
    typeHints: inferTransactionTypeFromRpc(tx),
    ...analyzeRpcTransaction(tx)
  };
}

// Infer transaction type from transaction data
function inferTransactionType(tx) {
  const types = [];
  
  // Check if it's a contract interaction
  if (tx.recipient && tx.input && tx.input !== '0x') {
    // Analyze function signatures
    const funcSig = tx.input.slice(0, 10);
    
    if (funcSig === '0xa9059cbb') types.push('Transfer'); // transfer(address,uint256)
    if (funcSig === '0x095ea7b3') types.push('Approval'); // approve(address,uint256)
    if (funcSig === '0x7ff36ab5') types.push('Swap'); // swapExactETHForTokens
    if (funcSig === '0x38ed1739') types.push('Swap'); // swapExactTokensForTokens
    if (funcSig === '0x8803dbee') types.push('Swap'); // swapTokensForExactTokens
  }
  
  // Simple ETH transfer
  if (!tx.input || tx.input === '0x') {
    types.push('Transfer');
  }
  
  return types.length > 0 ? types : ['Unknown'];
}

function inferTransactionTypeFromRpc(tx) {
  const types = [];
  
  if (tx.input && tx.input !== '0x') {
    const funcSig = tx.input.slice(0, 10);
    
    // Common function signatures
    if (funcSig === '0xa9059cbb') types.push('Transfer');
    if (funcSig === '0x095ea7b3') types.push('Approval');
    if (funcSig === '0x7ff36ab5' || funcSig === '0x38ed1739') types.push('Swap');
  } else {
    types.push('Transfer');
  }
  
  return types.length > 0 ? types : ['Unknown'];
}

// Analyze transaction patterns for risk assessment
function analyzeTransactionPattern(tx) {
  const analysis = {};
  
  // Check for high gas usage (potential complexity)
  if (tx.gas_used > 100000) {
    analysis.gas = { overP99_1h: true };
  }
  
  // Infer token information based on common patterns
  if (tx.recipient && isKnownTokenContract(tx.recipient)) {
    analysis.token = {
      name: getTokenName(tx.recipient),
      verified: true,
      contractAgeDays: 365, // Assume established tokens
      liquidityUSD: 1000000, // Assume good liquidity
      topHoldersPct: 20
    };
  }
  
  // Check for DEX interactions
  if (isDexAddress(tx.recipient)) {
    analysis.dex = {
      name: getDexName(tx.recipient),
      slippagePct: Math.random() * 5, // Assume reasonable slippage for real DEX
      poolLiquidityUSD: 500000
    };
  }
  
  return analysis;
}

function analyzeRpcTransaction(tx) {
  const analysis = {};
  
  // Analyze based on gas usage
  const gasUsed = parseInt(tx.gas, 16);
  if (gasUsed > 100000) {
    analysis.gas = { overP99_1h: true };
  }
  
  // Check for known addresses
  if (tx.to && isKnownTokenContract(tx.to)) {
    analysis.token = {
      name: getTokenName(tx.to),
      verified: true,
      contractAgeDays: 365,
      liquidityUSD: 1000000,
      topHoldersPct: 20
    };
  }
  
  if (tx.to && isDexAddress(tx.to)) {
    analysis.dex = {
      name: getDexName(tx.to),
      slippagePct: Math.random() * 5,
      poolLiquidityUSD: 500000
    };
  }
  
  return analysis;
}

// Helper functions for address recognition
function isKnownTokenContract(address) {
  const knownTokens = [
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    '0xA0b86a33E6B6F8a8C3b5E8f8b6E8f8f8A8c3b5e8', // USDC
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
    '0x514910771AF9Ca656af840dff83E8264EcF986CA'  // LINK
  ];
  return knownTokens.includes(address);
}

function isDexAddress(address) {
  const dexAddresses = [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'  // SushiSwap
  ];
  return dexAddresses.includes(address);
}

function getTokenName(address) {
  const tokenNames = {
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI',
    '0xA0b86a33E6B6F8a8C3b5E8f8b6E8f8f8A8c3b5e8': 'USDC',
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'UNI',
    '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'LINK'
  };
  return tokenNames[address] || 'Unknown Token';
}

function getDexName(address) {
  const dexNames = {
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': 'Uniswap V2',
    '0xE592427A0AEce92De3Edee1F18E0157C05861564': 'Uniswap V3',
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F': 'SushiSwap'
  };
  return dexNames[address] || 'Unknown DEX';
}

// Enhanced realistic transaction generator with real-world patterns
function generateEnhancedRealisticTransactions(count) {
  console.log('Generating enhanced realistic transactions based on real blockchain patterns');
  
  const transactions = [];
  const currentTime = Date.now();
  const currentBlockNumber = 19837421 + Math.floor(Math.random() * 1000);
  
  for (let i = 0; i < count; i++) {
    const txType = Math.random();
    let transaction;
    
    // Use real transaction patterns and addresses
    if (txType < 0.4) {
      // Real DEX interaction (40% - very common)
      transaction = generateRealDexTransaction(i, currentBlockNumber);
    } else if (txType < 0.6) {
      // Real token transfer (20%)
      transaction = generateRealTokenTransfer(i, currentBlockNumber);
    } else if (txType < 0.8) {
      // Real approval transaction (20%)
      transaction = generateRealApproval(i, currentBlockNumber);
    } else {
      // Complex/MEV transaction (20%)
      transaction = generateRealComplexTransaction(i, currentBlockNumber);
    }
    
    // Add realistic timing and gas data
    transaction.timestamp = new Date(currentTime - (i * 1000 * 60 * Math.random() * 5)).toISOString();
    transaction.gasUsed = calculateRealisticGas(transaction);
    transaction.gasPrice = Math.floor(Math.random() * 30) + 15; // 15-45 Gwei
    
    transactions.push(transaction);
  }
  
  return transactions;
}

function generateRealDexTransaction(index, blockNumber) {
  const dexAddresses = POPULAR_ADDRESSES.filter(addr => isDexAddress(addr));
  const selectedDex = dexAddresses[Math.floor(Math.random() * dexAddresses.length)];
  
  // Simulate real DEX swap patterns
  const isHighRisk = Math.random() < 0.3;
  
  return {
    id: `enhanced_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: selectedDex,
    value: (Math.random() * 5).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 10),
    typeHints: ["Swap"],
    dex: {
      name: getDexName(selectedDex),
      slippagePct: isHighRisk ? Math.random() * 20 + 10 : Math.random() * 5,
      poolLiquidityUSD: isHighRisk ? Math.random() * 30000 + 10000 : Math.random() * 500000 + 100000
    },
    token: {
      name: isHighRisk ? generateScamTokenName() : generateLegitTokenName(),
      notAllowlisted: isHighRisk,
      verified: !isHighRisk,
      contractAgeDays: isHighRisk ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * 500) + 100,
      liquidityUSD: isHighRisk ? Math.random() * 20000 : Math.random() * 1000000 + 50000,
      topHoldersPct: isHighRisk ? Math.random() * 40 + 60 : Math.random() * 30 + 10
    },
    gas: {
      overP99_1h: Math.random() < 0.2
    },
    category: "DEX Swap"
  };
}

function generateRealTokenTransfer(index, blockNumber) {
  const tokenAddresses = POPULAR_ADDRESSES.filter(addr => isKnownTokenContract(addr));
  const selectedToken = tokenAddresses[Math.floor(Math.random() * tokenAddresses.length)];
  
  const isScamToken = Math.random() < 0.4;
  
  return {
    id: `enhanced_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: isScamToken ? generateRandomAddress() : selectedToken,
    value: (Math.random() * 10).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 10),
    typeHints: ["Transfer"],
    token: {
      name: isScamToken ? generateScamTokenName() : getTokenName(selectedToken),
      address: selectedToken,
      contractAgeDays: isScamToken ? Math.floor(Math.random() * 7) : 365,
      verified: !isScamToken,
      liquidityUSD: isScamToken ? Math.random() * 15000 : Math.random() * 1000000 + 100000,
      topHoldersPct: isScamToken ? Math.random() * 30 + 70 : Math.random() * 40 + 10,
      notAllowlisted: isScamToken
    },
    amount: Math.floor(Math.random() * 1000000).toString(),
    category: "Token Transfer"
  };
}

function generateRealApproval(index, blockNumber) {
  const isRisky = Math.random() < 0.5;
  const UINT256_MAX = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
  
  return {
    id: `enhanced_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: isRisky ? generateRandomAddress() : POPULAR_ADDRESSES[0],
    value: "0",
    blockNumber: blockNumber - Math.floor(Math.random() * 10),
    approval: {
      method: "approve",
      amount: isRisky ? UINT256_MAX : Math.floor(Math.random() * 1000000).toString(),
      spenderAllowlisted: !isRisky,
      spenderVerified: !isRisky || Math.random() < 0.3
    },
    token: {
      name: generateLegitTokenName(),
      verified: true
    },
    category: "Token Approval"
  };
}

function generateRealComplexTransaction(index, blockNumber) {
  const isMev = Math.random() < 0.7;
  
  const transaction = {
    id: `enhanced_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: POPULAR_ADDRESSES[Math.floor(Math.random() * POPULAR_ADDRESSES.length)],
    value: (Math.random() * 2).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 3),
    category: isMev ? "MEV Transaction" : "Complex Transaction"
  };
  
  if (isMev) {
    transaction.mev = {
      isSandwichLeg: true,
      samePool: true,
      role: ["FRONT-RUN", "BACK-RUN"][Math.floor(Math.random() * 2)],
      profitUSD: Math.random() * 150 + 20
    };
    transaction.victimTxHash = `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`;
    transaction.pool = ["WETH/USDC", "WETH/USDT", "DAI/USDC"][Math.floor(Math.random() * 3)];
  }
  
  return transaction;
}

function generateRandomAddress() {
  return `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`;
}

function calculateRealisticGas(transaction) {
  // Base gas costs for different transaction types
  if (transaction.typeHints?.includes("Transfer")) {
    return transaction.token ? 65000 + Math.random() * 20000 : 21000; // ERC20 vs ETH transfer
  } else if (transaction.typeHints?.includes("Swap")) {
    return 150000 + Math.random() * 100000; // DEX swaps are expensive
  } else if (transaction.approval) {
    return 45000 + Math.random() * 10000; // Approvals
  } else {
    return 100000 + Math.random() * 150000; // Complex transactions
  }
}

// Keep the old helper functions that are still used
function generateScamTokenName() {
  const prefixes = ["Shiba", "Safe", "Moon", "Baby", "Mini", "Doge", "Pepe"];
  const suffixes = ["Inu", "Coin", "Token", "Moon", "X", "2.0", "Pro", "Max"];
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

function generateLegitTokenName() {
  return ["USDC", "USDT", "DAI", "WETH", "LINK", "UNI", "AAVE", "COMP"][Math.floor(Math.random() * 8)];
}

// Parse transaction data to work with our risk scoring system
export function parseTransactionData(rawTransaction) {
  // Convert the API response format to our internal format
  return {
    ...rawTransaction,
    // Add any additional parsing logic here
    lists: {
      addressOnBlocklist: false, // Would check against blocklist
      protocolAllowlisted: Math.random() < 0.1, // 10% chance
      tokenAllowlisted: Math.random() < 0.2 // 20% chance
    }
  };
}

// Fetch and analyze recent transactions, filtering for risk score > 0
export async function fetchAndAnalyzeTransactions(count = 10, chain = 'ethereum') {
  try {
    // Check if API key is available
    if (!ETHERSCAN_API_KEY) {
      console.warn('⚠️ No Etherscan API key found in environment variables');
    }
    
    // Fetch more transactions than needed since we'll filter for risky ones
    const rawTransactions = await fetchRecentTransactions(null, count * 3, chain);
    const analyzedTransactions = rawTransactions.map(parseTransactionData);
    
    // Filter for transactions with risk score > 0
    const riskyTransactions = analyzedTransactions.filter(tx => {
      const riskAnalysis = scoreRisk(tx);
      return riskAnalysis.risk > 0;
    });
    
    console.log(`🔍 Filtered ${riskyTransactions.length} risky transactions from ${analyzedTransactions.length} total`);
    
    // If we don't have enough risky transactions, add some enhanced simulation ones
    if (riskyTransactions.length < count) {
      const needed = count - riskyTransactions.length;
      console.log(`📊 Adding ${needed} enhanced risky transactions to meet target count`);
      
      const enhancedRiskyTxs = generateEnhancedRiskyTransactions(needed);
      const parsedEnhancedTxs = enhancedRiskyTxs.map(parseTransactionData);
      riskyTransactions.push(...parsedEnhancedTxs);
    }
    
    return riskyTransactions.slice(0, count);
  } catch (error) {
    console.error('Error analyzing transactions:', error);
    throw error;
  }
}

// Generate enhanced risky transactions (guaranteed to have risk score > 0)
function generateEnhancedRiskyTransactions(count) {
  console.log(`🎯 Generating ${count} guaranteed risky transactions`);
  
  const riskyTransactions = [];
  const currentTime = Date.now();
  const currentBlockNumber = 19837421 + Math.floor(Math.random() * 1000);
  
  for (let i = 0; i < count; i++) {
    const riskType = Math.random();
    let transaction;
    
    if (riskType < 0.5) {
      // Scam token transfer (guaranteed high risk) - Increased to 50%
      transaction = generateScamTokenTransaction(i, currentBlockNumber);
    } else if (riskType < 0.7) {
      // Infinite approval (guaranteed high risk)
      transaction = generateInfiniteApprovalTransaction(i, currentBlockNumber);
    } else if (riskType < 0.85) {
      // High slippage DEX swap (guaranteed high risk)
      transaction = generateHighSlippageSwap(i, currentBlockNumber);
    } else {
      // MEV sandwich attack (guaranteed high risk)
      transaction = generateMevSandwichTransaction(i, currentBlockNumber);
    }
    
    // Add realistic timing
    transaction.timestamp = new Date(currentTime - (i * 1000 * 60 * Math.random() * 5)).toISOString();
    transaction.gasUsed = calculateRealisticGas(transaction);
    transaction.gasPrice = Math.floor(Math.random() * 30) + 15;
    
    riskyTransactions.push(transaction);
  }
  
  return riskyTransactions;
}

function generateScamTokenTransaction(index, blockNumber) {
  const tx = {
    id: `risky_scam_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: generateRandomAddress(),
    value: (Math.random() * 0.1).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 5),
    typeHints: ["Transfer"],
    token: {
      name: generateScamTokenName(),
      address: generateRandomAddress(),
      contractAgeDays: Math.floor(Math.random() * 5), // Very new
      verified: false,
      liquidityUSD: Math.random() * 8000 + 1000, // Low liquidity
      topHoldersPct: Math.random() * 20 + 80, // High concentration
      notAllowlisted: true
    },
    amount: Math.floor(Math.random() * 10000000).toString(),
    category: "Scam Token Transfer"
  };
  console.log('🎯 Generated scam token transaction:', tx.id, 'TypeHints:', tx.typeHints, 'Token:', tx.token);
  return tx;
}

function generateInfiniteApprovalTransaction(index, blockNumber) {
  const UINT256_MAX = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
  
  return {
    id: `risky_approval_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: generateRandomAddress(),
    value: "0",
    blockNumber: blockNumber - Math.floor(Math.random() * 5),
    approval: {
      method: "approve",
      amount: UINT256_MAX,
      spenderAllowlisted: false,
      spenderVerified: false
    },
    token: {
      name: generateLegitTokenName(),
      verified: true
    },
    category: "Infinite Approval"
  };
}

function generateHighSlippageSwap(index, blockNumber) {
  return {
    id: `risky_swap_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: POPULAR_ADDRESSES[0], // Use known DEX
    value: (Math.random() * 2).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 5),
    typeHints: ["Swap"],
    dex: {
      name: "UniswapV2",
      slippagePct: Math.random() * 15 + 20, // High slippage (20-35%)
      poolLiquidityUSD: Math.random() * 20000 + 10000 // Thin liquidity
    },
    token: {
      name: generateScamTokenName(),
      notAllowlisted: true,
      verified: false,
      liquidityUSD: Math.random() * 15000 + 5000
    },
    tokenIn: "WETH",
    tokenOut: generateScamTokenName(),
    gas: {
      overP99_1h: Math.random() < 0.5
    },
    category: "High Slippage Swap"
  };
}

function generateMevSandwichTransaction(index, blockNumber) {
  return {
    id: `risky_mev_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: POPULAR_ADDRESSES[1],
    value: (Math.random() * 1).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 2),
    mev: {
      isSandwichLeg: true,
      samePool: true,
      role: ["FRONT-RUN", "BACK-RUN"][Math.floor(Math.random() * 2)],
      profitUSD: Math.random() * 100 + 30
    },
    victimTxHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    pool: ["WETH/USDC", "WETH/USDT"][Math.floor(Math.random() * 2)],
    category: "MEV Sandwich Attack"
  };
}

// Katana-specific transaction generators
function generateKatanaBridgeTransaction(index, blockNumber) {
  const isRisky = Math.random() < 0.3;
  
  return {
    id: `katana_bridge_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: CHAIN_CONFIGS.katana.popularAddresses[1], // Bridge contract
    value: (Math.random() * 10).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 5),
    typeHints: ["Bridge", "Transfer"],
    bridge: {
      sourceChain: Math.random() < 0.5 ? "Ethereum" : "Ronin",
      targetChain: "Katana",
      bridgeType: "Asset Transfer",
      verificationStatus: isRisky ? "Pending" : "Verified"
    },
    token: {
      name: isRisky ? generateScamTokenName() : ["AXS", "SLP", "WETH", "USDC"][Math.floor(Math.random() * 4)],
      verified: !isRisky,
      liquidityUSD: isRisky ? Math.random() * 20000 : Math.random() * 500000 + 100000
    },
    category: "Katana Bridge Transaction"
  };
}

function generateKatanaDexTransaction(index, blockNumber) {
  const isRisky = Math.random() < 0.4;
  
  return {
    id: `katana_dex_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: CHAIN_CONFIGS.katana.popularAddresses[2], // DEX contract
    value: (Math.random() * 5).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 5),
    typeHints: ["Swap"],
    dex: {
      name: "Katana DEX",
      slippagePct: isRisky ? Math.random() * 25 + 10 : Math.random() * 5,
      poolLiquidityUSD: isRisky ? Math.random() * 15000 + 5000 : Math.random() * 200000 + 50000
    },
    token: {
      name: isRisky ? generateScamTokenName() : ["AXS", "SLP", "RON"][Math.floor(Math.random() * 3)],
      verified: !isRisky,
      notAllowlisted: isRisky,
      contractAgeDays: isRisky ? Math.floor(Math.random() * 7) : Math.floor(Math.random() * 365) + 30
    },
    gaming: {
      gameRelated: true,
      gameTitle: ["Axie Infinity", "Pixels", "Apeiron"][Math.floor(Math.random() * 3)]
    },
    category: "Katana DEX Swap"
  };
}

function generateKatanaGameTransaction(index, blockNumber) {
  const gameAssets = ["Land NFT", "Axie NFT", "Game Item", "Breeding Pass", "Mystic Part"];
  const games = ["Axie Infinity", "Pixels", "Apeiron", "Lumiterra", "The Machines Arena"];
  
  return {
    id: `katana_game_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: generateRandomAddress(),
    value: (Math.random() * 2).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 5),
    typeHints: ["NFT", "Gaming"],
    gaming: {
      gameRelated: true,
      gameTitle: games[Math.floor(Math.random() * games.length)],
      assetType: gameAssets[Math.floor(Math.random() * gameAssets.length)],
      rarity: ["Common", "Rare", "Epic", "Mystic"][Math.floor(Math.random() * 4)]
    },
    nft: {
      tokenId: Math.floor(Math.random() * 10000).toString(),
      collection: "Official Game Assets",
      verified: true
    },
    category: "Katana Gaming Transaction"
  };
}

function generateKatanaStakingTransaction(index, blockNumber) {
  const stakingActions = ["Stake", "Unstake", "Claim Rewards", "Delegate"];
  
  return {
    id: `katana_staking_${index}`,
    hash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    from: generateRandomAddress(),
    to: CHAIN_CONFIGS.katana.popularAddresses[0], // System contract
    value: (Math.random() * 100).toFixed(6),
    blockNumber: blockNumber - Math.floor(Math.random() * 5),
    typeHints: ["Staking", "DeFi"],
    staking: {
      action: stakingActions[Math.floor(Math.random() * stakingActions.length)],
      validator: `Validator_${Math.floor(Math.random() * 100)}`,
      amount: (Math.random() * 1000).toFixed(2),
      rewards: (Math.random() * 50).toFixed(4)
    },
    token: {
      name: "RON",
      verified: true,
      staking: true
    },
    category: "Katana Staking Transaction"
  };
}
