import { TreeToolActionProps, CollapseToolActionProps, getShortLabel } from '../api/types'

export const TreeToolAction = ({ event, icon, label }: TreeToolActionProps) => {
  const content = event.message.replace(`${label}: `, '')
  
  return (
    <div className="border-b border-border last:border-0">
      <div className="px-3 py-1.5 flex items-center gap-2 text-sm">
        <div className="h-3 w-3 flex-shrink-0">{icon}</div>
        <span className="text-muted-foreground text-sm">{getShortLabel(label, content)}</span>
      </div>
    </div>
  )
}

export const CollapseToolAction = ({ icon, title }: CollapseToolActionProps) => {
  return (
    <div className="border-b border-border last:border-0">
      <div className="py-2 px-3 flex items-center gap-2">
        <div className="h-3 w-3 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground">{title}</div>
        </div>
      </div>
    </div>
  )
} 