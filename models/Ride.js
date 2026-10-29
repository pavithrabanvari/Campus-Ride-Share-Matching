
const mongoose = require('mongoose');

// GeoJSON Point schema for MongoDB geospatial queries
const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (coords) {
          return (
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords.every(Number.isFinite) &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] within valid ranges'
      }
    }
  },
  { _id: false }
);

const rideOfferSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originAddress: { type: String, required: true, trim: true },
  originCoordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },
  destinationAddress: {
    type: String,
    required: true,
    trim: true
  },
  destinationCoordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },

  // New GeoJSON fields
  originLocation: { type: geoPointSchema },
  destinationLocation: { type: geoPointSchema },

  departureTime: { type: Date, required: true },
  availableSeats: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'],
    default: 'ACTIVE'
  }
});

const rideRequestSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originAddress: { type: String, required: true, trim: true },
  originCoordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },
  destinationAddress: {
    type: String,
    required: true,
    trim: true
  },
  destinationCoordinates: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
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

