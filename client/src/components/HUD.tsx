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
  const wallet = useWallet();
  const balances = useBalances(wallet.address);
  const [isRefilling, setIsRefilling] = useState(false);

  const usdcBalance = balances.getUSDCBalance();
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
            {/* {balances.error && (
              <div className="error">⚠️ {balances.error}</div>
            )} */}
          </div>
        )}
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

      {/* Hotkeys Helper */}
      <div className="hud-section">
        <div className="hotkeys-guide" style={{
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '0.75rem',
          fontSize: '0.8rem',
          color: '#e0e0e0'
        }}>
          <div style={{ 
            color: '#74b9ff', 
            fontWeight: 'bold', 
            marginBottom: '0.5rem',
            fontSize: '0.85rem'
          }}>
            🎮 Hotkeys
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ddd' }}>Shield Purchase:</span>
              <kbd style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                color: '#fff',
                fontFamily: 'monospace'
              }}>SPACE</kbd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ddd' }}>Pause/Resume:</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <kbd style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  color: '#fff',
                  fontFamily: 'monospace'
                }}>P</kbd>
                <span style={{ color: '#888', fontSize: '0.75rem' }}>or</span>
                <kbd style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  color: '#fff',
                  fontFamily: 'monospace'
                }}>Z</kbd>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ddd' }}>Move Character:</span>
              <span style={{
                fontSize: '0.75rem',
                color: '#a0a0a0',
                fontStyle: 'italic'
              }}>Mouse</span>
            </div>
          </div>
          <div style={{ 
            marginTop: '0.5rem', 
            paddingTop: '0.5rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.7rem',
            color: '#b0b0b0',
            lineHeight: '1.3'
          }}>
            💡 <strong style={{ color: '#40e0d0' }}>Tips:</strong> Collect cyan jellyfish for points, avoid red predators, shield costs 100pts
          </div>
        </div>
      </div>

      {/* Wallet Error */}
      {wallet.error && (
        <div className="hud-section">
          <div className="error">⚠️ {wallet.error}</div>
        </div>
      )}
    </div>
  );
};
