import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './app/page.tsx'
import './styles/globals.css'
import { ThemeProvider } from './lib/providers/theme-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Home />
    </ThemeProvider>
  </StrictMode>,
) 