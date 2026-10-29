const mongoose = require('mongoose');

const rideOfferSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originAddress: { type: String, required: true },
  originCoordinates: { lat: Number, lng: Number },
  destinationAddress: { type: String, required: true },
  destinationCoordinates: { lat: Number, lng: Number },
  departureTime: { type: Date, required: true },
  availableSeats: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'], default: 'ACTIVE' }
});

const rideRequestSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originAddress: { type: String, required: true },
  originCoordinates: { lat: Number, lng: Number },
  destinationAddress: { type: String, required: true },
  destinationCoordinates: { lat: Number, lng: Number },
  desiredTime: { type: Date, required: true },
  seatsNeeded: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'FULFILLED'], default: 'ACTIVE' }
});

module.exports = {
  RideOffer: mongoose.model('RideOffer', rideOfferSchema),
  RideRequest: mongoose.model('RideRequest', rideRequestSchema)
};