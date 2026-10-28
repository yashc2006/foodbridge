import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import DonationCard from '../components/DonationCard'
import StatTiles from '../components/StatTiles'

const FILTERS = [['active', 'Active'], ['done', 'Completed'], ['all', 'All']]

export default function DonorDashboard() {
  const { user, liveVersion, pushToast } = useAuth()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('active')
  const [suggestions, setSuggestions] = useState({})

  const load = useCallback(() => {
    api('/donations/mine').then(setItems).catch((e) => pushToast(e.message, 'error'))
    api('/stats/me').then(setStats).catch(() => {})
  }, [pushToast])

  useEffect(load, [load, liveVersion])

  const act = async (id, action, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    try {
      await api(`/donations/${id}/${action}`, { method: 'POST' })
      load()
    } catch (e) {
      pushToast(e.message, 'error')
    }
  }

  const toggleSuggestions = async (id) => {
    if (suggestions[id]) return setSuggestions((s) => ({ ...s, [id]: null }))
    try {
      const d = await api(`/donations/${id}`)
      setSuggestions((s) => ({ ...s, [id]: d.suggestedReceivers || [] }))
    } catch (e) {
      pushToast(e.message, 'error')
    }
  }

  const shown = items.filter((d) =>
    filter === 'all' ? true : filter === 'active' ? ['available', 'claimed', 'picked_up'].includes(d.status) : !['available', 'claimed', 'picked_up'].includes(d.status)
  )

  return (
    <div className="container page">
      <div className="row between wrap gap">
        <div>
          <h1>Hi, {user.name.split(' ')[0]} 👋</h1>
          <p className="muted">{user.org_name || 'Donor'} · thank you for sharing food</p>
        </div>
        <Link to="/donate/new" className="btn btn-primary">+ Post surplus food</Link>
      </div>

      <StatTiles stats={stats} />

      <div className="row between wrap gap-sm section-head">
        <h2>My donations</h2>
        <div className="segmented small">
          {FILTERS.map(([v, l]) => <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
      </div>

      {shown.length === 0 && (
        <div className="empty card">
          <p>No donations here yet.</p>
          <Link to="/donate/new" className="btn btn-outline btn-sm">Post your first donation</Link>
        </div>
      )}

      <div className="grid-cards">
        {shown.map((d) => (
          <DonationCard key={d.id} d={d} showDonor={false} showClaimer>
            {d.status === 'available' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleSuggestions(d.id)}>
                  {suggestions[d.id] ? 'Hide matches' : '🧠 Best receivers'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => act(d.id, 'cancel', 'Cancel this donation?')}>Cancel</button>
              </>
            )}
            {d.status === 'claimed' && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => act(d.id, 'pickup')}>Confirm handed over</button>
                <button className="btn btn-danger btn-sm" onClick={() => act(d.id, 'cancel', 'Cancel? The receiver will be notified.')}>Cancel</button>
              </>
            )}
            {d.status === 'picked_up' && <span className="muted small">Waiting for receiver to confirm distribution…</span>}
            {d.status === 'delivered' && <span className="success small">🎉 Fed {d.quantity} people</span>}
            {suggestions[d.id] && (
              <div className="suggestions">
                {suggestions[d.id].length === 0 && <p className="muted small">No compatible receivers within range yet.</p>}
                {suggestions[d.id].map((r) => (
                  <div key={r.id} className="suggestion">
                    <div className="row between"><strong>{r.name}</strong><span className="score-inline">{r.score}%</span></div>
                    <span className="muted small">{r.reasons.slice(0, 2).join(' · ')}</span>
                  </div>
                ))}
              </div>
            )}
          </DonationCard>
        ))}
      </div>
    </div>
  )
}
