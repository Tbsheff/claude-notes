import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BuildStatusBadge } from '@/components/ui/build-status-badge'
import { AgentLogToolsView } from '@/app/modules/agent/components/agent-log-view'
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <BuildStatusBadge status="building">{buildStatus}</BuildStatusBadge>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-medium text-foreground">Agent Activity</h4>
        </div>
        
        <ScrollArea className="h-80">
          <AgentLogToolsView events={events} />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 