import React, { useRef, Suspense, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

// Performance mode toggle - set to true for simple spheres, false for GLTF models
const USE_PERFORMANCE_MODE = false // Change to true if still too slow

// Optimization settings for better performance
const ENABLE_ANIMATIONS = true // Set to false to disable all animations for performance
const REDUCE_GEOMETRY = true // Use lower-poly geometry

// ToxicWaste GLTF Model component - OPTIMIZED
const ToxicWasteModel = React.memo(React.forwardRef(({ character, currentPosition, scale, color }, ref) => {
  const meshRef = ref || useRef()
  const modelRef = useRef()
  
  // Load the toxic waste GLTF model only if not in performance mode
  const gltfData = USE_PERFORMANCE_MODE ? null : useGLTF('/models/toxic_waste.glb')
  const hasGLTF = !USE_PERFORMANCE_MODE && gltfData && gltfData.scene
  
  // Clone scene once and memoize it to avoid repeated cloning
  const clonedScene = useMemo(() => {
    if (hasGLTF) {
      const scene = gltfData.scene.clone()
      // Optimize materials for performance
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false  // Disable shadows for performance
          child.receiveShadow = false
          // Reduce material quality for performance
          if (child.material) {
            child.material.flatShading = true
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
      // Simple rotation only - remove complex animations
      modelRef.current.rotation.y += delta * 1.0 // Further reduced rotation speed for performance
    }
  })

  return (
    <group ref={meshRef} position={currentPosition} scale={scale}>
      {hasGLTF && clonedScene ? (
        <group ref={modelRef}>
          <primitive 
            object={clonedScene}
            scale={[0.6, 0.6, 0.6]} // Smaller scale for performance
          />
        </group>
      ) : (
        /* Simple fallback sphere - minimal performance impact */
        <group ref={modelRef}>
          <mesh>
            <sphereGeometry args={[1.0, 8, 8]} /> 
            <meshBasicMaterial 
              color={color}
              transparent={true}
              opacity={0.8}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}))

// Wrapper component with Suspense for proper loading
const ToxicWasteModelWithSuspense = React.forwardRef((props, ref) => {
  return (
    <Suspense fallback={<ToxicWasteFallback {...props} />}>
      <ToxicWasteModel {...props} ref={ref} />
    </Suspense>
  )
})

// Optimized fallback component - minimal performance impact
const ToxicWasteFallback = ({ character, currentPosition, scale, color }) => {
  const meshRef = useRef()
  const modelRef = useRef()
  
  // Minimal animation for loading state
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 1 // Slow rotation only
    }
  })

  return (
    <group ref={meshRef} position={currentPosition} scale={scale}>
      <group ref={modelRef}>
        {/* Simple loading sphere */}
        <mesh>
          <sphereGeometry args={[1.0, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      </group>
    </group>
  )
}

export default ToxicWasteModelWithSuspense
