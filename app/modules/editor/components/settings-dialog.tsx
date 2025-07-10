import React, { useState, useEffect } from 'react'
import { Settings, Moon, Sun, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { getAllFeatures } from '../features/registry'
import { useTheme } from '@/lib/providers/theme-provider'
import { useAllFeatures, featureManager } from '../features/feature-manager'

export function SettingsDialog() {
  const { theme, toggleTheme } = useTheme()
  const featureStates = useAllFeatures()
  const features = getAllFeatures()

  const handleFeatureToggle = (key: string, enabled: boolean) => {
    featureManager.setState(key, enabled)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Appearance</h3>
            <div className="flex items-center justify-between space-x-4 p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Dark Mode
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Switch to dark theme</div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Features</h3>
            <div className="space-y-4">
              {features.map((feature) => (
                <div key={feature.key} className="flex items-center justify-between space-x-4 p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">{feature.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{feature.description}</div>
                  </div>
                  <Switch
                    checked={featureStates[feature.key] ?? feature.enabled}
                    onCheckedChange={(checked) => handleFeatureToggle(feature.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 