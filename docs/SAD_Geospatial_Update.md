# Software Architecture Description - Geospatial Search Update

| Field | Value |
|---|---|
| Document | SAD geospatial module update |
| Version | 1.1 |
| Updated | November 5, 2026 |
| Owner | Khushi - Geospatial Search and Filtering |
| Scope | Ride location persistence, indexed search, and matching payload boundary |

This update supplements the existing architecture baseline with the geospatial design implemented in the ride service. It describes Khushi's module and its interface with the matching module; it does not revise the other teams' internal designs.

## Components and responsibilities

| Component | Responsibility |
|---|---|
| Express ride routes (`routes/rides.js`) | Validate search query parameters, execute the active-offer spatial query, return search results, and log response latency. |
| Mongoose ride models (`models/Ride.js`) | Validate address and coordinate fields, derive GeoJSON points, and declare spatial indexes for ride offers and requests. |
| MongoDB | Execute spherical origin-distance and destination-within-radius filters using `2dsphere` indexes. |
| Matching engine interface | Consume the normalized `request` and `offers` objects returned by search. Matching scores are owned by the matching module. |

## Data representation and indexes

Offers and requests keep application-facing coordinates as `{ lat, lng }` and store origin and destination as GeoJSON points. Model validation limits coordinate ranges, and a pre-validation hook derives each GeoJSON point as `[longitude, latitude]`.

Four `2dsphere` indexes are declared: offer origin, offer destination, request origin, and request destination. The current search route uses the offer-origin index for `$geoNear`; when a destination is provided, it applies `$geoWithin` with `$centerSphere` at the destination and the same requested radius. The request indexes support geospatial storage and future request-side spatial queries; this route does not query requests.

## Search flow

1. A client calls `GET /api/rides/search` with origin coordinates and optional destination coordinates, radius, and departure interval.
2. The route validates coordinates, radius, paired destination fields, paired departure fields, date order, and optional desired time.
3. MongoDB runs `$geoNear` against active offers, applies the optional inclusive departure filter, then applies the optional destination-radius filter.
4. The route caps candidates at 50 and maps stored offers into the public response. The internal `distanceMeters` field is used for query ordering but is omitted from the mapped offer objects.
5. The response carries normalized offer fields and, when enough request context is available, a normalized `request` object in the matching engine's expected contract.
6. The matching module can score that payload. The search route itself does not invoke the scoring endpoint.

## API boundary

`GET /api/rides/search` is currently an unauthenticated read route. It accepts `originLat`/`originLng` (with `lat`/`lng` compatibility aliases), optional `destinationLat`/`destinationLng`, optional `radiusKm` (default 5, valid range `(0, 100]`), optional paired `departureFrom`/`departureTo`, and optional ISO `desiredTime`.

The response shape is `{ count, radiusKm, request, offers }`. Offer timestamps and desired request time are converted to absolute UTC minutes for the matching contract. The endpoint returns HTTP 400 for invalid input and HTTP 200 with an empty list for a valid query without matches.

## Runtime monitoring and verification boundary

Search response timing is measured with a high-resolution process timer and logged when the response finishes. The threshold is strictly less than 3,000 ms. The local benchmark used the disposable MongoDB database `campus-ride-share-geospatial-integration-test`, seeded 1,005 offers, warmed up with three searches, and timed 25 additional searches. Results are recorded in `STP_Geospatial_Update.md`. This is a local module benchmark, not a production-capacity claim.

## Known module boundaries

- Only active ride offers are searched by this endpoint; requests are not matched here.
- Candidate results are capped at 50.
- Distance is calculated internally in meters, but is not currently exposed as a response field.
- Campus route fixtures are synthetic and are used for tests only.
- The route returns a ranker-compatible contract; ranking behavior remains owned by the matching module.
