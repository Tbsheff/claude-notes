import React from 'react'

export interface FocusModeConfig {
  enabled: boolean
  sessionDuration: number
  showTimer: boolean
}

export interface FocusModeState {
  isActive: boolean
  startTime: number | null
  endTime: number | null
  remainingTime: number
  sessionDuration: number
}

export interface FocusModeContextType {
  enabled: boolean
  state: FocusModeState
  startSession: (duration: number) => void
  stopSession: () => void
  formatTime: (seconds: number) => string
  getProgressPercentage: () => number
  setEnabled: (enabled: boolean) => void
  renderTimer: () => React.ReactElement | null
  renderControls: (sessionTime: number, onSessionTimeChange: (time: number) => void) => React.ReactElement | null
} 