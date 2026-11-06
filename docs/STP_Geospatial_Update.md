# Software Test Plan - Geospatial Search Update

| Field | Value |
|---|---|
| Document | STP geospatial module update |
| Version | 1.3 |
| Execution date | November 6, 2026 |
| Owner | Khushi - Geospatial Search and Filtering |
| Scope | TC-05, TC-11, FR-10, FR-11, and NFR-01 geospatial verification |

This update records the actual local test run for the geospatial module. It does not report test outcomes for other team members' requirements.

## Test environment

- Command: `npm test`
- Components: Node.js ride service, Mongoose schemas, local MongoDB, and the matching-engine contract exercised by the integration test.
- Database: disposable `campus-ride-share-geospatial-integration-test`; the integration suite refuses to run against another database name and drops this test database during cleanup.
- Dataset: 1,005 offers, including synthetic campus-route fixtures. This dataset is for testing and is not a production seed catalog.
- Performance measurement: three warm-up search requests followed by 25 timed HTTP requests. The percentile is calculated as the sorted observation at `ceil(25 * 0.95)`.

## Results summary

| Test case | Requirement mapping | Result | Evidence |
|---|---|---|---|
| TC-05 - Geospatial validation and search behavior | FR-10, FR-11 | **PASS** | Schema and API coordinate checks; origin/destination/departure filtering; radius boundary; empty search; ranker payload shape. |
| TC-11 - Geospatial response-time benchmark | NFR-01 | **PASS** | 25 timed searches over 1,005 offers; p95 23.44 ms; maximum 26.85 ms against a strict 3,000 ms limit. |

## TC-05 - Geospatial validation and search behavior

**Objective:** Verify coordinate conversion and validation, search filters, radius behavior, empty results, and the interface shape handed to matching.

**Checks and outcome:**

- Coordinates are stored as GeoJSON `[longitude, latitude]`; schema unit checks confirm out-of-range latitude is rejected and all four spatial indexes are declared - **PASS**.
- Ride offer creation rejects out-of-range and null coordinates; valid offer and request posts succeed - **PASS**.
- Search rejects missing, blank, null, malformed, and out-of-range coordinates; incomplete/invalid destination and departure inputs; and radii outside `(0, 100]` - **PASS**.
- Origin radius, destination radius, and inclusive departure window retain the expected offers and exclude offers outside each filter - **PASS**.
- A fixture approximately 0.99 km from the origin is included in a 1 km search - **PASS**.
- A valid search without matches returns HTTP 200 with `count: 0` - **PASS**.
- Response `request` and `offers` keys match the matching engine's expected contract, and the integration test submits the payload to the ranker endpoint - **PASS**.

**Overall result: PASS.**

## TC-11 - NFR-01 response-time benchmark

**Objective:** Verify geospatial search responses remain below 3 seconds under the local test load.

| Measurement | Observed | Acceptance threshold | Result |
|---|---:|---:|---|
| Timed requests | 25 | At least one timed request | PASS |
| Loaded offers | 1,005 | Representative local test dataset | PASS |
| p95 response time | 23.44 ms | `< 3,000 ms` | PASS |
| Maximum response time | 26.85 ms | `< 3,000 ms` | PASS |

**Overall result: PASS.** These values are from a single local test run; they are not a production or cross-environment latency guarantee. Hardware and network details were not captured by the test harness.

## Execution evidence and limits

The `npm test` run completed successfully on November 6, 2026. It ran `test-ride-geospatial.js` and `test-ride-search-integration.js`. Integration checks reported PASS for authenticated offer/request posts, coordinate validation, null/extreme input handling, empty results, route/time filtering, radius boundary, ranker payload/scoring acceptance, and NFR-01.

The integration test verifies that the ranker accepts and scores the search response payload; the matching heuristic's independent correctness is outside this geospatial test scope. The benchmark uses a local disposable database and synthetic test data.
