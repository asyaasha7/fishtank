import { ethers } from 'ethers';
import FishtankGameStateABI from '../abi/FishtankGameState.json';

// Environment variables
const KATANA_RPC = import.meta.env.VITE_KATANA_RPC;
const KATANA_CHAIN_ID = import.meta.env.VITE_KATANA_CHAIN_ID;
const FISHTANK_ADDR = import.meta.env.VITE_FISHTANK_ADDR;

// Read-only provider and contract instance
let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    if (!KATANA_RPC) {
      throw new Error('VITE_KATANA_RPC environment variable is not set');
    }
    provider = new ethers.JsonRpcProvider(KATANA_RPC);
  }
  return provider;
}

export function fishtankRO(): ethers.Contract {
  if (!contract) {
    if (!FISHTANK_ADDR) {
      throw new Error('VITE_FISHTANK_ADDR environment variable is not set');
    }
    console.log('🔧 Setting up Fishtank contract with address:', FISHTANK_ADDR);
    console.log('🔧 Using RPC:', KATANA_RPC);
    console.log('🔧 Chain ID:', KATANA_CHAIN_ID);
    
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
    contract = new ethers.Contract(FISHTANK_ADDR, contractABI, provider);
    console.log('✅ Fishtank contract instance created');
  }
  return contract;
}

export function getChainId(): number {
  if (!KATANA_CHAIN_ID) {
    throw new Error('VITE_KATANA_CHAIN_ID environment variable is not set');
  }
  return parseInt(KATANA_CHAIN_ID);
}

export function getContractAddress(): string {
  if (!FISHTANK_ADDR) {
    throw new Error('VITE_FISHTANK_ADDR environment variable is not set');
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
    console.log(`🏆 Client: Submitting score for player ${player}: ${score}`);
    
    const response = await fetch('/api/fishtank/score/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
        score
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log(`✅ Client: Score submitted successfully:`, result);
    return result;
  } catch (error) {
    console.error('💥 Client: Error submitting score:', error);
    throw error;
  }
}
