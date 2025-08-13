import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import AppProviders from './contexts/AppProviders'

const root = document.getElementById('root')
createRoot(root).render(
  <AppProviders>
    <App />
  </AppProviders>
)
