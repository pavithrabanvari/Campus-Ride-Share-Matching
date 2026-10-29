
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { RideOffer, RideRequest } = require('./models/Ride');

async function main() {
  // Test 1: Coordinates are converted to GeoJSON correctly.
  const offer = new RideOffer({
    driver: new mongoose.Types.ObjectId(),
    originAddress: 'Whitefield',
    originCoordinates: { lat: 12.9698, lng: 77.7500 },
    destinationAddress: 'Electronic City',
    destinationCoordinates: { lat: 12.8399, lng: 77.6770 },
    departureTime: new Date(),
    availableSeats: 3
  });

  await offer.validate();

  assert.deepEqual(
    offer.originLocation.coordinates,
    [77.7500, 12.9698]
  );

  assert.deepEqual(
    offer.destinationLocation.coordinates,
    [77.6770, 12.8399]
  );

  console.log('PASS: Coordinates convert to GeoJSON.');

  // Test 2: Invalid latitude is rejected.
  const invalidOffer = new RideOffer({
    driver: new mongoose.Types.ObjectId(),
    originAddress: 'Invalid location',
    originCoordinates: { lat: 100, lng: 77.75 },
    destinationAddress: 'Electronic City',
    destinationCoordinates: { lat: 12.8399, lng: 77.6770 },
    departureTime: new Date(),
    availableSeats: 3
  });

  await assert.rejects(() => invalidOffer.validate());
  console.log('PASS: Invalid latitude is rejected.');

  // Test 3: Both models have geospatial indexes.
  for (const Model of [RideOffer, RideRequest]) {
    const indexes = Model.schema.indexes();

    assert.ok(
      indexes.some(([keys]) => keys.originLocation === '2dsphere'),
      `${Model.modelName} is missing its origin index`
    );

    assert.ok(
      indexes.some(([keys]) => keys.destinationLocation === '2dsphere'),
      `${Model.modelName} is missing its destination index`
    );
  }

  console.log('PASS: All four geospatial indexes are declared.');
  console.log('All schema tests passed!');
}

main().catch((error) => {
  console.error('TEST FAILED:', error);
  process.exitCode = 1;
});
