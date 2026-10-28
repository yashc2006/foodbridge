import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { LocationPicker } from '../components/Maps'

const DEMO = [
  ['Donor (hotel)', 'hotel@demo.com', 'demo123'],
  ['Receiver (NGO)', 'ngo@demo.com', 'demo123'],
  ['Admin', 'admin@foodbridge.in', 'admin123'],
]

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container auth">
      <form className="card pad-lg auth-card" onSubmit={submit}>
        <h1>Welcome back</h1>
        <p className="muted">Log in to share or receive food.</p>
        {error && <div className="alert">{error}</div>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button className="btn btn-primary full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="small center">New here? <Link to="/register">Create an account</Link></p>
        <div className="demo">
          <p className="small muted">Demo accounts (one click fill):</p>
          <div className="row wrap gap-sm">
            {DEMO.map(([label, em, pw]) => (
              <button type="button" key={em} className="btn btn-ghost btn-sm" onClick={() => { setEmail(em); setPassword(pw) }}>{label}</button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}

const ORG_TYPES = {
  donor: [['restaurant', 'Restaurant / Hotel'], ['hostel', 'Hostel / Mess'], ['event', 'Event / Caterer'], ['household', 'Household'], ['other', 'Other']],
  receiver: [['ngo', 'NGO'], ['shelter', 'Shelter / Orphanage'], ['community', 'Community kitchen'], ['volunteer', 'Individual volunteer'], ['other', 'Other']],
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    role: params.get('role') === 'receiver' ? 'receiver' : 'donor',
    name: '', email: '', password: '', phone: '', org_name: '', org_type: '',
    address: '', food_preference: 'any', capacity: 50, lat: null, lng: null,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.lat == null) return setError('Please set your location on the map — it is used for matching.')
    setBusy(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container auth">
      <form className="card pad-lg auth-card wide" onSubmit={submit}>
        <h1>Join FoodBridge</h1>
        <div className="segmented">
          {[['donor', '🍱 I have surplus food'], ['receiver', '🤲 We need food']].map(([r, label]) => (
            <button type="button" key={r} className={form.role === r ? 'active' : ''} onClick={() => setForm((f) => ({ ...f, role: r, org_type: '' }))}>{label}</button>
          ))}
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="grid-2">
          <label>Your name<input required value={form.name} onChange={set('name')} /></label>
          <label>Phone<input value={form.phone} onChange={set('phone')} placeholder="Shared only after a claim" /></label>
          <label>Email<input type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>
          <label>Password<input type="password" required minLength={6} value={form.password} onChange={set('password')} autoComplete="new-password" /></label>
          <label>Organisation name<input value={form.org_name} onChange={set('org_name')} placeholder="Optional for households / individuals" /></label>
          <label>Type
            <select value={form.org_type} onChange={set('org_type')} required>
              <option value="">Select…</option>
              {ORG_TYPES[form.role].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {form.role === 'receiver' && (
            <>
              <label>Food preference
                <select value={form.food_preference} onChange={set('food_preference')}>
                  <option value="any">Accept any food</option>
                  <option value="veg">Vegetarian only</option>
                  <option value="nonveg">Prefer non-veg</option>
                </select>
              </label>
              <label>Capacity (people you can serve per pickup)<input type="number" min="1" value={form.capacity} onChange={set('capacity')} /></label>
            </>
          )}
        </div>
        <label>Address<input value={form.address} onChange={set('address')} placeholder="Area, city" /></label>
        <div className="label">Location</div>
        <LocationPicker value={form.lat != null ? { lat: form.lat, lng: form.lng } : null} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
        <button className="btn btn-primary full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="small center">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
