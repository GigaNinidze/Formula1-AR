import { useXR } from '@react-three/xr'
import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { RealityAccelerator } from 'ratk'
import Track from './Track'
import Cars from './Cars'
import ARControls from './ARControls'
import RaceTimer from './RaceTimer' // Import RaceTimer
import { useRaceData } from '../hooks/useRaceData'

import { useRaceControls } from '../contexts/RaceControlsContext'

interface ARSceneProps {
  selectedRace: string | null
}

export default function ARScene({ selectedRace }: ARSceneProps) {
  const { isPresenting } = useXR()
  const { scene, gl } = useThree()
  const { setTime } = useRaceControls()
  const [trackPosition, setTrackPosition] = useState<THREE.Vector3 | null>(null)
  const [trackScale, setTrackScale] = useState<number>(1)
  const ratkRef = useRef<RealityAccelerator | null>(null)
  const { data, loading } = useRaceData(selectedRace)
  
  // Detect start time of race (first movement) and set it once
  const hasSetStartTime = useRef(false)
  useEffect(() => {
    if (data && data.telemetry && !hasSetStartTime.current) {
      // Find the first time any car moves significantly
      let firstMoveTime = Infinity
      let found = false
      
      // Only check first few cars to save perf
      const carsToCheck = data.telemetry.slice(0, 5)
      
      for (const car of carsToCheck) {
        const positions = car.positions_normalized
        const times = car.times
        const startPos = positions[0]
        
        if (!startPos) continue
        
        for (let i = 0; i < positions.length; i += 10) { // Skip frames for speed
          const pos = positions[i]
          const distSq = 
            (pos[0] - startPos[0]) ** 2 + 
            (pos[2] - startPos[2]) ** 2 // Check X/Z movement
            
          if (distSq > 0.0001) { // Threshold for movement
            if (times[i] < firstMoveTime) {
              firstMoveTime = times[i]
              found = true
            }
            break // Found first move for this car
          }
        }
      }
      
      if (found && firstMoveTime !== Infinity) {
        console.log('🏁 Race start detected at:', firstMoveTime)
        // Start a bit before movement
        setTime(Math.max(0, firstMoveTime - 2)) 
        hasSetStartTime.current = true
      }
    }
  }, [data, setTime])

  // Reset track position when race changes
  useEffect(() => {
    setTrackPosition(null)
  }, [selectedRace])
  
  // Check renderer's XR session directly (RATK might start session before useXR detects it)
  const xrSession = gl?.xr?.getSession() || null
  const isARSessionActive = isPresenting || !!xrSession

  // Initialize RATK when renderer is available
  useEffect(() => {
    if (!gl || !gl.xr) {
      console.log('Waiting for renderer with XR...')
      return
    }

    try {
      console.log('Initializing RATK with renderer:', gl)
      const ratk = new RealityAccelerator(gl.xr)
      ratkRef.current = ratk
      scene.add(ratk.root)
      console.log('✅ RATK initialized and added to scene')
      
      // RATK will be updated in useFrame hook
    } catch (err) {
      console.error('Failed to initialize RATK:', err)
    }

    return () => {
      if (ratkRef.current && ratkRef.current.root) {
        scene.remove(ratkRef.current.root)
        ratkRef.current = null
      }
    }
  }, [scene, gl])

  // Automatically place track in front of user at eye level when AR session starts
  useEffect(() => {
    if (!isARSessionActive || !data || trackPosition || !selectedRace) {
      return
    }

    console.log('🎯 Auto-placing track in front of user at eye level')
    
    // Calculate track bounds to determine scale
    const trackPath = data.track.path
    if (!trackPath || trackPath.length === 0) {
      console.warn('⚠️ No track path data available')
      return
    }

    // Find min/max bounds of track
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    trackPath.forEach(([x, y, z]) => {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      minZ = Math.min(minZ, z)
      maxZ = Math.max(maxZ, z)
    })

    const trackWidth = maxX - minX
    const trackHeight = maxY - minY
    const trackDepth = maxZ - minZ

    // Target size: fit in 1m x 1m x 1m cube (coffee table size)
    // Use 80cm to leave some margin for better viewing
    const targetSize = 0.8 // 80cm
    const maxDimension = Math.max(trackWidth, trackHeight, trackDepth)
    
    // Calculate scale to fit within target size
    const scale = maxDimension > 0 ? targetSize / maxDimension : 1
    setTrackScale(scale)

    // Calculate center of track for positioning
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2

    console.log('📐 Track dimensions:', {
      width: trackWidth.toFixed(3),
      height: trackHeight.toFixed(3),
      depth: trackDepth.toFixed(3),
      maxDimension: maxDimension.toFixed(3),
      scale: scale.toFixed(3),
      center: { x: centerX.toFixed(3), y: centerY.toFixed(3), z: centerZ.toFixed(3) }
    })

    // Position track in front of user at eye level (1.6m high, 80cm forward)
    // Use viewer space to get user's position and orientation
    const activeSession = xrSession
    if (!activeSession) {
      console.error('❌ No active XR session for auto-placement')
      return
    }

    // Position track at eye level (1.6m) in front of user (80cm forward)
    // In viewer space, we're at origin (0,0,0), so we position relative to that
    // The track will appear 80cm in front and at eye level
    const eyeLevel = 1 // 1m eye level
    const distance = 0.8 // 80cm in front
    
    const placementPosition = new THREE.Vector3(
      -centerX * scale, // Center horizontally
      eyeLevel - centerY * scale, // Eye level - center offset
      -distance - centerZ * scale // 80cm in front - center offset
    )

    console.log('✅ Track auto-placed at eye level:', {
      x: placementPosition.x.toFixed(3),
      y: placementPosition.y.toFixed(3),
      z: placementPosition.z.toFixed(3),
      scale: scale.toFixed(3)
    })
    
    setTrackPosition(placementPosition)
  }, [isARSessionActive, data, trackPosition, xrSession, selectedRace])

  // No longer needed - track is auto-placed

  // Update RATK every frame
  useFrame(() => {
    if (ratkRef.current) {
      ratkRef.current.update()
    }
  })

  if (loading || !data) {
    console.log('⏳ Waiting for race data...', { loading, hasData: !!data })
    return null
  }

  console.log('🎨 Rendering ARScene:', {
    isPresenting,
    isARSessionActive,
    hasPosition: !!trackPosition,
    hasData: !!data,
    trackScale: trackScale.toFixed(3)
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {trackPosition && data && (
        <>
          {/* Time driver for animation */}
          <RaceTimer />
          
          <group 
            position={trackPosition}
            scale={[trackScale, trackScale, trackScale]}
          >
            <Track trackPath={data.track.path} />
            <Cars telemetry={data.telemetry} drivers={data.drivers} />
          </group>
          {/* AR Controls positioned below the track */}
          <ARControls position={trackPosition} trackScale={trackScale} />
        </>
      )}
    </>
  )
}
