import React, { useState, useEffect } from 'react'
import { scoreRisk } from '../utils/riskScoring'
import { fetchAndAnalyzeTransactions } from '../services/ethereumApi'

// Convert transaction to character format
function transactionToCharacter(tx) {
  const riskAnalysis = scoreRisk(tx)
  
  // Determine character type based on transaction characteristics
  let characterType = "Standard Transaction"
  let avatar = "💰"
  let background = "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)"
  
  if (tx.typeHints?.includes("Transfer") && tx.token?.notAllowlisted) {
    characterType = "Toxic Predator"
    avatar = "🦈"
    background = "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)"
  } else if (tx.approval?.method === "approve") {
    characterType = "Pufferfish Trap"
    avatar = "🐡"
    background = "linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)"
  } else if (tx.typeHints?.includes("Swap") || tx.dex?.name) {
    characterType = "Turbulent Current"
    avatar = "🌊"
    background = "linear-gradient(135deg, #00bfff 0%, #0096ff 100%)"
  } else if (tx.mev?.isSandwichLeg) {
    characterType = "Treasure Jellyfish"
    avatar = "🐚"
    background = "linear-gradient(135deg, #40e0d0 0%, #20b2aa 100%)"
  }
  
  const riskLevel = riskAnalysis.risk >= 60 ? "CRITICAL" :
                   riskAnalysis.risk >= 40 ? "EXTREME" :
                   riskAnalysis.risk >= 20 ? "HIGH" :
                   riskAnalysis.risk >= 10 ? "MEDIUM" : "LOW"
  
  return {
    id: tx.id,
    name: characterType,
    class: riskLevel,
    category: tx.category || characterType,
    avatar: avatar,
    background: background,
    description: getCharacterDescription(characterType, riskAnalysis),
    transaction: tx,
    riskAnalysis: riskAnalysis,
    stats: {
      "Risk Score": riskAnalysis.risk,
      "Block Number": tx.blockNumber || "N/A",
      "Gas Used": tx.gasUsed || "N/A",
      "Gas Price": tx.gasPrice ? `${tx.gasPrice} gwei` : "N/A",
      "Timestamp": tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : "Recent",
      "Status": riskAnalysis.label
    },
    abilities: riskAnalysis.reasons
  }
}

function getCharacterDescription(type, riskAnalysis) {
  const descriptions = {
    "Toxic Predator": "Detecting suspicious token transfers in contaminated pools with unverified contracts",
    "Pufferfish Trap": "Monitoring token approvals to unknown currents and potentially malicious depths", 
    "Turbulent Current": "Identifying DEX swaps with extreme turbulence indicating possible manipulation",
    "Treasure Jellyfish": "Tracking MEV sandwich attacks and front-running patterns in transaction currents",
    "Standard Transaction": "Regular blockchain transaction with standard risk characteristics"
  }
  
  return descriptions[type] || "Analyzing transaction for potential security risks and anomalies"
}

// Category configuration for transaction types
const typeConfig = {
  "Toxic Predator": {
    icon: "🦈",
    color: "#ff6b6b",
    gradient: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
    description: "Detecting suspicious token transfers in contaminated pools"
  },
  "Pufferfish Trap": {
    icon: "🐡", 
    color: "#fdcb6e",
    gradient: "linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)",
    description: "Monitoring infinite approvals to unknown currents"
  },
  "Turbulent Current": {
    icon: "🌊",
    color: "#00bfff",
    gradient: "linear-gradient(135deg, #00bfff 0%, #0096ff 100%)",
    description: "Identifying swaps with extreme turbulence and shallow pools"
  },
  "Treasure Jellyfish": {
    icon: "🐚",
    color: "#40e0d0", 
    gradient: "linear-gradient(135deg, #40e0d0 0%, #20b2aa 100%)",
    description: "Tracking sandwich attacks and front-running patterns"
  },
  "Standard Transaction": {
    icon: "💰",
    color: "#00b894",
    gradient: "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
    description: "Regular blockchain transactions with standard risk profiles"
  }
};

// Transaction type row component with arrow navigation
function TransactionTypeRow({ type, characters, selectedCharacter, onSelectCharacter }) {
  const config = typeConfig[type] || typeConfig["Standard Transaction"];
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const goToNext = () => {
    if (currentIndex < characters.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const currentCharacter = characters[currentIndex];
  
  return (
    <div style={{
      marginBottom: '4rem'
    }}>
      {/* Type Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        padding: '1rem 1.5rem',
        background: config.gradient,
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '2.5rem', marginRight: '1rem' }}>{config.icon}</span>
          <div>
            <h2 style={{ 
              margin: '0', 
              fontSize: '2rem', 
              color: 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {type}
            </h2>
            <p style={{ 
              margin: '0.5rem 0 0 0', 
              fontSize: '1.1rem', 
              opacity: '0.9',
              color: 'white'
            }}>
              {config.description}
            </p>
            <div style={{
              marginTop: '0.5rem',
              background: 'rgba(255,255,255,0.2)',
              padding: '0.3rem 0.8rem',
              borderRadius: '15px',
              fontSize: '0.9rem',
              display: 'inline-block'
            }}>
              {characters.length} transaction{characters.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        {/* Navigation Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            style={{
              background: currentIndex === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              color: currentIndex === 0 ? 'rgba(255,255,255,0.3)' : 'white',
              fontSize: '1.5rem',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (currentIndex !== 0) {
                e.target.style.background = 'rgba(255,255,255,0.3)'
                e.target.style.transform = 'scale(1.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (currentIndex !== 0) {
                e.target.style.background = 'rgba(255,255,255,0.2)'
                e.target.style.transform = 'scale(1)'
              }
            }}
          >
            ←
          </button>

          <div style={{
            color: 'white',
            fontSize: '1rem',
            fontWeight: 'bold',
            minWidth: '60px',
            textAlign: 'center'
          }}>
            {currentIndex + 1} / {characters.length}
          </div>

          <button
            onClick={goToNext}
            disabled={currentIndex === characters.length - 1}
            style={{
              background: currentIndex === characters.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              color: currentIndex === characters.length - 1 ? 'rgba(255,255,255,0.3)' : 'white',
              fontSize: '1.5rem',
              cursor: currentIndex === characters.length - 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (currentIndex !== characters.length - 1) {
                e.target.style.background = 'rgba(255,255,255,0.3)'
                e.target.style.transform = 'scale(1.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (currentIndex !== characters.length - 1) {
                e.target.style.background = 'rgba(255,255,255,0.2)'
                e.target.style.transform = 'scale(1)'
              }
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Full Width Card */}
      {currentCharacter && (
        <FullWidthTransactionCard
          character={currentCharacter}
          isSelected={selectedCharacter === currentCharacter.id}
          onSelect={onSelectCharacter}
          config={config}
        />
      )}
    </div>
  );
}

// Full width transaction card component
function FullWidthTransactionCard({ character, isSelected, onSelect, config }) {
  return (
    <div 
      style={{
        width: '100%',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        backdropFilter: 'blur(15px)',
        border: `2px solid ${config.color}`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: `0 10px 30px ${config.color}40`,
        position: 'relative'
      }}
      onClick={() => onSelect(character.id)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 15px 40px ${config.color}60`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = `0 10px 30px ${config.color}40`
      }}
    >
      {/* Main Content Layout */}
      <div style={{
        display: 'flex',
        minHeight: '300px'
      }}>
        {/* Left side - Avatar and Risk Score */}
        <div style={{
          width: '250px',
          background: config.gradient,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '5rem',
            marginBottom: '1rem',
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
          }}>
            {character.avatar}
          </div>
          
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            padding: '1rem 1.5rem',
            borderRadius: '20px',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '0.5rem'
            }}>
              {character.stats["Risk Score"]}
            </div>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: 'white'
            }}>
              RISK SCORE
            </div>
          </div>
          
          <div style={{
            background: character.class === 'CRITICAL' ? 'rgba(255,107,107,0.8)' : 
                       character.class === 'EXTREME' ? 'rgba(255,107,107,0.8)' :
                       character.class === 'HIGH' ? 'rgba(255,193,7,0.8)' : 'rgba(40,167,69,0.8)',
            padding: '0.5rem 1rem',
            borderRadius: '15px',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}>
            {character.class} RISK
          </div>
        </div>

        {/* Right side - Transaction Details */}
        <div style={{
          flex: 1,
          padding: '2rem',
          color: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '2rem',
              fontWeight: 'bold',
              color: config.color
            }}>
              {character.name}
            </h3>
            <div style={{
              fontSize: '0.9rem',
              opacity: '0.7',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              marginBottom: '1rem'
            }}>
              TX: {character.transaction.hash}
            </div>
            <p style={{
              lineHeight: '1.6',
              opacity: '0.9',
              fontSize: '1rem',
              margin: '0'
            }}>
              {character.description}
            </p>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {Object.entries(character.stats).slice(1).map(([stat, value]) => (
              <div key={stat} style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '1rem',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ 
                  fontSize: '0.8rem', 
                  opacity: '0.8',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {stat}
                </div>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold',
                  color: config.color
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Risk Factors */}
          <div>
            <h4 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.2rem',
              color: config.color
            }}>
              Risk Factors Analysis
            </h4>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}>
              {character.abilities.map((reason, index) => (
                <span key={index} style={{
                  background: 'rgba(255,107,107,0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255,107,107,0.5)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ color: '#ff6b6b' }}>⚠️</span>
                  {reason}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Explore() {
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [characters, setCharacters] = useState([])
  const [groupedCharacters, setGroupedCharacters] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedChain] = useState('katana')

  // Group characters by their transaction type
  const groupCharactersByType = (characters) => {
    return characters.reduce((groups, character) => {
      const type = character.name; // Use character name as type
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(character);
      return groups;
    }, {});
  }

  useEffect(() => {
    loadTransactions()
  }, [selectedChain]) // Reload when chain changes



  const loadTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🚀 Starting transaction fetch from ${selectedChain}...`)
      const transactions = await fetchAndAnalyzeTransactions(15, selectedChain) // Fetch more for better grouping
      const characterList = transactions.map(transactionToCharacter)
      
      // Group characters by transaction type
      const grouped = groupCharactersByType(characterList)
      setCharacters(characterList)
      setGroupedCharacters(grouped)
      
      if (characterList.length > 0) {
        setSelectedCharacter(characterList[0].id)
      }
      
      // Check data source and update UI accordingly
      const dataSource = transactions[0]?.id?.includes('etherscan') ? 'Etherscan V2 API' :
                         transactions[0]?.id?.includes('blockchair') ? 'Blockchair API' :
                         transactions[0]?.id?.includes('rpc') ? 'Ethereum RPC' :
                         'Enhanced Simulation'
      
      console.log(`✅ Successfully loaded ${characterList.length} transactions from: ${dataSource}`)
      console.log(`📊 Grouped into ${Object.keys(grouped).length} types:`, Object.keys(grouped).map(type => `${type}(${grouped[type].length})`).join(', '))
      
    } catch (err) {
      setError(`Failed to fetch transaction data: ${err.message}`)
      console.error('❌ Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshTransactions = () => {
    loadTransactions()
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1428 0%, #1e3a5f 25%, #2c5aa0 50%, #1e3a5f 75%, #0a1428 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            animation: 'spin 2s linear infinite' 
          }}>⟳</div>
          <h2>Loading Recent Transactions...</h2>
          <p style={{ opacity: 0.7 }}>Trying Etherscan V2 API → Blockchair API → Ethereum RPC → Enhanced Simulation</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1428 0%, #1e3a5f 25%, #2c5aa0 50%, #1e3a5f 75%, #0a1428 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2>Error Loading Transactions</h2>
          <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{error}</p>
          <button 
            onClick={refreshTransactions}
            style={{
              background: 'linear-gradient(135deg, #00ffff 0%, #0096ff 100%)',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      height: 'auto',
      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
      padding: '20px',
      paddingBottom: '40px',
      color: 'white',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        paddingTop: '80px'
      }}>
        <h1 style={{
          fontSize: '3rem',
          marginBottom: '0.5rem',
          textAlign: 'center',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Liquidity Pool Analysis
        </h1>
        
        {/* Katana Network Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '2rem'
        }}>
          <div style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '2px solid #a29bfe',
            background: 'rgba(162, 155, 254, 0.2)',
            color: '#a29bfe',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>🗡️</span>
            Katana Blockchain Explorer
            <span style={{ fontSize: '12px' }}>✓</span>
          </div>
        </div>
        
        <div style={{
          textAlign: 'center',
          marginBottom: '4rem'
        }}>
          <p style={{
            fontSize: '1.1rem',
            opacity: '0.8',
            marginBottom: '0.5rem'
          }}>
            Analyzing dangerous marine creatures in blockchain liquidity pools (Risk Score &gt; 0)
          </p>
          
          <p style={{
            fontSize: '0.9rem',
            opacity: '0.6',
            marginBottom: '1.5rem',
            fontStyle: 'italic'
          }}>
            Exploring Katana coral reefs and gaming ecosystem currents, including bridge depths and NFT treasures
          </p>
          
          <button 
            onClick={refreshTransactions}
            style={{
              background: 'linear-gradient(135deg, #00ffff 0%, #0096ff 100%)',
              border: 'none',
              padding: '0.8rem 1.5rem',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              boxShadow: '0 4px 15px rgba(116, 185, 255, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
            }}
          >
            🔄 Refresh Transactions
          </button>
        </div>

        {/* Transaction Summary */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '3rem',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
            Marine Life Overview
          </h3>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ffff' }}>
                {characters.length}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                Total Creatures
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00b894' }}>
                {Object.keys(groupedCharacters).length}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                Species Types
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fdcb6e' }}>
                {characters.filter(c => c.class === 'CRITICAL' || c.class === 'EXTREME').length}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                Dangerous Predators
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Type Rows */}
        {Object.entries(groupedCharacters).map(([type, typeCharacters]) => (
          <TransactionTypeRow
            key={type}
            type={type}
            characters={typeCharacters}
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
          />
        ))}

        {/* Instructions */}
        <div style={{
          textAlign: 'center',
          marginTop: '3rem',
          opacity: '0.6',
          fontSize: '0.9rem'
        }}>
          <p>🔍 Use the left/right arrows in each category header to navigate between transactions</p>
          <p>🎯 Each category shows one full-width transaction card at a time</p>
          <p>⚡ Click on any card to view detailed risk analysis</p>
        </div>
      </div>
    </div>
  )
}

export default Explore