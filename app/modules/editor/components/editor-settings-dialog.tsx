
import { Settings, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
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
  const [showApiKey, setShowApiKey] = useState(false)
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
          <MoreHorizontal className="h-3.5 w-3.5" />
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
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-ant-..."
                      value={apiKeys.anthropicApiKey || ''}
                      onChange={(e) => handleApiKeyChange('anthropicApiKey', e.target.value)}
                      className="pr-10"
                      autoFocus={false}
                      tabIndex={-1}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
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

          <div className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Shortcuts</h3>
            <ul className="space-y-2">
              <li className="flex items-center justify-between px-2 py-1">
                <span className="text-sm">Toggle Sidebar</span>
                <kbd className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">⌘ + /</kbd>
              </li>
              <li className="flex items-center justify-between px-2 py-1">
                <span className="text-sm">Toggle AI Chat</span>
                <kbd className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">⌘ + K</kbd>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 