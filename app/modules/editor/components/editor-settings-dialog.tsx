
import { Settings, Moon, Sun, MoreHorizontal, Key, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { getAllFeatures } from '../features/registry'
import { useTheme } from '@/lib/providers/theme-provider'
import { useAllFeatures, featureManager } from '../features/feature-manager'
import { useState, useEffect, useRef } from 'react'
import { AppSettings, APIKeysSettings } from '@/app/modules/editor/api'

export function SettingsDialog() {
  const { theme, toggleTheme } = useTheme()
  const featureStates = useAllFeatures()
  const features = getAllFeatures()
  
  const [apiKeys, setApiKeys] = useState<APIKeysSettings>({})
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.blur()
      }, 50)
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const result = await window.electronAPI.settings.load()
      if (result.success && result.settings) {
        setApiKeys(result.settings.apiKeys || {})
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveSettings = async () => {
    setIsLoading(true)
    setSaveStatus('saving')
    
    try {
      const settings: AppSettings = {
        apiKeys: {
          anthropicApiKey: apiKeys.anthropicApiKey || ''
        },
        theme,
        features: featureStates
      }
      
      const result = await window.electronAPI.settings.save(settings)
      if (result.success) {
        if (apiKeys.anthropicApiKey) {
          const initResult = await window.electronAPI.ai.initialize({})
          if (initResult.success) {
            console.log('🔧 AI Agent reinitialized with new API key')
            window.dispatchEvent(new CustomEvent('ai-reinitialized'))
          } else {
            console.error('Failed to reinitialize AI agent:', initResult.error)
          }
        }
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeatureToggle = (key: string, enabled: boolean) => {
    featureManager.setState(key, enabled)
  }

  const handleApiKeyChange = (key: keyof APIKeysSettings, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleDeleteApiKey = async () => {
    setApiKeys(prev => ({
      ...prev,
      anthropicApiKey: ''
    }))
    
    try {
      const settings: AppSettings = {
        apiKeys: { anthropicApiKey: '' },
        theme,
        features: featureStates
      }
      
      const result = await window.electronAPI.settings.save(settings)
      if (result.success) {
        console.log('🔧 API key deleted from settings')
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const isAnthropicRequired = !apiKeys.anthropicApiKey

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="!gap-2 !mb-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* API Keys Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-4">
              API Keys
            </h3>
            
            <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex-1 space-y-2">
                <div className="text-sm font-medium">Anthropic API Key</div>
                <div className="text-xs text-muted-foreground">
                  Required for AI agent functionality. Get your key from{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    Anthropic Console
                  </a>
                </div>
                <div className="flex gap-2 items-center mt-3">
                  <Input
                    ref={inputRef}
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKeys.anthropicApiKey || ''}
                    onChange={(e) => handleApiKeyChange('anthropicApiKey', e.target.value)}
                    className="flex-1"
                    autoFocus={false}
                    tabIndex={-1}
                  />
                  <Button 
                    onClick={saveSettings} 
                    disabled={isLoading}
                    variant={saveStatus === 'saved' ? 'default' : 'outline'}
                    size="sm"
                  >
                    {isLoading ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
                  </Button>
                  {apiKeys.anthropicApiKey && (
                    <Button 
                      onClick={handleDeleteApiKey}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-4">Appearance</h3>
            <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium">
                  Dark Mode
                </div>
                <div className="text-xs text-muted-foreground">Switch to dark theme</div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>
          
          {/* Features Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-4">Features</h3>
            <div className="flex flex-col gap-4">
              {features.map((feature) => (
                <div key={feature.key} className="flex items-center justify-between space-x-4 p-4 rounded-lg border bg-muted/50">
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">{feature.name}</div>
                    <div className="text-xs text-muted-foreground">{feature.description}</div>
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