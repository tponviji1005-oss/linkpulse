# LinkPulse

A modern, full-stack URL shortener with real-time analytics, bulk management, and advanced link features.

[![CI](https://github.com/your-username/linkpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/linkpulse/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Features

### Core
- **URL Shortening** - Generate short links with nanoid (8-char codes)
- **QR Code Generation** - Download QR codes for any short link
- **Password Protection** - Gate links behind a password
- **Link Expiration** - Set auto-expiry dates on links
- **Smart Redirects** - Fast redirect with browser/OS/device tracking

### Analytics
- **Real-time Dashboard** - Total links, active count, click totals, recent links
- **Top Performing Links** - See your best-performing short links at a glance
- **Advanced Analytics** - Daily/weekly/monthly trends, browser/OS/device/referrer breakdowns
- **Hourly Heatmap** - Visualize when your links get the most traffic
- **Bot Detection** - Filter out bot clicks from human engagement metrics
- **Time Period Filtering** - Today, 7 days, 30 days, 90 days, or all-time

### Management
- **Search & Filter** - Search by URL/short code/title, filter by status, sort multiple ways
- **Pagination** - Server-side pagination for large link collections
- **Bulk Operations** - Create, delete, activate, or deactivate multiple links at once
- **CSV Import/Export** - Upload CSV files to bulk-create links, or export all links as CSV
- **Bulk Text Create** - Paste multiple URLs (one per line) to create links instantly

### Security
- **JWT Authentication** - Secure login with 7-day token expiry
- **bcrypt Password Hashing** - Cost factor of 10
- **Rate Limiting** - Auth: 10/min, API: 120/min, Redirects: 30/min
- **Helmet Headers** - HTTP security headers enabled
- **Input Validation** - All inputs validated with validator.js
- **SQL Injection Prevention** - Prisma ORM parameterized queries

### UX
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Loading Skeletons** - Smooth loading states for all data views
- **Toast Notifications** - Non-intrusive success/error messages
- **Confirmation Dialogs** - Destructive actions require confirmation

---

## Screenshots

> Add screenshots of the dashboard, analytics, and bulk management pages here.

| Dashboard | Analytics | Bulk Management |
|-----------|-----------|-----------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Analytics](docs/screenshots/analytics.png) | ![Bulk](docs/screenshots/bulk.png) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, React Router, Vite, Recharts, react-hot-toast |
| **Backend** | Node.js, Express.js, Prisma ORM, ioredis |
| **Database** | PostgreSQL (via Prisma + PrismaPg adapter) |
| **Cache** | Redis (ioredis, optional — gracefully degrades, managed via `lib/redis.js`) |
| **Security** | Helmet, CORS, bcrypt, JWT, express-rate-limit |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or cloud like Neon)
- Redis (optional, for caching — server runs without it)

### Redis Setup

Redis is optional. The backend gracefully falls back to the database if Redis is unavailable.

**Local Redis (Docker):**
```bash
docker run -d --name linkpulse-redis -p 6379:6379 redis:7-alpine
```

Or use Docker Compose (includes Redis):
```bash
docker-compose up -d
```

**Upstash Redis:**
1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy your `REDIS_URL` (starts with `rediss://`)
3. Set it in `backend/.env`:
```env
REDIS_URL=rediss://default:your-password@your-region.upstash.io:6379
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/linkpulse.git
cd linkpulse

# Install backend dependencies
cd backend
cp .env.example .env   # Edit with your database credentials
npm install
npx prisma migrate dev
npx prisma generate

# Install frontend dependencies
cd ../frontend
npm install
```

### Development

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

### Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Environment Variables

**Backend** (`backend/.env`):
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `REDIS_URL` | No | Redis connection URL (local or Upstash) |
| `REDIS_HOST` | No | Redis host (alternative to REDIS_URL, default: localhost) |
| `REDIS_PORT` | No | Redis port (default: 6379) |
| `REDIS_PASSWORD` | No | Redis password |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment: development/production |
| `BACKEND_URL` | No | Backend URL for CSV export links |

**Frontend** (`frontend/.env`):
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API URL (default: http://localhost:5000) |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/profile` | Get current user profile |
| POST | `/api/links` | Create a short link |
| GET | `/api/links` | List links (search, filter, paginate) |
| GET | `/api/links/:id` | Get a single link |
| PUT | `/api/links/:id` | Update a link |
| DELETE | `/api/links/:id` | Delete a link |
| GET | `/api/links/:id/analytics` | Get basic link analytics |
| GET | `/api/links/:id/qrcode` | Get QR code image |
| POST | `/api/links/:id/verify-password` | Verify link password |
| GET | `/api/dashboard` | Dashboard summary stats |
| GET | `/api/dashboard/top-links` | Top 5 performing links |
| GET | `/api/analytics/:id` | Advanced analytics with period filter |
| POST | `/api/bulk` | Bulk create links |
| POST | `/api/bulk/csv` | Upload CSV to create links |
| GET | `/api/bulk/export` | Export all links as CSV |
| DELETE | `/api/bulk` | Bulk delete links |
| PUT | `/api/bulk/activate` | Bulk activate links |
| PUT | `/api/bulk/deactivate` | Bulk deactivate links |
| GET | `/:shortCode` | Redirect to original URL |

Full API documentation: [docs/api.md](docs/api.md)

---

## Project Structure

```
linkpulse/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma, Redis clients
│   │   ├── controllers/     # Route handlers
│   │   ├── lib/             # Redis, shared modules
│   │   ├── middleware/       # Error handler
│   │   ├── routes/          # Express route definitions
│   │   ├── utils/           # Cache, pagination, bot detection, CSV helpers
│   │   └── app.js           # Express app setup
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API client layer
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Route pages
│   │   ├── App.jsx          # Router setup
│   │   └── App.css          # All styles
│   ├── Dockerfile
│   └── package.json
├── docs/                    # Documentation
├── .github/                 # CI, issue/PR templates
├── docker-compose.yml
├── CONTRIBUTING.md
├── CHANGELOG.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── SUPPORTED_VERSIONS.md
```

---

## Roadmap

### Completed
- [x] JWT Authentication (register, login, profile)
- [x] URL shortening with nanoid
- [x] QR code generation
- [x] Password-protected links
- [x] Link expiration
- [x] Click tracking (browser, OS, device, referrer, bot detection)
- [x] Dashboard with stats and top links
- [x] Advanced analytics with Recharts
- [x] Search, filter, sort, and pagination
- [x] Bulk operations (create, delete, activate, deactivate)
- [x] CSV import/export
- [x] Responsive UI with loading states
- [x] Redis caching with graceful degradation
- [x] Docker & Docker Compose support
- [x] GitHub Actions CI pipeline
- [x] Full project documentation

### Planned
- [ ] Geographic analytics with GeoIP
- [ ] Custom short codes (user-defined aliases)
- [ ] Link tags and collections
- [ ] Click timestamp heatmaps
- [ ] API key authentication for programmatic access
- [ ] Webhook integrations
- [ ] Link scheduling (future activate/deactivate)
- [ ] A/B testing for links
- [ ] Batch analytics export

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding conventions, and PR guidelines.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2026 Pon Vijayalakdhmi T
