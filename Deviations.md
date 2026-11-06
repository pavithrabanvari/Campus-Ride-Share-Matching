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