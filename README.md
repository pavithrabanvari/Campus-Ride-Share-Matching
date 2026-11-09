# Campus Ride-Share Matching

> A platform where students post ride offers or requests with pickup/drop-off points and are matched based on route compatibility. The project implements geospatial query handling, matching heuristics, and notification via in-app messaging.

## Application layout

- `frontend/` contains the student web interface.
- `server.js` is the main Express application. It serves the frontend and mounts the API routes.
- `routes/rides.js` and `models/Ride.js` provide ride creation and MongoDB geospatial search.
- `routes/matching.js` ranks search candidates using pickup distance, destination distance, departure-time difference, and seat/status filters.
- `routes/messaging.js` provides prototype in-app messaging. Messages are currently held in process memory and reset when the server restarts.
- `routes/auth.js` and `middleware/auth.js` provide registration, sign-in, and JWT-protected ride creation.
- `main.py`, `routes/matching.py`, and `matching_engine/` retain the standalone FastAPI matching API and Python scoring implementation for development and comparison. The browser application uses the Express API.

## Run locally

Requirements: Node.js, MongoDB, and npm dependencies installed with `npm install`.

Set `MONGO_URI` to your MongoDB connection string. Set `JWT_SECRET` to a private random value for a stable development session. Then run:

```sh
npm start
```

Open `http://localhost:5000`. The frontend searches active ride offers from MongoDB and submits the results to the matching API. To create ride posts, sign in through `/api/auth/register` or `/api/auth/login` and send a Bearer token to the protected ride endpoints.

## Main API routes

- `POST /api/auth/register` and `POST /api/auth/login`
- `POST /api/rides/offers` and `POST /api/rides/requests` (Bearer token required)
- `GET /api/rides/search?originLat=…&originLng=…` with optional destination and departure-time filters
- `POST /api/matches/rank`
- `POST /api/messages/send` and `GET /api/messages/:userId`

Geospatial search details and the module's test evidence are in `docs/SRS_Geospatial_Update.md`, `docs/RTM_Geospatial_Update.md`, and `docs/STP_Geospatial_Update.md`.
