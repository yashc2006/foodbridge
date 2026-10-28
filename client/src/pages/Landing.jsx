import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Landing() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api('/stats/public').then(setStats).catch(() => {})
  }, [])

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <p className="eyebrow">Surplus food coordination</p>
            <h1>Good food shouldn’t go to waste while people go hungry.</h1>
            <p className="lead">
              FoodBridge connects restaurants, hostels, events and households that have extra food
              with nearby NGOs, shelters and volunteers — matched smartly, notified instantly, tracked till delivery.
            </p>
            <div className="row gap">
              {user ? (
                <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
              ) : (
                <>
                  <Link to="/register?role=donor" className="btn btn-primary">I have surplus food</Link>
                  <Link to="/register?role=receiver" className="btn btn-outline">We need food</Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-card">
            <p className="eyebrow">Impact so far</p>
            <div className="impact-grid">
              <div><strong>{stats?.mealsServed ?? '—'}</strong><span>meals served</span></div>
              <div><strong>{stats?.foodSavedKg ?? '—'} kg</strong><span>food saved</span></div>
              <div><strong>{stats?.co2SavedKg ?? '—'} kg</strong><span>CO₂e avoided</span></div>
              <div><strong>{stats?.availableNow ?? '—'}</strong><span>listings live now</span></div>
            </div>
            <p className="muted small">{stats ? `${stats.donors} donors · ${stats.receivers} receiving organisations` : 'Loading live stats…'}</p>
          </div>
        </div>
      </section>

      <section className="container section">
        <h2>How it works</h2>
        <div className="steps">
          {[
            ['📸', 'Post surplus', 'Donors add a photo, quantity, pickup location and a safe-until time. AI suggests category and shelf life.'],
            ['🧠', 'Smart matching', 'Our engine ranks receivers by distance, urgency, quantity fit, food preference and fairness.'],
            ['🔔', 'Instant alerts', 'The best-matched receivers get a real-time notification and claim it in one tap.'],
            ['🚚', 'Track to delivery', 'Claimed → Picked up → Delivered. Donors see exactly how many people their food fed.'],
          ].map(([icon, title, text], i) => (
            <div className="step card" key={title}>
              <span className="step-no">{i + 1}</span>
              <span className="step-icon">{icon}</span>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="two-col">
          <div className="card pad-lg">
            <h3>For donors</h3>
            <p className="muted">Restaurants, hotels, college messes, caterers, event venues and households.</p>
            <ul className="checks">
              <li>Post food in under a minute</li>
              <li>See suggested nearby receivers</li>
              <li>Get notified when it’s claimed and delivered</li>
            </ul>
          </div>
          <div className="card pad-lg">
            <h3>For receivers</h3>
            <p className="muted">NGOs, shelters, orphanages, community kitchens and volunteers.</p>
            <ul className="checks">
              <li>Live map of food available near you</li>
              <li>Listings ranked by how well they fit you</li>
              <li>Veg-only filter and capacity-aware matching</li>
            </ul>
          </div>
        </div>
      </section>
      <footer className="footer">
        <div className="container muted small">FoodBridge · PS-4 Local Service Management · Built with React, Node.js, Express, SQLite, Socket.io & Leaflet</div>
      </footer>
    </>
  )
}
