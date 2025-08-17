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
  const [selectedChain, setSelectedChain] = useState('ethereum')
  
  // Payment system states
  const [gameHealth, setGameHealth] = useState(9) // Start with full health
  const [gameScore, setGameScore] = useState(0)
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, paymentInfo: null })
  const [gameLives, setGameLives] = useState(3)
  const [isShieldActive, setIsShieldActive] = useState(false)
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0)
  const wallet = useWallet()

  useEffect(() => {
    loadTransactions(true) // Initial load
    
    // Add mouse move listener for sphere control
    const handleMouseMove = (event) => {
      const tx = -1 + (event.clientX / window.innerWidth) * 2;
      const ty = 1 - (event.clientY / window.innerHeight) * 2;
      setMousePos({ x: tx, y: ty });
    };

    document.addEventListener('mousemove', handleMouseMove, false);
    
    // Set up automatic refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing transactions...')
      setIsAutoRefreshing(true)
      loadTransactions(false) // Smooth refresh
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
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, [selectedChain]) // Reload when chain changes

  const handleChainSwitch = (newChain) => {
    if (newChain !== selectedChain) {
      console.log(`🔄 Switching from ${selectedChain} to ${newChain}`)
      setSelectedChain(newChain)
      setRefreshCountdown(10) // Reset countdown
      // The useEffect will trigger a reload automatically
    }
  }

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
      } else if (response.ok) {
        // Payment already processed
        const result = await response.json();
        setGameHealth(result.newHealth);
        console.log('Health refilled:', result);
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
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Payment completion error:', error);
      alert(`Payment processing failed: ${error.message}`);
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

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      paddingTop: '60px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '180px', 
        gap: '20px',
        left: '20px', 
        width: '349px',
        display: 'flex',
        zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '8px'
      }}>
        {loading && (
          <div style={{ 
            fontSize: '12px',
            opacity: 0.7,
            color: '#00ffff'
          }}>
            Loading transaction data...
          </div>
        )}
        {!loading && (
          <div style={{ 
            fontSize: '12px',
            opacity: 0.7,
            color: '#00b894'
          }}>
            {characters.length} transactions loaded
          </div>
        )}
        
        {/* Auto-refresh status */}
        <div style={{ 
          fontSize: '11px',
          opacity: 0.6,
          color: isAutoRefreshing ? '#fdcb6e' : '#74b9ff',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {isAutoRefreshing ? (
            <>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                border: '2px solid #fdcb6e',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Adding new cubes...
            </>
          ) : (
            <>
              <span style={{ color: '#74b9ff' }}>🔄</span>
              Next batch in {refreshCountdown}s
            </>
          )}
        </div>
      </div>
      
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
          {/* Ethereum Button */}
          <button
            onClick={() => handleChainSwitch('ethereum')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: selectedChain === 'ethereum' ? '2px solid #00ffff' : '1px solid rgba(255,255,255,0.3)',
              background: selectedChain === 'ethereum' ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255,255,255,0.1)',
              color: selectedChain === 'ethereum' ? '#00ffff' : '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (selectedChain !== 'ethereum') {
                e.target.style.background = 'rgba(255,255,255,0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedChain !== 'ethereum') {
                e.target.style.background = 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <span style={{ fontSize: '14px' }}>⟠</span>
            Ethereum
            {selectedChain === 'ethereum' && <span style={{ fontSize: '10px' }}>✓</span>}
          </button>
          
          {/* Katana Button */}
          <button
            onClick={() => handleChainSwitch('katana')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: selectedChain === 'katana' ? '2px solid #a29bfe' : '1px solid rgba(255,255,255,0.3)',
              background: selectedChain === 'katana' ? 'rgba(162, 155, 254, 0.2)' : 'rgba(255,255,255,0.1)',
              color: selectedChain === 'katana' ? '#a29bfe' : '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (selectedChain !== 'katana') {
                e.target.style.background = 'rgba(255,255,255,0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedChain !== 'katana') {
                e.target.style.background = 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <span style={{ fontSize: '14px' }}>🗡️</span>
            Katana
            {selectedChain === 'katana' && <span style={{ fontSize: '10px' }}>✓</span>}
          </button>
        </div>
        
        <div style={{ 
          fontSize: '10px', 
          opacity: 0.6, 
          color: '#ffffff',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          {selectedChain === 'ethereum' ? 'Mainnet transactions' : 'Gaming ecosystem'}
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
          zIndex: 0
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
          />
        </div>
      )}

      {/* HUD Overlay */}
      <HUD
        health={gameHealth}
        maxHealth={9}
        score={gameScore}
        onRefillHealth={handleRefillHealth}
        onAddFunds={handleAddFunds}
        lives={gameLives}
        isShieldActive={isShieldActive}
        shieldTimeLeft={shieldTimeLeft}
        onBuyShield={() => {
          // This will be handled by the game component
          // For now, just a placeholder
          console.log('Shield purchase requested from HUD');
        }}
        selectedChain={selectedChain}
        creatureCount={characters ? characters.length : 0}
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
