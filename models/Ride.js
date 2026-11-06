const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator(coords) {
        return Array.isArray(coords) && coords.length === 2 &&
          coords.every(Number.isFinite) && coords[0] >= -180 && coords[0] <= 180 &&
          coords[1] >= -90 && coords[1] <= 90;
      },
      message: 'Coordinates must be [longitude, latitude] within valid ranges'
    }
  }
}, { _id: false });

const coordinatesSchema = new mongoose.Schema({
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 }
}, { _id: false });

function syncGeoLocations() {
  for (const [coordinatesField, locationField] of [
    ['originCoordinates', 'originLocation'],
    ['destinationCoordinates', 'destinationLocation']
  ]) {
    const point = this[coordinatesField];
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
      this[locationField] = { type: 'Point', coordinates: [point.lng, point.lat] };
    }
  }
}

const rideOfferSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originAddress: { type: String, required: true, trim: true },
  originCoordinates: { type: coordinatesSchema, required: true },
  originLocation: { type: geoPointSchema, required: true },
  destinationAddress: { type: String, required: true, trim: true },
  destinationCoordinates: { type: coordinatesSchema, required: true },
  destinationLocation: { type: geoPointSchema, required: true },
  departureTime: { type: Date, required: true },
  availableSeats: { type: Number, required: true, min: 1 },
  vehicleDetails: { type: String, trim: true, maxlength: 300 },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

const rideRequestSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originAddress: { type: String, required: true, trim: true },
  originCoordinates: { type: coordinatesSchema, required: true },
  originLocation: { type: geoPointSchema, required: true },
  destinationAddress: { type: String, required: true, trim: true },
  destinationCoordinates: { type: coordinatesSchema, required: true },
  destinationLocation: { type: geoPointSchema, required: true },
  desiredTime: { type: Date, required: true },
  seatsNeeded: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'FULFILLED'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

rideOfferSchema.pre('validate', syncGeoLocations);
rideRequestSchema.pre('validate', syncGeoLocations);
rideOfferSchema.index({ originLocation: '2dsphere' });
rideOfferSchema.index({ destinationLocation: '2dsphere' });
rideRequestSchema.index({ originLocation: '2dsphere' });
rideRequestSchema.index({ destinationLocation: '2dsphere' });

module.exports = {
  RideOffer: mongoose.models.RideOffer || mongoose.model('RideOffer', rideOfferSchema),
  RideRequest: mongoose.models.RideRequest || mongoose.model('RideRequest', rideRequestSchema)
};
