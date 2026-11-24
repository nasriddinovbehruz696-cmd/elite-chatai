const BASE_URL = '/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('gemini_token')

  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса')
  }

  return data
}

export const api = {
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  googleLogin: (credential) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),

  getChats: () => request('/chats'),
  createChat: () => request('/chats', { method: 'POST' }),
  getChat: (id) => request(`/chats/${id}`),
  renameChat: (id, title) =>
    request(`/chats/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
  deleteChat: (id) => request(`/chats/${id}`, { method: 'DELETE' }),
  sendMessage: (id, text, image) =>
    request(`/chats/${id}/messages`, { method: 'POST', body: JSON.stringify({ text, image }) }),

  adminGetUsers: () => request('/admin/users'),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminGetStats: () => request('/admin/stats'),
  adminGetOnline: () => request('/admin/online'),

  getMe: () => request('/me'),
  setPlan: (plan) => request('/me/plan', { method: 'PUT', body: JSON.stringify({ plan }) }),
  submitComplaint: (text) =>
    request('/complaints', { method: 'POST', body: JSON.stringify({ text }) }),

  adminGetComplaints: () => request('/admin/complaints'),
  adminResolveComplaint: (id, resolved) =>
    request(`/admin/complaints/${id}`, { method: 'PUT', body: JSON.stringify({ resolved }) }),
  adminDeleteComplaint: (id) => request(`/admin/complaints/${id}`, { method: 'DELETE' }),
}
