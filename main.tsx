import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './app/page.js'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
) 