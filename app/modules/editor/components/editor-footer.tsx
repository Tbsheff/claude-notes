
import { stripHtmlTags } from '@/lib/utils'
import { useTextStats } from '../features/show-word-count'
import { useFeatureState } from '../features/feature-manager'

interface NoteEditorFooterProps {
  content: string
}

export function NoteEditorFooter({ content }: NoteEditorFooterProps) {
  const [showWordCount] = useFeatureState('showWordCount')
  
  const textStats = useTextStats(content, showWordCount)

  if (!showWordCount) return null

  return (
    <div className="border-t border-border px-6 py-2 bg-background">
      <div className="flex items-center justify-between">
        <div>
          {textStats.renderWords()}
        </div>
      </div>
    </div>
  )
} 