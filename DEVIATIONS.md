# Geospatial Deviations Review

| Field | Value |
|---|---|
| Review date | November 6, 2026 |
| Owner | Khushi - Geospatial Search and Filtering |
| Scope | Geospatial implementation compared with the repository's Markdown SRS/SAD updates |

## Review findings

| Topic | Markdown SRS/SAD baseline | Implementation | Finding |
|---|---|---|---|
| Distance model | MongoDB spherical geospatial search with `2dsphere` indexes. | `$geoNear` uses `spherical: true` and computes `distanceMeters`; destination filtering uses `$geoWithin` and `$centerSphere`. | No deviation identified. The implementation does not use planar Euclidean distance. |
| Maps/geocoding service | No external map, geocoding, or directions provider is required by the geospatial Markdown update. | Coordinates are supplied with ride data and converted to GeoJSON. No Google Maps API or external geocoder is called by the search module. | No deviation identified from the Markdown update. External map/geocoding integration remains unimplemented. |
| Candidate scope | Active offers are filtered by origin radius, optional destination radius, and optional departure window; results are capped at 50. | Search applies the documented filters and `$limit: 50`; ride requests are not returned by this endpoint. | No deviation identified. |
| Distance in response | The Markdown SRS/SAD update records distance as an internal query field, not a public response field. | MongoDB produces `distanceMeters`; the response mapper omits it. | No deviation identified. |

## Baseline limitation

This review compares the implementation with `docs/SRS_Geospatial_Update.md` and `docs/SAD_Geospatial_Update.md`. The original root-level SRS and SAD PDFs were not used as the comparison baseline in this Markdown review. Any difference between those older PDFs and the current geospatial updates remains unverified and should be reconciled if the PDFs explicitly require Euclidean distance, a Google Maps API, or another geospatial behavior.

## Evidence reviewed

- `routes/rides.js`
- `models/Ride.js`
- `docs/SRS_Geospatial_Update.md`
- `docs/SAD_Geospatial_Update.md`
- `docs/STP_Geospatial_Update.md`
- `docs/RTM_Geospatial_Update.md`
