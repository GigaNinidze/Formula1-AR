import { useState, useEffect } from 'react'

interface RaceData {
  metadata: {
    year: number
    grand_prix: string
    session_type: string
    num_drivers: number
  }
  drivers: Record<string, { name: string; team: string; number: string }>
  track: {
    path: number[][]
  }
  telemetry: Array<{
    driver: string
    positions_normalized: number[][]
    times: number[]
    throttle: number[]
    brake: (boolean | number)[]
    speed: number[]
  }>
}

export function useRaceData(raceFile: string | null = null) {
  const [data, setData] = useState<RaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // If no race file is selected, don't load anything
    if (!raceFile) {
      setLoading(false)
      setData(null)
      setError(null)
      setProgress(0)
      return
    }

    setLoading(true)
    setError(null)
    setProgress(0)
    
    // Load the race data JSON file from public directory with progress tracking
    const loadWithProgress = async () => {
      try {
        const response = await fetch(`/${raceFile}`)
        
        if (!response.ok) {
          throw new Error(`Failed to load race data: ${response.status} ${response.statusText}`)
        }

        // Get the content length for progress calculation
        const contentLength = response.headers.get('Content-Length')
        const total = contentLength ? parseInt(contentLength, 10) : 0

        if (!response.body) {
          // Fallback if ReadableStream not supported
          const json = await response.json()
          setData(json)
          setLoading(false)
          setProgress(100)
          console.log('✅ Race data loaded:', json.metadata)
          return
        }

        // Read the response body as a stream to track progress
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let receivedLength = 0

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          chunks.push(value)
          receivedLength += value.length
          
          // Calculate and update progress
          if (total > 0) {
            const percentComplete = Math.round((receivedLength / total) * 100)
            setProgress(percentComplete)
          } else {
            // If no content-length, show indeterminate progress based on received data
            // Estimate ~50MB for race data
            const estimatedTotal = 50 * 1024 * 1024
            const percentComplete = Math.min(95, Math.round((receivedLength / estimatedTotal) * 100))
            setProgress(percentComplete)
          }
        }

        // Combine chunks and decode
        const chunksAll = new Uint8Array(receivedLength)
        let position = 0
        for (const chunk of chunks) {
          chunksAll.set(chunk, position)
          position += chunk.length
        }

        setProgress(98) // Parsing phase

        const text = new TextDecoder('utf-8').decode(chunksAll)
        const json = JSON.parse(text)
        
        setProgress(100)
        setData(json)
        setLoading(false)
        console.log('✅ Race data loaded:', json.metadata)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setLoading(false)
        setProgress(0)
        console.error('Error loading race data:', err)
        console.error('Make sure the JSON file exists in the public directory')
      }
    }

    loadWithProgress()
  }, [raceFile])

  return { data, loading, error, progress }
}
