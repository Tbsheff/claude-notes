import React from 'react'
import { SparkleIcon } from './components/ui/sparkle-icon'

/**
 * Example component showing how to use the SparkleIcon component
 */
export function SparkleIconExample() {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">SparkleIcon Component Examples</h2>
      
      {/* Different sizes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Different Sizes</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SparkleIcon size="sm" />
            <span>Small (sm)</span>
          </div>
          <div className="flex items-center gap-2">
            <SparkleIcon size="default" />
            <span>Default</span>
          </div>
          <div className="flex items-center gap-2">
            <SparkleIcon size="lg" />
            <span>Large (lg)</span>
          </div>
          <div className="flex items-center gap-2">
            <SparkleIcon size="xl" />
            <span>Extra Large (xl)</span>
          </div>
        </div>
      </div>

      {/* Custom colors */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Custom Colors</h3>
        <div className="flex items-center gap-4">
          <SparkleIcon className="text-blue-500" />
          <SparkleIcon className="text-green-500" />
          <SparkleIcon className="text-purple-500" />
          <SparkleIcon className="text-pink-500" />
          <SparkleIcon className="text-yellow-500" />
        </div>
      </div>

      {/* Custom styling */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Custom Styling</h3>
        <div className="flex items-center gap-4">
          <SparkleIcon className="text-blue-500 animate-pulse" />
          <SparkleIcon className="text-purple-500 animate-bounce" />
          <SparkleIcon className="text-pink-500 animate-spin" />
        </div>
      </div>

      {/* Usage in buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Usage in Buttons</h3>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            <SparkleIcon size="sm" />
            Generate
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
            <SparkleIcon size="sm" />
            Enhance
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600">
            <SparkleIcon size="sm" />
            Magic
          </button>
        </div>
      </div>
    </div>
  )
}

export default SparkleIconExample