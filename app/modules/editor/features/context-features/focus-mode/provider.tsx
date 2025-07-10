import React, { createContext, useContext, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FocusModeConfig, FocusModeState, FocusModeContextType } from './types'

class FocusModeCore {
  private config: FocusModeConfig
  private state: FocusModeState
  private intervalId: NodeJS.Timeout | null = null
  private onStateChange?: (state: FocusModeState) => void

  constructor(config: FocusModeConfig) {
    this.config = config
    this.state = {
      isActive: false,
      startTime: null,
      endTime: null,
      remainingTime: config.sessionDuration * 60,
      sessionDuration: config.sessionDuration
    }
  }

  setOnStateChange(callback: (state: FocusModeState) => void): void {
    this.onStateChange = callback
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state)
    }
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  getState(): FocusModeState {
    return this.state
  }

  startSession(duration: number): void {
    if (this.state.isActive) return

    const now = Date.now()
    this.state = {
      isActive: true,
      startTime: now,
      endTime: now + (duration * 60 * 1000),
      remainingTime: duration * 60,
      sessionDuration: duration
    }

    this.startTimer()
    this.notifyStateChange()
  }

  stopSession(): void {
    this.state = {
      ...this.state,
      isActive: false,
      startTime: null,
      endTime: null,
      remainingTime: this.state.sessionDuration * 60
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    this.notifyStateChange()
  }

  private startTimer(): void {
    if (this.intervalId) clearInterval(this.intervalId)
    
    this.intervalId = setInterval(() => {
      if (!this.state.isActive || !this.state.endTime) return
      
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((this.state.endTime - now) / 1000))
      
      if (remaining === 0) {
        this.stopSession()
        return
      }
      
      this.state = { ...this.state, remainingTime: remaining }
      this.notifyStateChange()
    }, 1000)
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  getProgressPercentage(): number {
    if (!this.state.isActive) return 0
    const elapsed = this.state.sessionDuration * 60 - this.state.remainingTime
    return (elapsed / (this.state.sessionDuration * 60)) * 100
  }

  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  renderTimer(): React.ReactElement {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-medium">
          {this.formatTime(this.state.remainingTime)}
        </span>
        <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${this.getProgressPercentage()}%` }}
          />
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => this.stopSession()}
          className="text-xs px-1.5 py-0.5 h-5"
        >
          Stop
        </Button>
      </div>
    )
  }

  renderControls(sessionTime: number, onSessionTimeChange: (time: number) => void): React.ReactElement {
    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || 1
      onSessionTimeChange(Math.max(1, Math.min(180, value)))
    }

    const handleStart = () => {
      this.startSession(sessionTime)
    }
    
    return (
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          value={sessionTime}
          onChange={handleTimeChange}
          min="1"
          max="180"
          className="w-12 h-6 text-xs text-center border-gray-300 dark:border-gray-600 rounded"
          placeholder="25"
        />
        <span className="text-xs text-muted-foreground">min</span>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleStart}
          className="text-xs px-2 py-0.5 h-6"
        >
          Start
        </Button>
      </div>
    )
  }
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined)

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [state, setState] = useState<FocusModeState>({
    isActive: false,
    startTime: null,
    endTime: null,
    remainingTime: 25 * 60,
    sessionDuration: 25
  })
  
  const [core] = useState(() => new FocusModeCore({
    enabled: false,
    sessionDuration: 25,
    showTimer: true
  }))

  useEffect(() => {
    core.setOnStateChange(setState)
    core.setEnabled(enabled)
    setState(core.getState())
    
    return () => {
      core.cleanup()
    }
  }, [enabled, core])

  useEffect(() => {
    let unregister: (() => void) | undefined
    
    import('../../feature-manager').then(({ featureManager }) => {
      unregister = featureManager.registerFeatureHandler('focusMode', (newEnabled) => {
        setEnabled(newEnabled)
      })
    })
    
    return () => {
      if (unregister) {
        unregister()
      }
    }
  }, [])

  const value: FocusModeContextType = {
    enabled,
    state,
    startSession: (duration: number) => core.startSession(duration),
    stopSession: () => core.stopSession(),
    formatTime: (seconds: number) => core.formatTime(seconds),
    getProgressPercentage: () => core.getProgressPercentage(),
    setEnabled,
    renderTimer: () => {
      if (!enabled || !state.isActive) return null
      return core.renderTimer()
    },
    renderControls: (sessionTime: number, onSessionTimeChange: (time: number) => void) => {
      if (!enabled || state.isActive) return null
      return core.renderControls(sessionTime, onSessionTimeChange)
    }
  }

  return (
    <FocusModeContext.Provider value={value}>
      {children}
    </FocusModeContext.Provider>
  )
}

export function useFocusMode() {
  const context = useContext(FocusModeContext)
  
  if (!context) {
    throw new Error('useFocusMode must be used within a FocusModeProvider')
  }
  
  return context
}