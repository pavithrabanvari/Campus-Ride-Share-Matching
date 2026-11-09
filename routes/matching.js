const router = require('express').Router();

function distanceKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

router.post('/rank', (req, res) => {
  const { request, offers, max_time_window_min: window = 30 } = req.body || {};
  const required = ['pickup_lat', 'pickup_lon', 'dropoff_lat', 'dropoff_lon', 'desired_time_min'];
  if (!request || required.some((key) => !Number.isFinite(Number(request[key]))) || !Array.isArray(offers) || !Number.isFinite(Number(window)) || Number(window) < 0) {
    return res.status(400).json({ success: false, message: 'Provide valid request coordinates, desired time, offers, and time window.' });
  }
  const matches = offers.filter((offer) => {
    const timeDiff = Math.abs(Number(request.desired_time_min) - Number(offer.departure_time_min));
    return String(offer.status).toLowerCase() === 'active' && Number(offer.available_seats) > 0 && timeDiff <= Number(window);
  }).map((offer) => {
    const timeDiff = Math.abs(Number(request.desired_time_min) - Number(offer.departure_time_min));
    const pickupDistance = distanceKm(Number(request.pickup_lat), Number(request.pickup_lon), Number(offer.pickup_lat), Number(offer.pickup_lon));
    const dropoffDistance = distanceKm(Number(request.dropoff_lat), Number(request.dropoff_lon), Number(offer.dropoff_lat), Number(offer.dropoff_lon));
    return {
      offer_id: offer.id,
      driver_name: offer.driver_name || 'Student',
      score: Math.round(Math.max(0, 100 - (pickupDistance + dropoffDistance) * 5 - timeDiff * 0.5) * 100) / 100,
      available_seats: Number(offer.available_seats),
      pickup: offer.pickup_name || 'Pickup',
      dropoff: offer.dropoff_name || 'Dropoff',
      time_delta_min: timeDiff
    };
  }).filter((match) => match.score > 0).sort((a, b) => b.score - a.score);
  return res.json({ status: 'success', count: matches.length, matches });
});

module.exports = router;
