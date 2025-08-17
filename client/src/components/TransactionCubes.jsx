import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Individual cube component that moves and rotates
function TransactionCube({ character, position, speed, scale }) {
  const meshRef = useRef()
  
  // Get color from character's type configuration
  const getColor = (characterName) => {
    const colorMap = {
      "Toxic Predator": "#ff6b6b",
      "Pufferfish Trap": "#fdcb6e", 
      "Turbulent Current": "#00bfff",
      "Treasure Jellyfish": "#40e0d0",
      "Standard Current": "#00b894"
    }
    return colorMap[characterName] || "#ffffff"
  }

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Move from right to left (slower speed)
      meshRef.current.position.x -= speed * delta * 10
      
      // Rotate the cube for visual interest (slower rotation)
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.15
      
      // Reset position when cube goes off screen
      if (meshRef.current.position.x < -15) {
        meshRef.current.position.x = 15 + Math.random() * 10
        meshRef.current.position.y = position.y + (Math.random() - 0.5) * 2
        meshRef.current.position.z = position.z + (Math.random() - 0.5) * 4
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhongMaterial 
        color={getColor(character.name)}
        transparent={true}
        opacity={0.8}
        shininess={100}
      />
    </mesh>
  )
}

// Component that manages all transaction cubes
function TransactionCubeScene({ characters }) {
  const groupRef = useRef()
  
  // Generate random positions and properties for each cube
  const cubeData = characters.map((character, index) => ({
    character,
    position: [
      5 + Math.random() * 10, // Start from right side with random spacing
      (Math.random() - 0.5) * 8, // Random Y position
      (Math.random() - 0.5) * 6   // Random Z position  
    ],
    speed: 0.3 + Math.random() * 0.8, // Random speed between 0.3 and 1.1
    scale: 0.5 + Math.random() * 0.5   // Random scale between 0.5 and 1
  }))

  return (
    <group ref={groupRef}>
      {cubeData.map((data, index) => (
        <TransactionCube
          key={`${data.character.id}-${index}`}
          character={data.character}
          position={data.position}
          speed={data.speed}
          scale={data.scale}
        />
      ))}
    </group>
  )
}

// Lighting setup for the cubes
function CubeLights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff6b6b" />
      <pointLight position={[10, -10, -10]} intensity={0.5} color="#74b9ff" />
    </>
  )
}

// Main component that renders the Three.js scene with transaction cubes
export default function TransactionCubes({ characters }) {
  if (!characters || characters.length === 0) {
    return null
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none', // Allow interaction with elements behind
      zIndex: 1
    }}>
      <Canvas
        camera={{ 
          position: [0, 0, 10], 
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          alpha: true, 
          antialias: true,
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
        }}
      >
        <CubeLights />
        <TransactionCubeScene characters={characters} />
        
        {/* Optional: Add some atmospheric effects */}
        <fog attach="fog" args={['#f0f0f0', 5, 25]} />
      </Canvas>
      
      {/* Overlay with cube legend */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.7)',
        padding: '1rem',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.8rem',
        maxWidth: '250px',
        pointerEvents: 'auto'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
          🎲 Transaction Risk Cubes
        </h4>
        <p style={{ margin: '0 0 0.5rem 0', opacity: 0.8 }}>
          Each cube represents a risky transaction moving across the screen
        </p>
        <div style={{ fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.3rem 0' }}>
            <div style={{ width: '12px', height: '12px', background: '#ff6b6b', marginRight: '0.5rem' }}></div>
            Scam Token Hunter
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.3rem 0' }}>
            <div style={{ width: '12px', height: '12px', background: '#fdcb6e', marginRight: '0.5rem' }}></div>
            Approval Guardian
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.3rem 0' }}>
            <div style={{ width: '12px', height: '12px', background: '#74b9ff', marginRight: '0.5rem' }}></div>
            Slippage Sentinel
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.3rem 0' }}>
            <div style={{ width: '12px', height: '12px', background: '#a29bfe', marginRight: '0.5rem' }}></div>
            MEV Detective
          </div>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0.3rem 0' }}>
            <div style={{ width: '12px', height: '12px', background: '#00b894', marginRight: '0.5rem' }}></div>
            Standard Current

          </div>
        </div>
      </div>
    </div>
  )
}
