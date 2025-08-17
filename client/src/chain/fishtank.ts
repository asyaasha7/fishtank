import { ethers } from 'ethers';
import FishtankGameStateABI from '../abi/FishtankGameState.json';

// Extend the global Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

// Environment variables with defaults
const KATANA_RPC = import.meta.env.VITE_KATANA_RPC || 'https://rpc.tatara.katanarpc.com/';
const KATANA_CHAIN_ID = import.meta.env.VITE_KATANA_CHAIN_ID || '129399';
const FISHTANK_ADDR = import.meta.env.VITE_FISHTANK_ADDR || '0x467397d1d298c1a4ca9bfe87565ef04486c25c0f';

// Read-only provider and contract instance
let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    if (!KATANA_RPC) {
      console.warn('VITE_KATANA_RPC environment variable is not set, using default RPC');
    }
    const rpcUrl = KATANA_RPC || 'https://rpc.tatara.katanarpc.com/';
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

export function fishtankRO(): ethers.Contract {
  if (!contract) {
    const contractAddr = getContractAddress(); // Use the function that has default fallback
    const rpcUrl = KATANA_RPC || 'https://rpc.tatara.katanarpc.com/';
    const chainId = KATANA_CHAIN_ID || '129399';
    
    console.log('🔧 Setting up Fishtank contract with address:', contractAddr);
    console.log('🔧 Using RPC:', rpcUrl);
    console.log('🔧 Chain ID:', chainId);
    
    // Handle ABI format gracefully - extract from full JSON or use fallback
    let contractABI: any;
    try {
      contractABI = (FishtankGameStateABI as any).abi || FishtankGameStateABI;
    } catch {
      // Fallback to minimal ABI for the simplified contract
      contractABI = [
        "function difficulty() view returns (uint8)",
        "function getPlayer(address) view returns (tuple(uint64 bestScore, uint64 lastScore, uint32 runs, uint64 lastPlayedAt, bytes32 lastRunId))",
        "function getTop5() view returns (address[5], uint64[5])"
      ];
    }
    
    const provider = getProvider();
    contract = new ethers.Contract(contractAddr, contractABI, provider);
    console.log('✅ Fishtank contract instance created');
  }
  return contract;
}

export function getChainId(): number {
  if (!KATANA_CHAIN_ID) {
    console.warn('VITE_KATANA_CHAIN_ID environment variable is not set, using default: 129399');
    return 129399; // Default Katana Tatara Chain ID
  }
  return parseInt(KATANA_CHAIN_ID);
}

export function getContractAddress(): string {
  if (!FISHTANK_ADDR) {
    console.warn('VITE_FISHTANK_ADDR environment variable is not set, using default contract address');
    return '0x467397d1d298c1a4ca9bfe87565ef04486c25c0f'; // Default contract address
  }
  return FISHTANK_ADDR;
}

// Types for contract interactions (updated for new contract)
export interface PlayerState {
  bestScore: string;
  lastScore: string;
  runs: string;
  lastPlayedAt: string;
  lastRunId: string;
}

export interface FishtankData {
  player: string;
  state: PlayerState;
  difficulty: string;
}

// API functions to call server endpoints
export async function recordRiskEvent(player: string, riskScore: number, eventType: string) {
  try {
    const response = await fetch('/api/fishtank/event/risk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
        riskScore,
        eventType
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error recording risk event:', error);
    throw error;
  }
}

export async function recordHealthRefill(player: string, newHealth: number) {
  try {
    const response = await fetch('/api/fishtank/event/health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
        newHealth
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error recording health refill:', error);
    throw error;
  }
}

export async function submitScore(player: string, score: number) {
  try {
    console.log(`🏆 Client: Submitting score directly from user wallet ${player}: ${score}`);
    
    // Check if MetaMask is available
    if (!window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask to submit scores.');
    }

    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create provider and signer from user's wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Check and switch to correct network if needed
    const network = await provider.getNetwork();
    const requiredChainId = getChainId();
    
    if (Number(network.chainId) !== requiredChainId) {
      console.log(`🔄 Switching to Katana network (Chain ID: ${requiredChainId})`);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${requiredChainId.toString(16)}`,
              chainName: 'Katana Testnet',
              rpcUrls: [KATANA_RPC],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
            }],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    const signer = await provider.getSigner();
    
    // Verify the connected account matches the player
    const connectedAddress = await signer.getAddress();
    if (connectedAddress.toLowerCase() !== player.toLowerCase()) {
      throw new Error(`Connected wallet ${connectedAddress} does not match player ${player}`);
    }

    // Create contract instance with user's signer
    let contractABI: any;
    try {
      contractABI = (FishtankGameStateABI as any).abi || FishtankGameStateABI;
    } catch {
      // Fallback ABI for the simplified contract with correct function signature
      contractABI = [
        "function submitScore(uint64 score, bytes32 runId, uint64 startedAt, uint64 endedAt)",
        "function getPlayer(address player) view returns (tuple(uint64 bestScore, uint64 lastScore, uint32 runs, uint64 lastPlayedAt, bytes32 lastRunId))",
        "function difficulty() view returns (uint8)"
      ];
    }
    
    const contract = new ethers.Contract(getContractAddress(), contractABI, signer);
    
    // Create timestamps and runId with proper format
    const now = Math.floor(Date.now() / 1000);
    const startedAt = now - 300; // Game started 5 minutes ago
    const endedAt = now;
    
    // Create a proper 32-byte runId using keccak256
    const runIdString = `${player}:${Date.now()}:${Math.random()}`;
    const runId = ethers.keccak256(ethers.toUtf8Bytes(runIdString));
    
    console.log(`🎮 Submitting score: ${score}`);
    console.log(`🎮 RunId: ${runId}`);
    console.log(`🎮 StartedAt: ${startedAt} (${new Date(startedAt * 1000).toISOString()})`);
    console.log(`🎮 EndedAt: ${endedAt} (${new Date(endedAt * 1000).toISOString()})`);
    
    // Submit score directly to contract with correct parameter types
    const tx = await contract.submitScore(
      score, // uint64 - pass as number, ethers will convert
      runId, // bytes32 - already in correct format
      startedAt, // uint64 - pass as number, ethers will convert  
      endedAt // uint64 - pass as number, ethers will convert
    );
    
    console.log(`📡 Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ Score submitted successfully! Tx: ${receipt.hash} (block: ${receipt.blockNumber})`);
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      runId: runId,
      score: score
    };
  } catch (error: any) {
    console.error('💥 Client: Error submitting score:', error);
    
    // Provide user-friendly error messages
    let userMessage = 'Failed to submit score to blockchain';
    if (error?.message?.includes('user rejected')) {
      userMessage = 'Transaction was rejected by user';
    } else if (error?.message?.includes('insufficient funds')) {
      userMessage = 'Insufficient funds to pay for transaction';
    } else if (error?.message?.includes('score>max')) {
      userMessage = 'Score exceeds maximum allowed value';
    } else if (error?.message?.includes('runId used')) {
      userMessage = 'This game session ID has already been used';
    } else if (error?.message?.includes('cooldown')) {
      userMessage = 'Please wait before submitting another score';
    }
    
    throw new Error(userMessage);
  }
}
