import { useState, useEffect } from 'react'

export interface RaceFile {
  filename: string
  displayName: string
  year?: number
  grandPrix?: string
  sessionType?: string
}

export function useAvailableRaces() {
  const [races, setRaces] = useState<RaceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAvailableRaces() {
      try {
        // Try to fetch a list endpoint, or scan the public directory
        // For now, we'll use a simple approach: try to fetch known patterns
        // In a real app, you'd have a backend endpoint that lists files
        
        // Check if we can access the public directory
        // Since we're in a browser, we can't directly list files
        // We'll need to either:
        // 1. Have a backend endpoint that lists files
        // 2. Hardcode known races
        // 3. Try to fetch and parse a manifest file
        
        // For now, let's try fetching a manifest or use a default
        const defaultRace: RaceFile = {
          filename: 'race_data_2023_Bahrain_R.json',
          displayName: '2023 Bahrain Grand Prix (Race)',
          year: 2023,
          grandPrix: 'Bahrain',
          sessionType: 'R'
        }
        
        setRaces([defaultRace])
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load available races')
        setLoading(false)
      }
    }

    fetchAvailableRaces()
  }, [])

  return { races, loading, error }
}

