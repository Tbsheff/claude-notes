export const TEXT_TRANSLATOR_PROMPT = `
/*
FEATURE: Text Translator

This feature allows users to select text in the editor and translate it to a different language using an AI model.

Core files:
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/types.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/prompts.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/core.tsx
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/index.tsx

Integration files:
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/registry.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/components/editor-toolbar.tsx
*/

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/api/types.ts
export interface EditorContext {
  editorRef: React.RefObject<HTMLDivElement | null>
  setContent: (content: string) => void
  setShowMenu: (show: boolean) => void
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/types.ts
import { EditorContext } from '../../api';

export interface TextTranslatorState {
  isProcessing: boolean;
}

export interface TextTranslatorFeature {
  isAvailable: boolean;
  renderTranslateButton: (context: EditorContext) => React.ReactElement;
}

export interface TextTranslatorConfig {
  enabled: boolean;
  onStateChange?: (state: TextTranslatorState) => void;
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/prompts.ts
export const TRANSLATE_PROMPT = (text: string, targetLanguage: string) => \`
Translate the following text to \${targetLanguage}. Do not add any extra comments or introductions, only the translated text.
Text to translate:
---
\${text}
---
\`
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/core.tsx
import React from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Languages, Loader2 } from 'lucide-react'
// Note: Imports for types and prompts are managed internally

export class TextTranslatorCore {
  private config: TextTranslatorConfig;

  constructor(config: TextTranslatorConfig) {
    this.config = config;
  }

  get isAvailable(): boolean {
    return this.config.enabled;
  }

  async _processText(text: string, targetLanguage: string): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.isAvailable) {
      return { success: false, error: 'Feature not enabled' };
    }
    // Logic for setState is handled in the hook
    try {
      const response = await window.electronAPI.llmCall(
        [
          { role: 'user', content: TRANSLATE_PROMPT(text, targetLanguage) },
        ]
      );

      if (response.success && response.content) {
        return { success: true, content: response.content.trim() };
      } else {
        alert('Translate request failed: ' + (response.error || 'Unknown error'));
        return { success: false, error: response.error || 'Unknown error' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      alert('Translate request failed: ' + errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  renderTranslateButton(
    onClick: (language: string) => void,
    isProcessing: boolean
  ): React.ReactElement {
    const SUPPORTED_LANGUAGES = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
    ]
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
            Translate
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {SUPPORTED_LANGUAGES.map(lang => (
            <DropdownMenuItem key={lang.code} onSelect={() => onClick(lang.name)} disabled={isProcessing}>
              {lang.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/text-translator/index.tsx
import React from 'react'
// Note: Other imports are managed internally

export function useTextTranslator(enabled: boolean): Omit<TextTranslatorFeature, 'state'> {
  const [state, setState] = React.useState<TextTranslatorState>({ isProcessing: false })

  const core = React.useMemo(() => {
    return new TextTranslatorCore({
      enabled,
      onStateChange: setState,
    })
  }, [enabled])

  const handleTranslate = async (language: string, context: EditorContext) => {
    const { editorRef, setContent, setShowMenu } = context
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString()
    if (!selectedText) return

    setState({ isProcessing: true });
    const result = await core._processText(selectedText, language)
    setState({ isProcessing: false });

    if (result.success && result.content) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const textNode = document.createTextNode(result.content.trim())
      range.insertNode(textNode)
      
      if (editorRef.current) {
        editorRef.current.focus()
        setContent(editorRef.current.innerHTML)
      }
    }
    setShowMenu(false)
  }

  const renderTranslateButton = React.useCallback(
    (context: EditorContext) => {
      const handleClick = (language: string) => handleTranslate(language, context);
      return core.renderTranslateButton(handleClick, state.isProcessing);
    },
    [core, state.isProcessing]
  )

  return {
    isAvailable: enabled,
    renderTranslateButton,
  }
}

export const textTranslatorFeature = {
  config: {
    key: 'textTranslator',
    name: 'Text Translator',
    description: 'Translate selected text to different languages.',
    enabled: true,
    category: 'content',
  },
  useFeature: useTextTranslator,
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/registry.ts
import { textTranslatorFeature } from './text-translator/index'

export const features = [
  // ... other features
  textTranslatorFeature,
]
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/components/editor-toolbar.tsx
import { useTextTranslator } from '../features/text-translator'

export function SelectionToolbar(props) {
  const [textTranslatorEnabled] = useFeatureState('textTranslator')
  const textTranslator = useTextTranslator(textTranslatorEnabled)
  const editorContext = { /* ... */ }

  return (
    // ...
    {textTranslatorEnabled && <div className="bg-border -mx-1 my-1 h-px" />}
    {textTranslatorEnabled && textTranslator.renderTranslateButton(editorContext)}
    // ...
  )
}
// END FILE
`;