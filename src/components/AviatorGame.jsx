import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Game state and utilities
let gameState = {
  score: 0,
  lives: 3,
  health: 3, // Current health progress (3 = full heart, 0 = damaged heart)
  maxHealth: 3, // Max health per heart
  isGameOver: false,
  cubes: [],
  particleEffects: [],
  damageEffects: []
}

// Collision detection utility
function checkCollision(sphere, cube, threshold = 1.5) {
  if (!sphere || !cube) return false
  const distance = sphere.position.distanceTo(cube.position)
  return distance < threshold
}

// Handle taking damage
function takeDamage(amount = 1) {
  gameState.health -= amount
  
  // If health reaches 0, lose a life and reset health
  if (gameState.health <= 0) {
    gameState.lives -= 1
    gameState.health = gameState.maxHealth
    
    // Game over if no lives left
    if (gameState.lives <= 0) {
      console.log('💀 Game Over! Final Score:', gameState.score)
      gameState.isGameOver = true
      // Don't auto-reset - let the UI handle restart
    }
  }
}

// Reset game state for restart
function resetGame() {
  gameState.lives = 3
  gameState.health = gameState.maxHealth
  gameState.score = 0
  gameState.isGameOver = false
  console.log('🎮 Game restarted!')
}

// Normalize function from tutorial
function normalize(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin);
  var dv = vmax - vmin;
  var pc = (nv - vmin) / dv;
  var dt = tmax - tmin;
  var tv = tmin + (pc * dt);
  return tv;
}

// Particle effect for collecting cubes
function ParticleEffect({ position, color, onComplete }) {
  const particlesRef = useRef()
  const [particles] = useState(() => {
    const particleCount = 15
    const particles = []
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        position: [
          position[0] + (Math.random() - 0.5) * 2,
          position[1] + (Math.random() - 0.5) * 2,
          position[2] + (Math.random() - 0.5) * 2
        ],
        velocity: [
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ],
        life: 1.0,
        scale: 0.1 + Math.random() * 0.2
      })
    }
    return particles
  })

  useFrame((state, delta) => {
    if (particlesRef.current) {
      particles.forEach((particle, index) => {
        // Update particle position and life
        particle.position[0] += particle.velocity[0] * delta * 60
        particle.position[1] += particle.velocity[1] * delta * 60
        particle.position[2] += particle.velocity[2] * delta * 60
        particle.life -= delta * 2
        
        // Update mesh
        const mesh = particlesRef.current.children[index]
        if (mesh) {
          mesh.position.set(...particle.position)
          mesh.scale.setScalar(particle.scale * particle.life)
          mesh.material.opacity = particle.life
        }
      })
      
      // Remove effect when particles are dead
      if (particles[0].life <= 0) {
        onComplete()
      }
    }
  })

  return (
    <group ref={particlesRef}>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial 
            color={color} 
            transparent={true}
            opacity={particle.life}
          />
        </mesh>
      ))}
    </group>
  )
}

// Enhanced transaction cube with collision detection
function GameTransactionCube({ character, position, speed, scale, sphereRef, onCollected }) {
  const meshRef = useRef()
  const [isCollected, setIsCollected] = useState(false)
  
  // Keep track of cube's current position independently
  const currentPosition = useRef([...position])
  
  // Get color from character's type configuration
  const getColor = (characterName) => {
    const colorMap = {
      "Scam Token Hunter": "#ff6b6b",
      "Approval Guardian": "#fdcb6e", 
      "Slippage Sentinel": "#74b9ff",
      "MEV Detective": "#a29bfe",  // This is the collectible one!
      "Standard Transaction": "#00b894"
    }
    return colorMap[characterName] || "#ffffff"
  }

  useFrame((state, delta) => {
    if (meshRef.current && !isCollected) {
      // Different movement speeds based on character type
      let movementSpeed = 15; // Default speed
      
      if (character.name === "Scam Token Hunter") {
        movementSpeed = 15; // Keep same speed as default for dangerous cubes
        // Make Scam Token Hunter fly at the same Z-axis as the player for better collision
        if (sphereRef.current) {
          currentPosition.current[2] = sphereRef.current.position.z; // Match player's Z position (2)
        }
      } else {
        // Make other cubes fly slower
        movementSpeed = 8; // Slower speed for non-dangerous cubes
      }
      
      // Move from right to left - use independent position tracking
      currentPosition.current[0] -= speed * delta * movementSpeed
      
      // Update mesh position
      meshRef.current.position.x = currentPosition.current[0]
      meshRef.current.position.y = currentPosition.current[1]
      meshRef.current.position.z = currentPosition.current[2]
      
      // Special rotation for MEV Detective (more complex)
      if (character.name === "MEV Detective") {
        meshRef.current.rotation.x += delta * 0.3
        meshRef.current.rotation.y += delta * 0.4
        meshRef.current.rotation.z += delta * 0.2
        
        // Animate the torus ring if it exists
        if (meshRef.current.children[1]) {
          meshRef.current.children[1].rotation.x += delta * 1.5
          meshRef.current.children[1].rotation.z += delta * 0.8
        }
        
        // Animate orbiting particles
        const time = state.clock.elapsedTime
        if (meshRef.current.children[3]) meshRef.current.children[3].position.x = Math.cos(time * 2) * 1.5
        if (meshRef.current.children[4]) meshRef.current.children[4].position.x = Math.cos(time * 2 + Math.PI) * 1.5
        if (meshRef.current.children[5]) meshRef.current.children[5].position.y = Math.sin(time * 2) * 1.5
        if (meshRef.current.children[6]) meshRef.current.children[6].position.y = Math.sin(time * 2 + Math.PI) * 1.5
      } else {
        // Regular rotation for other cubes
        meshRef.current.rotation.x += delta * 0.2
        meshRef.current.rotation.y += delta * 0.15
      }
      
      // Check collision with sphere
      if (sphereRef.current && checkCollision(sphereRef.current, meshRef.current, character.name === "MEV Detective" ? 2.0 : 1.2)) {
        if (character.name === "MEV Detective") {
          // Collectible! Give points and make it disappear
          setIsCollected(true)
          onCollected(character, meshRef.current.position.clone())
        } else if (character.name === "Scam Token Hunter") {
          // Dangerous cube - take damage and make it disappear
          setIsCollected(true)
          takeDamage(1)
          onCollected(character, meshRef.current.position.clone(), 'damage')
        } else {
          // Other cubes - just pass through for now
          // We can add different behavior for other types later
        }
      }
      
      // Reset position when cube goes off screen
      if (currentPosition.current[0] < -15) {
        currentPosition.current[0] = 15 + Math.random() * 10
        currentPosition.current[1] = position[1] + (Math.random() - 0.5) * 2
        currentPosition.current[2] = position[2] + (Math.random() - 0.5) * 4
      }
    }
  })

  // Don't render if collected
  if (isCollected) return null

  const color = getColor(character.name)

  // Special shape for MEV Detective (diamond/crystal)
  if (character.name === "MEV Detective") {
    return (
      <group ref={meshRef} position={currentPosition.current} scale={scale}>
        {/* Central diamond core */}
        <mesh>
          <octahedronGeometry args={[0.8, 0]} />
          <meshPhongMaterial 
            color={color}
            transparent={true}
            opacity={0.9}
            shininess={100}
            emissive={color}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        {/* Rotating outer ring */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[1.2, 0.1, 8, 16]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent={true}
            opacity={0.6}
          />
        </mesh>
        
        {/* Pulsing inner glow */}
        <mesh>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial 
            color={color}
            transparent={true}
            opacity={0.4}
          />
        </mesh>
        
        {/* Small orbiting particles */}
        <mesh position={[1.5, 0, 0]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-1.5, 0, 0]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, -1.5, 0]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    )
  }

  // Regular cube shape for other transaction types
  return (
    <mesh ref={meshRef} position={currentPosition.current} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhongMaterial 
        color={color}
        transparent={true}
        opacity={0.6}
        shininess={50}
      />
    </mesh>
  )
}

// Enhanced flying sphere with collision detection
const GameSphere = React.memo(({ mousePos, sphereRef }) => {
  const propellerRef = useRef()
  
  useFrame((state, delta) => {
    if (sphereRef.current && mousePos) {
      // Convert mouse position to target coordinates
      const targetY = normalize(mousePos.y, -0.75, 0.75, -3, 3);
      const targetX = normalize(mousePos.x, -0.75, 0.75, -2, 2);
      
      // Smooth movement toward target position
      sphereRef.current.position.y += (targetY - sphereRef.current.position.y) * 0.1;
      sphereRef.current.position.x += (targetX - sphereRef.current.position.x) * 0.05;
      
      // Rotate the sphere proportionally to movement for realistic flight
      sphereRef.current.rotation.z = (targetY - sphereRef.current.position.y) * 0.1;
      sphereRef.current.rotation.x = (sphereRef.current.position.y - targetY) * 0.05;
    }
    
    // Rotate the propeller continuously
    if (propellerRef.current) {
      propellerRef.current.rotation.x += delta * 10;
    }
  })

  return (
    <group ref={sphereRef} position={[-3, 0, 2]}>
      {/* Main sphere body - now glowing to show it's the player */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshPhongMaterial 
          color="#00b894" 
          shininess={100}
          emissive="#00b894"
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Glowing ring around sphere to show it's special */}
      <mesh>
        <torusGeometry args={[0.6, 0.1, 8, 16]} />
        <meshBasicMaterial 
          color="#74b9ff" 
          transparent={true}
          opacity={0.6}
        />
      </mesh>
      
      {/* Wing attachments */}
      <mesh position={[0, 0, 0.5]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.1, 0.1]} />
        <meshPhongMaterial color="#00a085" />
      </mesh>
      
      <mesh position={[0, 0, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.1, 0.1]} />
        <meshPhongMaterial color="#00a085" />
      </mesh>
      
      {/* Front propeller */}
      <group ref={propellerRef} position={[0.5, 0, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
          <meshPhongMaterial color="#2d3436" />
        </mesh>
        
        {/* Propeller blades */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 0.8, 0.05]} />
          <meshPhongMaterial color="#636e72" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.02, 0.8, 0.05]} />
          <meshPhongMaterial color="#636e72" />
        </mesh>
      </group>
      
      {/* Enhanced trail effect */}
      <mesh position={[-0.6, 0, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial 
          color="#74b9ff" 
          transparent={true} 
          opacity={0.8}
        />
      </mesh>
      
      <mesh position={[-0.9, 0, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial 
          color="#0984e3" 
          transparent={true} 
          opacity={0.6}
        />
      </mesh>
    </group>
  )
})

// Game cubes manager component
function GameCubes({ characters, sphereRef, onCubeCollected }) {
  const [cubeRegistry, setCubeRegistry] = useState(new Map())
  
  // Create or update cube data, preserving existing cubes and only adding new ones
  const cubeData = useMemo(() => {
    const currentIds = new Set(characters.map(c => c.id))
    const newRegistry = new Map()
    
    // Keep existing cube data for characters that are still present
    characters.forEach((character, index) => {
      if (cubeRegistry.has(character.id)) {
        // Preserve existing cube data to maintain position and movement
        newRegistry.set(character.id, cubeRegistry.get(character.id))
      } else {
        // Create new cube data for new characters
        // Position new cubes further to the right so they enter naturally
        const existingCount = cubeRegistry.size
        
        // Special positioning for Scam Token Hunter - same Z-axis as player for better collision
        let zPosition;
        if (character.name === "Scam Token Hunter") {
          zPosition = 2 + (Math.random() - 0.5) * 0.5; // Close to player's Z-axis (2) with small variance
        } else {
          zPosition = (Math.random() - 0.5) * 4; // Normal random Z positioning for other cubes
        }
        
        newRegistry.set(character.id, {
          character,
          position: [
            15 + Math.random() * 8 + (index - existingCount) * 4, // Start further right for new cubes
            (Math.random() - 0.5) * 6,
            zPosition
          ],
          speed: 0.8 + Math.random() * 1.2,
          scale: character.name === "MEV Detective" ? 1.2 : (0.6 + Math.random() * 0.4)
        })
      }
    })
    
    // Update the registry state
    setCubeRegistry(newRegistry)
    
    // Return array of cube data
    return Array.from(newRegistry.values())
  }, [characters.map(c => c.id).join(',')])

  return (
    <group>
      {cubeData.map((data, index) => (
        <GameTransactionCube
          key={`${data.character.id}-${index}`}
          character={data.character}
          position={data.position}
          speed={data.speed}
          scale={data.scale}
          sphereRef={sphereRef}
          onCollected={onCubeCollected}
        />
      ))}
    </group>
  )
}

// Game scene with all components
function GameScene({ characters, mousePos, onScoreUpdate, onLifeUpdate, onHealthUpdate }) {
  const sphereRef = useRef()
  const [particles, setParticles] = useState([])

  const handleCubeCollected = (character, position, type = 'collect') => {
    if (character.name === "MEV Detective") {
      // Add points for collecting MEV Detective
      const points = 10 + character.riskAnalysis.risk; // Higher risk = more points
      gameState.score += points
      onScoreUpdate(gameState.score, points)
      
      // Create particle effect
      const newParticle = {
        id: Date.now() + Math.random(),
        position: position.toArray(),
        color: "#a29bfe"
      }
      setParticles(prev => [...prev, newParticle])
      
      console.log(`🎯 Collected MEV Detective! +${points} points (Total: ${gameState.score})`)
    } else if (type === 'damage') {
      // Handle damage collision
      onLifeUpdate(gameState.lives)
      onHealthUpdate(gameState.health)
      
      // Create red damage particle effect
      const newParticle = {
        id: Date.now() + Math.random(),
        position: position.toArray(),
        color: "#ff6b6b"
      }
      setParticles(prev => [...prev, newParticle])
      
      console.log(`💥 Hit ${character.name}! Health: ${gameState.health}/${gameState.maxHealth}, Lives: ${gameState.lives}`)
    }
  }

  const removeParticle = (particleId) => {
    setParticles(prev => prev.filter(p => p.id !== particleId))
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[8, 8, 5]} 
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-8, 0, 0]} intensity={0.6} color="#74b9ff" />
      <pointLight position={[8, 0, 0]} intensity={0.4} color="#00b894" />
      
      {/* Game objects */}
      <GameSphere mousePos={mousePos} sphereRef={sphereRef} />
      <GameCubes 
        characters={characters} 
        sphereRef={sphereRef}
        onCubeCollected={handleCubeCollected}
      />
      
      {/* Particle effects */}
      {particles.map(particle => (
        <ParticleEffect
          key={particle.id}
          position={particle.position}
          color={particle.color}
          onComplete={() => removeParticle(particle.id)}
        />
      ))}
      
      {/* Atmosphere */}
      <fog attach="fog" args={['#e8f4fd', 12, 25]} />
    </>
  )
}

// Main game component with UI
export default function AviatorGame({ characters, mousePos }) {
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [health, setHealth] = useState(3) // Current health (0-3)
  const [recentPoints, setRecentPoints] = useState(null)
  const [damageFlash, setDamageFlash] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const handleScoreUpdate = (newScore, points) => {
    setScore(newScore)
    setRecentPoints(points)
    
    // Clear recent points after animation
    setTimeout(() => setRecentPoints(null), 1500)
  }

  const handleLifeUpdate = (newLives) => {
    setLives(newLives)
  }

  const handleHealthUpdate = (newHealth) => {
    setHealth(newHealth)
    
    // Check for game over
    if (gameState.isGameOver) {
      setIsGameOver(true)
    }
    
    // Trigger damage flash effect
    setDamageFlash(true)
    setTimeout(() => setDamageFlash(false), 200)
  }

  const handleRestart = () => {
    // Reset global game state
    resetGame()
    
    // Reset local component state
    setScore(0)
    setLives(3)
    setHealth(3)
    setIsGameOver(false)
    setRecentPoints(null)
    setDamageFlash(false)
  }

  // Monitor game state for game over condition
  useEffect(() => {
    const checkGameOver = () => {
      if (gameState.isGameOver && !isGameOver) {
        setIsGameOver(true)
      }
    }
    
    // Check every 100ms for game over state changes
    const interval = setInterval(checkGameOver, 100)
    
    return () => clearInterval(interval)
  }, [isGameOver])

  if (!characters || characters.length === 0) {
    return null
  }

  // Game Over Screen
  if (isGameOver) {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(44,62,80,0.95) 50%, rgba(0,0,0,0.9) 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        color: 'white'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'rgba(0,0,0,0.8)',
          borderRadius: '20px',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          maxWidth: '500px'
        }}>
          {/* Game Over Title */}
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #ff6b6b, #ee5a24, #ff6b6b)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            💀 GAME OVER
          </div>
          
          {/* Final Score */}
          <div style={{
            fontSize: '1.5rem',
            marginBottom: '2rem',
            color: '#74b9ff'
          }}>
            <div style={{ marginBottom: '0.5rem', opacity: 0.8 }}>
              Final Score
            </div>
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: '#fdcb6e',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              {score}
            </div>
          </div>
          
          {/* Game Over Message */}
          <div style={{
            fontSize: '1.1rem',
            marginBottom: '2.5rem',
            opacity: 0.9,
            lineHeight: '1.5'
          }}>
            You've been overwhelmed by scam token attacks!<br/>
            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
              Keep practicing to improve your blockchain security skills
            </span>
          </div>
          
          {/* Restart Button */}
          <button
            onClick={handleRestart}
            style={{
              background: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 40px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 5px 15px rgba(0,184,148,0.3)',
              transform: 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 8px 25px rgba(0,184,148,0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 5px 15px rgba(0,184,148,0.3)'
            }}
          >
            🎮 Play Again
          </button>
          
          {/* Tips */}
          <div style={{
            marginTop: '2rem',
            fontSize: '0.8rem',
            opacity: 0.6,
            lineHeight: '1.4'
          }}>
            💡 <strong>Tip:</strong> Focus on avoiding red Scam Token Hunter cubes<br/>
            and collect purple MEV Detective cubes for points!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Game Canvas */}
      <Canvas
        camera={{ position: [0, 2, 12], fov: 60 }}
        style={{ 
          background: 'linear-gradient(135deg, #e8f4fd 0%, #a8d8f0 100%)',
          width: '100%',
          height: '100%'
        }}
        shadows
      >
        <GameScene 
          characters={characters}
          mousePos={mousePos}
          onScoreUpdate={handleScoreUpdate}
          onLifeUpdate={handleLifeUpdate}
          onHealthUpdate={handleHealthUpdate}
        />
      </Canvas>
      
      {/* Damage Flash Overlay */}
      {damageFlash && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 0, 0, 0.3)',
          pointerEvents: 'none',
          zIndex: 5,
          animation: 'damageFlash 0.2s ease-out'
        }} />
      )}
      
      {/* Transaction Types Description Card */}
      <div style={{
        position: 'absolute',
        top: '170px',
        left: '20px',
        background: 'rgba(0,0,0,0.85)',
        padding: '1.5rem',
        borderRadius: '12px',
        color: 'white',
        fontSize: '0.9rem',
        maxWidth: '350px',
        zIndex: 10,
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <h3 style={{ 
          margin: '0 0 1rem 0', 
          fontSize: '1.2rem', 
          color: '#74b9ff',
          textAlign: 'center'
        }}>
        Transaction Risk Types
        </h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>💥</span>
            <strong style={{ color: '#ff6b6b' }}>Scam Token Hunter</strong>
            <span style={{ 
              marginLeft: '0.5rem', 
              fontSize: '0.7rem', 
              background: '#ff6b6b', 
              color: 'white', 
              padding: '0.2rem 0.5rem', 
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              DANGEROUS
            </span>
          </div>
          <p style={{ margin: '0 0 0 2rem', fontSize: '0.8rem', opacity: 0.9 }}>
            ⚠️ <strong>AVOID these red cubes!</strong> Newly deployed tokens with unverified contracts, low liquidity, and suspicious holder patterns. Hitting them damages your health!
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🛡️</span>
            <strong style={{ color: '#fdcb6e' }}>Approval Guardian</strong>
          </div>
          <p style={{ margin: '0 0 0 2rem', fontSize: '0.8rem', opacity: 0.9 }}>
            Infinite token approvals to unknown or unverified contracts. First step in many wallet drain attacks.
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>⚡</span>
            <strong style={{ color: '#74b9ff' }}>Slippage Sentinel</strong>
          </div>
          <p style={{ margin: '0 0 0 2rem', fontSize: '0.8rem', opacity: 0.9 }}>
            DEX swaps with extreme slippage (&gt;15%), often targeting thin liquidity pools or exotic tokens.
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>💎</span>
            <strong style={{ color: '#a29bfe' }}>MEV Detective</strong>
          </div>
          <p style={{ margin: '0 0 0 2rem', fontSize: '0.8rem', opacity: 0.9 }}>
            <span style={{ color: '#00b894', fontWeight: 'bold' }}>COLLECTIBLE!</span> Sandwich attacks and front-running patterns. Collect these diamond crystals for bonus points!
          </p>
        </div>
        
        <div style={{ 
          borderTop: '1px solid rgba(255,255,255,0.2)', 
          paddingTop: '1rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          opacity: 0.7
        }}>
          💡 Higher risk transactions = more points when collected
        </div>
      </div>

      {/* Game UI Overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        padding: '1.5rem',
        borderRadius: '12px',
        color: 'white',
        fontSize: '1rem',
        minWidth: '200px',
        zIndex: 10
      }}>
        {/* Score */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SCORE</span>
          <span style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#74b9ff'
          }}>
            {score}
          </span>
        </div>
        
        {/* Recent points animation */}
        {recentPoints && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            color: '#00b894',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            animation: 'fadeInOut 1.5s ease-out',
            pointerEvents: 'none'
          }}>
            +{recentPoints}
          </div>
        )}
        
        {/* Lives */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '0.5rem'
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>LIVES</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[...Array(3)].map((_, i) => (
              <span 
                key={i} 
                style={{ 
                  fontSize: '1.5rem',
                  opacity: i < lives ? 1 : 0.3,
                  transition: 'opacity 0.3s ease'
                }}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>
        
        {/* Health Progress Bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontSize: '0.9rem', 
            marginBottom: '0.5rem',
            opacity: 0.8
          }}>
            Current Heart Health: {health}/3
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(health / 3) * 100}%`,
              height: '100%',
              backgroundColor: health > 2 ? '#00b894' : health > 1 ? '#fdcb6e' : '#ff6b6b',
              transition: 'width 0.3s ease, background-color 0.3s ease',
              borderRadius: '4px'
            }} />
          </div>
          <div style={{ 
            fontSize: '0.7rem', 
            marginTop: '0.3rem',
            opacity: 0.6,
            textAlign: 'center'
          }}>
            💥 3 hits from Scam Token Hunter = 1 heart lost
          </div>
        </div>
        
        {/* Instructions */}
        <div style={{ 
          fontSize: '0.8rem', 
          opacity: 0.8,
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: '1rem'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            🎯 <strong>Collect MEV Detective cubes</strong> for points
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            💥 <strong>Avoid Scam Token Hunter cubes</strong> (red, fast-moving)
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            🎮 Move mouse to fly
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            🐌 Other cubes move slower and pass by safely
          </div>
          <div>
            ⚡ Higher risk = more points!
          </div>
        </div>
      </div>
      
      {/* Add CSS animations */}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          30% { opacity: 1; transform: translateY(-10px); }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes damageFlash {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
