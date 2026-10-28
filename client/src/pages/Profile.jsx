import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { LocationPicker } from '../components/Maps'

export default function Profile() {
  const { user, setUser, pushToast } = useAuth()
  const [form, setForm] = useState({
    name: user.name, phone: user.phone || '', org_name: user.org_name || '', address: user.address || '',
    food_preference: user.food_preference, capacity: user.capacity, lat: user.lat, lng: user.lng,
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      setUser(await api('/auth/me', { method: 'PUT', body: form }))
      pushToast('Profile saved', 'success')
    } catch (err) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <h1>Profile</h1>
      <form className="card pad-lg form" onSubmit={save}>
        <p className="muted small">{user.email} · <span className="role-chip">{user.role}</span></p>
        <div className="grid-2">
          <label>Name<input required value={form.name} onChange={set('name')} /></label>
          <label>Phone<input value={form.phone} onChange={set('phone')} /></label>
          <label>Organisation<input value={form.org_name} onChange={set('org_name')} /></label>
          <label>Address<input value={form.address} onChange={set('address')} /></label>
          {user.role === 'receiver' && (
            <>
              <label>Food preference
                <select value={form.food_preference} onChange={set('food_preference')}>
                  <option value="any">Accept any food</option>
                  <option value="veg">Vegetarian only</option>
                  <option value="nonveg">Prefer non-veg</option>
                </select>
              </label>
              <label>Capacity (people per pickup)<input type="number" min="1" value={form.capacity} onChange={set('capacity')} /></label>
            </>
          )}
        </div>
        <div className="label">Location (used for matching)</div>
        <LocationPicker value={form.lat != null ? { lat: form.lat, lng: form.lng } : null} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  )
}
