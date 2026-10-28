import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { Navbar, RequireAuth, Toasts } from './components/Layout'
import Landing from './pages/Landing'
import { Login, Register } from './pages/Auth'
import DonorDashboard from './pages/DonorDashboard'
import ReceiverDashboard from './pages/ReceiverDashboard'
import AdminDashboard from './pages/AdminDashboard'
import PostFood from './pages/PostFood'
import Profile from './pages/Profile'

function Dashboard() {
  const { user } = useAuth()
  if (user.role === 'donor') return <DonorDashboard />
  if (user.role === 'receiver') return <ReceiverDashboard />
  return <AdminDashboard />
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/donate/new" element={<RequireAuth roles={['donor']}><PostFood /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Toasts />
      </BrowserRouter>
    </AuthProvider>
  )
}
