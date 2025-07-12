import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorPage } from './app/modules/editor/pages/editor-page'
import './styles/globals.css'
import { ThemeProvider } from './lib/providers/theme-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <EditorPage />
    </ThemeProvider>
  </StrictMode>,
) 