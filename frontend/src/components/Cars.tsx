import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRaceControls } from '../contexts/RaceControlsContext'

interface CarTelemetry {
  driver: string
  positions_normalized: number[][]
  times: number[]
  throttle: number[]
  brake: (boolean | number)[]
  speed: number[]
}

interface CarsProps {
  telemetry: CarTelemetry[]
  drivers: Record<string, { name: string; team: string; number: string }>
}

export default function Cars({ telemetry }: CarsProps) {
  const { isPlaying, getCurrentTime } = useRaceControls()
  const carRefs = useRef<Record<string, THREE.Mesh>>({})
  const lastTimeRef = useRef<number>(-1)
  const lastPlayingRef = useRef<boolean>(false)

  useFrame(() => {
    const currentTime = getCurrentTime()

    // Debug: log state changes only when they actually change
    if (isPlaying !== lastPlayingRef.current) {
      console.log('🚗 Playback state changed:', { isPlaying, currentTime, numCars: telemetry.length })
      lastPlayingRef.current = isPlaying
    }
    
    // Reset cars to start position when time resets to 0
    if (currentTime === 0 && lastTimeRef.current > 0) {
      console.log('🔄 Resetting cars to start position')
      telemetry.forEach((carData) => {
        const carRef = carRefs.current[carData.driver]
        if (!carRef) return
        const initialPos = carData.positions_normalized[0] || [0, 0, 0]
        carRef.position.set(initialPos[0], 0.01, initialPos[2])
      })
    }
    
    // Debug: log first time we start playing
    if (isPlaying && lastTimeRef.current === -1 && currentTime > 0) {
      console.log('🚗 Cars animation started:', { currentTime, isPlaying, numCars: telemetry.length })
    }
    
    // Debug: log when time updates (every 0.5 seconds to avoid spam)
    if (isPlaying && Math.floor(currentTime * 2) !== Math.floor(lastTimeRef.current * 2)) {
      console.log('⏱️ Time update:', { 
        currentTime: currentTime.toFixed(2), 
        isPlaying, 
        numCars: telemetry.length,
        timeDelta: (currentTime - lastTimeRef.current).toFixed(3)
      })
    }
    
    lastTimeRef.current = currentTime

    telemetry.forEach((carData, index) => {
      const carRef = carRefs.current[carData.driver]
      if (!carRef) {
        // Debug: log missing car refs
        if (isPlaying && currentTime > 0.1 && currentTime < 0.2) {
          console.warn('⚠️ Missing car ref for driver:', carData.driver, {
            totalRefs: Object.keys(carRefs.current).length,
            expectedCars: telemetry.length
          })
        }
        return
      }

      if (!isPlaying && currentTime === 0) {
        // When paused at start, ensure cars are at initial position
        const initialPos = carData.positions_normalized[0] || [0, 0, 0]
        carRef.position.set(initialPos[0], 0.01, initialPos[2])
        return
      }

      if (!isPlaying) {
        // When paused, keep cars at their current position
        return
      }

      // Find the closest time index
      let timeIndex = carData.times.findIndex((t) => t >= currentTime)
      
      // Handle edge cases
      if (timeIndex === -1) {
        // Past the end - use last position
        timeIndex = carData.times.length - 1
        const lastPos = carData.positions_normalized[timeIndex]
        carRef.position.set(lastPos[0], 0.01, lastPos[2]) // 1cm above flat track
        return
      }

      if (timeIndex === 0) {
        // At or before first frame
        if (currentTime <= carData.times[0]) {
          // Before start - use first position
          const firstPos = carData.positions_normalized[0]
          carRef.position.set(firstPos[0], 0.01, firstPos[2]) // 1cm above flat track
          return
        }
        // If currentTime > times[0] but timeIndex is 0, we need to interpolate
        // This shouldn't happen, but handle it gracefully
        timeIndex = 1
      }

      // Interpolate position between prev and next
      const prevTime = carData.times[timeIndex - 1]
      const nextTime = carData.times[timeIndex]
      
      // Validation: Ensure we have valid times
      if (prevTime === undefined || nextTime === undefined) {
        return
      }

      const t = Math.max(0, Math.min(1, (currentTime - prevTime) / (nextTime - prevTime)))

      const prevPos = carData.positions_normalized[timeIndex - 1]
      const nextPos = carData.positions_normalized[timeIndex]
      
      // Validation: Ensure we have valid positions
      if (!prevPos || !nextPos) {
        return
      }

      // Track is flat (Y=0), cars are 1cm above (0.01m)
      const newX = THREE.MathUtils.lerp(prevPos[0], nextPos[0], t)
      const newZ = THREE.MathUtils.lerp(prevPos[2], nextPos[2], t)
      
      // Debug: log position updates for first car more frequently to catch issues
      if (index === 0 && isPlaying && Math.random() < 0.05) { // Log ~5% of frames for first car
        console.log('🚗 Car update details:', {
          driver: carData.driver,
          currentTime: currentTime.toFixed(2),
          timeRange: [prevTime.toFixed(2), nextTime.toFixed(2)],
          t: t.toFixed(3),
          posChange: [newX.toFixed(4), newZ.toFixed(4)],
          isMoving: Math.abs(newX - prevPos[0]) > 0.0001 || Math.abs(newZ - prevPos[2]) > 0.0001
        })
      }

      // IMPORTANT: Manually update matrix to ensure position change is rendered immediately
      carRef.position.set(newX, 0.01, newZ)
      carRef.updateMatrix()
      carRef.updateMatrixWorld(true)

      // Color based on throttle/brake
      const throttle = carData.throttle[timeIndex] || 0
      const brake = carData.brake[timeIndex] || false

      let color = '#FFFFFF' // Default white
      if (brake) {
        color = '#CA1551' // Rose red for braking
      } else if (throttle > 50) {
        color = '#03CEA4' // Mint green for throttle
      }

      const material = carRef.material as THREE.MeshStandardMaterial
      if (material) {
        material.color.set(color)
      }
    })
  })

  // Debug: log car positions on first render only
  const hasLoggedInitial = useRef(false)
  if (telemetry.length > 0 && !hasLoggedInitial.current) {
    console.log('🚗 Rendering cars:', {
      numCars: telemetry.length,
      firstCarPos: telemetry[0]?.positions_normalized[0],
      firstCarTimes: telemetry[0]?.times?.slice(0, 5),
      first3CarsInitialPos: telemetry.slice(0, 3).map(c => ({
        driver: c.driver,
        pos: c.positions_normalized[0]
      }))
    })
    hasLoggedInitial.current = true
  }

  return (
    <>
      {telemetry.map((carData) => {
        return (
          <mesh
            key={carData.driver}
            ref={(el) => {
              if (el) carRefs.current[carData.driver] = el
            }}
            // Remove default position to avoid overwriting animation
            // Initial position will be set by useFrame in the first frame
          >
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial
              color="#FFFFFF"
              emissive="#000000"
              emissiveIntensity={0.5}
            />
          </mesh>
        )
      })}
    </>
  )
}

