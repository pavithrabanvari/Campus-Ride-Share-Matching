# Software Requirements Specification - Geospatial Search Update

| Field | Value |
|---|---|
| Document | SRS geospatial module update |
| Version | 1.1 |
| Updated | November 5, 2026 |
| Owner | Khushi - Geospatial Search and Filtering |
| Scope | FR-10, FR-11, and the geospatial portion of NFR-01 |

This update records the implemented geospatial behavior for the requirements owned by Khushi. It supplements the project SRS baseline; it does not replace requirements owned by the other modules.

## FR-10 - Location coordinates

Ride offers and ride requests shall store origin and destination addresses with geographic coordinates. Latitude shall be in the inclusive range -90 through 90, and longitude shall be in the inclusive range -180 through 180. The API's application-level coordinate objects use `{ "lat": number, "lng": number }`. The persistence layer shall derive GeoJSON `Point` values in the required `[longitude, latitude]` order.

Invalid, missing, or null coordinate values shall be rejected during ride creation or search validation. Mongoose schema validation and the API's search-parameter validation enforce these constraints.

## FR-11 - Geospatial ride search

`GET /api/rides/search` shall return active ride offers within the requested origin radius. The required query parameters are `originLat` and `originLng`; legacy aliases `lat` and `lng` remain accepted. `radiusKm` is optional, defaults to 5 km, and must be greater than 0 and at most 100 km.

The caller may provide both `destinationLat` and `destinationLng` to constrain the offer destination to the same radius. Supplying only one destination coordinate is invalid. The caller may also provide both `departureFrom` and `departureTo`; the inclusive interval filters offers by departure time, and the values must be valid dates with `departureFrom <= departureTo`.

The search includes active offers only and returns at most 50 offers. A valid query with no matches returns HTTP 200 with `count: 0` and an empty `offers` array. The search endpoint searches offers; ride requests are stored with geospatial fields but are not returned by this endpoint.

### Search response and matching-engine handoff

The response contains `count`, `radiusKm`, `request`, and `offers`. Each offer contains its identifier, pickup/drop-off coordinates and labels, departure time in absolute UTC minutes, available seats, driver label, and status. When destination coordinates and a desired time are available, `request` contains the matching engine's expected `pickup_lat`, `pickup_lon`, `dropoff_lat`, `dropoff_lon`, and `desired_time_min` fields. Otherwise, `request` is `null`. When only a departure window supplies a time, its midpoint is used for `desired_time_min`.

The internal geospatial distance is computed in meters for the origin query; `distanceMeters` is not currently included in the public response. Ranking is outside the ride search route. The returned `request` and `offers` form the payload boundary consumed by the matching module.

### Input and error behavior

| Condition | Expected behavior |
|---|---|
| Missing, malformed, blank, null, or out-of-range origin coordinate | HTTP 400 |
| Incomplete or invalid destination coordinate pair | HTTP 400 |
| Radius not finite, `<= 0`, or `> 100` km | HTTP 400 |
| Only one departure-window endpoint, invalid dates, or start after end | HTTP 400 |
| Invalid `desiredTime` | HTTP 400 |
| Valid search with no matching offers | HTTP 200 with an empty result |
| Unexpected search failure | HTTP 500 with a generic error response |

## NFR-01 - Search response time

Search responses shall complete in less than 3,000 ms. The route logs elapsed response time and a pass/fail result against this threshold. The November 5 benchmark and its limits are recorded in the geospatial STP update.

## Acceptance evidence

The geospatial integration suite covers coordinate conversion and validation, radius and route filtering, departure windows, empty results, matching payload shape, and search latency. The campus route fixture is synthetic test data, not a production seed dataset.
