const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:8001'

async function apiCall(method, path, body) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`${method} ${path} -> ${res.status}: ${errorText}`)
    }
    
    return await res.json()
  } catch (error) {
    console.error(`API Error [${method} ${path}]:`, error)
    throw error
  }
}

export const AdminAPI = {
  // Estado del sistema
  status: () => apiCall('GET', '/api/admin/status'),
  
  // Configuraciones
  getSettings: () => apiCall('GET', '/api/admin/settings'),
  setSettings: (settings) => apiCall('POST', '/api/admin/settings', settings),
  
  // Test API Key
  testApiKey: (apiKey = null) => apiCall('POST', '/api/admin/test-api-key', apiKey ? { api_key: apiKey } : {}),
  
  // Conversaciones
  conversations: (limit = 100) => apiCall('GET', `/api/admin/conversations?limit=${limit}`),
  clearConversations: () => apiCall('DELETE', '/api/admin/conversations'),
  
  // Logs
  logs: (limit = 200) => apiCall('GET', `/api/admin/logs?limit=${limit}`),
  
  // Sistema
  restart: () => apiCall('POST', '/api/admin/system/restart'),
}
