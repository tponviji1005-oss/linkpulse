# LinkPulse Architecture

## System Overview

LinkPulse is a self-hosted URL shortener and link intelligence platform. It generates short codes for long URLs, tracks every redirect with detailed click analytics, and presents the data through a dashboard with charts.

The system has three runtime components:

- **Frontend** — React 19 SPA served by Nginx (in production) or Vite dev server
- **Backend** — Express.js REST API
- **Data stores** — PostgreSQL (primary storage via Prisma ORM) and Redis (caching layer via ioredis)

A fourth component, PostgreSQL, is expected to run externally or be provided via environment configuration (not bundled in `docker-compose.yml`).

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | React 19, React Router 7 | SPA with client-side routing |
| Charts | Recharts 3 | Analytics visualizations |
| Linting | oxlint | Fast JavaScript/TypeScript linting |
| Build tool | Vite 8 | Dev server and production bundling |
| Backend runtime | Node.js, Express 4 | HTTP server and routing |
| ORM | Prisma 7 (`@prisma/client`) | Type-safe database access |
| DB adapter | `@prisma/adapter-pg` (PrismaPg) | Direct PostgreSQL connection via `pg` driver |
| Database | PostgreSQL | Persistent storage for users, links, clicks |
| Cache | Redis 7 via ioredis | Redirect caching, dashboard/analytics caching |
| Authentication | JWT (`jsonwebtoken`), bcrypt | Stateless auth with hashed passwords |
| Short code generation | nanoid 3 | Generates 8-character URL-safe short codes |
| User agent parsing | ua-parser-js 2 | Extracts browser, OS, and device from request headers |
| Bot detection | Custom regex patterns | Identifies crawlers (Googlebot, Bingbot, Facebook, Twitter) |
| QR code generation | qrcode 1 | Generates PNG QR codes for short links |
| URL validation | validator.js 13 | Validates URLs and email addresses |
| CSV processing | csv-parse 7, csv-stringify 6 | Import/export links via CSV |
| File uploads | multer 2 | Handles CSV file uploads (5 MB limit) |
| Security | helmet 8, cors, express-rate-limit 8 | HTTP headers, CORS policy, rate limiting |
| Logging | morgan 1 | HTTP request logging in dev format |

## Project Structure

```
linkpulse/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema (User, Link, Click)
│   │   ├── migrations/                # Migration history
│   │   └── migration_lock.toml        # Provider lockfile (postgresql)
│   ├── prisma.config.ts               # Prisma config with datasource URL
│   ├── server.js                      # Entry point — loads env, starts Express
│   ├── Dockerfile                     # Multi-stage Node 18 Alpine build
│   ├── package.json
│   └── src/
│       ├── app.js                     # Express app setup (middleware, routes, rate limits)
│       ├── config/
│       │   ├── prisma.js              # PrismaClient with PrismaPg adapter
│       │   └── redis.js               # ioredis client with retry strategy
│       ├── controllers/
│       │   ├── authController.js      # Register, login, profile
│       │   ├── linkController.js      # CRUD, redirect, QR code, password verify
│       │   ├── analyticsController.js # Advanced analytics with period filtering
│       │   ├── dashboardController.js # Dashboard summary and top links
│       │   └── bulkController.js      # Bulk create, CSV import/export, bulk delete/activate
│       ├── middleware/
│       │   ├── auth.js                # JWT verification middleware
│       │   └── errorHandler.js        # Centralized error handler
│       ├── routes/
│       │   ├── index.js               # Route aggregator
│       │   ├── auth.js                # /api/auth/*
│       │   ├── link.js                # /api/links/*
│       │   ├── analytics.js           # /api/analytics/*
│       │   ├── dashboard.js           # /api/dashboard/*
│       │   └── bulk.js                # /api/bulk/*
│       └── utils/
│           ├── cache.js               # getCache, setCache, invalidateCache wrappers
│           ├── cacheKeys.js           # Key builders: redirect:, dashboard:, analytics:
│           ├── botDetection.js        # Bot regex matching
│           ├── csvHelpers.js          # CSV parse and generate
│           └── pagination.js          # Pagination parsing and response formatting
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js              # Fetch wrapper with JWT injection
│   │   │   ├── auth.js                # Login/register API calls
│   │   │   └── links.js              # All link, dashboard, analytics, bulk API calls
│   │   ├── components/
│   │   │   ├── CreateLinkForm.jsx     # Link creation form
│   │   │   ├── DashboardStats.jsx     # Stats cards
│   │   │   ├── EditLinkModal.jsx      # Link editing modal
│   │   │   ├── LinksTable.jsx         # Links list with actions
│   │   │   ├── SearchFilter.jsx       # Search and filter controls
│   │   │   ├── Pagination.jsx         # Page navigation
│   │   │   ├── QRCodeModal.jsx        # QR code display modal
│   │   │   ├── TopLinks.jsx           # Top links chart
│   │   │   ├── Navbar.jsx             # Navigation bar
│   │   │   ├── ConfirmDialog.jsx      # Confirmation dialog
│   │   │   └── Skeleton.jsx           # Loading skeleton
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # Auth state (token, user, login/logout)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Main dashboard page
│   │   │   ├── Analytics.jsx          # Per-link analytics page
│   │   │   ├── BulkManagement.jsx     # Bulk operations page
│   │   │   ├── Login.jsx              # Login page
│   │   │   ├── Register.jsx           # Registration page
│   │   │   └── PasswordGate.jsx       # Password-protected link gate
│   │   ├── App.jsx                    # Router setup with protected/guest routes
│   │   └── main.jsx                   # React entry point
│   ├── Dockerfile                     # Multi-stage build: Vite → Nginx
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml                 # Frontend + backend + Redis
└── docs/
    ├── architecture.md
    ├── api.md
    ├── deployment.md
    ├── database.md
    └── testing.md
```

## Data Flow

### Link Creation

1. User submits a URL via the frontend form (`CreateLinkForm.jsx`)
2. Frontend sends `POST /api/links` with `{ originalUrl, title?, expiresAt?, password? }`
3. Backend validates the URL with `validator.isURL()`
4. nanoid generates an 8-character short code: `nanoid(8)`
5. If a password is provided, it is hashed with bcrypt (cost factor 10)
6. The Link record is written to PostgreSQL via Prisma
7. Dashboard cache keys (`dashboard:summary:{userId}`, `dashboard:toplinks:{userId}`) are invalidated
8. Response returns the created link with `hasPassword: true/false`

### Redirect

1. User visits `GET /:shortCode` (e.g., `https://linkpulse.example/abc12345`)
2. Rate limit check: redirect limiter allows 30 requests per minute per IP
3. Backend checks Redis cache for key `redirect:{shortCode}`
4. **Cache hit**: link data is returned from Redis (skips database query)
5. **Cache miss**: queries PostgreSQL for an active link matching the short code
   - If the link has no password and no expiration, the result is cached in Redis with TTL 3600 seconds
6. If the link has expired (expiresAt < now), returns `410 Gone`
7. If the link is password-protected, redirects to the frontend password gate page
8. Otherwise, ua-parser-js extracts browser, OS, and device from the User-Agent header
9. Bot detection checks the User-Agent against patterns for Googlebot, Bingbot, Facebook External Hit, and Twitterbot
10. A Click record is written to PostgreSQL with: linkId, ipAddress, browser, os, device, referer, userAgent, isBot
11. User is redirected (302) to the original URL

### Analytics Aggregation

1. Frontend requests `GET /api/analytics/:id?period=today|7d|30d|90d|all`
2. Backend checks Redis cache for `analytics:{linkId}:{period}`
3. **Cache hit**: returns cached analytics response (TTL 120 seconds)
4. **Cache miss**: queries all Click records within the date range, then aggregates in-memory:
   - Total and unique clicks (by IP address)
   - Browser, OS, device, referrer, country breakdowns
   - Daily, weekly, monthly trend arrays
   - Hourly distribution (24-hour histogram)
   - Bot vs. human click counts
   - Protected vs. public click counts
   - Active vs. expired click counts
5. Result is cached in Redis for 120 seconds and returned

## Caching Strategy

Redis is an optional dependency. If `REDIS_URL` is not set, the backend runs without caching — all requests hit PostgreSQL directly.

### Cache Keys and TTLs

| Key Pattern | TTL | Source | Purpose |
|---|---|---|---|
| `redirect:{shortCode}` | 3600s (1 hour) | `linkController.js:281` | Cache redirect lookups to avoid DB hits on every redirect |
| `dashboard:summary:{userId}` | 60s | `dashboardController.js:5` | Cache dashboard summary stats |
| `dashboard:toplinks:{userId}` | 60s | `dashboardController.js:5` | Cache top links query |
| `analytics:{linkId}:{period}` | 120s | `analyticsController.js:5` | Cache aggregated analytics per link per period |

### Cache Invalidation

- **Link create/update/delete**: invalidates `dashboard:summary:{userId}` and `dashboard:toplinks:{userId}`
- **Link update**: also invalidates `redirect:{shortCode}` for the old short code
- **Link delete**: invalidates the redirect key and all 5 analytics period keys (`today`, `7d`, `30d`, `90d`, `all`)
- **Bulk operations**: invalidate dashboard keys after completion; bulk delete and bulk deactivate also invalidate redirect and analytics keys

### Cache-Only Conditions

Redirect data is only cached when the link is both non-password-protected and non-expiring. Password-protected and time-limited links always query the database to ensure the latest state is enforced.

### Redis Connection Configuration

```js
new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;     // Stop retrying after 10 attempts
    return Math.min(times * 200, 5000); // Exponential backoff, max 5s
  },
  lazyConnect: true,       // Don't connect until first command
  enableReadyCheck: true,  // Wait for Redis READY response
  connectTimeout: 5000,    // 5s connection timeout
  commandTimeout: 3000,    // 3s command timeout
})
```

On graceful shutdown (`SIGTERM`/`SIGINT`), the Redis connection is closed with `redis.quit()`.

## Authentication Flow

### Registration

1. Client sends `{ name, email, password }` to `POST /api/auth/register`
2. Server validates: name required, email format (validator.js), password minimum 8 characters
3. Checks for existing user with the same email (case-insensitive via `toLowerCase()`)
4. Password is hashed with bcrypt, salt rounds = 10
5. User record is created in PostgreSQL
6. JWT is signed with `{ userId, email }`, expires in 7 days
7. Response: `{ token, user: { id, name, email } }`

### Login

1. Client sends `{ email, password }` to `POST /api/auth/login`
2. Server looks up user by lowercase email
3. Password is verified with `bcrypt.compare()`
4. On success, signs a new JWT (7-day expiry) and returns `{ token, user: { id, name, email } }`
5. On failure, returns `401` with `"Invalid email or password"` (same message for both missing user and wrong password to prevent enumeration)

### Authenticated Requests

1. Client stores the JWT in `localStorage` and attaches it as `Authorization: Bearer <token>` header
2. The `auth` middleware (`src/middleware/auth.js`) extracts the token, verifies it with `jwt.verify()` against `JWT_SECRET`
3. Decoded payload (`{ userId, email }`) is attached to `req.user`
4. If the token is missing or invalid, returns `401` with `"Authentication required"` or `"Invalid or expired token"`

## Security Layers

### Rate Limiting

Two rate limiters protect different endpoint groups:

| Limiter | Scope | Limit | Window |
|---|---|---|---|
| `apiLimiter` | All `/api/*` routes | 100 requests | 1 minute |
| `redirectLimiter` | `GET /:shortCode` | 30 requests | 1 minute |

The API limiter is a custom Redis-backed fixed-window limiter (`middleware/rateLimiter.js`); the redirect limiter uses `express-rate-limit`. Both return rate limit info in `RateLimit-*` headers. There is no dedicated auth limiter.

### HTTP Security Headers

`helmet` sets secure HTTP headers including:
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection`
- `Content-Security-Policy`
- And others per the helmet 8 defaults

### CORS

CORS is restricted to the `FRONTEND_URL` origin with:
- Credentials allowed
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization

### Payload Limits

- JSON body parser: 1 MB maximum (`express.json({ limit: '1mb' })`)
- CSV file upload (multer): 5 MB maximum (`limits: { fileSize: 5 * 1024 * 1024 }`)
- Bulk create: maximum 50 links per request
- CSV upload: maximum 100 rows per file

### Password Protection

- User passwords: bcrypt with cost factor 10
- Link passwords: bcrypt with cost factor 10, stored as `passwordHash`
- Password hashes are never returned in API responses — replaced with `hasPassword: boolean`

### Bot Detection

User-Agent strings are checked against patterns for known bots:
- Googlebot
- Bingbot
- Facebook External Hit
- Twitterbot

Bot clicks are recorded separately (`isBot: true`) and counted distinctly from human clicks in analytics.

### Error Handling

- Centralized error handler (`errorHandler.js`) catches all unhandled errors
- In production (`NODE_ENV=production`), error messages are masked to `"Internal Server Error"`
- In development, the actual error message is returned
- Specific error types handled: payload too large (413), file type rejection (400), file size limit (413)
