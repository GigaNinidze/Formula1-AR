import { ARButton } from 'ratk'
import { useRaceData } from '../hooks/useRaceData'
import { useState, useRef, useEffect } from 'react'
import type * as THREE from 'three'
import RaceSelector from './RaceSelector'
import './UI.css'

interface UIProps {
  renderer: THREE.WebGLRenderer | null
  selectedRace: string | null
  onRaceSelected: (raceFile: string) => void
}

export default function UI({ renderer, selectedRace, onRaceSelected }: UIProps) {
  const [arStatus, setArStatus] = useState<'unsupported' | 'exited' | 'entered'>('exited')
  const [sessionActive, setSessionActive] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const selectedRaceRef = useRef<string | null>(selectedRace)
  const { loading, error, progress } = useRaceData(selectedRace)

  // Keep ref in sync with selectedRace
  useEffect(() => {
    selectedRaceRef.current = selectedRace
  }, [selectedRace])

  // Check WebXR support
  const isSupported = typeof navigator !== 'undefined' && navigator.xr !== undefined


  // Initialize RATK ARButton when renderer is available
  useEffect(() => {
    console.log('🔍 ARButton setup check:', { 
      renderer: !!renderer, 
      button: !!buttonRef.current, 
      isSupported,
      rendererXR: renderer?.xr ? 'exists' : 'missing',
      rendererXREnabled: renderer?.xr?.enabled,
      alreadySetup: !!(buttonRef.current as any)?.__ratkSetup
    })
    
    if (!renderer || !buttonRef.current || !isSupported) {
      return
    }

    // Don't re-initialize if already set up
    if ((buttonRef.current as any)?.__ratkSetup) {
      console.log('⏭️ RATK ARButton already initialized, skipping...')
      return
    }

    console.log('🔧 Setting up RATK ARButton...')
    console.log('🔧 Renderer:', renderer)
    console.log('🔧 Renderer.xr:', renderer.xr)
    console.log('🔧 Renderer.xr.enabled:', renderer.xr.enabled)
    console.log('🔧 ARButton:', ARButton)
    console.log('🔧 ARButton methods:', Object.getOwnPropertyNames(ARButton))
    console.log('🔧 ARButton.convertToARButton:', typeof ARButton.convertToARButton)

    try {
      // Ensure button is enabled when setting up RATK
      // RATK needs to attach event listeners, which might not work on disabled buttons
      buttonRef.current.disabled = false
      
      // Check if convertToARButton exists
      if (typeof ARButton.convertToARButton === 'function') {
        ARButton.convertToARButton(
          buttonRef.current,
          renderer,
          {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['hit-test', 'hand-tracking'],
            onSessionStarted: (session: XRSession) => {
              // Check if a race is selected before allowing AR session
              if (!selectedRaceRef.current) {
                console.warn('⚠️ No race selected, ending AR session')
                session.end()
                alert('Please select a race before entering AR')
                return
              }
              console.log('✅ AR session started via RATK!', session)
              setSessionActive(true)
              setArStatus('entered')
            },
            onSessionEnded: (session: XRSession) => {
              console.log('🔴 AR session ended', session)
              setSessionActive(false)
              setArStatus('exited')
            },
            onSupported: () => {
              console.log('✅ AR is supported')
            },
            onUnsupported: () => {
              console.warn('❌ AR is not supported')
              setArStatus('unsupported')
            },
            onFeaturesUnsupported: (reason: string) => {
              console.error('❌ Required features unsupported:', reason)
              alert(`AR features not supported: ${reason}`)
            },
            onNotAllowed: (exception: DOMException) => {
              console.error('❌ AR access not allowed:', exception)
              alert(`AR access denied: ${exception.message}`)
            },
            ENTER_XR_TEXT: '🥽 Enter AR',
            LEAVE_XR_TEXT: '🥽 Exit AR',
            XR_NOT_SUPPORTED_TEXT: 'AR Not Supported',
            XR_NOT_ALLOWED_TEXT: 'AR Access Denied'
          }
        )
        
        // Don't restore disabled state - let RATK manage it
        // RATK will disable the button if AR is not supported
        // We'll check for selectedRace in the onSessionStarted callback
        
        // Mark button as set up by RATK
        ;(buttonRef.current as any).__ratkSetup = true
        
        // Verify the button has event listeners
        console.log('✅ RATK ARButton initialized successfully')
        console.log('🔍 Button after RATK setup:', {
          disabled: buttonRef.current.disabled,
          hasOnClick: !!(buttonRef.current as any).onclick,
          className: buttonRef.current.className
        })
      } else {
        console.error('❌ ARButton.convertToARButton not found - RATK may not be properly installed')
        alert('AR button setup failed. Please ensure RATK is properly installed.')
      }
    } catch (err) {
      console.error('❌ Failed to initialize RATK ARButton:', err)
    }
  }, [renderer, isSupported])

  // Listen to XR session events
  useEffect(() => {
    if (!renderer || !renderer.xr) return

    const handleSessionStart = () => {
      console.log('🎉 AR session started!')
      setSessionActive(true)
      setArStatus('entered')
    }

    const handleSessionEnd = () => {
      console.log('🔴 AR session ended')
      setSessionActive(false)
      setArStatus('exited')
    }

    renderer.xr.addEventListener('sessionstart', handleSessionStart)
    renderer.xr.addEventListener('sessionend', handleSessionEnd)

    return () => {
      renderer.xr.removeEventListener('sessionstart', handleSessionStart)
      renderer.xr.removeEventListener('sessionend', handleSessionEnd)
    }
  }, [renderer])

  const isPresenting = sessionActive || arStatus === 'entered'

  // Don't show any UI when in AR - controls are in AR scene
  if (isPresenting) {
    return null
  }

  // Show entry UI when not in AR
  if (!isPresenting) {
    return (
      <div className="ui-overlay">
        <div className="ui-container">
          <h1>AR-F1</h1>
          <p className="ui-subtitle">Formula 1 Race Replay in Augmented Reality</p>
          
          {/* Race Selection - always show */}
          <RaceSelector 
            onRaceSelected={onRaceSelected}
            selectedRace={selectedRace}
          />

          {loading && selectedRace && (
            <div className="ui-loading">
              <p>Loading race data...</p>
              <div className="ui-progress-container">
                <div className="ui-progress-bar">
                  <div 
                    className="ui-progress-fill" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="ui-progress-text">{progress}%</span>
              </div>
              <p className="ui-progress-status">
                {progress < 98 ? 'Downloading telemetry data...' : 'Parsing race data...'}
              </p>
            </div>
          )}

          {error && selectedRace && (
            <div className="ui-error">
              <p>Error loading race data</p>
              <p className="ui-hint">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {!selectedRace && (
                <div className="ui-warning" style={{ marginTop: '1rem' }}>
                  <p>Please select a race above to continue</p>
                </div>
              )}

              {!isSupported && (
                <div className="ui-warning">
                  <p>WebXR not supported. Please use Meta Quest 3 browser.</p>
                </div>
              )}
              
              <button
                ref={buttonRef}
                className="ui-button ui-button-enter-ar"
                // Don't manually disable - let RATK manage disabled state based on AR support
                // We'll check for selectedRace in onSessionStarted callback
                style={{ 
                  opacity: (!selectedRace || loading) ? 0.5 : 1,
                  cursor: (!selectedRace || loading) ? 'not-allowed' : 'pointer'
                }}
                onClick={() => {
                  console.log('🔘 Button clicked manually', {
                    hasRATKSetup: !!(buttonRef.current as any)?.__ratkSetup,
                    selectedRace: selectedRaceRef.current,
                    isSupported,
                    hasRenderer: !!renderer,
                    buttonDisabled: buttonRef.current?.disabled
                  })
                  
                  // If RATK didn't set up or button is disabled, try manual session creation
                  if (!(buttonRef.current as any)?.__ratkSetup || buttonRef.current?.disabled) {
                    console.log('⚠️ RATK not properly set up, trying manual session creation...')
                    if (!selectedRaceRef.current) {
                      alert('Please select a race before entering AR')
                      return
                    }
                    if (!renderer || !isSupported) {
                      alert('AR is not supported or renderer is not ready')
                      return
                    }
                    
                    // Try manual session creation as fallback
                    if (navigator.xr) {
                      navigator.xr.requestSession('immersive-ar', {
                        requiredFeatures: ['local-floor'],
                        optionalFeatures: ['hit-test', 'hand-tracking']
                      }).then((session) => {
                        console.log('✅ AR session started manually!', session)
                        renderer.xr.setSession(session)
                        setSessionActive(true)
                        setArStatus('entered')
                      }).catch((err) => {
                        console.error('❌ Failed to start AR session manually:', err)
                        alert(`Failed to start AR: ${err.message}`)
                      })
                    }
                  }
                }}
              >
                {sessionActive ? 'Exit AR' : 'Enter AR'}
              </button>
              
              <div className="ui-instructions">
                <p className="ui-hint">Instructions</p>
                <ol className="ui-steps">
                  <li>Select a race from the list above</li>
                  <li>Put on your Meta Quest 3 headset</li>
                  <li>Click "Enter AR" button</li>
                  <li>The track will appear automatically in front of you at eye level</li>
                  <li>Point your controller at the buttons below the track and press trigger to control the race</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // This should never be reached, but TypeScript needs it
  return null
}
