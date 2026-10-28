import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import DonationCard from '../components/DonationCard'
import StatTiles from '../components/StatTiles'
import { DonationMap } from '../components/Maps'

export default function ReceiverDashboard() {
  const { user, liveVersion, pushToast } = useAuth()
  const [tab, setTab] = useState('find')
  const [available, setAvailable] = useState([])
  const [mine, setMine] = useState([])
  const [stats, setStats] = useState(null)
  const [sort, setSort] = useState('match')
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    api(`/donations?sort=${sort}`).then(setAvailable).catch((e) => pushToast(e.message, 'error'))
    api('/donations/mine').then(setMine).catch(() => {})
    api('/stats/me').then(setStats).catch(() => {})
  }, [sort, pushToast])

  useEffect(load, [load, liveVersion])

  const act = async (id, action, okMsg, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    try {
      await api(`/donations/${id}/${action}`, { method: 'POST' })
      if (okMsg) pushToast(okMsg, 'success')
      load()
    } catch (e) {
      pushToast(e.message, 'error')
      load()
    }
  }

  const active = mine.filter((d) => ['claimed', 'picked_up'].includes(d.status))
  const history = mine.filter((d) => !['claimed', 'picked_up'].includes(d.status))

  return (
    <div className="container page">
      <div className="row between wrap gap">
        <div>
          <h1>{user.org_name || user.name}</h1>
          <p className="muted">
            {user.food_preference === 'veg' ? 'Vegetarian only' : 'Accepts any food'} · capacity {user.capacity} people ·{' '}
            {user.lat == null ? <Link to="/profile">set your location for better matches</Link> : 'matches ranked for you'}
          </p>
        </div>
        <div className="segmented">
          <button className={tab === 'find' ? 'active' : ''} onClick={() => setTab('find')}>Find food ({available.length})</button>
          <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My pickups ({active.length})</button>
        </div>
      </div>

      <StatTiles stats={stats} />

      {tab === 'find' && (
        <>
          <DonationMap donations={available} me={user} onSelect={(d) => setSelected(d.id)} radiusKm={15} />
          <div className="row between wrap gap-sm section-head">
            <h2>Available near you</h2>
            <label className="inline small">Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="match">Best match (AI)</option>
                <option value="distance">Nearest</option>
                <option value="expiry">Expiring soonest</option>
              </select>
            </label>
          </div>
          {available.length === 0 && <div className="empty card"><p>No food available right now. You’ll get a notification as soon as something is posted nearby.</p></div>}
          <div className="grid-cards">
            {available.map((d) => (
              <DonationCard key={d.id} d={d} highlight={selected === d.id} onClick={() => setSelected(d.id)}>
                <button className="btn btn-primary btn-sm" onClick={() => act(d.id, 'claim', `Claimed "${d.title}". Contact details are in My pickups.`)}>Claim this food</button>
                <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`}>Directions</a>
              </DonationCard>
            ))}
          </div>
        </>
      )}

      {tab === 'mine' && (
        <>
          <h2 className="section-head">Active pickups</h2>
          {active.length === 0 && <div className="empty card"><p>No active pickups. Claim food from the “Find food” tab.</p></div>}
          <div className="grid-cards">
            {active.map((d) => (
              <DonationCard key={d.id} d={d}>
                <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lng}`}>Directions</a>
                {d.status === 'claimed' && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => act(d.id, 'pickup', 'Marked as picked up')}>I’ve picked it up</button>
                    <button className="btn btn-danger btn-sm" onClick={() => act(d.id, 'unclaim', 'Claim released', 'Release this claim so others can take it?')}>Release</button>
                  </>
                )}
                {d.status === 'picked_up' && (
                  <button className="btn btn-primary btn-sm" onClick={() => act(d.id, 'deliver', `Great! ${d.quantity} people fed.`)}>Mark distributed</button>
                )}
              </DonationCard>
            ))}
          </div>
          {history.length > 0 && (
            <>
              <h2 className="section-head">History</h2>
              <div className="grid-cards">
                {history.map((d) => <DonationCard key={d.id} d={d} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
