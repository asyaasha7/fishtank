import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    ethereum?: {
      request?: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (accounts: string[]) => void) => void;
      removeListener?: (event: string, handler: (accounts: string[]) => void) => void;
      isMetaMask?: boolean;
      isDefaultWallet?: boolean;
      providers?: any[];
    };
  }
}

interface WalletState {
  address: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
    isConnected: false,
    error: null
  });

  // Global error handler for wallet-related errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('isDefaultWallet') || event.filename?.includes('pageProvider')) {
        console.warn('Wallet provider error (non-critical):', event.message);
        event.preventDefault(); // Prevent the error from appearing in console
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Check if wallet is already connected with a delay for proper initialization
  useEffect(() => {
    const initWallet = async () => {
      // Wait for page to fully load and wallet to inject
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }
      
      // Additional delay for wallet injection
      setTimeout(() => {
        checkConnection();
      }, 200);
    };

    initWallet();
  }, []);

  // Listen for account changes with defensive checks
  useEffect(() => {
    if (!window.ethereum || !window.ethereum.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!Array.isArray(accounts)) {
        console.warn('Invalid accounts array received from wallet');
        return;
      }
      
      if (accounts.length === 0) {
        setState(prev => ({
          ...prev,
          address: null,
          isConnected: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
          error: null
        }));
      }
    };

    try {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    } catch (error) {
      console.warn('Failed to attach wallet event listener:', error);
    }

    return () => {
      try {
        window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      } catch (error) {
        console.warn('Failed to remove wallet event listener:', error);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (!window.ethereum) {
      setState(prev => ({
        ...prev,
        error: 'No wallet detected. Please install MetaMask or another Web3 wallet.'
      }));
      return;
    }

    try {
      // Add a small delay to avoid race conditions with wallet injection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      if (accounts.length > 0) {
        setState(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
          error: null
        }));
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      // Don't set error state for connection check failures as they're non-critical
    }
  };

  const connect = useCallback(async () => {
    if (!window.ethereum || !window.ethereum.request) {
      setState(prev => ({
        ...prev,
        error: 'No wallet detected. Please install MetaMask or another Web3 wallet.'
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (Array.isArray(accounts) && accounts.length > 0) {
        setState(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
          isConnecting: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: 'No accounts found. Please make sure your wallet is unlocked.'
        }));
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.code === 4001 ? 'Connection rejected by user' : (error.message || 'Failed to connect wallet')
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnecting: false,
      isConnected: false,
      error: null
    });
  }, []);

  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return {
    ...state,
    connect,
    disconnect,
    formatAddress: state.address ? formatAddress(state.address) : '',
    hasWallet: !!(window.ethereum && typeof window.ethereum === 'object')
  };
};
