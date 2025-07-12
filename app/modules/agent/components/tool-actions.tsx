
import { TreeToolActionProps, CollapseToolActionProps } from '@/app/modules/agent/api/types'
import { getShortLabel } from '@/app/modules/agent/utils'

export const TreeToolAction = ({ event, icon, label }: TreeToolActionProps) => {
  const content = event.message.replace(`${label}: `, '')
  
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="px-3 py-1.5 flex items-center gap-2 text-sm">
        <div className="h-3 w-3 flex-shrink-0">{icon}</div>
        <span className="text-gray-700 text-sm">{getShortLabel(label, content)}</span>
      </div>
    </div>
  )
}

export const CollapseToolAction = ({ icon, title }: CollapseToolActionProps) => {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="py-2 px-3 flex items-center gap-2">
        <div className="h-3 w-3 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-800">{title}</div>
        </div>
      </div>
    </div>
  )
} 