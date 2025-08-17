import { useState, useEffect, useCallback } from 'react';

interface TokenBalance {
  symbol: string;
  network: string;
  value: string;
  valueUSD: number;
  contractAddress?: string;
}

interface BalanceResponse {
  balances: TokenBalance[];
}

interface BalanceState {
  balances: TokenBalance[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useBalances = (address: string | null) => {
  const [state, setState] = useState<BalanceState>({
    balances: [],
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setState(prev => ({
        ...prev,
        balances: [],
        isLoading: false,
        error: null
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/balances?address=${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BalanceResponse = await response.json();
      
      setState(prev => ({
        ...prev,
        balances: data.balances || [],
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      }));
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch balances'
      }));
    }
  }, [address]);

  // Fetch balances on address change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchBalances();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [address, fetchBalances]);

  const getUSDCBalance = (): TokenBalance | null => {
    return state.balances.find(b => b.symbol === 'USDC') || null;
  };

  const getTotalValueUSD = (): number => {
    return state.balances.reduce((total, balance) => total + balance.valueUSD, 0);
  };

  const refresh = useCallback(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    ...state,
    getUSDCBalance,
    getTotalValueUSD,
    refresh
  };
};
