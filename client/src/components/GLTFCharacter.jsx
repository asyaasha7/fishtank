import React, { useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Shield Effect Component with glowing, blinking animation
function ShieldEffect() {
  const shieldRef = useRef()
  const outerShieldRef = useRef()
  
  useFrame((state) => {
    if (shieldRef.current && outerShieldRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Enhanced pulsing opacity effect
      const pulseOpacity = 0.4 + Math.sin(time * 4) * 0.2 // Oscillates between 0.2 and 0.6
      const outerPulseOpacity = 0.2 + Math.sin(time * 3) * 0.15 // Oscillates between 0.05 and 0.35
      
      // Rotating effect
      shieldRef.current.rotation.y += 0.01
      outerShieldRef.current.rotation.y -= 0.008
      shieldRef.current.rotation.x += 0.005
      
      // Update materials opacity
      shieldRef.current.material.opacity = pulseOpacity
      outerShieldRef.current.material.opacity = outerPulseOpacity
      
      // Slight scaling effect for breathing
      const scale = 1 + Math.sin(time * 2.5) * 0.1
      shieldRef.current.scale.setScalar(scale)
      outerShieldRef.current.scale.setScalar(scale * 1.5)
    }
  })
  
  return (
    <group>
      {/* Inner shield - wireframe */}
      <mesh ref={shieldRef} position={[0, 3, 0]}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial 
          color="#00ffff" 
          transparent={true} 
          opacity={0.3}
          wireframe={true}
        />
      </mesh>
      
      {/* Outer shield - solid with glow */}
      <mesh ref={outerShieldRef} position={[0, 3, 0]}>
        <sphereGeometry args={[1.0, 12, 12]} />
        <meshBasicMaterial 
          color="#40e0d0" 
          transparent={true} 
          opacity={0.15}
          wireframe={false}
        />
      </mesh>
      
      {/* Enhanced glowing particles effect */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={0.5} 
        color="#00ffff" 
        distance={4}
      />
      <pointLight 
        position={[0.5, 0.5, 0]} 
        intensity={0.3} 
        color="#40e0d0" 
        distance={3}
      />
    </group>
  )
}
// GLTF Character component that replaces the sphere
const GLTFCharacter = React.memo(({ mousePos, sphereRef, isShieldActive, modelPath = '/models/character.glb' }) => {
  const propellerRef = useRef()
  const ringRef = useRef()
  
  // Load the GLTF model with debugging
  const gltfData = useGLTF(modelPath)
  const hasGLTF = gltfData && gltfData.scene
  
  // Debug logging (can be removed once working)
  React.useEffect(() => {
    console.log('GLTF loaded successfully:', hasGLTF ? 'YES' : 'NO')
    if (hasGLTF) {
      console.log('GLTF scene object:', gltfData.scene)
    }
  }, [gltfData, hasGLTF])

  // Debug shield state
  React.useEffect(() => {
    console.log('🛡️ GLTFCharacter shield state:', isShieldActive)
  }, [isShieldActive])
  
  useFrame((state, delta) => {
    if (sphereRef.current && mousePos) {
      // Convert mouse position to target coordinates
      const targetY = normalize(mousePos.y, -0.75, 0.75, -3, 3);
      const targetX = normalize(mousePos.x, -0.75, 0.75, -2, 2);
      
      // Smooth movement toward target position
      sphereRef.current.position.y += (targetY - sphereRef.current.position.y) * 0.1;
      sphereRef.current.position.x += (targetX - sphereRef.current.position.x) * 0.05;
      
      // Rotate the character proportionally to movement for realistic flight
      sphereRef.current.rotation.z = (targetY - sphereRef.current.position.y) * 0.1;
      sphereRef.current.rotation.x = (sphereRef.current.position.y - targetY) * 0.05;
    }
    
    // Rotate the propeller continuously if it exists
    if (propellerRef.current) {
      propellerRef.current.rotation.x += delta * 10;
    }
    
    // Rotate the glowing ring around the character
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 2; // Rotate around Z-axis for horizontal ring
    }
  })

  // Normalize function (copied from the original component)
  function normalize(v, vmin, vmax, tmin, tmax) {
    var nv = Math.max(Math.min(v, vmax), vmin);
    var dv = vmax - vmin;
    var pc = (nv - vmin) / dv;
    var dt = tmax - tmin;
    var tv = tmin + (pc * dt);
    return tv;
  }

  return (
    <group ref={sphereRef} position={[-3, 0, 2]} scale={hasGLTF ? [0.5, 0.5, 0.5] : [1, 1, 1]}>
      {hasGLTF ? (
        /* GLTF Model */
        <primitive 
          object={gltfData.scene} 
          castShadow 
          receiveShadow
        />
      ) : (
        /* Fallback sphere when GLTF is not available */
        <>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshPhongMaterial 
              color="#00b894" 
              shininess={100}
              emissive="#00b894"
              emissiveIntensity={0.3}
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
        </>
      )}
      

      {/* Enhanced trail effect */}
      <mesh position={hasGLTF ? [-4.8, 3, 0] : [-0.6, 0, 0]}>
        <sphereGeometry args={hasGLTF ? [0.3, 8, 8] : [0.15, 8, 8]} />
        <meshBasicMaterial 
          color="#74b9ff" 
          transparent={true} 
          opacity={0.8}
        />
      </mesh>
      
      <mesh position={hasGLTF ? [-5.6, 3, 0] : [-0.9, 0, 0]}>
        <sphereGeometry args={hasGLTF ? [0.2, 8, 8] : [0.1, 8, 8]} />
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

// Wrapper component with Suspense for proper loading
const GLTFCharacterWithSuspense = (props) => {
  return (
    <Suspense fallback={
      <GLTFCharacterFallback {...props} />
    }>
      <GLTFCharacter {...props} />
    </Suspense>
  )
}

// Fallback component that shows while GLTF is loading
const GLTFCharacterFallback = ({ mousePos, sphereRef, isShieldActive }) => {
  const propellerRef = useRef()
  
  useFrame((state, delta) => {
    if (sphereRef.current && mousePos) {
      // Convert mouse position to target coordinates
      const targetY = normalize(mousePos.y, -0.75, 0.75, -3, 3);
      const targetX = normalize(mousePos.x, -0.75, 0.75, -2, 2);
      
      // Smooth movement toward target position
      sphereRef.current.position.y += (targetY - sphereRef.current.position.y) * 0.1;
      sphereRef.current.position.x += (targetX - sphereRef.current.position.x) * 0.05;
      
      // Rotate the character proportionally to movement for realistic flight
      sphereRef.current.rotation.z = (targetY - sphereRef.current.position.y) * 0.1;
      sphereRef.current.rotation.x = (sphereRef.current.position.y - targetY) * 0.05;
    }
    
    if (propellerRef.current) {
      propellerRef.current.rotation.x += delta * 10;
    }
  })

  function normalize(v, vmin, vmax, tmin, tmax) {
    var nv = Math.max(Math.min(v, vmax), vmin);
    var dv = vmax - vmin;
    var pc = (nv - vmin) / dv;
    var dt = tmax - tmin;
    var tv = tmin + (pc * dt);
    return tv;
  }

  return (
    <group ref={sphereRef} position={[-3, 0, 2]} scale={[1, 1, 1]}>
      {/* Loading sphere */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshPhongMaterial 
          color="#00b894" 
          shininess={100}
          emissive="#00b894"
          emissiveIntensity={0.3}
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

      {/* Trail effect */}
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
      
      {/* Shield Effect */}
      {isShieldActive && (
        <ShieldEffect />
      )}
    </group>
  )
}

// Preload the GLTF model
useGLTF.preload('/models/character.glb')

export default GLTFCharacterWithSuspense
