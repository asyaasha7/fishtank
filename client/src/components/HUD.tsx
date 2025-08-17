import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useBalances } from '../hooks/useBalances';

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
  recentPoints
}) => {
  const wallet = useWallet();
  const balances = useBalances(wallet.address);
  const [isRefilling, setIsRefilling] = useState(false);

  const usdcBalance = balances.getUSDCBalance();
  const hearts = Math.ceil(health / 3); // 3 HP per heart
  const maxHearts = Math.ceil(maxHealth / 3);

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
        <div className="game-title">🌊 Fishtank: Liquidity Hunter</div>
        <div className="network-info">
          Game: {selectedChain === 'katana' ? 'Katana' : 'Ethereum'} · Payments: Base
        </div>
        <div className="creature-count">📊 Active Creatures: {creatureCount}</div>
      </div>

      {/* Game Stats */}
      <div className="hud-section">
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

      {/* Wallet Section */}
      <div className="hud-section">
        {!wallet.isConnected ? (
          <button 
            onClick={wallet.connect} 
            disabled={wallet.isConnecting}
            className="connect-button"
          >
            {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <div className="address">🔗 {wallet.formatAddress}</div>
            {balances.isLoading ? (
              <div className="balance">Loading balances...</div>
            ) : usdcBalance ? (
              <div className="balance">
                💰 USDC (Base): ${parseFloat(usdcBalance.value).toFixed(2)}
                {usdcBalance.valueUSD !== parseFloat(usdcBalance.value) && (
                  <span className="usd-value"> (${usdcBalance.valueUSD.toFixed(2)})</span>
                )}
              </div>
            ) : (
              <div className="balance">💰 USDC (Base): $0.00</div>
            )}
            {balances.error && (
              <div className="error">⚠️ {balances.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Health & Lives Progress */}
      <div className="hud-section">
        <div className="health-lives">
          
          {/* Current Heart Health Progress Bar */}
          <div className="heart-progress">
            <div className="heart-progress-label">Current Heart Health: {health % 3 || 3}/3</div>
            <div className="heart-progress-bar">
              <div 
                className="heart-progress-fill"
                style={{ 
                  width: `${((health % 3 || 3) / 3) * 100}%`,
                  backgroundColor: (health % 3 || 3) > 2 ? '#00b894' : (health % 3 || 3) > 1 ? '#fdcb6e' : '#ff6b6b'
                }}
              />
            </div>
            <div className="heart-progress-info">🦈 3 hits from Toxic Predator = 1 life lost</div>
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
      {wallet.isConnected && (
        <div className="hud-section">
          <div className="action-buttons">
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
      )}

      {/* Wallet Error */}
      {wallet.error && (
        <div className="hud-section">
          <div className="error">⚠️ {wallet.error}</div>
        </div>
      )}
    </div>
  );
};
