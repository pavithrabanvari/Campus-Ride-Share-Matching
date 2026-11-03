# Geospatial search verification (November 3, 2026)

This records the checks run in the local workspace for Khushi's geospatial-search scope. The sprint checklist is dated October 30; this verification was performed four days later.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| FR-10 coordinate conversion and validation | PASS (schema level) | `node test-ride-geospatial.js`: GeoJSON longitude/latitude conversion, invalid latitude rejection, and all four declared 2dsphere indexes passed. |
| FR-11 distance and radius boundary behavior | NOT VERIFIED | Search uses MongoDB `$near` with a maximum distance in metres and a destination `$centerSphere`, but no running MongoDB service or seeded rides were available to exercise inclusion/exclusion boundaries. |
| TC-05 / TC-11 | PARTIAL | Schema checks passed; matching engine's existing test suite passed locally. Test case definitions were not available as searchable text in the supplied STP PDF, and no HTTP/database integration run was available. |
| NFR-01 (< 3 seconds) | NOT VERIFIED | The route logs elapsed response time and PASS/FAIL against 3000 ms. A benchmark against MongoDB with representative ride data is still required; local schema-only timings are not a query benchmark. |
| Keertika ride-post integration | NOT VERIFIED | The offer/request models and POST endpoints are present, but no authenticated posts or persisted records were available for end-to-end search verification. |
| Tanishkaa ranker handoff | CONTRACT MAPPED | Search response includes `request` and `offers` using `routes/matching.py` / `matching_engine/scorer.py` field names. A live cross-service call has not been exercised. |

The route accepts `originLat`/`originLng` (or the legacy `lat`/`lng` aliases), optional `destinationLat`/`destinationLng`, `radiusKm`, and an optional paired `departureFrom`/`departureTo` ISO datetime range. To produce a ranker-ready `request`, provide destination coordinates and either `desiredTime` or the departure window. Candidate times are represented as absolute UTC minutes so time deltas remain meaningful across midnight and date boundaries.

Remaining verification requires a MongoDB instance with representative offer data, an authenticated post from the ride-post module, an HTTP request through the search endpoint, and a benchmark capturing response time. Confirm the TC-05 and TC-11 labels against the STP before marking those cases complete.
