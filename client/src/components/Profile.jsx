import React, { useState, useEffect } from 'react'

// Mock user data - in a real app this would come from authentication/database
const mockUserData = {
  username: "AquaCrypto",
  address: "0x1234...5678",
  avatar: "🐟",
  joinDate: "2024-01-15",
  gamesPlayed: 127,
  totalScore: 45672,
  bestScore: 2840,
  totalTimeAlive: "12h 34m",
  favoriteCube: "Treasure Jellyfish",
  cubesCollected: 892,
  scamTokensAvoided: 234,
  heartsLost: 45,
  achievements: [
    { id: 1, name: "First Dive", description: "Complete your first swim", icon: "🏊", earned: true },
    { id: 2, name: "Jellyfish Collector", description: "Collect 100 Treasure Jellyfish", icon: "🐚", earned: true },
    { id: 3, name: "Deep Sea Survivor", description: "Survive for 5 minutes straight", icon: "🤿", earned: true },
    { id: 4, name: "Predator Dodger", description: "Avoid 50 Toxic Predators", icon: "🦈", earned: true },
    { id: 5, name: "Ocean Explorer", description: "Swim in both Ethereum and Katana waters", icon: "🌊", earned: false },
    { id: 6, name: "Depth Master", description: "Reach a score of 5000", icon: "🐙", earned: false }
  ]
}

// Mock leaderboard data
const mockLeaderboard = [
  { rank: 1, username: "DeepSeaMaster", score: 5247, chain: "ethereum", avatar: "🐳" },
  { rank: 2, username: "CoralGuardian", score: 4892, chain: "ethereum", avatar: "🦑" },
  { rank: 3, username: "AquaCrypto", score: 2840, chain: "katana", avatar: "🐟" },
  { rank: 4, username: "JellyfishHunter", score: 2634, chain: "ethereum", avatar: "🐚" },
  { rank: 5, username: "AgileFin", score: 2401, chain: "katana", avatar: "🌊" },
  { rank: 6, username: "ReefProtector", score: 2156, chain: "ethereum", avatar: "🤿" },
  { rank: 7, username: "CurrentRider", score: 1987, chain: "katana", avatar: "🌊" },
  { rank: 8, username: "PredatorDodger", score: 1845, chain: "ethereum", avatar: "🦈" },
  { rank: 9, username: "TreasureDiver", score: 1723, chain: "katana", avatar: "🤿" },
  { rank: 10, username: "DepthAnalyst", score: 1654, chain: "ethereum", avatar: "🌊" }
]

function Profile() {
  const [activeTab, setActiveTab] = useState('profile')
  const [leaderboardFilter, setLeaderboardFilter] = useState('all')
  const [userData] = useState(mockUserData)

  const filteredLeaderboard = leaderboardFilter === 'all' 
    ? mockLeaderboard 
    : mockLeaderboard.filter(player => player.chain === leaderboardFilter)

  const TabButton = ({ id, label, icon, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      style={{
        background: isActive ? 'linear-gradient(135deg, #00ffff 0%, #0096ff 100%)' : 'rgba(255,255,255,0.1)',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        color: 'white',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '140px',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.target.style.background = 'rgba(255,255,255,0.2)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.target.style.background = 'rgba(255,255,255,0.1)'
        }
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      {label}
    </button>
  )

  const StatCard = ({ icon, label, value, color = '#00ffff' }) => (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'center',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color, marginBottom: '0.5rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{label}</div>
    </div>
  )

  const AchievementCard = ({ achievement }) => (
    <div style={{
      background: achievement.earned ? 'rgba(0,184,148,0.2)' : 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '1rem',
      border: achievement.earned ? '2px solid #00b894' : '1px solid rgba(255,255,255,0.2)',
      opacity: achievement.earned ? 1 : 0.6,
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '2rem', marginRight: '1rem' }}>{achievement.icon}</span>
        <div>
          <div style={{ fontWeight: 'bold', color: achievement.earned ? '#00b894' : 'white' }}>
            {achievement.name}
          </div>
          {achievement.earned && (
            <div style={{ fontSize: '0.8rem', color: '#00b894' }}>✓ Unlocked</div>
          )}
        </div>
      </div>
      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
        {achievement.description}
      </div>
    </div>
  )

  const LeaderboardRow = ({ player, isCurrentUser = false }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '1rem',
      background: isCurrentUser ? 'rgba(116,185,255,0.2)' : 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      border: isCurrentUser ? '2px solid #74b9ff' : '1px solid rgba(255,255,255,0.1)',
      marginBottom: '0.5rem'
    }}>
      <div style={{ 
        minWidth: '60px', 
        fontSize: '1.5rem', 
        fontWeight: 'bold',
        color: player.rank <= 3 ? '#fdcb6e' : '#74b9ff'
      }}>
        #{player.rank}
      </div>
      <div style={{ fontSize: '2rem', marginRight: '1rem' }}>{player.avatar}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '0.2rem' }}>
          {player.username}
          {isCurrentUser && <span style={{ color: '#74b9ff', marginLeft: '0.5rem' }}>(You)</span>}
        </div>
        <div style={{ 
          fontSize: '0.8rem', 
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>{player.chain === 'ethereum' ? '⟠' : '🗡️'}</span>
          {player.chain === 'ethereum' ? 'Ethereum' : 'Katana'}
        </div>
      </div>
      <div style={{ 
        fontSize: '1.5rem', 
        fontWeight: 'bold', 
        color: '#fdcb6e' 
      }}>
        {player.score.toLocaleString()}
      </div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1428 0%, #1e3a5f 25%, #2c5aa0 50%, #1e3a5f 75%, #0a1428 100%)',
      padding: '20px',
      color: 'white'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        paddingTop: '80px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3rem',
            marginBottom: '0.5rem',
            background: 'linear-gradient(45deg, #00ffff, #0096ff, #00ffff)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Swimmer Dashboard
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.8 }}>
            Track your blockchain security skills and compete with other swimmers
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          <TabButton
            id="profile"
            label="Profile"
            icon="👤"
            isActive={activeTab === 'profile'}
            onClick={setActiveTab}
          />
          <TabButton
            id="leaderboard"
            label="Leaderboard"
            icon="🏆"
            isActive={activeTab === 'leaderboard'}
            onClick={setActiveTab}
          />
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            {/* User Info Card */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ 
                  fontSize: '4rem', 
                  marginRight: '2rem',
                  background: 'rgba(116,185,255,0.2)',
                  borderRadius: '50%',
                  width: '100px',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {userData.avatar}
                </div>
                <div>
                  <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {userData.username}
                  </h2>
                  <div style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                    {userData.address}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                    Swimming since {new Date(userData.joinDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <StatCard icon="🎮" label="Games Played" value={userData.gamesPlayed} />
                <StatCard icon="🏆" label="Best Score" value={userData.bestScore.toLocaleString()} color="#fdcb6e" />
                <StatCard icon="📊" label="Total Score" value={userData.totalScore.toLocaleString()} color="#00b894" />
                <StatCard icon="⏱️" label="Time Swimming" value={userData.totalTimeAlive} color="#a29bfe" />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <StatCard icon="🐚" label="Treasures Collected" value={userData.cubesCollected} color="#00b894" />
                <StatCard icon="🚫" label="Predators Avoided" value={userData.scamTokensAvoided} color="#00b894" />
                <StatCard icon="💔" label="Lives Lost" value={userData.heartsLost} color="#ff6b6b" />
                <StatCard icon="⭐" label="Favorite Treasure" value={userData.favoriteCube} color="#a29bfe" />
              </div>
            </div>

            {/* Achievements */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '20px',
              padding: '2rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                color: '#00ffff'
              }}>
                🏅 Achievements
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {userData.achievements.map(achievement => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div>
            {/* Filter Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {[
                { id: 'all', label: 'All Chains', icon: '🌐' },
                { id: 'ethereum', label: 'Ethereum', icon: '⟠' },
                { id: 'katana', label: 'Katana', icon: '🗡️' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setLeaderboardFilter(filter.id)}
                  style={{
                    background: leaderboardFilter === filter.id ? 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Leaderboard */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '20px',
              padding: '2rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                color: '#fdcb6e',
                textAlign: 'center'
              }}>
                🏆 Top Swimmers {leaderboardFilter !== 'all' && `- ${leaderboardFilter === 'ethereum' ? 'Ethereum' : 'Katana'}`}
              </h3>
              
              <div>
                {filteredLeaderboard.map(player => (
                  <LeaderboardRow 
                    key={player.rank + player.chain} 
                    player={player} 
                    isCurrentUser={player.username === userData.username}
                  />
                ))}
              </div>

              {filteredLeaderboard.length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.6, padding: '2rem' }}>
                  No swimmers found for {leaderboardFilter} chain
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
