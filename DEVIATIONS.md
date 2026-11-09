# Sprint 2 Architecture & Design Deviations

This document details all technical, architectural, and design deviations made during the implementation of Sprint 2 for the Campus Ride-Share Matching system. These modifications were introduced to improve API security, streamline runtime validation, and simplify request payloads while adhering to system requirements.

---

## 1. Authentication & Middleware (NFR-03 Security)

* **Original SRS/SAD Specification:** 
  - Token passing strategy specified plain HTTP headers for authentication checks.
* **Implemented Solution:** 
  - Adopted standard **JSON Web Token (JWT) Bearer Authentication** passed via the `Authorization` header (`Bearer <token>`).
* **Justification:** 
  - Standardizes REST API stateless security and allows seamless context extraction (`req.user.id`) across all protected endpoints.

---

## 2. Ride Offer Ownership & Authorization Verification (FR-08)

* **Original SRS/SAD Specification:** 
  - Generic update logic using a static user ID check in the request body.
* **Implemented Solution:** 
  - Strict ownership check inside the `PATCH /offers/:id` endpoint comparing `ride.host.toString()` against `req.user.id` extracted from the decoded JWT.
  - Returns an explicit **HTTP 403 Forbidden** status code with `{ success: false, message: 'Access denied: You can only modify your own ride offers' }` if unauthorized.
* **Justification:** 
  - Prevents client-side parameter tampering and guarantees that only the authentic creator of a ride offer can edit or cancel it.

---

## 3. Payload & Field Validation Handling

* **Original SRS/SAD Specification:** 
  - Complex nested objects for route coordinates during initial ride offer creation.
* **Implemented Solution:** 
  - Flattened required creation attributes to `source`, `destination`, `departureTime`, `seatsAvailable`, and `vehicleDetails` with explicit HTTP 400 validation checks.
* **Justification:** 
  - Reduces API payload overhead and prevents runtime exceptions caused by missing schema properties.

---

## 4. Response Schema Consistency

* **Original SRS/SAD Specification:** 
  - Variable JSON structure formats across success and error handling paths.
* **Implemented Solution:** 
  - Unified all API endpoints under a standardized JSON wrapper:
    ```json
    {
      "success": true | false,
      "message": "Descriptive status message",
      "data": { ... } // (Included on success)
    }
    ```
* **Justification:** 
  - Simplifies frontend integration and simplifies client-side error handling.

## 5. Geospatial Search & Filtering (FR-10, FR-11, NFR-01)

**Owner:** Khushi - Geospatial Search and Filtering.

### Review findings

| Topic | Markdown SRS/SAD baseline | Implementation | Finding |
|---|---|---|---|
| Distance model | MongoDB spherical geospatial search with `2dsphere` indexes. | `$geoNear` uses `spherical: true` and computes `distanceMeters`; destination filtering uses `$geoWithin` and `$centerSphere`. | No deviation identified. The implementation does not use planar Euclidean distance. |
| Maps/geocoding service | No external map, geocoding, or directions provider is required by the geospatial Markdown update. | Coordinates are supplied with ride data and converted to GeoJSON. No Google Maps API or external geocoder is called by the search module. | No deviation identified from the Markdown update. External map/geocoding integration remains unimplemented. |
| Candidate scope | Active offers are filtered by origin radius, optional destination radius, and optional departure window; results are capped at 50. | Search applies the documented filters and `$limit: 50`; ride requests are not returned by this endpoint. | No deviation identified. |
| Distance in response | The Markdown SRS/SAD update records distance as an internal query field, not a public response field. | MongoDB produces `distanceMeters`; the response mapper omits it. | No deviation identified. |

### Baseline limitation

This review compares the implementation with `docs/SRS_Geospatial_Update.md` and `docs/SAD_Geospatial_Update.md`. The original root-level SRS and SAD PDFs were not used as the comparison baseline in this Markdown review. Any difference between those older PDFs and the current geospatial updates remains unverified and should be reconciled if the PDFs explicitly require Euclidean distance, a Google Maps API, or another geospatial behavior.

### Evidence reviewed

- `routes/rides.js`
- `models/Ride.js`
- `docs/SRS_Geospatial_Update.md`
- `docs/SAD_Geospatial_Update.md`
- `docs/STP_Geospatial_Update.md`
- `docs/RTM_Geospatial_Update.md`