# Requirements Traceability Matrix - Geospatial Update

| Field | Value |
|---|---|
| Document | RTM geospatial module update |
| Updated | November 6, 2026 |
| Owner | Khushi - Geospatial Search and Filtering |
| Scope | FR-10, FR-11, NFR-01, TC-05, and TC-11 |

This is the geospatial portion of the project RTM. Requirement IDs follow the ownership matrix; descriptions below state the behavior implemented and verified in this module. Other requirements and test cases remain with their assigned owners.

| Requirement ID | Implemented requirement / quality target | Test case | Verification evidence | Result |
|---|---|---|---|---|
| FR-10 | Store origin and destination coordinates for ride offers and requests; validate latitude/longitude ranges; derive GeoJSON points in `[longitude, latitude]` order. | TC-05 | Schema unit checks and integration posts covering valid, out-of-range, and null coordinates; four `2dsphere` indexes declared. | PASS |
| FR-11 | Search active ride offers using an origin radius, optional destination radius, and optional paired departure-time window; return a defined empty result for valid searches without matches. | TC-05 | Integration checks for origin/destination/time filters, the 1 km boundary fixture, malformed input, and empty result behavior. | PASS |
| FR-11 | Return normalized request and offer fields accepted by the matching module when destination and time context are available. | TC-05 | Integration assertion of exact payload keys and successful submission to `/api/matches/rank`. This verifies interface acceptance, not independent ranking correctness. | PASS |
| NFR-01 | Complete each geospatial search response in less than 3,000 ms. | TC-11 | Local run with 1,005 offers and 25 timed requests: p95 23.44 ms, maximum 26.85 ms. | PASS |

## Evidence sources

- `test-ride-geospatial.js`
- `test-ride-search-integration.js`
- `models/Ride.js`
- `routes/rides.js`
- Execution command: `npm test` on November 6, 2026

The local performance measurement is environment-specific. No production load test or cross-browser test is claimed by this module RTM update.
