import { useState, useRef, useEffect } from 'react'

export function useRaceControls() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [currentTime, setCurrentTime] = useState(0)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      const delta = (timestamp - lastTimeRef.current) / 1000 // Convert to seconds
      setCurrentTime((prev) => prev + delta * playbackSpeed)
      lastTimeRef.current = timestamp

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, playbackSpeed])

  const togglePlay = () => {
    setIsPlaying((prev: boolean) => !prev)
    if (!isPlaying) {
      lastTimeRef.current = 0
    }
  }

  const reset = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    lastTimeRef.current = 0
  }

  return {
    isPlaying,
    togglePlay,
    reset,
    currentTime,
    playbackSpeed,
    setPlaybackSpeed,
  }
}

