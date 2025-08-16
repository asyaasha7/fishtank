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
function GameTransactionCube({ character, position, speed, scale, sphereRef, onCollected, isShieldActive }) {
  const meshRef = useRef()
  const [isCollected, setIsCollected] = useState(false)
  const [lastPushTime, setLastPushTime] = useState(0)
  // Keep track of cube's current position independently
  const currentPosition = useRef([...position])
  
  // Get color from character's type configuration
  const getColor = (characterName) => {
    const colorMap = {
      "Toxic Predator": "#ff6b6b",
      "Pufferfish Trap": "#fdcb6e", 
      "Turbulent Current": "#00bfff",
      "Treasure Jellyfish": "#40e0d0",  // This is the collectible one!
      "Standard Transaction": "#00b894"
    }
    return colorMap[characterName] || "#ffffff"
  }

  useFrame((state, delta) => {
    if (meshRef.current && !isCollected) {
      // Different movement speeds based on character type
      let movementSpeed = 15; // Default speed
      
      if (character.name === "Toxic Predator") {
        movementSpeed = 15; // Keep same speed as default for dangerous cubes
        
        // Add vertical oscillation to make Toxic Predators more menacing
        const time = state.clock.getElapsedTime();
        const oscillationAmplitude = 1.5; // How far up/down they move
        const oscillationSpeed = 2.0; // How fast they oscillate
        const uniqueOffset = character.id * 0.1; // Unique phase offset for each predator
        
        currentPosition.current[1] += Math.sin(time * oscillationSpeed + uniqueOffset) * oscillationAmplitude * delta;
        
        // Keep them within reasonable bounds
        currentPosition.current[1] = Math.max(-4, Math.min(4, currentPosition.current[1]));
        
        // Make Toxic Predator swim close to the player's Z-axis for better collision
        if (sphereRef.current) {
          currentPosition.current[2] = sphereRef.current.position.z; // Match player's Z position (2)
        }
      } else {
        // Make other cubes swim slower
        movementSpeed = 8; // Slower speed for non-dangerous cubes
      }
      
      // Move from right to left - use independent position tracking
      currentPosition.current[0] -= speed * delta * movementSpeed
      
      // Update mesh position
      meshRef.current.position.x = currentPosition.current[0]
      meshRef.current.position.y = currentPosition.current[1]
      meshRef.current.position.z = currentPosition.current[2]
      
      // Special rotation for Treasure Jellyfish (more complex)
      if (character.name === "Treasure Jellyfish") {
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
      if (sphereRef.current && checkCollision(sphereRef.current, meshRef.current, character.name === "Treasure Jellyfish" ? 2.0 : 1.2)) {
        if (character.name === "Treasure Jellyfish") {
          // Collectible! Give points and make it disappear
          setIsCollected(true)
          onCollected(character, meshRef.current.position.clone())
        } else if (character.name === "Toxic Predator") {
          // Dangerous cube - take damage and make it disappear
          setIsCollected(true)
          takeDamage(1)
          onCollected(character, meshRef.current.position.clone(), 'damage')
        } else if (character.name === "Pufferfish Trap") {
          // Pufferfish Trap - lose points and make it disappear
          setIsCollected(true)
          onCollected(character, meshRef.current.position.clone(), 'points_loss')
        } else if (character.name === "Turbulent Current") {
          // Turbulent Current - push fish in random direction but stay active
          // Add cooldown to prevent continuous pushing
          const currentTime = Date.now();
          if (currentTime - lastPushTime > 1000) { // 1 second cooldown
            setLastPushTime(currentTime);
            onCollected(character, meshRef.current.position.clone(), 'push');
          }
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

  // Special shape for Treasure Jellyfish (diamond/crystal)
  if (character.name === "Treasure Jellyfish") {
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
const GameSphere = React.memo(({ mousePos, sphereRef, isShieldActive }) => {
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
      
      {/* Enhanced Shield Effect */}
      {isShieldActive && (
        <ShieldEffect />
      )}
    </group>
  )
})

// Shield Effect Component with glowing, blinking animation
function ShieldEffect() {
  const shieldRef = useRef()
  const outerShieldRef = useRef()
  
  useFrame((state) => {
    if (shieldRef.current && outerShieldRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Pulsing opacity effect
      const pulseOpacity = 0.2 + Math.sin(time * 3) * 0.15 // Oscillates between 0.05 and 0.35
      const outerPulseOpacity = 0.1 + Math.sin(time * 2) * 0.08 // Oscillates between 0.02 and 0.18
      
      // Rotating effect
      shieldRef.current.rotation.y += 0.01
      outerShieldRef.current.rotation.y -= 0.008
      shieldRef.current.rotation.x += 0.005
      
      // Update materials opacity
      shieldRef.current.material.opacity = pulseOpacity
      outerShieldRef.current.material.opacity = outerPulseOpacity
      
      // Slight scaling effect for breathing
      const scale = 1 + Math.sin(time * 2.5) * 0.05
      shieldRef.current.scale.setScalar(scale)
      outerShieldRef.current.scale.setScalar(scale * 1.1)
    }
  })
  
  return (
    <group>
      {/* Inner shield - wireframe */}
      <mesh ref={shieldRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial 
          color="#00ffff" 
          transparent={true} 
          opacity={0.3}
          wireframe={true}
        />
      </mesh>
      
      {/* Outer shield - solid with glow */}
      <mesh ref={outerShieldRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1.0, 12, 12]} />
        <meshBasicMaterial 
          color="#40e0d0" 
          transparent={true} 
          opacity={0.15}
          wireframe={false}
        />
      </mesh>
      
      {/* Glowing particles effect */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={0.3} 
        color="#00ffff" 
        distance={3}
      />
    </group>
  )
}

// Game cubes manager component
function GameCubes({ characters, sphereRef, onCubeCollected, isShieldActive }) {
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
        
        // Special positioning for specific creature types
        let zPosition;
        if (character.name === "Treasure Jellyfish") {
          zPosition = 2 + (Math.random() - 0.5) * 0.5; // Same Z-axis as player (2) with small variance
        } else if (character.name === "Toxic Predator") {
          zPosition = 2 + (Math.random() - 0.5) * 1.0; // Close to player but with more variance for hunting
        } else if (character.name === "Pufferfish Trap") {
          zPosition = 2 + (Math.random() - 0.5) * 0.5; // Same Z-axis as player (2) for reliable collision
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
          isShieldActive={isShieldActive}
        />
      ))}
    </group>
  )
}

// Game scene with all components
function GameScene({ characters, mousePos, onScoreUpdate, onLifeUpdate, onHealthUpdate, isShieldActive }) {
  const sphereRef = useRef()
  const [particles, setParticles] = useState([])

  const handleCubeCollected = (character, position, type = 'collect') => {
    if (character.name === "Treasure Jellyfish") {
      // Add points for collecting MEV Detective
      const points = 10 + character.riskAnalysis.risk; // Higher risk = more points
      gameState.score += points
      onScoreUpdate(gameState.score, points)
      
      // Create particle effect
      const newParticle = {
        id: Date.now() + Math.random(),
        position: position.toArray(),
        color: "#40e0d0"
      }
      setParticles(prev => [...prev, newParticle])
      
      console.log(`🎯 Collected Treasure Jellyfish! +${points} points (Total: ${gameState.score})`)
    } else if (type === 'damage') {
      // Check if shield is active and this is a Toxic Predator
      if (isShieldActive && character.name === "Toxic Predator") {
        // Shield blocks damage from Toxic Predators
        const newParticle = {
          id: Date.now() + Math.random(),
          position: position.toArray(),
          color: "#00ffff" // Cyan color for shield block
        }
        setParticles(prev => [...prev, newParticle])
        
        console.log(`🛡️ Shield blocked damage from ${character.name}!`)
      } else {
        // Handle damage collision normally
        onLifeUpdate(gameState.lives)
        onHealthUpdate(gameState.health)
        
        // Trigger glitch effect for Toxic Predator hits
        if (character.name === "Toxic Predator") {
          setGlitchEffect(true)
          setTimeout(() => setGlitchEffect(false), 500) // Glitch for 0.5 seconds
        }
        
        // Create red damage particle effect
        const newParticle = {
          id: Date.now() + Math.random(),
          position: position.toArray(),
          color: "#ff6b6b"
        }
        setParticles(prev => [...prev, newParticle])
        
        console.log(`💥 Hit ${character.name}! Health: ${gameState.health}/${gameState.maxHealth}, Lives: ${gameState.lives}`)
      }
    } else if (type === 'points_loss') {
      // Check if shield is active for Pufferfish Trap
      if (isShieldActive && character.name === "Pufferfish Trap") {
        // Shield blocks damage from Pufferfish Trap
        const newParticle = {
          id: Date.now() + Math.random(),
          position: position.toArray(),
          color: "#00ffff" // Cyan color for shield block
        }
        setParticles(prev => [...prev, newParticle])
        
        console.log(`🛡️ Shield blocked damage from ${character.name}!`)
      } else {
        // Handle health reduction from Pufferfish Trap (without damage flash)
        // Update health directly without triggering red overlay
        gameState.health = Math.max(0, gameState.health - 1);
        if (gameState.health <= 0 && gameState.lives > 0) {
          gameState.lives--;
          gameState.health = gameState.maxHealth;
        }
        if (gameState.lives <= 0) {
          gameState.isGameOver = true;
        }
        
        // Update UI without damage flash
        onLifeUpdate(gameState.lives)
        setHealth(gameState.health)
        
        // Also lose some points
        const pointsLost = Math.min(10, gameState.score); // Lose 10 points or current score if less
        gameState.score = Math.max(0, gameState.score - pointsLost);
        onScoreUpdate(gameState.score, -pointsLost);
        
        // Create orange particle effect for pufferfish hit
        const newParticle = {
          id: Date.now() + Math.random(),
          position: position.toArray(),
          color: "#fdcb6e" // Orange color matching Pufferfish Trap
        }
        setParticles(prev => [...prev, newParticle])
        
        console.log(`🐡 Hit Pufferfish Trap! Health: ${gameState.health}/${gameState.maxHealth}, Lives: ${gameState.lives}, -${pointsLost} points`)
      }
    } else if (type === 'push') {
      // Handle push effect from Turbulent Current
      if (sphereRef.current) {
        // Random push direction
        const pushX = (Math.random() - 0.5) * 4; // Random X push between -2 and 2
        const pushY = (Math.random() - 0.5) * 4; // Random Y push between -2 and 2
        
        // Apply push to player position with bounds checking
        const newX = Math.max(-3, Math.min(3, sphereRef.current.position.x + pushX));
        const newY = Math.max(-4, Math.min(4, sphereRef.current.position.y + pushY));
        
        sphereRef.current.position.x = newX;
        sphereRef.current.position.y = newY;
      }
      
      console.log(`🌊 Hit Turbulent Current! Fish pushed by current!`)
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
      <GameSphere mousePos={mousePos} sphereRef={sphereRef} isShieldActive={isShieldActive} />
      <GameCubes 
        characters={characters} 
        sphereRef={sphereRef}
        onCubeCollected={handleCubeCollected}
        isShieldActive={isShieldActive}
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
export default function FishtankGame({ characters, mousePos }) {
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [health, setHealth] = useState(3) // Current health (0-3)
  const [recentPoints, setRecentPoints] = useState(null)
  const [damageFlash, setDamageFlash] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isRiskTypesCollapsed, setIsRiskTypesCollapsed] = useState(false)
  const [isShieldActive, setIsShieldActive] = useState(false)
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0)
  const [glitchEffect, setGlitchEffect] = useState(false)

  // Count creatures by type for display
  const creatureCounts = useMemo(() => {
    if (!characters || characters.length === 0) {
      return {
        "Toxic Predator": 0,
        "Pufferfish Trap": 0,
        "Turbulent Current": 0,
        "Treasure Jellyfish": 0,
        "Standard Transaction": 0
      };
    }
    
    const counts = {};
    characters.forEach(character => {
      counts[character.name] = (counts[character.name] || 0) + 1;
    });
    
    return {
      "Toxic Predator": counts["Toxic Predator"] || 0,
      "Pufferfish Trap": counts["Pufferfish Trap"] || 0,
      "Turbulent Current": counts["Turbulent Current"] || 0,
      "Treasure Jellyfish": counts["Treasure Jellyfish"] || 0,
      "Standard Transaction": counts["Standard Transaction"] || 0
    };
  }, [characters])

  // Shield countdown effect
  useEffect(() => {
    let shieldTimer;
    if (isShieldActive && shieldTimeLeft > 0) {
      shieldTimer = setInterval(() => {
        setShieldTimeLeft(prev => {
          if (prev <= 1) {
            setIsShieldActive(false);
            console.log('🛡️ Shield expired!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000); // Update every second
    }
    
    return () => {
      if (shieldTimer) clearInterval(shieldTimer);
    };
  }, [isShieldActive, shieldTimeLeft]);

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

  const handleBuyShield = () => {
    if (score >= 100 && !isShieldActive) {
      // Deduct points and activate shield
      setScore(prevScore => prevScore - 100);
      setIsShieldActive(true);
      setShieldTimeLeft(10); // 10 seconds of protection
      console.log('🛡️ Shield activated! 10 seconds of protection against Toxic Predators');
      
      // Show points deduction animation
      setRecentPoints(-100);
      setTimeout(() => setRecentPoints(null), 1500);
    }
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
            color: '#00ffff'
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
          background: 'linear-gradient(135deg, #0a1428 0%, #1e3a5f 50%, #2c5aa0 100%)',
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
          isShieldActive={isShieldActive}
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

      {/* Glitch Effect Overlay */}
      {glitchEffect && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 6,
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255, 0, 100, 0.1) 2px,
              rgba(255, 0, 100, 0.1) 4px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 255, 0.05) 2px,
              rgba(0, 255, 255, 0.05) 4px
            )
          `,
          animation: 'glitchEffect 0.5s ease-out',
          mixBlendMode: 'screen'
        }} />
      )}
      
      {/* Transaction Types Description Card */}
      <div style={{
        position: 'absolute',
        top: '163px',
        left: '20px',
        width: '348px',
        background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.9) 0%, rgba(0, 20, 40, 0.95) 100%)',
        padding: isRiskTypesCollapsed ? '1rem' : '1.5rem',
        borderRadius: '12px',
        color: 'white',
        fontSize: '0.9rem',
        maxWidth: '350px',
        zIndex: 10,
        border: '1px solid rgba(0, 255, 255, 0.3)',
        boxShadow: '0 4px 20px rgba(0, 255, 255, 0.1)',
        transition: 'all 0.3s ease'
      }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            margin: '0 0 1rem 0',
            cursor: 'pointer'
          }}
          onClick={() => setIsRiskTypesCollapsed(!isRiskTypesCollapsed)}
        >
          <h3 style={{ 
            margin: '0', 
            fontSize: '1.2rem', 
            color: '#00ffff',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>
            🌊 Liquidity Pool Hazards
          </h3>
          <span style={{
            fontSize: '1rem',
            color: '#00ffff',
            transform: isRiskTypesCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </div>
        
        {!isRiskTypesCollapsed && (
        <div style={{
          maxHeight: isRiskTypesCollapsed ? '0' : '1000px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🦈</span>
              <strong style={{ color: '#ff6b6b' }}>Toxic Predator</strong>
              <span style={{ 
                marginLeft: '0.5rem', 
                fontSize: '0.8rem', 
                background: 'rgba(255, 107, 107, 0.2)', 
                color: '#ff6b6b', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '12px',
                fontWeight: 'bold',
                border: '1px solid rgba(255, 107, 107, 0.3)'
              }}>
                {creatureCounts["Toxic Predator"]}
              </span>
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
            ⚠️ <strong>AVOID these toxic predators!</strong> Contaminated liquidity pools with unverified contracts, low depth, and suspicious whale patterns. Swimming into them damages your health!
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🐡</span>
              <strong style={{ color: '#fdcb6e' }}>Pufferfish Trap</strong>
              <span style={{ 
                marginLeft: '0.5rem', 
                fontSize: '0.8rem', 
                background: 'rgba(253, 203, 110, 0.2)', 
                color: '#fdcb6e', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '12px',
                fontWeight: 'bold',
                border: '1px solid rgba(253, 203, 110, 0.3)'
              }}>
                {creatureCounts["Pufferfish Trap"]}
              </span>
          </div>
          <p style={{ margin: '0 0 0 2rem', fontSize: '0.8rem', opacity: 0.9 }}>
            Infinite token approvals to unknown currents. These spiky traps damage your health and steal some points when touched.
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🌊</span>
              <strong style={{ color: '#00bfff' }}>Turbulent Current</strong>
              <span style={{ 
                marginLeft: '0.5rem', 
                fontSize: '0.8rem', 
                background: 'rgba(0, 191, 255, 0.2)', 
                color: '#00bfff', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '12px',
                fontWeight: 'bold',
                border: '1px solid rgba(0, 191, 255, 0.3)'
              }}>
                {creatureCounts["Turbulent Current"]}
              </span>
          </div>
          <p style={{ margin: '0 0 0 2rem', fontSize: '0.8rem', opacity: 0.9 }}>
            DEX swaps with extreme slippage (&gt;15%), creating dangerous turbulence in shallow pools or exotic coral reefs.
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>🐚</span>
            <strong style={{ color: '#40e0d0' }}>Treasure Jellyfish</strong>
            <span style={{ 
              marginLeft: '0.5rem', 
              fontSize: '0.8rem', 
              background: 'rgba(64, 224, 208, 0.2)', 
              color: '#40e0d0', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '12px',
              fontWeight: 'bold',
              border: '1px solid rgba(64, 224, 208, 0.3)'
            }}>
              {creatureCounts["Treasure Jellyfish"]}
            </span>
          </div>
          <p style={{ margin: '0 0 0 2rem', fontSize: '0.8rem', opacity: 0.9 }}>
            <span style={{ color: '#00b894', fontWeight: 'bold' }}>COLLECTIBLE!</span> Sandwich attacks and front-running patterns. Collect these luminous jellyfish for bonus points!
          </p>
        </div>
        
          <div style={{ 
            borderTop: '1px solid rgba(255,255,255,0.2)', 
            paddingTop: '1rem',
            marginTop: '1rem'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '0.8rem',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              color: '#00ffff'
            }}>
              📊 Total Active Creatures: {characters ? characters.length : 0}
            </div>
            <div style={{ 
              textAlign: 'center',
              fontSize: '0.8rem',
              opacity: 0.7
            }}>
              🐠 Navigate dangerous waters - higher risk pools = more treasure when collected
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Game UI Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        width: '443px',
        right: '20px',
        background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.9) 0%, rgba(0, 20, 40, 0.95) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        boxShadow: '0 4px 20px rgba(0, 255, 255, 0.1)',
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
            color: '#00ffff'
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
            🦈 3 hits from Toxic Predator = 1 life lost
          </div>
        </div>

        {/* Shield Section */}
        <div style={{ marginBottom: '1rem' }}>
          {/* Shield Status */}
          {isShieldActive && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 150, 255, 0.2) 100%)',
              border: '1px solid rgba(0, 255, 255, 0.4)',
              borderRadius: '8px',
              padding: '0.8rem',
              marginBottom: '0.8rem',
              textAlign: 'center',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
            }}>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: 'bold',
                color: '#00ffff',
                marginBottom: '0.3rem'
              }}>
                🛡️ SHIELD ACTIVE
              </div>
              <div style={{ 
                fontSize: '0.8rem', 
                opacity: 0.8
              }}>
                Protection: {shieldTimeLeft}s remaining
              </div>
              <div style={{ 
                fontSize: '0.7rem', 
                opacity: 0.6,
                marginTop: '0.2rem'
              }}>
                Blocking Toxic Predator & Pufferfish damage
              </div>
            </div>
          )}

          {/* Shield Purchase Button */}
          <button
            onClick={handleBuyShield}
            disabled={score < 100 || isShieldActive}
            style={{
              width: '100%',
              background: isShieldActive 
                ? 'rgba(100, 100, 100, 0.3)' 
                : score >= 100 
                  ? 'linear-gradient(135deg, #00ffff 0%, #0096ff 100%)'
                  : 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              color: isShieldActive ? 'rgba(255, 255, 255, 0.5)' : 'white',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              cursor: isShieldActive || score < 100 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isShieldActive || score < 100 ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isShieldActive && score >= 100) {
                e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)'
                e.target.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isShieldActive && score >= 100) {
                e.target.style.boxShadow = 'none'
                e.target.style.transform = 'translateY(0)'
              }
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            {isShieldActive 
              ? 'Shield Active' 
              : score >= 100 
                ? 'Buy Shield (100 pts)' 
                : `Need ${100 - score} more points`
            }
          </button>
          
          <div style={{ 
            fontSize: '0.65rem', 
            opacity: 0.6,
            textAlign: 'center',
            marginTop: '0.4rem'
          }}>
            💡 Shield protects against Toxic Predators & Pufferfish Traps for 10 seconds
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
        @keyframes glitchEffect {
          0% { 
            opacity: 1; 
            transform: translateX(0px);
            filter: hue-rotate(0deg);
          }
          10% { 
            opacity: 0.8; 
            transform: translateX(2px);
            filter: hue-rotate(90deg);
          }
          20% { 
            opacity: 0.9; 
            transform: translateX(-2px);
            filter: hue-rotate(180deg);
          }
          30% { 
            opacity: 0.7; 
            transform: translateX(1px);
            filter: hue-rotate(270deg);
          }
          40% { 
            opacity: 1; 
            transform: translateX(-1px);
            filter: hue-rotate(360deg);
          }
          50% { 
            opacity: 0.6; 
            transform: translateX(3px);
            filter: hue-rotate(180deg);
          }
          60% { 
            opacity: 0.8; 
            transform: translateX(-3px);
            filter: hue-rotate(90deg);
          }
          70% { 
            opacity: 0.9; 
            transform: translateX(1px);
            filter: hue-rotate(270deg);
          }
          80% { 
            opacity: 0.7; 
            transform: translateX(-1px);
            filter: hue-rotate(0deg);
          }
          90% { 
            opacity: 0.8; 
            transform: translateX(2px);
            filter: hue-rotate(180deg);
          }
          100% { 
            opacity: 0; 
            transform: translateX(0px);
            filter: hue-rotate(0deg);
          }
        }
      `}</style>
    </div>
  )
}
