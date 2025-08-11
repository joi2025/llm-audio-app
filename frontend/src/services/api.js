const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

async function j(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`)
  return await res.json()
}

export const AdminAPI = {
  status: () => j('GET', '/api/admin/status'),
  getSettings: () => j('GET', '/api/admin/settings'),
  setSettings: (s) => j('POST', '/api/admin/settings', s),
  conversations: (limit=100) => j('GET', `/api/admin/conversations?limit=${limit}`),
  clearConversations: () => j('DELETE', '/api/admin/conversations'),
  logs: (limit=200) => j('GET', `/api/admin/logs?limit=${limit}`),
}
