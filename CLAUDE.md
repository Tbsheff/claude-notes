# Claude Code SDK - Components & Features

## UI Components Structure

```
components/
└── ui/
    ├── button.tsx      # Button component with variants
    ├── card.tsx        # Card container component
    ├── input.tsx       # Input field component
    ├── scroll-area.tsx # Scrollable area component
    ├── separator.tsx   # Visual separator component
    └── textarea.tsx    # Textarea component
```

## Main Modules

```
app/modules/editor/
├── components/
│   ├── note-editor.tsx  # Main text editor with AI integration
│   └── note-list.tsx    # List of notes sidebar
├── pages/
│   └── editor-page.tsx  # Main editor page layout
└── index.tsx           # Module entry point
```

## Component Usage

### Button
```typescript
import { Button } from '@/components/ui/button'

<Button variant="primary">Click me</Button>
```

### Card
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Input
```typescript
import { Input } from '@/components/ui/input'

<Input placeholder="Enter text..." />
```

### Textarea
```typescript
import { Textarea } from '@/components/ui/textarea'

<Textarea placeholder="Enter text..." />
```

### Scroll Area
```typescript
import { ScrollArea } from '@/components/ui/scroll-area'

<ScrollArea className="h-96">
  <div>Long content...</div>
</ScrollArea>
```

### Separator
```typescript
import { Separator } from '@/components/ui/separator'

<Separator />
```

## Module Usage

### Note Editor
```typescript
import { NoteEditor } from '@/app/modules/editor/components/note-editor'

<NoteEditor />
```

### Note List
```typescript
import { NoteList } from '@/app/modules/editor/components/note-list'

<NoteList />
```

### Editor Page
```typescript
import { EditorPage } from '@/app/modules/editor/pages/editor-page'

<EditorPage />
```

## Features System

### Feature Categories

**CRITICAL: Features should ONLY be managed through the settings dialog. DO NOT add feature toggles to header, footer, or any other UI components.**

1. **Context Features**: Global state/behavior (Focus Mode, Dark Mode)
2. **Element Features**: UI elements (Word Count, Character Counter)
3. **Content Features**: Text analysis (Spell Check, Grammar Check)
4. **Behavior Features**: Interaction changes (Undo/Redo, Auto-save)

### Architecture Rules

**CRITICAL: ALL UI methods must be in core.tsx files, NOT in provider files**

- Provider files should be thin wrappers, not duplicate logic
- Use .tsx for JSX components, .ts for pure TypeScript
- Registry system manages all features centrally
- Components use hooks directly, no props drilling

### Context Features Structure

```
app/modules/editor/features/context-features/feature-name/
├── types.ts        # Type definitions
├── feature-name.tsx # Main logic + provider + hook + core class
└── index.ts        # Exports + feature configuration
```

#### Context Feature Example (Focus Mode)

```typescript
// types.ts
export interface FocusModeConfig {
  enabled: boolean
  sessionDuration: number
  showTimer: boolean
}

export interface FocusModeState {
  isActive: boolean
  startTime: number | null
  endTime: number | null
  remainingTime: number
  sessionDuration: number
}

export interface FocusModeContextType {
  enabled: boolean
  state: FocusModeState
  startSession: (duration: number) => void
  stopSession: () => void
  setEnabled: (enabled: boolean) => void
  renderTimer: () => React.ReactElement | null
  renderControls: (sessionTime: number, onSessionTimeChange: (time: number) => void) => React.ReactElement | null
}

// focus-mode.tsx
class FocusModeCore {
  // Core logic + UI render methods
  renderTimer(): React.ReactElement { /* JSX */ }
  renderControls(): React.ReactElement { /* JSX */ }
}

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  // React Context provider
}

export function useFocusMode() {
  // Hook for components
}

// index.ts
export { FocusModeProvider, useFocusMode } from './focus-mode'
export const focusModeFeature = {
  config: {
    key: 'focusMode',
    name: 'Focus Mode',
    description: 'Distraction-free writing with timer',
    enabled: false,
    category: 'context'
  },
  provider: 'FocusModeProvider',
  hook: 'useFocusMode'
}
```

### Element Features Structure

```
app/modules/editor/features/element-features/feature-name/
├── types.ts     # Type definitions
├── core.tsx     # Logic + UI render methods
└── index.tsx    # Exports + configuration + hooks
```

#### Element Feature Example (Word Count)

```typescript
// types.ts
export interface TextStatsConfig {
  enabled: boolean
  showCharCount: boolean
  showWordCount: boolean
}

// core.tsx
export class TextStatsCore {
  renderStats(): React.ReactElement | null {
    // JSX rendering logic
  }
}

// index.tsx
export const useTextStats = (characterCount: number, wordCount: number, showWordCount: boolean) => {
  const core = new TextStatsCore({
    enabled: showWordCount,
    showCharCount: true,
    showWordCount: showWordCount
  })
  
  return {
    renderStats: () => core.renderStats()
  }
}

export const showWordCountFeature = {
  config: {
    key: 'showWordCount',
    name: 'Word Count',
    description: 'Show word and character count',
    enabled: true,
    category: 'element'
  }
}
```

### Component Integration

```typescript
// note-editor-footer.tsx
export function NoteEditorFooter({ characterCount, wordCount, showWordCount }: NoteEditorFooterProps) {
  const focusMode = useFocusMode()
  const textStats = useTextStats(characterCount, wordCount, showWordCount)
  const [sessionTime, setSessionTime] = useState(25)

  return (
    <div className="border-t border-border px-6 py-2 flex items-center justify-between bg-background">
      {textStats.renderStats()}
      
      {focusMode.renderTimer()}
      {focusMode.renderControls(sessionTime, setSessionTime)}
    </div>
  )
}
```

### Feature Manager System

**CRITICAL: All features are now managed centrally through Feature Manager - NO manual props passing required!**

```typescript
// feature-manager.ts
export const featureManager = new FeatureManager()

// Hooks for components
export function useFeatureState(key: string): [boolean, (enabled: boolean) => void]
export function useAllFeatures(): Record<string, boolean>
```

#### How it Works

1. **Registry**: All features auto-register in `features/registry.ts`
2. **Settings Dialog**: Automatically shows ALL registered features
3. **Components**: Use `useFeatureState('featureKey')` to get state
4. **Synchronization**: All features sync automatically via Feature Manager

#### Adding New Features

```typescript
// 1. Create your feature
export const myFeature = {
  config: {
    key: 'myFeature',
    name: 'My Feature',
    description: 'Cool new feature',
    enabled: true,
    category: 'element'
  }
}

// 2. Add to registry
export const features = [...existingFeatures, myFeature]

// 3. DONE! Automatically appears in settings
```

#### Using Features in Components

```typescript
// Auto-sync with settings
const [enabled, setEnabled] = useFeatureState('myFeature')

// Footer example - no props needed
export function NoteEditorFooter({ content }: { content: string }) {
  const [showWordCount] = useFeatureState('showWordCount')
  const [showCharacterCount] = useFeatureState('characterCount')
  
  const textStats = useTextStats(content, showWordCount)
  const characterStats = useCharacterCount(content, showCharacterCount)
  
  return (
    <div>
      {textStats.renderWords()}
      {characterStats.renderCharacters()}
    </div>
  )
}
```

### Content Features Structure

```
app/modules/editor/features/content-features/feature-name/
├── types.ts     # Type definitions
├── core.tsx     # Logic + UI render methods  
└── index.tsx    # Exports + configuration + hooks
```

#### Content Feature Example (AI Text Editor)

```typescript
// AI Text Editor - processes and improves text
export const aiTextEditorFeature = {
  config: {
    key: 'aiTextEditor',
    name: 'AI Text Editor', 
    description: 'Fix grammar and improve text with AI',
    enabled: true,
    category: 'content'
  }
}

// Usage in selection toolbar
const aiEditor = useAITextEditor(enabled)
return (
  <div>
    {aiEditor.renderFixButton(() => handleFix())}
    {aiEditor.renderImproveButton(() => handleImprove())}
  </div>
)
```

### Existing Features

- **Focus Mode** (Context): Distraction-free writing with timer
  - Location: `app/modules/editor/features/context-features/focus-mode/`
  - Provider: `FocusModeProvider` in `main.tsx`
  - Hook: `useFocusMode`
  - Manager: Auto-syncs via `useFeatureState('focusMode')`

- **Word Count** (Element): Display word count statistics
  - Location: `app/modules/editor/features/element-features/show-word-count/`
  - Hook: `useTextStats(text, enabled)`
  - Manager: Auto-syncs via `useFeatureState('showWordCount')`

- **Character Count** (Element): Display character count statistics  
  - Location: `app/modules/editor/features/element-features/character-count/`
  - Hook: `useCharacterCount(text, enabled)`
  - Manager: Auto-syncs via `useFeatureState('characterCount')`

- **AI Text Editor** (Content): Fix and improve text with AI
  - Location: `app/modules/editor/features/content-features/ai-text-editor/`
  - Hook: `useAITextEditor(enabled)`
  - Manager: Auto-syncs via `useFeatureState('aiTextEditor')`

### Feature Manager Architecture

**Circular Import Prevention:**
- Lazy initialization in Feature Manager
- Dynamic imports in providers when needed
- `registerFeatureHandler()` for external feature integration

**Settings Dialog Flow:**
1. `getAllFeatures()` from registry
2. `useAllFeatures()` for reactive state
3. `featureManager.setState()` on toggle
4. All components auto-update via `useFeatureState()`

**NO MORE MANUAL PROPS PASSING!** 🎉

## AI Integration

### LLM Call Usage

**CRITICAL: Use the llmCall function from lib/ai/core.ts for all AI interactions**

```typescript
import { llmCall } from '@/lib/ai/core'

// Basic usage
const response = await llmCall([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Fix this text: Hello wrold!' }
])

if (response.success) {
  console.log(response.content) // Fixed text
} else {
  console.error(response.error)
}
```

### AI Architecture Rules

1. **Centralized AI Logic**: All AI calls must go through `lib/ai/core.ts`
2. **Error Handling**: Always check `response.success` before using content
3. **Model Selection**: Default is `anthropic/claude-3.5-sonnet`, specify if different needed
4. **Prompts**: Store reusable prompts in `lib/ai/prompts/`
5. **Electron Bridge**: AI functions are exposed via `window.electronAPI.llmCall`

### Content Feature AI Integration

```typescript
// In core.tsx files
export class AIFeatureCore {
  private async processText(text: string, prompt: string): Promise<string> {
    const response = await window.electronAPI.llmCall([
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ])
    
    if (!response.success) {
      throw new Error(response.error || 'AI processing failed')
    }
    
    return response.content || text
  }
  
  async fixGrammar(text: string): Promise<string> {
    return this.processText(text, FIX_TEXT_PROMPT)
  }
  
  async improveText(text: string): Promise<string> {
    return this.processText(text, IMPROVE_TEXT_PROMPT)
  }
}
```

### Available Prompts

```typescript
// lib/ai/prompts/text-editing-prompts.ts
export const FIX_TEXT_PROMPT = `Fix grammar, spelling, and punctuation errors`
export const IMPROVE_TEXT_PROMPT = `Improve clarity, style, and flow while maintaining meaning`
```

### Electron API Integration

```typescript
// Available via window.electronAPI
interface ElectronAPI {
  llmCall: (
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>, 
    model?: string
  ) => Promise<{ success: boolean, content?: string, error?: string }>
}

// Usage in renderer process
const result = await window.electronAPI.llmCall(messages, 'anthropic/claude-3.5-sonnet')
```

### Best Practices

1. **Loading States**: Show loading indicators during AI processing
2. **Error Recovery**: Provide fallback behavior when AI fails
3. **Rate Limiting**: Debounce rapid AI requests
4. **User Feedback**: Show progress and results clearly
5. **Model Costs**: Be mindful of token usage with large texts

## Commands

```bash
npm run build && npm run electron
``` 