const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const mongoose = require('mongoose');
const { RideOffer, RideRequest } = require('./models/Ride');

const TEST_DB = 'campus-ride-share-geospatial-integration-test';
const MONGO_URI = `mongodb://127.0.0.1:27017/${TEST_DB}`;
const rankerHttpTest = String.raw`
import json, sys
from fastapi.testclient import TestClient
from main import app
response = TestClient(app).post("/api/matches/rank", json=json.load(sys.stdin))
response.raise_for_status()
print(json.dumps(response.json()))
`;

async function main() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  assert.equal(mongoose.connection.name, TEST_DB, 'Refusing to run outside the disposable test database');

  const portProbe = net.createServer();
  await new Promise((resolve, reject) => {
    portProbe.once('error', reject);
    portProbe.listen(0, '127.0.0.1', resolve);
  });
  const port = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));

  const serverProcess = spawn(process.execPath, [require.resolve('./server.js')], {
    cwd: process.cwd(),
    env: { ...process.env, MONGO_URI, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverOutput = '';
  serverProcess.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  serverProcess.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${serverOutput}`)), 10000);
    serverProcess.on('error', (error) => { clearTimeout(timeout); reject(error); });
    serverProcess.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited with code ${code} before listening: ${serverOutput}`));
    });
    const checkReady = () => {
      if (serverOutput.includes(`Server running on port ${port}`)) {
        clearTimeout(timeout);
        resolve();
      }
    };
    serverProcess.stdout.on('data', checkReady);
    serverProcess.stderr.on('data', checkReady);
  });

    await Promise.all([RideOffer.createIndexes(), RideRequest.createIndexes()]);
    const baseUrl = `http://127.0.0.1:${port}`;
    const api = async (path, options = {}) => {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { 'content-type': 'application/json', ...(options.headers || {}) }
      });
      return { status: response.status, body: await response.json() };
    };

    const createAccount = async (name) => {
      const email = `khushi.geo.${name.toLowerCase()}.${Date.now()}-${Math.random().toString(16).slice(2)}@pes.edu`;
      const registration = await api('/api/auth/register', {
        method: 'POST', body: JSON.stringify({ name, email, password: 'test-password' })
      });
      assert.equal(registration.status, 201);
      const login = await api('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password: 'test-password' })
      });
      assert.equal(login.status, 200);
      return { authorization: `Bearer ${login.body.token}` };
    };
    const driverAuth = await createAccount('Geospatial Driver');
    const riderAuth = await createAccount('Geospatial Rider');

    const desiredTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const origin = { lat: 12.9716, lng: 77.5946 };
    const destination = { lat: 12.8399, lng: 77.6770 };
    const departureFrom = new Date(desiredTime.getTime() - 10 * 60 * 1000);
    const departureTo = new Date(desiredTime.getTime() + 10 * 60 * 1000);

    const invalidCoordinate = await api('/api/rides/offers', {
      method: 'POST', headers: driverAuth,
      body: JSON.stringify({
        originAddress: 'Invalid', originCoordinates: { lat: 91, lng: origin.lng },
        destinationAddress: 'Destination', destinationCoordinates: destination,
        departureTime: desiredTime, availableSeats: 1
      })
    });
    assert.equal(invalidCoordinate.status, 400, 'Out-of-range coordinate should be rejected');

    const offer = await api('/api/rides/offers', {
      method: 'POST', headers: driverAuth,
      body: JSON.stringify({
        originAddress: 'PES Main Gate', originCoordinates: origin,
        destinationAddress: 'Electronic City', destinationCoordinates: destination,
        departureTime: desiredTime, availableSeats: 2
      })
    });
    assert.equal(offer.status, 201);
    assert.deepEqual(offer.body.originLocation.coordinates, [origin.lng, origin.lat]);

    // Approximately 0.99 km from origin: inside the 1 km search boundary.
    const boundaryOffer = await api('/api/rides/offers', {
      method: 'POST', headers: driverAuth,
      body: JSON.stringify({
        originAddress: 'Near radius boundary', originCoordinates: { lat: origin.lat + 0.0089, lng: origin.lng },
        destinationAddress: 'Electronic City', destinationCoordinates: destination,
        departureTime: desiredTime, availableSeats: 1
      })
    });
    assert.equal(boundaryOffer.status, 201);

    const request = await api('/api/rides/requests', {
      method: 'POST', headers: riderAuth,
      body: JSON.stringify({
        originAddress: 'PES Main Gate', originCoordinates: origin,
        destinationAddress: 'Electronic City', destinationCoordinates: destination,
        desiredTime, seatsNeeded: 1
      })
    });
    assert.equal(request.status, 201);

    // Nearby origin but outside destination radius.
    assert.equal((await api('/api/rides/offers', {
      method: 'POST', headers: driverAuth,
      body: JSON.stringify({
        originAddress: 'Near origin', originCoordinates: { lat: origin.lat + 0.0001, lng: origin.lng },
        destinationAddress: 'Wrong destination', destinationCoordinates: { lat: destination.lat + 0.02, lng: destination.lng },
        departureTime: desiredTime, availableSeats: 1
      })
    })).status, 201);
    // Correct route but outside the origin search radius.
    assert.equal((await api('/api/rides/offers', {
      method: 'POST', headers: driverAuth,
      body: JSON.stringify({
        originAddress: 'Far origin', originCoordinates: { lat: origin.lat + 0.02, lng: origin.lng },
        destinationAddress: 'Electronic City', destinationCoordinates: destination,
        departureTime: desiredTime, availableSeats: 1
      })
    })).status, 201);
    // Correct route but outside the requested departure window.
    assert.equal((await api('/api/rides/offers', {
      method: 'POST', headers: driverAuth,
      body: JSON.stringify({
        originAddress: 'PES Main Gate', originCoordinates: origin,
        destinationAddress: 'Electronic City', destinationCoordinates: destination,
        departureTime: new Date(desiredTime.getTime() + 60 * 60 * 1000), availableSeats: 1
      })
    })).status, 201);

    const invalidSearches = [
      '/api/rides/search?originLat=91&originLng=77.5',
      '/api/rides/search?originLat=12&originLng=77&departureFrom=2030-01-01T00:00:00Z',
      '/api/rides/search?originLat=12&originLng=77&radiusKm=0'
    ];
    for (const path of invalidSearches) assert.equal((await api(path)).status, 400);

    const params = new URLSearchParams({
      originLat: String(request.body.originCoordinates.lat),
      originLng: String(request.body.originCoordinates.lng),
      destinationLat: String(request.body.destinationCoordinates.lat),
      destinationLng: String(request.body.destinationCoordinates.lng),
      desiredTime: new Date(request.body.desiredTime).toISOString(),
      departureFrom: departureFrom.toISOString(),
      departureTo: departureTo.toISOString(),
      radiusKm: '1'
    });
    const search = await api(`/api/rides/search?${params}`);
    assert.equal(search.status, 200);
    assert.equal(search.body.count, 2, 'Origin, destination, and departure filters should retain the match and the inside-radius boundary offer');
    assert.equal(search.body.offers[0].id, String(offer.body._id));
    assert.ok(search.body.offers.some((candidate) => candidate.id === String(boundaryOffer.body._id)));
    assert.deepEqual(Object.keys(search.body.request).sort(), [
      'desired_time_min', 'dropoff_lat', 'dropoff_lon', 'pickup_lat', 'pickup_lon'
    ].sort());
    assert.deepEqual(Object.keys(search.body.offers[0]).sort(), [
      'id', 'driver_name', 'pickup_lat', 'pickup_lon', 'dropoff_lat', 'dropoff_lon',
      'departure_time_min', 'available_seats', 'status', 'pickup_name', 'dropoff_name'
    ].sort());

    const ranker = spawnSync('python', ['-c', rankerHttpTest], {
      input: JSON.stringify({ request: search.body.request, offers: search.body.offers }),
      encoding: 'utf8'
    });
    assert.equal(ranker.status, 0, `Matching engine rejected the search payload: ${ranker.stderr}`);
    const ranked = JSON.parse(ranker.stdout.trim());
    assert.equal(ranked.count, 2, 'Matching engine should score the search results');

    // Exercise the indexed query with a representative local load after the
    // authenticated offer/request integration checks have passed.
    const loadOffers = Array.from({ length: 1000 }, (_, i) => {
      const offset = 0.001 + (i % 20) * 0.0001;
      const originCoordinates = { lat: origin.lat + offset, lng: origin.lng + offset };
      const destinationCoordinates = { lat: destination.lat + offset, lng: destination.lng + offset };
      return {
        driver: new mongoose.Types.ObjectId(),
        originAddress: `Load origin ${i}`, originCoordinates,
        originLocation: { type: 'Point', coordinates: [originCoordinates.lng, originCoordinates.lat] },
        destinationAddress: `Load destination ${i}`, destinationCoordinates,
        destinationLocation: { type: 'Point', coordinates: [destinationCoordinates.lng, destinationCoordinates.lat] },
        departureTime: desiredTime, availableSeats: 1, status: 'ACTIVE'
      };
    });
    await RideOffer.insertMany(loadOffers, { ordered: true });

    for (let i = 0; i < 3; i++) assert.equal((await api(`/api/rides/search?${params}`)).status, 200);
    const latenciesMs = [];
    for (let i = 0; i < 25; i++) {
      const start = performance.now();
      const response = await api(`/api/rides/search?${params}`);
      latenciesMs.push(performance.now() - start);
      assert.equal(response.status, 200);
    }
    latenciesMs.sort((a, b) => a - b);
    const p95Ms = latenciesMs[Math.ceil(latenciesMs.length * 0.95) - 1];
    assert.ok(p95Ms < 3000, `NFR-01 failed: p95 ${p95Ms.toFixed(2)} ms >= 3000 ms`);

    process.stdout.write(JSON.stringify({
      status: 'PASS',
      database: TEST_DB,
      checks: {
        separateDriverAndRiderAccounts: 'PASS',
        authenticatedOfferPost: 'PASS',
        authenticatedRequestPost: 'PASS',
        coordinateValidation: 'PASS',
        originDestinationDepartureFiltering: 'PASS',
        rankerPayloadAndScoring: 'PASS',
        radiusBoundary: 'PASS',
        nfr01: 'PASS'
      },
      loadedOfferCount: 1005,
      searchRequests: latenciesMs.length,
      p95Ms: Number(p95Ms.toFixed(2)),
      maxMs: Number(latenciesMs.at(-1).toFixed(2))
    }) + '\n');
  } finally {
    if (serverProcess.exitCode === null) {
      const exited = new Promise((resolve) => serverProcess.once('exit', resolve));
      serverProcess.kill();
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
