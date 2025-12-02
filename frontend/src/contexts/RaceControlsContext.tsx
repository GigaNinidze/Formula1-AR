import { createContext, useContext, useState, useRef, ReactNode } from 'react'

interface RaceControlsContextType {
  isPlaying: boolean
  togglePlay: () => void
  reset: () => void
  currentTime: number
  getCurrentTime: () => number
  advanceTime: (delta: number) => void
  setTime: (time: number) => void // Allow manual seeking/setting
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
}

const RaceControlsContext = createContext<RaceControlsContextType | null>(null)

export function RaceControlsProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [currentTimeState, setCurrentTimeState] = useState(0)
  const currentTimeRef = useRef(0)

  // Remove internal requestAnimationFrame loop
  // Time is now driven by the RaceTimer component inside the Canvas/XR session

  const advanceTime = (delta: number) => {
    if (!isPlaying) return
    
    // Delta is expected in seconds
    currentTimeRef.current += delta * playbackSpeed
    
    // Log occasionally for debug
    if (currentTimeRef.current % 5 < 0.1 && delta > 0) {
        // console.log('⏱️ Time advancing:', { time: currentTimeRef.current.toFixed(3) })
    }
  }

  const setTime = (time: number) => {
    currentTimeRef.current = time
    setCurrentTimeState(time) // Update UI state as well
    console.log('⏩ Time manually set to:', time)
  }

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const reset = () => {
    setIsPlaying(false)
    currentTimeRef.current = 0
    setCurrentTimeState(0)
  }

  const getCurrentTime = () => currentTimeRef.current

  return (
    <RaceControlsContext.Provider
      value={{
        isPlaying,
        togglePlay,
        reset,
        currentTime: currentTimeState,
        getCurrentTime,
        advanceTime,
        setTime,
        playbackSpeed,
        setPlaybackSpeed,
      }}
    >
      {children}
    </RaceControlsContext.Provider>
  )
}

export function useRaceControls() {
  const context = useContext(RaceControlsContext)
  if (!context) {
    throw new Error('useRaceControls must be used within RaceControlsProvider')
  }
  return context
}

