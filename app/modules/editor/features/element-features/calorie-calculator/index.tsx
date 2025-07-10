export { useCalorieCalculator } from './core'
export type { CalorieCalculatorConfig, CalorieData, CalorieCalculatorProps } from './types'

export const calorieCalculatorFeature = {
  config: {
    key: 'calorieCalculator',
    name: 'Calorie Calculator',
    description: 'Calculate calories for dishes using AI',
    enabled: false,
    category: 'element'
  }
}