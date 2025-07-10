import React from 'react'

export interface CalorieCalculatorConfig {
  enabled: boolean
}

export interface CalorieData {
  totalCalories: number
  dishes: string[]
  isCalculating: boolean
  lastCalculated: number
}

export interface CalorieCalculatorProps {
  content: string
  enabled: boolean
}

export interface CalorieCalculatorContextType {
  calculateCalories: (dishes: string[]) => Promise<number>
  renderCalories: () => React.ReactElement | null
}