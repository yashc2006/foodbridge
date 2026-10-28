export default function StatTiles({ stats }) {
  const tiles = [
    ['🍽️', stats?.mealsServed ?? '—', 'Meals served'],
    ['⚖️', stats ? `${stats.foodSavedKg} kg` : '—', 'Food saved'],
    ['🌱', stats ? `${stats.co2SavedKg} kg` : '—', 'CO₂e avoided'],
    ['✅', stats?.deliveredDonations ?? '—', 'Completed'],
  ]
  return (
    <div className="stats">
      {tiles.map(([icon, value, label]) => (
        <div className="card stat" key={label}>
          <span className="stat-icon">{icon}</span>
          <strong>{value}</strong>
          <span className="muted small">{label}</span>
        </div>
      ))}
    </div>
  )
}
