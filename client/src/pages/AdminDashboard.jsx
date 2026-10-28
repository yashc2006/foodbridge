import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { StatusBadge, FoodTypeTag } from '../components/DonationCard'
import { DonationMap } from '../components/Maps'
import StatTiles from '../components/StatTiles'
import { CATEGORIES, STATUS, formatDateTime } from '../lib/format'

export default function AdminDashboard() {
  const { liveVersion, pushToast } = useAuth()
  const [overview, setOverview] = useState(null)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [donations, setDonations] = useState([])
  const [tab, setTab] = useState('donations')

  const load = useCallback(() => {
    api('/admin/overview').then(setOverview).catch((e) => pushToast(e.message, 'error'))
    api('/stats/public').then(setStats).catch(() => {})
    api('/admin/users').then(setUsers).catch(() => {})
    api('/admin/donations').then(setDonations).catch(() => {})
  }, [pushToast])

  useEffect(load, [load, liveVersion])

  const cancel = async (id) => {
    if (!window.confirm('Cancel this donation?')) return
    try {
      await api(`/donations/${id}/cancel`, { method: 'POST' })
      load()
    } catch (e) {
      pushToast(e.message, 'error')
    }
  }

  const maxCat = Math.max(1, ...(overview?.byCategory || []).map((c) => c.servings || 0))

  return (
    <div className="container page">
      <h1>Admin overview</h1>
      <StatTiles stats={stats} />

      <div className="two-col">
        <div className="card pad">
          <h3>Donations by status</h3>
          <div className="status-grid">
            {Object.keys(STATUS).map((s) => (
              <div key={s}><StatusBadge status={s} /><strong>{overview?.byStatus?.[s] || 0}</strong></div>
            ))}
          </div>
          <p className="muted small">Average time to claim: <b>{overview?.avgMinutesToClaim ?? '—'} min</b> · Users: {overview?.byRole?.donor || 0} donors, {overview?.byRole?.receiver || 0} receivers</p>
        </div>
        <div className="card pad">
          <h3>Servings by category</h3>
          {(overview?.byCategory || []).map((c) => (
            <div className="bar-row" key={c.category}>
              <span className="small">{CATEGORIES[c.category]?.icon} {CATEGORIES[c.category]?.label}</span>
              <div className="bar"><div style={{ width: `${(c.servings / maxCat) * 100}%` }} /></div>
              <span className="small">{c.servings}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="section-head">Live map</h2>
      <DonationMap donations={donations.filter((d) => ['available', 'claimed', 'picked_up'].includes(d.status))} height={340} />

      <div className="segmented section-head">
        <button className={tab === 'donations' ? 'active' : ''} onClick={() => setTab('donations')}>Donations ({donations.length})</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Users ({users.length})</button>
      </div>

      <div className="card table-wrap">
        {tab === 'donations' ? (
          <table>
            <thead><tr><th>#</th><th>Food</th><th>Qty</th><th>Donor</th><th>Receiver</th><th>Status</th><th>Posted</th><th /></tr></thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.title} <FoodTypeTag type={d.food_type} /></td>
                  <td>{d.quantity}</td>
                  <td>{d.donor_org || d.donor_name}</td>
                  <td>{d.claimer_org || d.claimer_name || '—'}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="nowrap">{formatDateTime(d.created_at)}</td>
                  <td>{['available', 'claimed'].includes(d.status) && <button className="link-btn danger" onClick={() => cancel(d.id)}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Organisation</th><th>Posted</th><th>Claimed</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td><td>{u.name}</td><td>{u.email}</td><td><span className="role-chip">{u.role}</span></td>
                  <td>{u.org_name || '—'}</td><td>{u.posted}</td><td>{u.claimed}</td><td className="nowrap">{formatDateTime(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
