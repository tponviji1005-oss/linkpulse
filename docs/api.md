# LinkPulse API Documentation

Base URL: `http://localhost:5000` (development) or your configured backend URL.

All endpoints return JSON unless explicitly stated (QR code returns PNG, CSV export returns `text/csv`).

## Error Response Format

All errors follow a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:

| Status | Meaning |
|---|---|
| 400 | Validation error or bad request |
| 401 | Authentication required or invalid credentials |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 413 | Payload too large or file size exceeded |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

Rate limit responses include `RateLimit-*` standard headers and return:
```json
{
  "error": "Too many requests, please try again later"
}
```

---

## Auth

### POST /api/auth/register

Create a new user account.

**Rate limit:** 10 requests/minute

**Request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepass123"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| name | string | yes | Must not be empty after trim |
| email | string | yes | Must be valid email format |
| password | string | yes | Minimum 8 characters |

**Success response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

**Error responses:**
- `400` — `"Name is required"`, `"Email is required"`, `"Invalid email format"`, `"Password is required"`, `"Password must be at least 8 characters"`
- `409` — `"Email already registered"`

---

### POST /api/auth/login

Authenticate an existing user.

**Rate limit:** 10 requests/minute

**Request body:**
```json
{
  "email": "jane@example.com",
  "password": "securepass123"
}
```

**Success response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

**Error responses:**
- `400` — `"Email is required"`, `"Invalid email format"`, `"Password is required"`
- `401` — `"Invalid email or password"`

---

### GET /api/auth/profile

Get the authenticated user's profile.

**Auth:** Bearer token required

**Success response (200):**
```json
{
  "message": "Profile fetched successfully",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

**Error response:**
- `401` — `"Authentication required"` or `"Invalid or expired token"`

---

## Links

### POST /api/links

Create a new short link.

**Auth:** Bearer token required

**Request body:**
```json
{
  "originalUrl": "https://example.com/very/long/path",
  "title": "My Example Link",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "password": "linkpass123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| originalUrl | string | yes | Must be a valid URL |
| title | string | no | Optional display title |
| expiresAt | ISO 8601 string | no | Must be in the future |
| password | string | no | If set, link requires password to access |

**Success response (201):**
```json
{
  "message": "Short link created successfully",
  "link": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shortCode": "xK7mQ2pL",
    "originalUrl": "https://example.com/very/long/path",
    "title": "My Example Link",
    "isActive": true,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "2026-07-27T10:30:00.000Z",
    "hasPassword": true
  }
}
```

**Error responses:**
- `400` — `"originalUrl is required"`, `"Invalid URL format"`, `"Invalid expiration date"`, `"Expiration must be in the future"`, `"Password cannot be empty"`

---

### GET /api/links

List the authenticated user's links with filtering, search, sorting, and pagination.

**Auth:** Bearer token required

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| search | string | — | Case-insensitive search across originalUrl, shortCode, title |
| status | string | — | Filter: `active`, `inactive`, `protected`, `public`, `expired` |
| sort | string | `newest` | Sort: `newest`, `oldest`, `most_clicked`, `least_clicked` |
| page | integer | 1 | Page number (minimum 1) |
| limit | integer | 20 | Items per page (1–100) |

**Success response (200):**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shortCode": "xK7mQ2pL",
      "originalUrl": "https://example.com/very/long/path",
      "title": "My Example Link",
      "isActive": true,
      "expiresAt": null,
      "createdAt": "2026-07-27T10:30:00.000Z",
      "hasPassword": false,
      "clickCount": 42
    }
  ],
  "pagination": {
    "total": 85,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /api/links/:id

Get a single link by ID.

**Auth:** Bearer token required

**Success response (200):**
```json
{
  "link": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shortCode": "xK7mQ2pL",
    "originalUrl": "https://example.com/very/long/path",
    "title": "My Example Link",
    "isActive": true,
    "expiresAt": null,
    "createdAt": "2026-07-27T10:30:00.000Z",
    "updatedAt": "2026-07-27T10:30:00.000Z",
    "hasPassword": false
  }
}
```

**Error responses:**
- `404` — `"Link not found"`

---

### PUT /api/links/:id

Update a link. All body fields are optional — only provided fields are updated.

**Auth:** Bearer token required

**Request body:**
```json
{
  "originalUrl": "https://updated-url.com",
  "title": "Updated Title",
  "isActive": false,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "password": "newpassword"
}
```

| Field | Type | Notes |
|---|---|---|
| originalUrl | string | Must be valid URL |
| title | string | Set to `null` to clear |
| isActive | boolean | Toggle link active state |
| expiresAt | string/null | Set to `null` or `""` to remove expiration |
| password | string/null | Set to `null` or `""` to remove password protection |

**Success response (200):**
```json
{
  "message": "Link updated successfully",
  "link": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shortCode": "xK7mQ2pL",
    "originalUrl": "https://updated-url.com",
    "title": "Updated Title",
    "isActive": false,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "2026-07-27T10:30:00.000Z",
    "updatedAt": "2026-07-27T12:00:00.000Z",
    "hasPassword": true
  }
}
```

**Error responses:**
- `404` — `"Link not found"`
- `400` — `"Invalid URL format"`, `"title must be a string"`, `"isActive must be a boolean"`, `"Invalid expiration date"`, `"Expiration must be in the future"`, `"Password cannot be empty"`

---

### DELETE /api/links/:id

Delete a link and all its associated click records.

**Auth:** Bearer token required

**Success response (200):**
```json
{
  "message": "Link deleted successfully"
}
```

**Error responses:**
- `404` — `"Link not found"`

---

### GET /api/links/:id/analytics

Get basic analytics for a single link (all-time, no caching).

**Auth:** Bearer token required

**Success response (200):**
```json
{
  "totalClicks": 150,
  "browserBreakdown": {
    "Chrome": 90,
    "Firefox": 30,
    "Safari": 25,
    "Unknown": 5
  },
  "deviceBreakdown": {
    "desktop": 100,
    "mobile": 45,
    "tablet": 5
  },
  "osBreakdown": {
    "Windows": 80,
    "macOS": 40,
    "Linux": 20,
    "Android": 10
  }
}
```

**Error responses:**
- `404` — `"Link not found"`

---

### GET /api/links/:id/qrcode

Generate a QR code PNG for the link's short URL.

**Auth:** Bearer token required

**Response:** Binary PNG image (`Content-Type: image/png`)

The QR code encodes the short URL (e.g., `http://localhost:5000/xK7mQ2pL`) at 400x400 pixels with colors `#1a1a2e` (dark) and `#ffffff` (light).

**Error responses:**
- `404` — `"Link not found"`

---

### POST /api/links/:id/verify-password

Verify a password for a password-protected link. This endpoint does **not** require authentication.

**Request body:**
```json
{
  "password": "linkpass123"
}
```

**Success response (200):**
```json
{
  "success": true,
  "redirectUrl": "https://example.com/very/long/path"
}
```

**Error responses:**
- `404` — `"Link not found"` (also returned if link is inactive)
- `410` — `"This link has expired."`
- `400` — `"Password is required"`, `"This link does not require a password"`
- `401` — `"Incorrect password"`

---

## Dashboard

### GET /api/dashboard

Get the authenticated user's dashboard summary. Cached for 60 seconds.

**Auth:** Bearer token required

**Success response (200):**
```json
{
  "totalLinks": 45,
  "activeLinks": 38,
  "inactiveLinks": 7,
  "totalClicks": 1250,
  "recentLinks": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shortCode": "xK7mQ2pL",
      "title": "My Example Link",
      "originalUrl": "https://example.com",
      "isActive": true,
      "expiresAt": null,
      "hasPassword": false,
      "createdAt": "2026-07-27T10:30:00.000Z",
      "clickCount": 42
    }
  ]
}
```

The `recentLinks` array contains the 5 most recently created links.

---

### GET /api/dashboard/top-links

Get the user's top 5 links by click count. Cached for 60 seconds.

**Auth:** Bearer token required

**Success response (200):**
```json
{
  "topLinks": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shortCode": "xK7mQ2pL",
      "title": "My Example Link",
      "originalUrl": "https://example.com",
      "isActive": true,
      "expiresAt": null,
      "hasPassword": false,
      "createdAt": "2026-07-27T10:30:00.000Z",
      "clickCount": 42
    }
  ]
}
```

---

## Analytics

### GET /api/analytics/:id

Get advanced analytics for a link with period-based filtering. Cached per period for 120 seconds.

**Auth:** Bearer token required

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| period | string | `all` | `today`, `7d`, `30d`, `90d`, `all` |

Period date ranges:
- `today` — midnight to now
- `7d` — last 7 days
- `30d` — last 30 days
- `90d` — last 90 days
- `all` — epoch to now

**Success response (200):**
```json
{
  "link": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "shortCode": "xK7mQ2pL",
    "originalUrl": "https://example.com",
    "title": "My Example Link",
    "isActive": true,
    "hasPassword": false,
    "expiresAt": null
  },
  "period": "30d",
  "totalClicks": 230,
  "uniqueClicks": 180,
  "dailyTrend": [
    { "date": "2026-07-20", "clicks": 12 },
    { "date": "2026-07-21", "clicks": 18 }
  ],
  "weeklyTrend": [
    { "date": "2026-07-14", "clicks": 85 },
    { "date": "2026-07-21", "clicks": 145 }
  ],
  "monthlyTrend": [
    { "month": "2026-07", "clicks": 230 }
  ],
  "hourlyDistribution": [
    { "hour": 0, "clicks": 2 },
    { "hour": 1, "clicks": 1 },
    { "hour": 14, "clicks": 35 },
    { "hour": 15, "clicks": 28 }
  ],
  "browserBreakdown": { "Chrome": 120, "Firefox": 60, "Safari": 40, "Unknown": 10 },
  "osBreakdown": { "Windows": 100, "macOS": 70, "Linux": 40, "Android": 20 },
  "deviceBreakdown": { "desktop": 150, "mobile": 70, "tablet": 10 },
  "referrerBreakdown": { "twitter.com": 80, "google.com": 50, "Direct": 100 },
  "countryBreakdown": { "US": 120, "GB": 40, "DE": 30, "JP": 20, "Other": 20 },
  "botClicks": 15,
  "humanClicks": 215,
  "protectedClicks": 0,
  "publicClicks": 230,
  "activeClicks": 230,
  "expiredClicks": 0
}
```

**Error responses:**
- `404` — `"Link not found"`

---

## Bulk Operations

### POST /api/bulk

Bulk create links from a JSON array. Maximum 50 links per request.

**Auth:** Bearer token required

**Request body:**
```json
{
  "links": [
    {
      "originalUrl": "https://example.com/1",
      "title": "First Link",
      "password": "secret1",
      "expiresAt": "2026-12-31T23:59:59.000Z"
    },
    {
      "originalUrl": "https://example.com/2",
      "title": "Second Link"
    }
  ]
}
```

Each link item supports: `originalUrl` (required, valid URL), `title` (optional), `password` (optional), `expiresAt` (optional, must be future).

Duplicate URLs within the user's existing links are rejected with an error entry.

**Success response (201):**
```json
{
  "message": "Bulk create completed: 1 created, 1 failed",
  "created": [
    {
      "id": "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shortCode": "aB3cD4eF",
      "originalUrl": "https://example.com/1",
      "title": "First Link",
      "isActive": true,
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "createdAt": "2026-07-27T10:30:00.000Z",
      "hasPassword": true
    }
  ],
  "failed": [
    {
      "row": 2,
      "originalUrl": "https://example.com/2",
      "error": "Duplicate URL"
    }
  ],
  "totalCreated": 1,
  "totalFailed": 1
}
```

**Error responses:**
- `400` — `"links array is required and must not be empty"`, `"Maximum 50 links per bulk create"`

---

### POST /api/bulk/csv

Import links from a CSV file upload. Maximum 100 rows and 5 MB file size.

**Auth:** Bearer token required

**Request:** `multipart/form-data` with field name `file`

The CSV file should have a header row. Accepted column names (case-insensitive):

| Column | Required | Notes |
|---|---|---|
| `url` or `originalUrl` or `original_url` | yes | Must be valid URL |
| `title` | no | |
| `password` | no | |
| `expiresAt` or `expires_at` | no | Must be future date |

Example CSV:
```csv
url,title,password,expiresAt
https://example.com/1,First Link,secret1,2026-12-31T23:59:59.000Z
https://example.com/2,Second Link,,
```

**Success response (201):**
```json
{
  "message": "CSV import completed: 2 created, 0 failed",
  "created": [
    {
      "id": "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shortCode": "xY9zW8vU",
      "originalUrl": "https://example.com/1",
      "title": "First Link",
      "isActive": true,
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "createdAt": "2026-07-27T10:30:00.000Z",
      "hasPassword": true
    }
  ],
  "failed": [],
  "totalCreated": 2,
  "totalFailed": 0
}
```

**Error responses:**
- `400` — `"CSV file is required"`, `"CSV file is empty or has no valid rows"`, `"Maximum 100 rows per CSV upload"`, `"Only CSV files are allowed"`
- `413` — `"File too large. Maximum size is 5MB"`

---

### GET /api/bulk/export

Export all of the authenticated user's links as a CSV file.

**Auth:** Bearer token required

**Response:** `text/csv` with `Content-Disposition: attachment; filename="linkpulse-export.csv"`

CSV columns: `shortCode`, `url`, `originalUrl`, `title`, `isActive`, `hasPassword`, `expiresAt`, `createdAt`, `clicks`

---

### DELETE /api/bulk

Bulk delete links by ID array. Deletes all associated click records.

**Auth:** Bearer token required

**Request body:**
```json
{
  "ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b1b2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```

**Success response (200):**
```json
{
  "message": "2 links deleted successfully",
  "deleted": 2
}
```

**Error responses:**
- `400` — `"ids array is required"`
- `404` — `"No matching links found"`

---

### PUT /api/bulk/activate

Bulk activate links by ID array.

**Auth:** Bearer token required

**Request body:**
```json
{
  "ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```

**Success response (200):**
```json
{
  "message": "1 links activated",
  "updated": 1
}
```

**Error responses:**
- `400` — `"ids array is required"`

---

### PUT /api/bulk/deactivate

Bulk deactivate links by ID array. Also invalidates redirect cache for affected short codes.

**Auth:** Bearer token required

**Request body:**
```json
{
  "ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```

**Success response (200):**
```json
{
  "message": "1 links deactivated",
  "updated": 1
}
```

**Error responses:**
- `400` — `"ids array is required"`

---

## Redirect

### GET /:shortCode

Redirect to the original URL. This is not an API endpoint — it is a browser-facing route.

**Rate limit:** 30 requests/minute per IP

**Behavior:**
1. Looks up the short code in Redis cache, then PostgreSQL
2. Returns `404` if not found or inactive
3. Returns `410` if the link has expired
4. Redirects to the frontend password gate if the link is password-protected
5. Records a click (IP, browser, OS, device, referer, user agent, bot detection)
6. Redirects (302) to the original URL

**Bot detection patterns:** Googlebot, Bingbot, Facebook External Hit, Twitterbot

---

## Health Check

### GET /health

Returns server status. No authentication required.

**Success response (200):**
```json
{
  "status": "ok",
  "uptime": 3600.5,
  "redis": "ready"
}
```

The `redis` field shows the current Redis connection status (`"ready"`, `"connecting"`, `"not configured"`, etc.).

---

### GET /

Returns a basic API status message.

**Response (200):**
```json
{
  "message": "LinkPulse API running"
}
```
