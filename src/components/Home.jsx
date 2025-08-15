import React from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'

function Home() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      paddingTop: '60px',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '80px', 
        left: '20px', 
        zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: 'white' }}>
          React + Three.js Starter
        </h1>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8, color: 'white' }}>
          A rotating cube with orbit controls
        </p>
      </div>
      
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          height: 'calc(100vh - 60px)'
        }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

export default Home
