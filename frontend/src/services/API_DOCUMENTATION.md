# Thinkz AI — Day 4 API Specification
## Developer: Gnanadeep

This document outlines the standardized specifications for response headers, list pagination models, error structures, and system health checks implemented on Day 4.

---

## 1. Caching & Response Headers (Module 1)
All GET endpoints include conditional verification headers (ETag) and route-specific Cache-Control max-age windows to improve mobile application load times.

### Durations Table:

| Endpoint Routing Pattern | Cache-Control Window | Expected Purpose |
| :--- | :--- | :--- |
| /v1/courses | public, max-age=300 | Course overview directory (5 min) |
| /v1/threads | public, max-age=120 | Community discussion threads (2 min) |
| /v1/notifications | public, max-age=30 | In-app alerts and notifications (30s) |
| /v1/analytics | public, max-age=600 | Profile progress analytics graphs (10 min) |

---

## 2. Cursor Pagination Standard (Module 2)
To maximize dataset horizontal scaling capability, all list data objects use cursor arrays instead of offset offsets.

### Request Format:
GET /v1/threads?limit=20&cursor=eyJpZCI6MTIzNH0=

### Standard JSON Response Schema:
json
{
  "data": [],
  "nextCursor": "ZXhhbXBsZUN1cnNvcjEyMw==",
  "hasMore": true,
  "totalCount": 142
}


---

## 3. Standardized Error Payload (Module 3)
All service failures return an unified dictionary mapping containing tracking codes and validation dictionaries.

### Standard Error JSON Structure:
json
{
  "code": "VAL_400",
  "message": "Invalid field data inputs supplied.",
  "metadata": {
    "missingFields": ["email", "password"]
  },
  "timestamp": "2026-10-14T09:38:00.000Z"
}


### Registered Codes:
* VAL_400: Input field parsing validator exception.
* AUTH_401: Missing or expired token credentials.
* PERM_403: Insufficient access permission rules.
* RES_404: Entity database ID not found.
* SYS_500: Core cluster unexpected error.

---

## 4. Health Check Endpoint (Module 4)
Exposes active resource layer ping arrays to automated load balancers at /health.

### Healthy Response (HTTP 200):
json
{
  "status": "healthy",
  "dependencies": {
    "db": "connected",
    "redis": "connected"
  },
  "timestamp": "2026-10-14T09:38:00.000Z"
}