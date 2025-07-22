export const FOLLOW_UP_PROMPT_DOCUMENTATION = `
/*
FEATURE: Follow-up

This feature allows users to select text and generate a follow-up question or summary, which is then inserted as a bullet point below the selection.

Core files:
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/types.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/prompts.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/core.tsx
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/index.tsx

Integration files:
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/registry.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/components/editor-toolbar.tsx
*/

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/types.ts
import { EditorContext } from '../../api';

export interface FollowUpState {
  isProcessing: boolean;
}

export interface FollowUpFeature {
  isAvailable: boolean;
  state: FollowUpState;
  renderFollowUpButton: (context: EditorContext) => React.ReactElement;
}

export interface FollowUpConfig {
  enabled: boolean;
  onStateChange?: (state: FollowUpState) => void;
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/prompts.ts
export const FOLLOW_UP_PROMPT = (text: string) => \`
Based on the following text, generate a concise follow-up question or a short summary.
The goal is to continue the conversation or thought process.
Do not add any extra comments or introductions, only the generated text.

Text:
---
\${text}
---
\`
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/core.tsx
import React from 'react'
import { MessageSquarePlus, Loader2 } from 'lucide-react'
// Note: FollowUpConfig, FollowUpState, FOLLOW_UP_PROMPT are imported

export class FollowUpCore {
  private config: FollowUpConfig;
  private state: FollowUpState;
  private onStateChange?: (state: FollowUpState) => void;

  constructor(config: FollowUpConfig) {
    this.config = config;
    this.state = { isProcessing: false };
    this.onStateChange = config.onStateChange;
  }

  private setState(newState: Partial<FollowUpState>) {
    this.state = { ...this.state, ...newState };
    this.onStateChange?.(this.state);
  }

  get isAvailable(): boolean {
    return this.config.enabled;
  }

  async _processText(text: string): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.isAvailable) {
      return { success: false, error: 'Feature not enabled' };
    }

    this.setState({ isProcessing: true });

    try {
      const response = await window.electronAPI.llmCall(
        [{ role: 'user', content: FOLLOW_UP_PROMPT(text) }]
      );

      if (response.success && response.content) {
        return { success: true, content: response.content.trim() };
      } else {
        alert('Follow-up request failed: ' + (response.error || 'Unknown error'));
        return { success: false, error: response.error || 'Unknown error' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      alert('Follow-up request failed: ' + errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  renderFollowUpButton(
    onClick: () => void,
    isProcessing: boolean
  ): React.ReactElement {
    return (
      <div
        onClick={onClick}
        className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageSquarePlus className="h-4 w-4" />
        )}
        Follow-up
      </div>
    );
  }
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/follow-up/index.tsx
import React from 'react'
// Note: FollowUpCore, FollowUpFeature, FollowUpState, EditorContext are imported

export function useFollowUp(enabled: boolean): Omit<FollowUpFeature, 'state'> {
  const [state, setState] = React.useState<FollowUpState>({ isProcessing: false })

  const core = React.useMemo(() => {
    return new FollowUpCore({
      enabled,
      onStateChange: setState,
    })
  }, [enabled])

  const handleFollowUp = async (context: EditorContext) => {
    const { editorRef, setContent, setShowMenu } = context
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return

    const selectedText = selection.toString()
    if (!selectedText) return

    const result = await core._processText(selectedText)
    if (result.success && result.content) {
      const range = selection.getRangeAt(0)
      range.collapse(false)

      const list = document.createElement('ul')
      const listItem = document.createElement('li')
      listItem.textContent = result.content.trim()
      list.appendChild(listItem)
      
      range.insertNode(list)

      const newRange = document.createRange()
      newRange.setStartAfter(list)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)
      
      if (editorRef.current) {
        editorRef.current.focus()
        setContent(editorRef.current.innerHTML)
      }
    }
    setShowMenu(false)
  }

  const renderFollowUpButton = React.useCallback(
    (context: EditorContext) => {
      return core.renderFollowUpButton(() => handleFollowUp(context), state.isProcessing);
    },
    [core, state.isProcessing]
  )

  return {
    isAvailable: enabled,
    renderFollowUpButton,
  }
}

export const followUpFeature = {
  config: {
    key: 'followUp',
    name: 'Follow-up Generator',
    description: 'Generate a follow-up question or summary from selected text.',
    enabled: true,
    category: 'content',
  },
  useFeature: useFollowUp,
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/registry.ts
import { followUpFeature } from './follow-up/index'

export const features = [
  // ... other features
  followUpFeature,
]
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/components/editor-toolbar.tsx
import { useFollowUp } from '../features/follow-up'

export function SelectionToolbar(props) {
  const [followUpEnabled] = useFeatureState('followUp')
  const followUp = useFollowUp(followUpEnabled)
  const editorContext = { /* ... */ }

  return (
    // ...
    {followUpEnabled && <div className="bg-border -mx-1 my-1 h-px" />}
    {followUpEnabled && followUp.renderFollowUpButton(editorContext)}
    // ...
  )
}
// END FILE
`; 