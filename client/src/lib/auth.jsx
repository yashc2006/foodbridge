// Auth + real-time context: holds the logged-in user, the Socket.io connection and notifications.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { api, API_URL, getToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [toasts, setToasts] = useState([])
  const [liveVersion, setLiveVersion] = useState(0) // bumps whenever any donation changes
  const socketRef = useRef(null)

  const pushToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api('/notifications')
      setNotifications(data.items)
      setUnread(data.unread)
    } catch { /* ignore */ }
  }, [])

  // Restore session on page load.
  useEffect(() => {
    if (!getToken()) return
    api('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('fb_token'))
      .finally(() => setLoading(false))
  }, [])

  // Connect the socket while logged in.
  useEffect(() => {
    if (!user) return undefined
    loadNotifications()
    const socket = io(API_URL || undefined, { auth: { token: getToken() } })
    socketRef.current = socket
    socket.on('notification', (n) => {
      setNotifications((list) => [n, ...list].slice(0, 50))
      setUnread((u) => u + 1)
      pushToast(n.message, n.type)
    })
    socket.on('donation:update', () => setLiveVersion((v) => v + 1))
    return () => socket.disconnect()
  }, [user, loadNotifications, pushToast])

  const saveSession = (data) => {
    localStorage.setItem('fb_token', data.token)
    setUser(data.user)
    return data.user
  }

  const login = async (email, password) => saveSession(await api('/auth/login', { method: 'POST', body: { email, password } }))
  const register = async (form) => saveSession(await api('/auth/register', { method: 'POST', body: form }))
  const logout = () => {
    localStorage.removeItem('fb_token')
    setUser(null)
    setNotifications([])
    setUnread(0)
  }

  const markAllRead = async () => {
    await api('/notifications/read-all', { method: 'POST' }).catch(() => {})
    setUnread(0)
    setNotifications((list) => list.map((n) => ({ ...n, is_read: 1 })))
  }

  const value = {
    user, setUser, loading, login, register, logout,
    notifications, unread, markAllRead,
    toasts, pushToast, liveVersion,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
