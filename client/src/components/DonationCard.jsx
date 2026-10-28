// Card showing one donation, with role-specific action buttons passed in as children.
import { imageUrl } from '../lib/api'
import { CATEGORIES, FOOD_TYPES, STATUS, formatDateTime, isUrgent, timeLeft } from '../lib/format'

export function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{STATUS[status] || status}</span>
}

export function FoodTypeTag({ type }) {
  return <span className={`tag tag-${FOOD_TYPES[type]?.color}`}>{FOOD_TYPES[type]?.label}</span>
}

export default function DonationCard({ d, children, showDonor = true, showClaimer = false, highlight = false, onClick }) {
  const cat = CATEGORIES[d.category] || CATEGORIES.other
  const urgent = d.status === 'available' && isUrgent(d.expires_at)
  return (
    <article className={`card donation ${highlight ? 'highlight' : ''}`} onClick={onClick}>
      <div className="donation-img">
        {d.image ? <img src={imageUrl(d.image)} alt={d.title} loading="lazy" /> : <span className="placeholder">{cat.icon}</span>}
        {d.match && <span className="score" title="Smart match score">{d.match.score}% match</span>}
      </div>
      <div className="donation-body">
        <div className="row between gap-sm">
          <h3>{d.title}</h3>
          <StatusBadge status={d.status} />
        </div>
        <div className="row wrap gap-sm small">
          <FoodTypeTag type={d.food_type} />
          <span className="tag">{cat.icon} {cat.label}</span>
          <span className="tag">🍽️ {d.quantity} servings</span>
          {d.match?.distanceKm != null && <span className="tag">📍 {d.match.distanceKm} km</span>}
        </div>
        {d.description && <p className="muted small clamp">{d.description}</p>}
        <div className="meta small">
          {['available', 'claimed'].includes(d.status) && (
            <span className={urgent ? 'urgent' : ''}>⏱ {timeLeft(d.expires_at)}</span>
          )}
          {showDonor && <span>🏪 {d.donor_org || d.donor_name}{d.donor_phone && ['claimed', 'picked_up'].includes(d.status) ? ` · ${d.donor_phone}` : ''}</span>}
          {showClaimer && d.claimed_by && <span>🤝 {d.claimer_org || d.claimer_name}{d.claimer_phone ? ` · ${d.claimer_phone}` : ''}</span>}
          {d.address && <span>🗺 {d.address}</span>}
          <span className="muted">Posted {formatDateTime(d.created_at)}</span>
        </div>
        {d.match?.reasons?.length > 0 && (
          <ul className="reasons">
            {d.match.reasons.slice(0, 3).map((r) => <li key={r}>✓ {r}</li>)}
          </ul>
        )}
        {children && <div className="actions" onClick={(e) => e.stopPropagation()}>{children}</div>}
      </div>
    </article>
  )
}
