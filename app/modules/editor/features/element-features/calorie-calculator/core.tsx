import React, { useState, useEffect, useCallback } from 'react'
import { CalorieCalculatorConfig, CalorieData } from './types'

export class CalorieCalculatorCore {
  private config: CalorieCalculatorConfig

  constructor(config: CalorieCalculatorConfig) {
    this.config = config
  }

  async calculateCalories(dishes: string[]): Promise<number> {
    if (!dishes.length) return 0
    
    try {
      // Use electron's exposed API for LLM calls
      const response = await (window as any).electronAPI.llmCall([
        {
          role: 'system',
          content: `You are a nutrition expert. Calculate the approximate total calories for the given dishes. 
          Consider typical serving sizes and ingredients. Return ONLY the total number as an integer, no explanations.
          If you cannot determine calories, return 0.`
        },
        {
          role: 'user',
          content: `Calculate total calories for these dishes: ${dishes.join(', ')}`
        }
      ])

      if (response.success && response.content) {
        const calories = parseInt(response.content.trim())
        return isNaN(calories) ? 0 : calories
      }
      
      return 0
    } catch (error) {
      console.error('Error calculating calories:', error)
      return 0
    }
  }

  renderCalories(calorieData: CalorieData): React.ReactElement | null {
    if (!this.config.enabled) return null

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {calorieData.isCalculating ? (
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            Calculating...
          </span>
        ) : (
          <span className="flex items-center gap-1">
            🍽️ {calorieData.totalCalories} cal
          </span>
        )}
      </div>
    )
  }
}

export function useCalorieCalculator(content: string, enabled: boolean) {
  const [calorieData, setCalorieData] = useState<CalorieData>({
    totalCalories: 0,
    dishes: [],
    isCalculating: false,
    lastCalculated: 0
  })

  const core = new CalorieCalculatorCore({ enabled })

  const extractDishes = useCallback((text: string): string[] => {
    if (!text.trim()) return []
    
    // Simple extraction - look for lines that might be dish names
    // This can be improved with more sophisticated parsing
    const lines = text.split('\n').filter(line => line.trim())
    const dishes: string[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      // Skip very short lines, lines with only numbers, or lines that look like notes
      if (trimmedLine.length < 3 || /^\d+$/.test(trimmedLine) || trimmedLine.startsWith('#')) {
        continue
      }
      
      // Look for food-related patterns
      if (trimmedLine.length < 100) { // Reasonable dish name length
        dishes.push(trimmedLine)
      }
    }
    
    return dishes.slice(0, 10) // Limit to 10 dishes to avoid too many API calls
  }, [])

  const calculateCalories = useCallback(async (dishes: string[]): Promise<number> => {
    if (!enabled || !dishes.length) return 0
    
    setCalorieData(prev => ({ ...prev, isCalculating: true }))
    
    try {
      const calories = await core.calculateCalories(dishes)
      const now = Date.now()
      
      setCalorieData(prev => ({
        ...prev,
        totalCalories: calories,
        dishes,
        isCalculating: false,
        lastCalculated: now
      }))
      
      return calories
    } catch (error) {
      setCalorieData(prev => ({ ...prev, isCalculating: false }))
      return 0
    }
  }, [enabled, core])

  // Auto-calculate when content changes
  useEffect(() => {
    if (!enabled) return

    const dishes = extractDishes(content)
    const dishesChanged = JSON.stringify(dishes) !== JSON.stringify(calorieData.dishes)
    
    if (dishesChanged && dishes.length > 0) {
      // Debounce calculation
      const timeoutId = setTimeout(() => {
        calculateCalories(dishes)
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    } else if (dishes.length === 0) {
      // Clear calories if no dishes
      setCalorieData(prev => ({ ...prev, totalCalories: 0, dishes: [] }))
    }
  }, [content, enabled, extractDishes, calculateCalories])

  return {
    calorieData,
    calculateCalories,
    renderCalories: () => core.renderCalories(calorieData)
  }
}