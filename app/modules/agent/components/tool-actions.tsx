import React, { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { TreeToolActionProps, CollapseToolActionProps } from '@/app/modules/agent/api/types'
import { getShortLabel } from '@/app/modules/agent/utils'

export const TreeToolAction = ({ event, icon, label, toolResults }: TreeToolActionProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const content = event.message.replace(`${label}: `, '')
  const result = event.tool_use_id ? toolResults[event.tool_use_id] : null
  const hasResult = !!result
  
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        className={`px-3 py-1.5 flex items-center gap-2 text-sm ${hasResult ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
        onClick={() => hasResult && setIsExpanded(!isExpanded)}
      >
        {hasResult ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
          )
        ) : (
          <div className="w-3 h-3 flex-shrink-0" />
        )}
        <div className="h-3 w-3 flex-shrink-0">{icon}</div>
        <span className="text-gray-700 text-sm">{getShortLabel(label, content)}</span>
      </div>
      
      {isExpanded && (
        <div className="px-6 pb-2 bg-gray-50">
          <div className="text-xs text-gray-600 font-mono mb-2">{content}</div>
          {result && (
            <div className="flex items-start gap-2">
              {result.is_error ? (
                <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 font-mono break-words max-w-full overflow-hidden whitespace-pre-wrap">
                  {result.message}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const CollapseToolAction = ({ event, icon, title, children }: CollapseToolActionProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        className="py-2 px-3 flex items-center gap-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-gray-400" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-400" />
        )}
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800">{title}</div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="pb-3 px-8">
          {children}
        </div>
      )}
    </div>
  )
} 