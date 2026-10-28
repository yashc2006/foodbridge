// Small fetch wrapper for the FoodBridge REST API.
// VITE_API_URL can point to a deployed backend; by default calls go to the same origin (Vite proxy in dev).
export const API_URL = import.meta.env.VITE_API_URL || ''

export function getToken() {
  return localStorage.getItem('fb_token')
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) payload = form // FormData: browser sets multipart headers
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${API_URL}/api${path}`, { method, headers, body: payload })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const imageUrl = (path) => (path ? `${API_URL}${path}` : null)
