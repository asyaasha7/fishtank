import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import TransactionCubes from './TransactionCubes'
import FishtankGame from './AviatorGame'
import { HUD } from './HUD'
import { PaymentModal } from './PaymentModal'
import { useWallet } from '../hooks/useWallet'
import { fetchAndAnalyzeTransactions, getRiskyTransactionsForGame } from '../services/ethereumApi'
import { scoreRisk, categorizeBlockscoutTransaction, scoreBlockscoutTransaction } from '../utils/riskScoring'
import { recordRiskEvent, recordHealthRefill, submitScore } from '../chain/fishtank'

// Convert transaction to character format using enhanced categorization
function transactionToCharacter(tx) {
  // Use the enhanced Blockscout categorization if available
  let category;
  let riskAnalysis;
  
  if (tx.from && typeof tx.from === 'object' && tx.from.hash) {
    // This is Blockscout format data - use new categorization
    category = categorizeBlockscoutTransaction(tx);
    riskAnalysis = scoreBlockscoutTransaction(tx);
  } else {
    // This is legacy format data
    riskAnalysis = scoreRisk(tx);
  }
  
  // Map new categories to game character types
  let characterType = "Standard Current";
  
  if (category) {
    // Use the new categorization system
    switch(category.riskLevel) {
      case "CRITICAL":
      case "HIGH":
        if (category.category === "Malicious Activity") {
          characterType = "Toxic Predator";
        } else if (category.category === "Token Approval") {
          characterType = "Pufferfish Trap";
        } else if (category.category === "Failed Transaction") {
          characterType = "Pufferfish Trap";
        } else {
          characterType = "Chaotic Vortex";
        }
        break;
      case "MODERATE":
        if (category.category === "DeFi Trading" || category.category === "MEV Activity") {
          characterType = "Treasure Jellyfish";
        } else if (category.category === "Cross-chain Bridge") {
          characterType = "Chaotic Vortex";
        } else {
          characterType = "Standard Current";
        }
        break;
      case "LOW":
      default:
        characterType = "Standard Current";
        break;
    }
  } else {
    // Fallback to old logic for legacy data
    if (riskAnalysis.risk >= 80) {
      characterType = "Toxic Predator";
    } else if (riskAnalysis.risk >= 40) {
      characterType = "Treasure Jellyfish";
    } else if (tx.typeHints?.includes("Approval")) {
      characterType = "Pufferfish Trap";
    } else if (tx.typeHints?.includes("Swap") && tx.slippage > 15) {
      characterType = "Chaotic Vortex";
    }
  }
  
  return {
    id: tx.id || tx.transaction_hash || tx.hash || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: characterType,
    transaction: tx,
    riskAnalysis: riskAnalysis || { risk: 0 },
    category: category
  }
}

function Home() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [refreshCountdown, setRefreshCountdown] = useState(30)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [selectedChain] = useState('katana')
  
  // Payment system states
  const [gameHealth, setGameHealth] = useState(8) // Start with full health (8 hits from Toxic Predator = 1 life lost)
  const [gameScore, setGameScore] = useState(0)
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, paymentInfo: null })
  const [gameLives, setGameLives] = useState(3)
  const [isShieldActive, setIsShieldActive] = useState(false)
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [gameEvents, setGameEvents] = useState([]) // Store game console events
  const wallet = useWallet()

  // Function to add events to the game console
  const addGameEvent = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newEvent = {
      id: Date.now() + Math.random(),
      message,
      type, // 'info', 'damage', 'points', 'collision'
      timestamp
    };
    
    setGameEvents(prev => {
      const updated = [newEvent, ...prev];
      return updated.slice(0, 50); // Keep only last 50 events
    });
  };

  useEffect(() => {
    // Only start the game if wallet is connected
    if (wallet.isConnected) {
      loadTransactions(true) // Initial load
    } else {
      // Reset game state when wallet disconnects
      setCharacters([])
      setLoading(false)
    }
    
    // Add mouse move listener for sphere control
    const handleMouseMove = (event) => {
      const tx = -1 + (event.clientX / window.innerWidth) * 2;
      const ty = 1 - (event.clientY / window.innerHeight) * 2;
      setMousePos({ x: tx, y: ty });
    };

    document.addEventListener('mousemove', handleMouseMove, false);
    
    // Add keyboard listeners for hotkeys
    const handleKeyPress = (event) => {
      // Prevent hotkeys when typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      switch(event.key.toLowerCase()) {
        case ' ': // Spacebar for shield
          event.preventDefault()
          handleBuyShield()
          break
        case 'p': // P key for pause
        case 'z': // Z key for pause (alternative)
          event.preventDefault()
          setIsPaused(prev => !prev)
          console.log(`🎮 Game ${!isPaused ? 'paused' : 'resumed'}`)
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    
    // Set up automatic refresh every 30 seconds (pauses when game is paused)
    const refreshInterval = setInterval(() => {
      if (!isPaused) {
        console.log('🔄 Auto-refreshing transactions...')
        setIsAutoRefreshing(true)
        loadTransactions(false) // Smooth refresh
      }
    }, 30000) // 30 seconds
    
    // Countdown timer that updates every second
    const countdownInterval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          return 30 // Reset to 30 when it reaches 0
        }
        return prev - 1
      })
    }, 1000) // 1 second
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove, false);
      document.removeEventListener('keydown', handleKeyPress);
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [selectedChain, isPaused, wallet.isConnected]) // Reload when chain changes, pause state changes, or wallet connection changes



  const loadTransactions = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
        console.log(`🎲 Loading initial transactions for 3D cube visualization from ${selectedChain.toUpperCase()}...`)
        const transactions = await getRiskyTransactionsForGame(60, selectedChain)
        const characterList = transactions.map(transactionToCharacter)
        console.log('🎯 Generated characters:', characterList.map(c => c.name))
        console.log('🦈 Toxic Predators found:', characterList.filter(c => c.name === "Toxic Predator").length)
        setCharacters(characterList)
        
        // Record risk events for initial load
        characterList.forEach(character => {
          if (character.name === "Toxic Predator" && character.riskScore >= 80) {
            recordRisk(character.riskScore, "Toxic Predator Spawned");
          }
        });
        
        // Check data source for better user feedback
        const dataSource = transactions[0]?.id?.includes('katana_') 
          ? (transactions[0]?.id?.includes('katana_0x') ? 'Real Katana RPC' : 'Katana Simulation')
          : (transactions[0]?.id?.includes('etherscan') ? 'Etherscan API' : 'Ethereum Simulation')
        
        console.log(`✅ Loaded ${characterList.length} initial transaction cubes from ${selectedChain.toUpperCase()} (${dataSource})`)
        addGameEvent(`🎮 Game Started - Loaded ${characterList.length} transaction creatures from ${selectedChain.toUpperCase()}`, 'info');
        
        // Count and log toxic predators
        const toxicPredatorCount = characterList.filter(c => c.name === "Toxic Predator").length;
        const syntheticCount = characterList.filter(c => c.transaction?.synthetic).length;
        if (syntheticCount > 0) {
          addGameEvent(`💀 Auto-generated ${syntheticCount} synthetic Toxic Predators for challenging gameplay`, 'info');
        }
        if (toxicPredatorCount > 0) {
          addGameEvent(`🦈 ${toxicPredatorCount} Toxic Predators prowling the depths - Stay alert!`, 'info');
        }
      } else {
        // Smooth refresh - fetch new transactions and add to existing array
        console.log(`🔄 Fetching new transactions from ${selectedChain} for smooth update...`)
        const newTransactions = await getRiskyTransactionsForGame(10, selectedChain) // Fetch fewer for updates
        const newCharacterList = newTransactions.map(transactionToCharacter)
        
        setCharacters(prevCharacters => {
          // Record risk events for new characters
          newCharacterList.forEach(character => {
            if (character.name === "Toxic Predator" && character.riskScore >= 80) {
              recordRisk(character.riskScore, "Toxic Predator Spawned");
            }
          });
          
          // Add new transactions to the end and remove old ones from the front
          const maxTransactions = 50 // Maintain a rolling buffer of 50 transactions
          const updatedCharacters = [...prevCharacters, ...newCharacterList]
          
          // Remove oldest transactions if we exceed the limit
          const finalCharacters = updatedCharacters.length > maxTransactions 
            ? updatedCharacters.slice(-maxTransactions) // Keep the last N transactions
            : updatedCharacters
          
          console.log(`✅ Added ${newCharacterList.length} new transactions, total: ${finalCharacters.length}`)
          console.log(`🎮 Smooth update: ${newCharacterList.length} new cubes entering from the right`)
          return finalCharacters
        })
      }
    } catch (err) {
      console.error('❌ Error loading transactions for cubes:', err)
      // Continue without cubes if there's an error
    } finally {
      setLoading(false)
      setIsAutoRefreshing(false)
      setRefreshCountdown(30) // Reset countdown after loading
    }
  }

  // Payment system functions
  const handleRefillHealth = async () => {
    try {
      // First call - should return 402
      const response = await fetch('/api/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Current-Health': gameHealth.toString(),
          'X-Player-Address': wallet.address || ''
        }
      });

      if (response.status === 402) {
        // Payment required - show modal
        const paymentInfo = await response.json();
        setPaymentModal({
          isOpen: true,
          paymentInfo: paymentInfo.payment
        });
      } else       if (response.ok) {
        // Payment already processed
        const result = await response.json();
        setGameHealth(result.newHealth);
        console.log('Health refilled:', result);
        // Record on blockchain
        await onRefillDone(result.newHealth);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Refill error:', error);
      alert(`Refill failed: ${error.message}`);
    }
  };

  const handlePaymentComplete = async () => {
    try {
      // Retry with payment proof
      const response = await fetch('/api/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Current-Health': gameHealth.toString(),
          'X-Player-Address': wallet.address || '',
          'X-Payment': 'demo-ok' // Demo payment proof
        }
      });

      if (response.ok) {
        const result = await response.json();
        setGameHealth(result.newHealth);
        console.log('Health refilled successfully:', result);
        // Record on blockchain
        await onRefillDone(result.newHealth);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Payment completion error:', error);
      alert(`Payment processing failed: ${error.message}`);
    }
  };

  const handleBuyShield = () => {
    // Check if we have enough score to buy shield
    console.log('🛡️ Shield purchase attempt - Score:', gameScore, 'Shield Active:', isShieldActive);
    if (gameScore >= 100 && !isShieldActive) {
      // Deduct points
      setGameScore(prevScore => prevScore - 100);
      // Activate shield
      setIsShieldActive(true);
      setShieldTimeLeft(10);
      console.log('🛡️ Shield activated! Visual effect should now appear around character');
    } else {
      console.log('🛡️ Cannot buy shield - insufficient score or shield already active');
    }
  };

  const handleAddFunds = async () => {
    if (!wallet.address) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const response = await fetch(`/api/onramp-url?address=${wallet.address}`);
      
      if (response.ok) {
        const result = await response.json();
        window.open(result.url, '_blank');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Onramp error:', error);
      alert(`Failed to open onramp: ${error.message}`);
    }
  };

  // Blockchain integration functions
  const recordRisk = async (riskScore, eventType) => {
    if (!wallet.address) return;
    
    try {
      console.log(`📡 Recording risk event: ${eventType}, score: ${riskScore}`);
      await recordRiskEvent(wallet.address, riskScore, eventType);
    } catch (error) {
      console.error('Failed to record risk event:', error);
    }
  };

  const onRefillDone = async (newHealth) => {
    if (!wallet.address) return;
    
    try {
      console.log(`📡 Recording health refill: ${newHealth}`);
      await recordHealthRefill(wallet.address, newHealth);
    } catch (error) {
      console.error('Failed to record health refill:', error);
    }
  };

  const onGameOver = async (finalScore, finalHealth, finalLives) => {
    console.log('!!!wallet.address', wallet.address)
    if (!wallet.address) return;
    
    try {
      console.log(`📡 Submitting final score: ${finalScore} (health: ${finalHealth}, lives: ${finalLives})`);
      const result = await submitScore(wallet.address, finalScore);
      console.log('✅ Score submission result:', result);
      
      // Give some time for the blockchain to update, then refresh data
      setTimeout(() => {
        console.log('🔄 Refreshing player data after score submission...');
        // The HUD component will automatically refresh its data due to polling
        // We could also trigger a manual refresh if needed
      }, 2000);
      
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  // Show wallet connection screen if not connected
  if (!wallet.isConnected) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0a1428 0%, #1e3a5f 25%, #2c5aa0 50%, #1e3a5f 75%, #0a1428 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '3rem',
          borderRadius: '20px',
          border: '2px solid #a29bfe',
          boxShadow: '0 20px 60px rgba(162, 155, 254, 0.3)',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗡️</div>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #a29bfe, #74b9ff)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Katana Fishtank
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            opacity: 0.8, 
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Connect your wallet to dive into the blockchain gaming experience
          </p>
          <button
            onClick={wallet.connect}
            style={{
              background: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(162, 155, 254, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 12px 35px rgba(162, 155, 254, 0.6)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 8px 25px rgba(162, 155, 254, 0.4)'
            }}
          >
            🔗 Connect Wallet to Start
          </button>
          <div style={{
            marginTop: '2rem',
            fontSize: '0.9rem',
            opacity: 0.6,
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '1rem'
          }}>
            <div>🎮 Real-time blockchain gaming</div>
            <div>🏆 On-chain leaderboards</div>
            <div>⚡ Live transaction analysis</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      paddingTop: '60px',
      overflow: 'hidden',
      position: 'relative'
    }}>

      
      {/* Chain Switching Panel */}
      <div style={{ 
        position: 'absolute', 
        top: '70px', 
        left: '20px', 
        width: '349px',
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ 
          color: 'white', 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          🔗 Blockchain Network
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', justifyContent: 'center' }}>
          {/* Katana Indicator */}
          <div style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '2px solid #a29bfe',
            background: 'rgba(162, 155, 254, 0.2)',
            color: '#a29bfe',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '14px' }}>🗡️</span>
            Katana Blockchain
            <span style={{ fontSize: '10px' }}>✓</span>
          </div>
        </div>
        
        <div style={{ 
          fontSize: '10px', 
          opacity: 0.6, 
          color: '#ffffff',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          Gaming ecosystem powered by Katana
        </div>
      </div>
      
      {/* Fishtank Game */}
      {!loading && characters.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: 0,
          width: '100%',
          height: 'calc(100vh - 60px)',
          zIndex: 1000
        }}>
          <FishtankGame 
            characters={characters} 
            mousePos={mousePos}
            gameHealth={gameHealth}
            setGameHealth={setGameHealth}
            gameScore={gameScore}
            setGameScore={setGameScore}
            gameLives={gameLives}
            setGameLives={setGameLives}
            isShieldActive={isShieldActive}
            setIsShieldActive={setIsShieldActive}
            shieldTimeLeft={shieldTimeLeft}
            setShieldTimeLeft={setShieldTimeLeft}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            recordRisk={recordRisk}
            onGameOver={onGameOver}
            loading={loading}
            isAutoRefreshing={isAutoRefreshing}
            refreshCountdown={refreshCountdown}
            charactersCount={characters ? characters.length : 0}
            addGameEvent={addGameEvent}
          />
        </div>
      )}

      {/* HUD Overlay */}
      <HUD
        health={gameHealth}
        maxHealth={8}
        score={gameScore}
        onRefillHealth={handleRefillHealth}
        onAddFunds={handleAddFunds}
        lives={gameLives}
        isShieldActive={isShieldActive}
        shieldTimeLeft={shieldTimeLeft}
        onBuyShield={handleBuyShield}
        selectedChain={selectedChain}
        creatureCount={characters ? characters.length : 0}
        isPaused={isPaused}
      />

      {/* Game Events Console */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '11px',
        overflowY: 'auto',
        padding: '8px 12px',
        zIndex: 1000
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          marginBottom: '4px',
          color: '#74b9ff',
          borderBottom: '1px solid rgba(116, 185, 255, 0.3)',
          paddingBottom: '4px'
        }}>
          🎮 Game Events Console
        </div>
        <div style={{ height: '85px', overflowY: 'auto' }}>
          {gameEvents.length === 0 ? (
            <div style={{ color: '#888', fontStyle: 'italic' }}>
              Waiting for game events...
            </div>
          ) : (
            gameEvents.map(event => (
              <div 
                key={event.id} 
                style={{
                  marginBottom: '2px',
                  color: event.type === 'damage' ? '#ff6b6b' : 
                         event.type === 'points' ? '#00b894' :
                         event.type === 'collision' ? '#fdcb6e' : '#ffffff'
                }}
              >
                <span style={{ color: '#888' }}>[{event.timestamp}]</span> {event.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, paymentInfo: null })}
        paymentInfo={paymentModal.paymentInfo}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  )
}

export default Home
