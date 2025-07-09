# Claude Code SDK - Components

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

## Commands

```bash
npm run build && npm run electron
``` 