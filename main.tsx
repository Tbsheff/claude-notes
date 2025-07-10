import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './app/page.js'
import './styles/globals.css'
import { ThemeProvider } from './lib/providers/theme-provider'
import { FocusModeProvider } from './app/modules/editor/features/context-features/focus-mode'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <FocusModeProvider>
    <Home />
      </FocusModeProvider>
    </ThemeProvider>
  </StrictMode>,
) 