import React from 'react'
import { ConversationProvider } from './ConversationContext'

export default function AppProviders({ children }) {
  return (
    <ConversationProvider>
      {children}
    </ConversationProvider>
  )
}
