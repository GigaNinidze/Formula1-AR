import { useFrame } from '@react-three/fiber'
import { useRaceControls } from '../contexts/RaceControlsContext'

export default function RaceTimer() {
  const { advanceTime, isPlaying } = useRaceControls()

  useFrame((_, delta) => {
    if (isPlaying) {
      // Delta is in seconds
      // Cap delta to avoid huge jumps if frame drops or on resume
      const safeDelta = Math.min(delta, 0.1)
      advanceTime(safeDelta)
    }
  })

  return null
}

