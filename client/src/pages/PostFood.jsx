// Donor form for posting surplus food, with AI analysis and image upload.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { CATEGORIES, toLocalInput } from '../lib/format'
import { LocationPicker } from '../components/Maps'

const QUICK_EXPIRY = [2, 4, 8, 24]

export default function PostFood() {
  const { user, pushToast } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => ({
    title: '', description: '', category: 'cooked', food_type: 'veg', quantity: 20,
    address: user.address || '', expires_at: toLocalInput(new Date(Date.now() + 4 * 36e5)),
  }))
  const [loc, setLoc] = useState(user.lat != null ? { lat: user.lat, lng: user.lng } : null)
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [ai, setAi] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const pickImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return setError('Image must be under 5 MB')
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const analyze = async () => {
    const text = `${form.title}. ${form.description}`.trim()
    if (text.length < 4) return setError('Write a title or description first, then let AI analyse it.')
    setError('')
    setAiBusy(true)
    try {
      const result = await api('/ai/analyze', { method: 'POST', body: { text } })
      setAi(result)
      setForm((f) => ({
        ...f,
        category: result.category,
        food_type: result.food_type,
        expires_at: toLocalInput(new Date(Date.now() + result.shelf_life_hours * 36e5)),
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setAiBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!loc) return setError('Please set the pickup location on the map.')
    const expires = new Date(form.expires_at)
    if (expires <= new Date()) return setError('“Safe until” time must be in the future.')
    const fd = new FormData()
    Object.entries({ ...form, expires_at: expires.toISOString(), lat: loc.lat, lng: loc.lng }).forEach(([k, v]) => fd.append(k, v))
    if (image) fd.append('image', image)
    setBusy(true)
    try {
      const created = await api('/donations', { method: 'POST', form: fd })
      pushToast(`Posted! ${created.notifiedReceivers} matched receiver(s) were notified.`, 'success')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <h1>Post surplus food</h1>
      <form className="card pad-lg form" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        <label>Title<input required maxLength={80} value={form.title} onChange={set('title')} placeholder="e.g. Veg biryani from lunch buffet" /></label>
        <label>Description<textarea rows={3} value={form.description} onChange={set('description')} placeholder="What is it, when was it cooked, how is it packed?" /></label>

        <div className="ai-box">
          <div className="row between wrap gap-sm">
            <div>
              <strong>🧠 AI food check</strong>
              <p className="muted small">Auto-detects category, veg/non-veg and a safe shelf life from your description.</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={analyze} disabled={aiBusy}>{aiBusy ? 'Analysing…' : 'Analyse with AI'}</button>
          </div>
          {ai && (
            <div className="ai-result small">
              <p>Detected: <b>{CATEGORIES[ai.category]?.label}</b> · <b>{ai.food_type}</b> · safe for about <b>{ai.shelf_life_hours} h</b> <span className="muted">({ai.source})</span></p>
              {ai.tips?.length > 0 && <ul>{ai.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
            </div>
          )}
        </div>

        <div className="grid-3">
          <label>Category
            <select value={form.category} onChange={set('category')}>
              {Object.entries(CATEGORIES).map(([v, c]) => <option key={v} value={v}>{c.icon} {c.label}</option>)}
            </select>
          </label>
          <label>Food type
            <select value={form.food_type} onChange={set('food_type')}>
              <option value="veg">Veg</option>
              <option value="nonveg">Non-veg</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label>Quantity (servings)<input type="number" min="1" max="10000" required value={form.quantity} onChange={set('quantity')} /></label>
        </div>

        <label>Safe to eat until<input type="datetime-local" required value={form.expires_at} onChange={set('expires_at')} /></label>
        <div className="row wrap gap-sm">
          {QUICK_EXPIRY.map((h) => (
            <button type="button" key={h} className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, expires_at: toLocalInput(new Date(Date.now() + h * 36e5)) }))}>+{h}h</button>
          ))}
        </div>

        <label>Photo (optional, max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} /></label>
        {preview && <img src={preview} alt="Preview" className="preview" />}

        <label>Pickup address<input value={form.address} onChange={set('address')} placeholder="Building, area, landmark" /></label>
        <div className="label">Pickup location</div>
        <LocationPicker value={loc} onChange={setLoc} />

        <div className="row gap">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Posting…' : 'Post food'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
