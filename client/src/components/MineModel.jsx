import React, { useRef, Suspense, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

// Performance mode toggle - set to true for simple spheres, false for GLTF models
const USE_PERFORMANCE_MODE = false // Change to true if still too slow

// Optimization settings
const ENABLE_ANIMATIONS = true // Set to false to disable all animations for performance
const REDUCE_GEOMETRY = true // Use lower-poly geometry

// Mine GLTF Model component - OPTIMIZED
const MineModel = React.memo(React.forwardRef(({ character, currentPosition, scale, color }, ref) => {
  const meshRef = ref || useRef()
  const modelRef = useRef()
  
  // Load the mine GLTF model only if not in performance mode
  const gltfData = USE_PERFORMANCE_MODE ? null : useGLTF('/models/mine.glb')
  const hasGLTF = !USE_PERFORMANCE_MODE && gltfData && gltfData.scene
  
  // Clone scene once and memoize it to avoid repeated cloning
  const clonedScene = useMemo(() => {
    if (hasGLTF) {
      const scene = gltfData.scene.clone()
      // Aggressive optimization for performance
      scene.traverse((child) => {
        if (child.isMesh) {
          // Disable all shadow calculations
          child.castShadow = false
          child.receiveShadow = false
          child.frustumCulled = true // Enable frustum culling
          
          // Optimize materials aggressively
          if (child.material) {
            child.material.flatShading = true
            child.material.transparent = false // Disable transparency if possible
            
            // Reduce material complexity
            if (child.material.map) {
              child.material.map.generateMipmaps = false
            }
            
            // Disable expensive material features
            child.material.envMap = null
            child.material.lightMap = null
            child.material.aoMap = null
            child.material.normalMap = null
            child.material.bumpMap = null
            child.material.displacementMap = null
          }
          
          // Reduce geometry complexity if enabled
          if (REDUCE_GEOMETRY && child.geometry) {
            child.geometry.deleteAttribute('uv2') // Remove secondary UV coordinates
            child.geometry.deleteAttribute('normal') // We're using flat shading anyway
            child.geometry.deleteAttribute('tangent')
          }
        }
      })
      return scene
    }
    return null
  }, [gltfData, hasGLTF])

  // Conditional animation for performance
  useFrame((state, delta) => {
    if (ENABLE_ANIMATIONS && modelRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Reduced animation complexity for performance
      // Slower rotation for mine (reduced frequency)
      modelRef.current.rotation.y += delta * 0.5 // Even slower rotation
      
      // Gentle vertical bobbing like floating mine (reduced amplitude)
      const bob = Math.sin(time * 1.2) * 0.1 // Reduced bobbing
      modelRef.current.position.y = bob
    }
  })

  return (
    <group ref={meshRef} position={currentPosition} scale={scale}>
      {hasGLTF && clonedScene ? (
        <group ref={modelRef}>
          <primitive 
            object={clonedScene}
            scale={[1.4, 1.4, 1.4]} // 2x larger scale (0.7 * 2 = 1.4)
          />
          
          {/* Optimized warning glow effect - reduced intensity for performance */}
          <pointLight 
            position={[0, 0, 0]} 
            intensity={0.4} // Reduced intensity
            color="#fdcb6e" 
            distance={3.0} // Slightly larger distance for bigger mine
            decay={2} // Add decay for more realistic lighting
            castShadow={false} // Explicitly disable shadows
          />
        </group>
      ) : (
        /* Fallback pufferfish spheres - 2x larger and optimized */
        <group ref={modelRef}>
          {/* Main pufferfish body - sphere (2x larger) */}
          <mesh>
            <sphereGeometry args={[1.8, 6, 6]} /> {/* 2x larger + reduced geometry */}
            <meshBasicMaterial 
              color={color}
              transparent={false} // Disable transparency for performance
              opacity={1.0}
            />
          </mesh>
          
          {/* Spikes for pufferfish effect (2x larger) */}
          <mesh>
            <sphereGeometry args={[2.0, 4, 4]} /> {/* 2x larger + even lower poly */}
            <meshBasicMaterial 
              color="#fdcb6e"
              transparent={true}
              opacity={0.4}
              wireframe={true}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}))

// Wrapper component with Suspense for proper loading
const MineModelWithSuspense = React.forwardRef((props, ref) => {
  return (
    <Suspense fallback={<MineFallback {...props} />}>
      <MineModel {...props} ref={ref} />
    </Suspense>
  )
})

// Optimized fallback component - minimal performance impact, 2x larger
const MineFallback = ({ character, currentPosition, scale, color }) => {
  const meshRef = useRef()
  const modelRef = useRef()
  
  // Conditional minimal animation for loading state
  useFrame((state, delta) => {
    if (ENABLE_ANIMATIONS && modelRef.current) {
      modelRef.current.rotation.y += delta * 0.3 // Very slow rotation only
      
      // Gentle bobbing
      const time = state.clock.getElapsedTime()
      const bob = Math.sin(time * 1.2) * 0.08 // Reduced bobbing
      modelRef.current.position.y = bob
    }
  })

  return (
    <group ref={meshRef} position={currentPosition} scale={scale}>
      <group ref={modelRef}>
        {/* Simple loading sphere with pufferfish colors (2x larger) */}
        <mesh>
          <sphereGeometry args={[1.8, 6, 6]} /> {/* 2x larger + low-poly */}
          <meshBasicMaterial 
            color={color}
            transparent={false} // Disable transparency for performance
            opacity={1.0}
          />
        </mesh>
        
        {/* Simple spiky wireframe (2x larger) */}
        <mesh>
          <sphereGeometry args={[2.0, 4, 4]} /> {/* 2x larger + even lower poly */}
          <meshBasicMaterial 
            color="#fdcb6e"
            transparent={true}
            opacity={0.4}
            wireframe={true}
          />
        </mesh>
      </group>
    </group>
  )
}

export default MineModelWithSuspense
