// Map components built on Leaflet + OpenStreetMap (free, no API key).
import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CATEGORIES, timeLeft } from '../lib/format'

export const DEFAULT_CENTER = [28.6139, 77.209] // New Delhi

const pinIcon = (emoji, variant = '') =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin ${variant}"><span>${emoji}</span></div>`,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -40],
  })

function Recenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, map.getZoom())
  }, [center?.[0], center?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const Tiles = () => (
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
)

/** Shows donations as pins, plus the viewer's own location. */
export function DonationMap({ donations, me, onSelect, height = 420, radiusKm }) {
  const center = me?.lat != null ? [me.lat, me.lng] : donations[0] ? [donations[0].lat, donations[0].lng] : DEFAULT_CENTER
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%' }}>
        <Tiles />
        {me?.lat != null && (
          <>
            <Marker position={[me.lat, me.lng]} icon={pinIcon('📍', 'me')}>
              <Popup>You are here</Popup>
            </Marker>
            {radiusKm && <Circle center={[me.lat, me.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#1f5f3f', weight: 1, fillOpacity: 0.04 }} />}
          </>
        )}
        {donations.map((d) => (
          <Marker
            key={d.id}
            position={[d.lat, d.lng]}
            icon={pinIcon(CATEGORIES[d.category]?.icon || '🍽️', d.food_type)}
            eventHandlers={{ click: () => onSelect?.(d) }}
          >
            <Popup>
              <strong>{d.title}</strong>
              <br />
              {d.quantity} servings · {timeLeft(d.expires_at)}
              <br />
              {d.donor_org || d.donor_name}
              {d.match && <><br />Match score: <b>{d.match.score}%</b></>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

function ClickToSet({ onChange }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

/** Lets a user choose a location by clicking/dragging, or using GPS. */
export function LocationPicker({ value, onChange, height = 260 }) {
  const center = value?.lat != null ? [value.lat, value.lng] : DEFAULT_CENTER

  const useGps = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by this browser')
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert('Could not get your location. Please click on the map instead.'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="picker">
      <div className="picker-bar">
        <span className="muted small">Click on the map or drag the pin to set the location</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={useGps}>📡 Use my location</button>
      </div>
      <div className="map-wrap" style={{ height }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%' }}>
          <Tiles />
          <Recenter center={value?.lat != null ? center : null} />
          <ClickToSet onChange={onChange} />
          {value?.lat != null && (
            <Marker
              position={center}
              draggable
              icon={pinIcon('📍', 'me')}
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange({ lat: p.lat, lng: p.lng }) } }}
            />
          )}
        </MapContainer>
      </div>
      {value?.lat != null && (
        <div className="muted small">Selected: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</div>
      )}
    </div>
  )
}
