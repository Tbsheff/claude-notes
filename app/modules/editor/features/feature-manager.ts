import { getAllFeatures } from './registry'

type FeatureState = Record<string, boolean>
type FeatureListener = (key: string, enabled: boolean) => void

class FeatureManager {
  private state: FeatureState = {}
  private listeners: FeatureListener[] = []
  private initialized = false

  constructor() {
  }

  private initialize() {
    if (this.initialized) return
    
    try {
      const features = getAllFeatures()
      features.forEach(feature => {
        this.state[feature.key] = feature.enabled
      })
      this.initialized = true
    } catch (error) {
      console.warn('Feature manager initialization delayed due to circular import')
    }
  }

  getState(key: string): boolean {
    this.initialize()
    return this.state[key] ?? false
  }

  setState(key: string, enabled: boolean): void {
    this.initialize()
    if (this.state[key] !== enabled) {
      this.state[key] = enabled
      this.notifyListeners(key, enabled)
    }
  }

  subscribe(listener: FeatureListener): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(key: string, enabled: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(key, enabled)
      } catch (error) {
        console.error('Feature listener error:', error)
      }
    })
  }

  getAllStates(): FeatureState {
    this.initialize()
    return { ...this.state }
  }

  registerFeatureHandler(key: string, handler: (enabled: boolean) => void): () => void {
    const listener: FeatureListener = (featureKey, enabled) => {
      if (featureKey === key) {
        handler(enabled)
      }
    }
    
    this.listeners.push(listener)
    
    handler(this.getState(key))
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
}

export const featureManager = new FeatureManager()

import { useState, useEffect } from 'react'

export function useFeatureState(key: string): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(() => featureManager.getState(key))

  useEffect(() => {
    const unsubscribe = featureManager.subscribe((featureKey, featureEnabled) => {
      if (featureKey === key) {
        setEnabled(featureEnabled)
      }
    })

    return unsubscribe
  }, [key])

  const setFeatureEnabled = (newEnabled: boolean) => {
    featureManager.setState(key, newEnabled)
  }

  return [enabled, setFeatureEnabled]
}

export function useAllFeatures() {
  const [states, setStates] = useState(() => featureManager.getAllStates())

  useEffect(() => {
    const unsubscribe = featureManager.subscribe(() => {
      setStates(featureManager.getAllStates())
    })

    return unsubscribe
  }, [])

  return states
} 