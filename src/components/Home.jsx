import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import TransactionCubes from './TransactionCubes'
import AviatorGame from './AviatorGame'
import { fetchAndAnalyzeTransactions } from '../services/ethereumApi'
import { scoreRisk } from '../utils/riskScoring'

// Convert transaction to character format (simplified version)
function transactionToCharacter(tx) {
  const riskAnalysis = scoreRisk(tx)
  
  // Determine character type based on transaction characteristics
  let characterType = "Standard Transaction"
  
  if (tx.typeHints?.includes("Transfer") && tx.token?.notAllowlisted) {
    characterType = "Scam Token Hunter"
  } else if (tx.approval?.method === "approve") {
    characterType = "Approval Guardian"
  } else if (tx.typeHints?.includes("Swap") || tx.dex?.name) {
    characterType = "Slippage Sentinel"
  } else if (tx.mev?.isSandwichLeg) {
    characterType = "MEV Detective"
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
  }, [])

  const loadTransactions = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
        console.log('🎲 Loading initial transactions for 3D cube visualization...')
        const transactions = await fetchAndAnalyzeTransactions(12)
        const characterList = transactions.map(transactionToCharacter)
        setCharacters(characterList)
        console.log(`✅ Loaded ${characterList.length} initial transaction cubes`)
      } else {
        // Smooth refresh - fetch new transactions and add to existing array
        console.log('🔄 Fetching new transactions for smooth update...')
        const newTransactions = await fetchAndAnalyzeTransactions(6) // Fetch fewer for updates
        const newCharacterList = newTransactions.map(transactionToCharacter)
        
        setCharacters(prevCharacters => {
          // Add new transactions to the end and remove old ones from the front
          const maxTransactions = 18 // Maintain a rolling buffer of 18 transactions
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
        top: '80px', 
        left: '20px', 
        zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px'
      }}>
        {loading && (
          <div style={{ 
            marginTop: '10px',
            fontSize: '12px',
            opacity: 0.7,
            color: '#74b9ff'
          }}>
            Loading transaction data...
          </div>
        )}
        {!loading && (
          <div style={{ 
            marginTop: '10px',
            fontSize: '12px',
            opacity: 0.7,
            color: '#00b894'
          }}>
            {characters.length} transactions loaded
          </div>
        )}
        
        {/* Auto-refresh status */}
        <div style={{ 
          marginTop: '10px',
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
      
      {/* Aviator Game */}
      {!loading && characters.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: 0,
          width: '100%',
          height: 'calc(100vh - 60px)',
          zIndex: 0
        }}>
          <AviatorGame characters={characters} mousePos={mousePos} />
        </div>
      )}
    </div>
  )
}

export default Home
