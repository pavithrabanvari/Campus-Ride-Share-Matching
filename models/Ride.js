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
  departureTime: { type: Date, required: true },
  seatsAvailable: { type: Number, required: function() { return this.type === 'OFFER'; } },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ride', RideSchema);