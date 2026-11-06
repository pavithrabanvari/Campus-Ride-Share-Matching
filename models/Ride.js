const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['OFFER', 'REQUEST'], required: true },
  source: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  destination: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
<<<<<<< HEAD
=======
  originAddress: { type: String, required: true, trim: true },
  originCoordinates: {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 }
  },
  destinationAddress: {
    type: String,
    required: true,
    trim: true
  },
  destinationCoordinates: {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 }
  },

  // New GeoJSON fields
  originLocation: { type: geoPointSchema },
  destinationLocation: { type: geoPointSchema },

>>>>>>> main
  departureTime: { type: Date, required: true },
  seatsAvailable: { type: Number, required: function() { return this.type === 'OFFER'; } },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

<<<<<<< HEAD
module.exports = mongoose.model('Ride', RideSchema);
=======
const rideRequestSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originAddress: { type: String, required: true, trim: true },
  originCoordinates: {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 }
  },
  destinationAddress: {
    type: String,
    required: true,
    trim: true
  },
  destinationCoordinates: {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 }
  },

  // New GeoJSON fields
  originLocation: { type: geoPointSchema },
  destinationLocation: { type: geoPointSchema },

  desiredTime: { type: Date, required: true },
  seatsNeeded: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'FULFILLED'],
    default: 'ACTIVE'
  }
});

// Generate GeoJSON points from the existing { lat, lng } format.
// GeoJSON always uses [longitude, latitude].
function syncGeoLocations() {
  for (const [coordinatesField, locationField] of [
    ['originCoordinates', 'originLocation'],
    ['destinationCoordinates', 'destinationLocation']
  ]) {
    const point = this[coordinatesField];

    if (
      point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng)
    ) {
      this[locationField] = {
        type: 'Point',
        coordinates: [point.lng, point.lat]
      };
    }
  }
}

rideOfferSchema.pre('validate', syncGeoLocations);
rideRequestSchema.pre('validate', syncGeoLocations);

// Geospatial indexes for offers and requests
rideOfferSchema.index({ originLocation: '2dsphere' });
rideOfferSchema.index({ destinationLocation: '2dsphere' });

rideRequestSchema.index({ originLocation: '2dsphere' });
rideRequestSchema.index({ destinationLocation: '2dsphere' });

module.exports = {
  RideOffer: mongoose.model('RideOffer', rideOfferSchema),
  RideRequest: mongoose.model('RideRequest', rideRequestSchema)
};

>>>>>>> main
