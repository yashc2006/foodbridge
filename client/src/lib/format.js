// Display helpers shared across pages.

export const CATEGORIES = {
  cooked: { label: 'Cooked meal', icon: '🍛' },
  raw: { label: 'Raw / grains', icon: '🌾' },
  packaged: { label: 'Packaged', icon: '📦' },
  bakery: { label: 'Bakery', icon: '🥖' },
  fruits_veg: { label: 'Fruits & veg', icon: '🍎' },
  other: { label: 'Other', icon: '🍽️' },
}

export const FOOD_TYPES = {
  veg: { label: 'Veg', color: 'veg' },
  nonveg: { label: 'Non-veg', color: 'nonveg' },
  mixed: { label: 'Mixed', color: 'mixed' },
}

export const STATUS = {
  available: 'Available',
  claimed: 'Claimed',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} min left`
  const h = Math.floor(mins / 60)
  if (h < 48) return `${h}h ${mins % 60}m left`
  return `${Math.floor(h / 24)} days left`
}

export function isUrgent(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  return ms > 0 && ms < 2 * 36e5
}

export function timeAgo(iso) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Value for <input type="datetime-local"> from a Date, in local time.
export function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
