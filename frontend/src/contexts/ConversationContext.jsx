import React, { createContext, useContext, useMemo, useReducer } from 'react'

const ConversationCtx = createContext(null)

const initialState = {
  messages: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'appendUser':
      return { ...state, messages: [...state.messages, { role: 'user', text: action.text }] }
    case 'appendAssistant':
      return { ...state, messages: [...state.messages, { role: 'assistant', text: action.text }] }
    case 'clear':
      return { ...state, messages: [] }
    default:
      return state
  }
}

export function ConversationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions = useMemo(() => ({
    appendUser: (text) => dispatch({ type: 'appendUser', text }),
    appendAssistant: (text) => dispatch({ type: 'appendAssistant', text }),
    clear: () => dispatch({ type: 'clear' }),
  }), [])

  const value = useMemo(() => ({ state, actions }), [state, actions])
  return (
    <ConversationCtx.Provider value={value}>
      {children}
    </ConversationCtx.Provider>
  )
}

export function useConversation(selector) {
  const ctx = useContext(ConversationCtx)
  if (!ctx) throw new Error('useConversation must be used within ConversationProvider')
  const { state } = ctx
  return typeof selector === 'function' ? selector(state) : state
}

export function useConversationActions() {
  const ctx = useContext(ConversationCtx)
  if (!ctx) throw new Error('useConversationActions must be used within ConversationProvider')
  return ctx.actions
}
