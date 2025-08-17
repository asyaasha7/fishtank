import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import TransactionCubes from './TransactionCubes'
import FishtankGame from './AviatorGame'
import { HUD } from './HUD'
import { PaymentModal } from './PaymentModal'
import { useWallet } from '../hooks/useWallet'
import { fetchAndAnalyzeTransactions } from '../services/ethereumApi'
import { scoreRisk } from '../utils/riskScoring'
import { recordRiskEvent, recordHealthRefill, submitScore } from '../chain/fishtank'

// Convert transaction to character format with improved creature distribution
function transactionToCharacter(tx) {
  const riskAnalysis = scoreRisk(tx)
  
  // Determine character type based on transaction characteristics and risk
  let characterType = "Standard Transaction"
  
  // High-risk transactions become Toxic Predators (much stricter criteria)
  if (riskAnalysis.risk >= 80 || 
      (tx.typeHints?.includes("Transfer") && tx.token?.notAllowlisted && riskAnalysis.risk >= 60) ||
      (tx.token && !tx.token.verified && riskAnalysis.risk >= 60) ||
      (tx.token?.contractAgeDays && tx.token.contractAgeDays < 1) ||
      tx.lists?.addressOnBlocklist ||
      tx.category === "Scam Token Transfer") {
    characterType = "Toxic Predator"
    console.log('🦈 Creating Toxic Predator:', tx.id, 'Risk:', riskAnalysis.risk, 'Category:', tx.category, 'Token:', tx.token)
  } 
  // MEV/Sandwich attacks become valuable Treasure Jellyfish
  else if (tx.mev?.isSandwichLeg || 
           tx.mev?.bundlePosition || 
           (riskAnalysis.risk >= 40 && tx.typeHints?.includes("MEV"))) {
    characterType = "Treasure Jellyfish"
  }
  // Approval transactions become Pufferfish Traps
  else if (tx.approval?.method === "approve" || 
           tx.typeHints?.includes("Approval")) {
    characterType = "Pufferfish Trap"
  }
  // Swap transactions with slippage become Turbulent Current
  else if (tx.typeHints?.includes("Swap") || 
           tx.dex?.name || 
           (tx.slippage && tx.slippage > 5)) {
    characterType = "Turbulent Current"
  }
  // Medium risk transactions very rarely become Toxic Predators (much reduced frequency)
  else if (riskAnalysis.risk >= 60 && Math.random() < 0.05) {
    characterType = "Toxic Predator"
    console.log('🦈 Creating Toxic Predator (medium risk):', tx.id, 'Risk:', riskAnalysis.risk)
  }
  
  return {
    id: tx.id,
    name: characterType,
    transaction: tx,
    riskAnalysis: riskAnalysis
  }
}

function Home() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [refreshCountdown, setRefreshCountdown] = useState(10)
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
  const wallet = useWallet()

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
    
    // Set up automatic refresh every 10 seconds (pauses when game is paused)
    const refreshInterval = setInterval(() => {
      if (!isPaused) {
        console.log('🔄 Auto-refreshing transactions...')
        setIsAutoRefreshing(true)
        loadTransactions(false) // Smooth refresh
      }
    }, 10000) // 10 seconds
    
    // Countdown timer that updates every second
    const countdownInterval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          return 10 // Reset to 10 when it reaches 0
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
        const transactions = await fetchAndAnalyzeTransactions(40, selectedChain)
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
      } else {
        // Smooth refresh - fetch new transactions and add to existing array
        console.log(`🔄 Fetching new transactions from ${selectedChain} for smooth update...`)
        const newTransactions = await fetchAndAnalyzeTransactions(6, selectedChain) // Fetch fewer for updates
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
      setRefreshCountdown(10) // Reset countdown after loading
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
    if (!wallet.address) return;
    
    try {
      console.log(`📡 Submitting final score: ${finalScore} (health: ${finalHealth}, lives: ${finalLives})`);
      await submitScore(wallet.address, finalScore);
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
