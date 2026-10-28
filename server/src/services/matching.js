// Smart matching engine.
// Ranks donations for a receiver (and receivers for a donation) using a weighted score of:
//   distance (35%), expiry urgency (25%), quantity fit (20%), food preference (10%), fairness (10%).
// Every score comes with human-readable reasons so the match is explainable.

const MAX_DISTANCE_KM = Number(process.env.MATCH_RADIUS_KM || 15);

const WEIGHTS = { distance: 0.35, urgency: 0.25, quantity: 0.2, preference: 0.1, fairness: 0.1 };

// Great-circle distance between two lat/lng points, in kilometres.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function hoursUntil(isoDate) {
  return (new Date(isoDate).getTime() - Date.now()) / 36e5;
}

// Veg-only receivers can never be matched with non-veg or mixed food.
function isCompatible(donation, receiver) {
  if (receiver.food_preference === 'veg' && donation.food_type !== 'veg') return false;
  return true;
}

/**
 * Score one donation against one receiver.
 * @param donation  row from donations table
 * @param receiver  row from users table (role = receiver)
 * @param activeClaims number of claims this receiver currently has open
 * @returns { score 0-100, distanceKm, reasons[], compatible }
 */
function scoreMatch(donation, receiver, activeClaims = 0) {
  const reasons = [];
  if (!isCompatible(donation, receiver)) {
    return { score: 0, distanceKm: null, reasons: ['Receiver accepts vegetarian food only'], compatible: false };
  }

  // 1. Distance
  let distanceKm = null;
  let sDistance = 0.3; // neutral value if receiver has no location saved
  if (receiver.lat != null && receiver.lng != null) {
    distanceKm = haversineKm(donation.lat, donation.lng, receiver.lat, receiver.lng);
    sDistance = Math.max(0, 1 - distanceKm / MAX_DISTANCE_KM);
    if (distanceKm <= 3) reasons.push(`Very close (${distanceKm.toFixed(1)} km)`);
    else if (distanceKm <= MAX_DISTANCE_KM) reasons.push(`${distanceKm.toFixed(1)} km away`);
    else reasons.push(`Far away (${distanceKm.toFixed(1)} km)`);
  }

  // 2. Urgency — food expiring sooner should be picked up first
  const h = hoursUntil(donation.expires_at);
  let sUrgency;
  if (h <= 2) { sUrgency = 1; reasons.push('Expires within 2 hours — urgent'); }
  else if (h <= 6) { sUrgency = 0.75; reasons.push(`Expires in ~${Math.round(h)} hours`); }
  else if (h <= 24) sUrgency = 0.45;
  else sUrgency = 0.25;

  // 3. Quantity fit — how well the amount matches the receiver's capacity
  const cap = receiver.capacity || 50;
  const sQuantity = Math.min(donation.quantity, cap) / Math.max(donation.quantity, cap);
  if (sQuantity >= 0.7) reasons.push(`Quantity (${donation.quantity}) fits capacity (${cap})`);
  else if (donation.quantity > cap) reasons.push(`More food than capacity (${cap}) — may need partial pickup`);

  // 4. Food preference
  let sPreference = 0.7;
  if (receiver.food_preference === 'veg' && donation.food_type === 'veg') { sPreference = 1; reasons.push('Matches veg preference'); }
  else if (receiver.food_preference === 'nonveg' && donation.food_type !== 'veg') { sPreference = 1; reasons.push('Matches food preference'); }
  else if (receiver.food_preference === 'any') sPreference = 0.9;

  // 5. Fairness — spread food across organisations instead of one taking everything
  const sFairness = 1 / (1 + activeClaims);
  if (activeClaims === 0) reasons.push('No pending pickups — fair distribution');

  const score =
    WEIGHTS.distance * sDistance +
    WEIGHTS.urgency * sUrgency +
    WEIGHTS.quantity * sQuantity +
    WEIGHTS.preference * sPreference +
    WEIGHTS.fairness * sFairness;

  return {
    score: Math.round(score * 100),
    distanceKm: distanceKm == null ? null : Number(distanceKm.toFixed(2)),
    reasons,
    compatible: true,
  };
}

module.exports = { scoreMatch, haversineKm, hoursUntil, MAX_DISTANCE_KM, WEIGHTS };
