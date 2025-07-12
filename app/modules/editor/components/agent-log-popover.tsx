import React, { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentLogToolsView } from '@/app/modules/agent/main'
import { ClaudeEvent } from '@/lib/ai/agent/types'

interface AgentLogPopoverProps {
  buildStatus: string
}

export function AgentLogPopover({ buildStatus }: AgentLogPopoverProps) {
  const [events, setEvents] = useState<ClaudeEvent[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [_hasNewEvents, setHasNewEvents] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    const handleAgentEvent = (_event: any, agentEvent: ClaudeEvent) => {
      setEvents(prev => [...prev, agentEvent])
      setHasNewEvents(true)
      
      if (agentEvent.type === 'start') {
        setIsOpen(true)
      }
      
      if (agentEvent.type === 'complete' || agentEvent.type === 'error') {
        setTimeout(() => {
          setIsOpen(false)
          setEvents([])
          setHasNewEvents(false)
        }, 3000)
      }
    }

    window.electronAPI.ipcRenderer.on('claude-event', handleAgentEvent)

    return () => {
      window.electronAPI.ipcRenderer.removeListener('claude-event', handleAgentEvent)
    }
  }, [])

  const clearEvents = () => {
    setEvents([])
    setHasNewEvents(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="flex items-center space-x-2 hover:bg-blue-50 transition-colors"
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{buildStatus}</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Agent Activity</h4>
            {events.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearEvents}
                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-80">
          <AgentLogToolsView events={events} />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 