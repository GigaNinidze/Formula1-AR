import { useState, useEffect } from 'react'
import { useAvailableRaces, RaceFile } from '../hooks/useAvailableRaces'
import './RaceSelector.css'

interface RaceSelectorProps {
  onRaceSelected: (raceFile: string) => void
  selectedRace: string | null
}

export default function RaceSelector({ onRaceSelected, selectedRace }: RaceSelectorProps) {
  const { races, loading, error } = useAvailableRaces()
  const [localRaces, setLocalRaces] = useState<RaceFile[]>([])

  // Auto-select first race if none selected and races are available
  useEffect(() => {
    if (!selectedRace && localRaces.length > 0) {
      onRaceSelected(localRaces[0].filename)
    }
  }, [localRaces, selectedRace, onRaceSelected])

  // Try to discover race files by attempting to load them
  useEffect(() => {
    async function discoverRaces() {
      const discoveredRaces: RaceFile[] = []
      
      // Try to load the known race file first
      const knownRace: RaceFile = {
        filename: 'race_data_2023_Bahrain_R.json',
        displayName: '2023 Bahrain Grand Prix (Race)',
        year: 2023,
        grandPrix: 'Bahrain',
        sessionType: 'R'
      }

      // Try to fetch the file to see if it exists and get metadata
      try {
        const response = await fetch(`/${knownRace.filename}`)
        if (response.ok) {
          const data = await response.json()
          // Use metadata from the file if available
          if (data.metadata) {
            discoveredRaces.push({
              filename: knownRace.filename,
              displayName: `${data.metadata.year} ${data.metadata.grand_prix} Grand Prix (${data.metadata.session_type === 'R' ? 'Race' : data.metadata.session_type})`,
              year: data.metadata.year,
              grandPrix: data.metadata.grand_prix,
              sessionType: data.metadata.session_type
            })
          } else {
            discoveredRaces.push(knownRace)
          }
        }
      } catch (err) {
        console.warn('Could not load race file:', err)
      }

      // Try common race file patterns
      const commonGPs = ['Bahrain', 'Saudi Arabia', 'Australia', 'Monaco', 'Silverstone', 'Monza', 'Spa', 'Suzuka']
      const years = [2023, 2024]
      const sessionTypes = ['R', 'Q']

      // Try to discover more races (limit to avoid too many requests)
      for (const year of years) {
        for (const gp of commonGPs.slice(0, 5)) { // Limit to first 5 to avoid too many requests
          for (const sessionType of sessionTypes) {
            const filename = `race_data_${year}_${gp.replace(' ', '_')}_${sessionType}.json`
            // Skip if we already have this one
            if (discoveredRaces.some(r => r.filename === filename)) continue

            try {
              const response = await fetch(`/${filename}`, { method: 'HEAD' })
              if (response.ok) {
                // Try to get metadata
                const dataResponse = await fetch(`/${filename}`)
                if (dataResponse.ok) {
                  const data = await dataResponse.json()
                  if (data.metadata) {
                    discoveredRaces.push({
                      filename,
                      displayName: `${data.metadata.year} ${data.metadata.grand_prix} Grand Prix (${data.metadata.session_type === 'R' ? 'Race' : data.metadata.session_type})`,
                      year: data.metadata.year,
                      grandPrix: data.metadata.grand_prix,
                      sessionType: data.metadata.session_type
                    })
                  }
                }
              }
            } catch (err) {
              // File doesn't exist, skip it
            }
          }
        }
      }

      if (discoveredRaces.length > 0) {
        setLocalRaces(discoveredRaces)
      } else if (races.length > 0) {
        setLocalRaces(races)
      }
    }

    discoverRaces()
  }, [races])

  if (loading) {
    return (
      <div className="race-selector">
        <div className="race-selector-loading">
          <p>Loading available races...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="race-selector">
        <div className="race-selector-error">
          <p>⚠️ {error}</p>
        </div>
      </div>
    )
  }

  const availableRaces = localRaces.length > 0 ? localRaces : races

  if (availableRaces.length === 0) {
    return (
      <div className="race-selector">
        <div className="race-selector-empty">
          <p>No race data available.</p>
          <p className="race-selector-hint">Please process a race using the backend first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="race-selector">
      <h2 className="race-selector-title">Select Race to Replay</h2>
      <div className="race-selector-list">
        {availableRaces.map((race) => (
          <button
            key={race.filename}
            className={`race-selector-item ${selectedRace === race.filename ? 'selected' : ''}`}
            onClick={() => onRaceSelected(race.filename)}
          >
            <div className="race-selector-item-content">
              <div className="race-selector-item-title">{race.displayName}</div>
              {race.year && (
                <div className="race-selector-item-meta">
                  Year: {race.year} | Session: {race.sessionType === 'R' ? 'Race' : race.sessionType}
                </div>
              )}
            </div>
            {selectedRace === race.filename && (
              <div className="race-selector-item-check">✓</div>
            )}
          </button>
        ))}
      </div>
      {selectedRace && (
        <div className="race-selector-selected">
          <p>Selected: <strong>{availableRaces.find(r => r.filename === selectedRace)?.displayName}</strong></p>
        </div>
      )}
    </div>
  )
}

