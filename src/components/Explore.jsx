import React, { useState } from 'react'
import { generateMockTransactions, categorizeTransaction } from '../utils/riskScoring'

// Generate transaction-based characters
const mockTransactions = generateMockTransactions()
const characters = mockTransactions.map(tx => {
  const character = categorizeTransaction(tx)
  return {
    id: tx.id,
    name: character.name,
    class: character.riskLevel,
    category: tx.category,
    avatar: character.avatar,
    background: character.background,
    description: character.description,
    transaction: character.transaction,
    riskAnalysis: character.riskAnalysis,
    // Convert transaction details to stats-like format
    stats: {
      "Risk Score": character.riskAnalysis.risk,
      "Block Number": tx.blockNumber || "N/A",
      "Gas Used": tx.gasUsed || "N/A",
      "Value (ETH)": tx.value || "N/A",
      "Timestamp": tx.timestamp || "Recent",
      "Status": character.riskAnalysis.label
    },
    abilities: character.riskAnalysis.reasons
  }
})

function CharacterCard({ character, isSelected, onSelect }) {
  return (
    <div 
      style={{
        display: 'flex',
        background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        backdropFilter: 'blur(15px)',
        border: isSelected ? '2px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.2)',
        marginBottom: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isSelected ? '0 10px 30px rgba(0,0,0,0.3)' : '0 5px 15px rgba(0,0,0,0.1)'
      }}
      onClick={() => onSelect(character.id)}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'scale(1.01)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
        }
      }}
    >
      {/* Left side - Avatar */}
      <div style={{
        width: '200px',
        background: character.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
        }}>
          {character.avatar}
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          Risk: {character.stats["Risk Score"]}
        </div>
      </div>

      {/* Right side - Character Info */}
      <div style={{
        flex: 1,
        padding: '2rem',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem'
        }}>
          <div>
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '1.8rem',
              fontWeight: 'bold'
            }}>
              {character.name}
            </h3>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                background: character.class === 'CRITICAL' ? 'rgba(255,107,107,0.3)' : 
                           character.class === 'EXTREME' ? 'rgba(255,107,107,0.3)' :
                           character.class === 'HIGH' ? 'rgba(255,193,7,0.3)' : 'rgba(40,167,69,0.3)',
                padding: '0.3rem 0.8rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                display: 'inline-block',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                {character.class} RISK
              </div>
            </div>
            <div style={{
              fontSize: '0.85rem',
              opacity: '0.7',
              fontFamily: 'monospace'
            }}>
              TX: {character.transaction.hash}
            </div>
          </div>
        </div>

        <p style={{
          lineHeight: '1.5',
          opacity: '0.9',
          marginBottom: '1.5rem',
          fontSize: '0.95rem'
        }}>
          {character.description}
        </p>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {Object.entries(character.stats).map(([stat, value]) => (
            <div key={stat} style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '0.8rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', opacity: '0.8' }}>{stat}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Risk Factors */}
        <div>
          <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem' }}>Risk Factors:</h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {character.abilities.map((reason, index) => (
              <span key={index} style={{
                background: 'rgba(255,107,107,0.3)',
                padding: '0.3rem 0.8rem',
                borderRadius: '15px',
                fontSize: '0.8rem',
                border: '1px solid rgba(255,107,107,0.5)'
              }}>
                {reason}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Explore() {
  const [selectedCharacter, setSelectedCharacter] = useState(1)

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
          Transaction Risk Analysis
        </h1>
        
        <p style={{
          textAlign: 'center',
          fontSize: '1.1rem',
          opacity: '0.8',
          marginBottom: '3rem'
        }}>
          Analyzing blockchain transactions and their risk characteristics
        </p>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0'
        }}>
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              isSelected={selectedCharacter === character.id}
              onSelect={setSelectedCharacter}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Explore
