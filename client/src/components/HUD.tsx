import React, { useState } from 'react';

interface HUDProps {
  health: number;
  maxHealth: number;
  score: number;
  onRefillHealth: () => Promise<void>;
  onAddFunds: () => void;
}

interface ExtendedHUDProps extends HUDProps {
  lives?: number;
  isShieldActive?: boolean;
  shieldTimeLeft?: number;
  onBuyShield?: () => void;
  gameScore?: number;
  selectedChain?: string;
  creatureCount?: number;
  onChainSwitch?: (chain: string) => void;
  recentPoints?: number;
  isPaused?: boolean;
}

export const HUD: React.FC<ExtendedHUDProps> = ({
  health,
  maxHealth,
  score,
  onRefillHealth,
  onAddFunds,
  lives = 3,
  isShieldActive = false,
  shieldTimeLeft = 0,
  onBuyShield,
  gameScore = 0,
  selectedChain = 'ethereum',
  creatureCount = 0,
  onChainSwitch,
  recentPoints,
  isPaused = false
}) => {
  const [isRefilling, setIsRefilling] = useState(false);
  const hearts = Math.ceil(health / 8); // 8 HP per heart (8 hits from Toxic Predator = 1 life lost)
  const maxHearts = Math.ceil(maxHealth / 8); // Show 1 heart that represents 8 health points

  const handleRefill = async () => {
    setIsRefilling(true);
    try {
      await onRefillHealth();
    } finally {
      setIsRefilling(false);
    }
  };

  return (
    <div className="hud">
      {/* Recent points animation */}
      {recentPoints && (
        <div className="recent-points">
          +{recentPoints}
        </div>
      )}
      {/* Game Info */}
      <div className="hud-section">
        {/* <div className="game-title">🌊 Fishtank: Liquidity Hunter</div>
        <div className="network-info">
          Game: {selectedChain === 'katana' ? 'Katana' : 'Ethereum'} · Payments: Base
        </div> */}
        {/* <div className="creature-count">📊 Active Creatures: {creatureCount}</div> */}
      </div>

      {/* Game Stats */}
      <div className="hud-section">
        {isPaused && (
          <div className="pause-indicator" style={{
            background: 'rgba(255, 165, 0, 0.9)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            textAlign: 'center',
            margin: '0.5rem 0',
            border: '2px solid #ff8c00',
            boxShadow: '0 0 20px rgba(255, 165, 0, 0.5)'
          }}>
            ⏸️ GAME PAUSED
                              <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '0.25rem' }}>
                    Press P or Z to resume • Space for shield
                  </div>
          </div>
        )}
        <div className="game-stats">
          <div className="stat-item">
            <span className="stat-label">SCORE:</span>
            <span className="stat-value">{score.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">LIVES:</span>
            <div className="lives-display">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={`life-heart ${i < lives ? 'filled' : 'empty'}`}>
                  {i < lives ? '❤️' : '🤍'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>



      {/* Health & Lives Progress */}
      <div className="hud-section">
        <div className="health-lives">
          
          {/* Current Heart Health Progress Bar */}
          <div className="heart-progress">
            <div className='flex'>
            <div className="heart-progress-label">Current Heart Health: {health % 8 || 8}/8</div>            <div className="heart-progress-info">🦈 8 hits from Toxic Predator = 1 life lost</div>
            </div>
            <div className="heart-progress-bar">
              <div 
                className="heart-progress-fill"
                style={{ 
                  width: `${((health % 8 || 8) / 8) * 100}%`,
                  backgroundColor: (health % 8 || 8) > 5 ? '#00b894' : (health % 8 || 8) > 2 ? '#fdcb6e' : '#ff6b6b'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Shield Section */}
      <div className="hud-section">
        {isShieldActive && (
          <div className="shield-status">
            <div className="shield-active">🛡️ SHIELD ACTIVE</div>
            <div className="shield-time">Protection: {shieldTimeLeft}s remaining</div>
            <div className="shield-info">Blocking Toxic Predator & Pufferfish damage</div>
          </div>
        )}
        
        {onBuyShield && (
          <button
            onClick={onBuyShield}
            disabled={score < 100 || isShieldActive}
            className="shield-button"
            title="Buy shield protection for 100 game points"
          >
            <span>🛡️</span>
            {isShieldActive 
              ? 'Shield Active' 
              : score >= 100 
                ? 'Buy Shield (100 pts)' 
                : `Need ${100 - score} more points`
            }
          </button>
        )}
        
        <div className="shield-description">
          💡 Shield protects against Toxic Predators & Pufferfish for 10s
        </div>
      </div>

      {/* Action Buttons */}
      <div className="hud-section">
        <div className="action-buttons flex">
          <button 
            onClick={handleRefill}
            disabled={isRefilling || health >= maxHealth}
            className="refill-button"
            title="Pay $0.01 USDC to refill health (+3 HP)"
          >
            {isRefilling ? '⏳ Refilling...' : '💊 Refill Health (+3 HP)'}
          </button>
          <button 
            onClick={onAddFunds}
            className="add-funds-button"
            title="Buy USDC on Base to pay for refills"
          >
            💳 Add Funds
          </button>
        </div>
        <div className="refill-info">
          💊 Health refill costs $0.01 USDC on Base
        </div>
      </div>



    </div>
  );
};
