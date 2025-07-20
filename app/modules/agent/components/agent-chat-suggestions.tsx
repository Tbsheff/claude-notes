import { MessageSquarePlus, Languages, ListTodo, FilePenLine } from 'lucide-react'

interface AgentChatSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void
}

const suggestions = [
  {
    icon: <MessageSquarePlus className="h-3 w-3" />,
    title: 'Add Follow-up Feature',
    description: 'Generate follow-ups from selected text',
    prompt: 'Implement a feature that allows me to select text and generate a follow-up question or summary as a bullet point below the selection.'
  },
  {
    icon: <Languages className="h-3 w-3" />,
    title: 'Add Translate Feature',
    description: 'Translate selected text into any language',
    prompt: 'Implement a feature that allows me to select text and translate it into different languages from a context menu.'
  },
  {
    icon: <ListTodo className="h-3 w-3" />,
    title: 'Add Task List Feature',
    description: 'Manage tasks and generate from content',
    prompt: 'Implement a feature that displays a task list under the header. I want to be able to add tasks manually and also click a "Generate from content" button to create tasks automatically from the document.'
  },
  {
    icon: <FilePenLine className="h-3 w-3" />,
    title: 'Create a document',
    description: 'Draft a new document based on a topic',
    prompt: 'Create a document based on specific topic'
  }
]

export function AgentChatSuggestions({ onSelectSuggestion }: AgentChatSuggestionsProps) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2 max-w-sm">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-2 cursor-pointer hover:bg-accent/30 transition-colors rounded border"
            onClick={() => onSelectSuggestion(suggestion.prompt)}
          >
            <div className="flex items-start gap-2">
              <div className="text-muted-foreground mt-0.5">
                {suggestion.icon}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-medium text-foreground">{suggestion.title}</h4>
                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 