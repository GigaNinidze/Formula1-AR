import { Canvas } from '@react-three/fiber'
import { XR, Controllers, Hands } from '@react-three/xr'
import { Suspense, useState } from 'react'
import { RaceControlsProvider } from './contexts/RaceControlsContext'
import ARScene from './components/ARScene'
import UI from './components/UI'
import type * as THREE from 'three'

function App() {
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null)
  const [selectedRace, setSelectedRace] = useState<string | null>(null)

  return (
    <RaceControlsProvider>
      <Canvas
        camera={{ position: [0, 1.6, 0], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          // Enable XR on renderer (required for WebXR)
          gl.xr.enabled = true
          setRenderer(gl)
          console.log('Renderer created with XR enabled:', gl)
          console.log('XR enabled:', gl.xr.enabled)
        }}
      >
        <XR>
          <Suspense fallback={null}>
            <ARScene selectedRace={selectedRace} />
            <Controllers />
            <Hands />
          </Suspense>
        </XR>
      </Canvas>
      <UI 
        renderer={renderer} 
        selectedRace={selectedRace}
        onRaceSelected={setSelectedRace}
      />
    </RaceControlsProvider>
  )
}

export default App

