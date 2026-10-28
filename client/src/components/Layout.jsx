// App shell: navbar with notification bell, toasts, and route guards.
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { timeAgo } from '../lib/format'

export function Logo() {
  return (
    <Link to="/" className="logo">
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="var(--green)" />
        <path d="M14 38c0-10 8-18 18-18s18 8 18 18H14z" fill="var(--saffron)" />
        <rect x="10" y="38" width="44" height="5" rx="2.5" fill="#fff" />
        <circle cx="32" cy="17" r="3" fill="#fff" />
      </svg>
      <span>FoodBridge</span>
    </Link>
  )
}

function NotificationBell() {
  const { notifications, unread, markAllRead } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="bell" ref={ref}>
      <button className="icon-btn" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        🔔{unread > 0 && <span className="badge-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown-head">
            <strong>Notifications</strong>
            {unread > 0 && <button className="link-btn" onClick={markAllRead}>Mark all read</button>}
          </div>
          {notifications.length === 0 && <p className="muted small pad">No notifications yet.</p>}
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className={n.is_read ? '' : 'unread'}>
                <span>{n.message}</span>
                <span className="muted small">{timeAgo(n.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Logo />
        <nav className="nav-links">
          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              <NotificationBell />
              <span className="role-chip">{user.role}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/') }}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/register" className="btn btn-primary btn-sm">Join now</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export function Toasts() {
  const { toasts } = useAuth()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  )
}

export function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="container pad-lg muted">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}
