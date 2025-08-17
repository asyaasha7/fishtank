import { useState, useEffect } from 'react';
import { fishtankRO } from '../chain/fishtank';
import type { PlayerState, FishtankData } from '../chain/fishtank';

// Hook to fetch and monitor game difficulty
export function useDifficulty() {
  const [difficulty, setDifficulty] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchDifficulty() {
      try {
        setLoading(true);
        setError(null);
        
        // Try server API first as fallback
        try {
          console.log('🔍 Fetching difficulty from server API...');
          const response = await fetch('/api/fishtank/difficulty');
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Server API difficulty response:', data);
            if (mounted) {
              setDifficulty(data.difficulty);
              return;
            }
          } else {
            console.log('❌ Server API response not ok:', response.status, response.statusText);
          }
        } catch (serverError) {
          console.log('❌ Server API failed, trying direct contract call:', serverError);
        }
        
        // Fallback to direct contract call
        console.log('🔍 Trying direct contract call...');
        const contract = fishtankRO();
        console.log('📄 Contract instance created, calling difficulty()...');
        const difficultyValue = await contract.difficulty();
        console.log('✅ Direct contract difficulty response:', difficultyValue.toString());
        
        if (mounted) {
          setDifficulty(difficultyValue.toString());
        }
      } catch (err) {
        console.error('Error fetching difficulty:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch difficulty');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchDifficulty();

    // Set up polling to refresh difficulty every 30 seconds
    const interval = setInterval(fetchDifficulty, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { difficulty, loading, error, refetch: () => {
    setLoading(true);
    setError(null);
  }};
}

// Hook to fetch and monitor player state
export function usePlayerState(playerAddress: string | null) {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPlayerState() {
      if (!playerAddress) {
        if (mounted) {
          setPlayerState(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const contract = fishtankRO();
        const playerData = await contract.getPlayer(playerAddress);
        
        if (mounted) {
          setPlayerState({
            bestScore: playerData.bestScore.toString(),
            lastScore: playerData.lastScore.toString(),
            runs: playerData.runs.toString(),
            lastPlayedAt: playerData.lastPlayedAt.toString(),
            lastRunId: playerData.lastRunId
          });
        }
      } catch (err) {
        console.error('Error fetching player state:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch player state');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchPlayerState();

    // Set up polling to refresh player state every 15 seconds
    const interval = setInterval(fetchPlayerState, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [playerAddress]);

  return { playerState, loading, error, refetch: () => {
    if (playerAddress) {
      setLoading(true);
      setError(null);
    }
  }};
}

// Hook to fetch complete fishtank data for a player
export function useFishtankData(playerAddress: string | null) {
  const [data, setData] = useState<FishtankData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchFishtankData() {
      if (!playerAddress) {
        if (mounted) {
          setData(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch data via server API for consistency
        const response = await fetch(`/api/fishtank/player/${playerAddress}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fishtankData = await response.json();
        
        if (mounted) {
          setData(fishtankData);
        }
      } catch (err) {
        console.error('Error fetching fishtank data:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch fishtank data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchFishtankData();

    // Set up polling to refresh data every 20 seconds
    const interval = setInterval(fetchFishtankData, 20000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [playerAddress]);

  return { data, loading, error, refetch: () => {
    if (playerAddress) {
      setLoading(true);
      setError(null);
    }
  }};
}

// Additional types for leaderboard (updated for simplified contract)
export interface LeaderboardEntry {
  rank: number;
  player: string;
  address: string;
  displayAddress: string;
  score: number;
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalPlayers: number;
  timestamp: string;
}

// Hook to fetch leaderboard data
export function useLeaderboard(limit: number = 10) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchLeaderboard() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🏆 Fetching leaderboard data...');
        const response = await fetch(`/api/fishtank/leaderboard?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Leaderboard data:', data);
        
        if (mounted) {
          setLeaderboard(data);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchLeaderboard();

    // Set up polling to refresh leaderboard every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [limit]);

  return { leaderboard, loading, error, refetch: () => {
    setLoading(true);
    setError(null);
  }};
}
