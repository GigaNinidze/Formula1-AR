import { useController } from '@react-three/xr'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { useRaceControls } from '../contexts/RaceControlsContext'

interface ARControlsProps {
  position: THREE.Vector3
  trackScale: number
}

export default function ARControls({ position, trackScale }: ARControlsProps) {
  const { isPlaying, togglePlay, reset, playbackSpeed, setPlaybackSpeed } = useRaceControls()
  const leftController = useController('left')
  const rightController = useController('right')
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const triggerPressedRef = useRef<boolean>(false)
  const lastTriggerTimeRef = useRef<number>(0)
  const buttonMeshesRef = useRef<Record<string, THREE.Mesh>>({})
  
  // Button positions relative to track center (below the track)
  // Position controls below the track, centered horizontally
  const buttonSpacing = 0.12 * trackScale
  const buttonY = -0.2 * trackScale // Below the track
  const buttonSize = 0.1 * trackScale
  
  const playButtonPos = new THREE.Vector3(-buttonSpacing * 1.5, buttonY, 0)
  const resetButtonPos = new THREE.Vector3(-buttonSpacing * 0.5, buttonY, 0)
  const speedUpButtonPos = new THREE.Vector3(buttonSpacing * 0.5, buttonY, 0)
  const speedDownButtonPos = new THREE.Vector3(buttonSpacing * 1.5, buttonY, 0)
  
  // Raycasting for button interaction
  useFrame(() => {
    const controller = rightController || leftController
    if (!controller) return

    const controllerWorldPos = new THREE.Vector3()
    const controllerWorldQuat = new THREE.Quaternion()
    
    controller.controller.getWorldPosition(controllerWorldPos)
    controller.controller.getWorldQuaternion(controllerWorldQuat)
    
    // Ray direction is forward from controller
    const rayDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(controllerWorldQuat)
    
    // Use proper raycasting with button meshes
    const raycaster = new THREE.Raycaster(controllerWorldPos, rayDirection)
    
    // Check intersection with buttons using actual meshes
    const buttons = [
      { name: 'play', action: togglePlay, label: isPlaying ? '⏸' : '▶' },
      { name: 'reset', action: reset, label: '⏮' },
      { name: 'speedUp', action: () => {
        const newSpeed = Math.min(5, playbackSpeed + 0.5)
        console.log('🎮 Speed Up button pressed:', { oldSpeed: playbackSpeed, newSpeed })
        setPlaybackSpeed(newSpeed)
      }},
      { name: 'speedDown', action: () => {
        const newSpeed = Math.max(0.5, playbackSpeed - 0.5)
        console.log('🎮 Speed Down button pressed:', { oldSpeed: playbackSpeed, newSpeed })
        setPlaybackSpeed(newSpeed)
      }},
    ]
    
    let hitButton: string | null = null
    let closestDistance = Infinity
    
    // Raycast against all button meshes
    buttons.forEach(({ name }) => {
      const buttonMesh = buttonMeshesRef.current[name]
      if (!buttonMesh) return
      
      const intersects = raycaster.intersectObject(buttonMesh, false)
      if (intersects.length > 0) {
        const distance = intersects[0].distance
        if (distance < closestDistance) {
          closestDistance = distance
          hitButton = name
        }
      }
    })
    
    // Only update when hover state actually changes
    if (hitButton !== hoveredButton) {
      setHoveredButton(hitButton)
    }
    
    // Check for trigger press (debounced)
    const gamepad = controller.inputSource?.gamepad
    const now = Date.now()
    if (gamepad && gamepad.buttons[0]?.pressed) {
      if (!triggerPressedRef.current && now - lastTriggerTimeRef.current > 300) {
        triggerPressedRef.current = true
        lastTriggerTimeRef.current = now
        
        // Use hoveredButton as fallback if hitButton is null (timing issue)
        const buttonToClick = hitButton || hoveredButton
        const button = buttons.find(b => b.name === buttonToClick)
        if (button && buttonToClick) {
          console.log('🎮 Button CLICKED:', buttonToClick, {
            action: button.label,
            isPlaying,
            playbackSpeed,
            usedHovered: !hitButton && !!hoveredButton
          })
          button.action()
        } else {
          console.log('🎮 Trigger pressed but no button hit:', { hitButton, hoveredButton, buttonToClick })
        }
      }
    } else {
      triggerPressedRef.current = false
    }
  })
  
  const Button = ({ name, position: btnPos, label, color }: { name: string; position: THREE.Vector3; label: string; color: string }) => {
    const isHovered = hoveredButton === name
    const worldPos = new THREE.Vector3(
      position.x + btnPos.x,
      position.y + btnPos.y,
      position.z + btnPos.z
    )
    
    return (
      <group position={worldPos}>
        <mesh
          ref={(el) => {
            if (el) buttonMeshesRef.current[name] = el
          }}
        >
          <boxGeometry args={[buttonSize, buttonSize * 0.6, buttonSize * 0.15]} />
          <meshStandardMaterial 
            color={isHovered ? '#FA8148' : color} 
            emissive={isHovered ? '#FA8148' : '#000000'}
            emissiveIntensity={isHovered ? 0.6 : 0.1}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
        <Text
          position={[0, 0, buttonSize * 0.08]}
          fontSize={buttonSize * 0.4}
          color={isHovered ? '#FFFFFF' : '#000000'}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    )
  }
  
  return (
    <group>
      <Button 
        name="play" 
        position={playButtonPos} 
        label={isPlaying ? '⏸' : '▶'} 
        color="#03CEA4" 
      />
      <Button 
        name="reset" 
        position={resetButtonPos} 
        label="⏮" 
        color="#CA1551" 
      />
      <Button 
        name="speedUp" 
        position={speedUpButtonPos} 
        label="+"
        color="#FA8148"
      />
      <Button 
        name="speedDown" 
        position={speedDownButtonPos} 
        label="-"
        color="#FA8148"
      />
      {/* Speed display */}
      <Text
        position={[
          position.x + speedDownButtonPos.x + buttonSpacing * 0.5, 
          position.y + buttonY, 
          position.z
        ]}
        fontSize={buttonSize * 0.3}
        color="#000000"
        anchorX="center"
        anchorY="middle"
      >
        {playbackSpeed.toFixed(1)}x
      </Text>
    </group>
  )
}

