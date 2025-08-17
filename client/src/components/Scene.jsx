import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Box } from '@react-three/drei'

function RotatingCube({ position }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <Box ref={meshRef} position={position} args={[1, 1, 1]}>
      <meshStandardMaterial color="#ff6b6b" />
    </Box>
  )
}

function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-5, 5, 5]} intensity={0.5} />

      {/* Objects */}
      <RotatingCube position={[0, 0, 0]} />
      <RotatingCube position={[3, 0, 0]} />
      <RotatingCube position={[-3, 0, 0]} />

      {/* Controls */}
      <OrbitControls 
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        autoRotate={false}
      />
    </>
  )
}

export default Scene
