import React from 'react';
import { useLeaderboard } from '../hooks/useFishtank';
import type { LeaderboardEntry } from '../hooks/useFishtank';

interface LeaderboardProps {
  limit?: number;
  className?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  limit = 10, 
  className = '' 
}) => {
  const { leaderboard, loading, error } = useLeaderboard(limit);

  if (loading) {
    return (
      <div className={`leaderboard ${className}`}>
        <div className="leaderboard-header">
          <h3>🏆 Top Players</h3>
        </div>
        <div className="leaderboard-loading">
          <div className="loading-spinner">⏳</div>
          Loading leaderboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`leaderboard ${className}`}>
        <div className="leaderboard-header">
          <h3>🏆 Top Players</h3>
        </div>
        <div className="leaderboard-error">
          ❌ Failed to load leaderboard: {error}
        </div>
      </div>
    );
  }

  if (!leaderboard || !leaderboard.leaderboard.length) {
    return (
      <div className={`leaderboard ${className}`}>
        <div className="leaderboard-header">
          <h3>🏆 Top Players</h3>
        </div>
        <div className="leaderboard-empty">
          🎮 No scores yet - be the first to play!
        </div>
      </div>
    );
  }

  return (
    <div className={`leaderboard ${className}`}>
      <div className="leaderboard-header">
        <h3>🏆 Top Players</h3>
        <div className="leaderboard-stats">
          {leaderboard.totalPlayers} players • Updated {new Date(leaderboard.timestamp).toLocaleTimeString()}
        </div>
      </div>
      
      <div className="leaderboard-list">
        {leaderboard.leaderboard.map((entry: LeaderboardEntry) => (
          <div key={entry.address} className="leaderboard-entry">
            <div className="rank">
              {entry.rank === 1 && '🥇'}
              {entry.rank === 2 && '🥈'}
              {entry.rank === 3 && '🥉'}
              {entry.rank > 3 && `#${entry.rank}`}
            </div>
            
            <div className="player-info">
              <div className="player-address">{entry.displayAddress}</div>
              <div className="player-details">
                ❤️ {entry.health} • 👤 {entry.lives} lives
              </div>
            </div>
            
            <div className="score">
              {entry.score.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      
      <div className="leaderboard-footer">
        <div className="blockchain-info">
          📡 Live data from Katana blockchain
        </div>
      </div>
    </div>
  );
};
