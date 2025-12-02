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

  useEffect(() => {
    // If no race file is selected, don't load anything
    if (!raceFile) {
      setLoading(false)
      setData(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    
    // Load the race data JSON file from public directory
    fetch(`/${raceFile}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load race data: ${res.status} ${res.statusText}`)
        }
        return res.json()
      })
      .then((json) => {
        setData(json)
        setLoading(false)
        console.log('✅ Race data loaded:', json.metadata)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
        console.error('Error loading race data:', err)
        console.error('Make sure the JSON file exists in the public directory')
      })
  }, [raceFile])

  return { data, loading, error }
}

