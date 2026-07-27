# LinkPulse

A production-ready Smart URL Shortener and Link Intelligence Platform with advanced analytics, bulk management, and a polished UI.

## Features

### Core
- **JWT Authentication** - Register and log in with secure token-based sessions
- **Link CRUD** - Create, read, update, and delete shortened links
- **Redirect Engine** - Fast short-code resolution with click tracking
- **Dashboard** - Overview of total links, clicks, active/inactive counts, and recent activity
- **QR Code Generation** - Server-generated QR codes with download and copy functionality
- **Password Protected Links** - Optional password gate for sensitive URLs
- **Link Expiration** - Auto-expiring links with HTTP 410 responses
- **Redis Caching** - Optional caching layer with graceful degradation

### Advanced Analytics (Bitly-style)
- **KPI Cards** - Total clicks, unique visitors, human vs bot counts
- **Click Trends** - Daily, weekly, and monthly click line/bar charts
- **Hourly Heatmap** - 24-hour click distribution visualization
- **Browser/OS/Device Breakdown** - Pie charts for audience segmentation
- **Referrer & Country Lists** - Top traffic sources and geographic data
- **Bot vs Human Comparison** - Automated traffic analysis
- **Protected vs Public Comparison** - Click distribution by protection type
- **Time Period Filters** - Today, 7d, 30d, 90d, All Time

### Bulk Management
- **CSV Upload** - Drag-and-drop CSV import with validation
- **Bulk Create** - Paste multiple URLs for batch shortening
- **CSV Export** - Download all links as CSV
- **Bulk Delete** - Select and delete multiple links
- **Bulk Activate/Deactivate** - Toggle link status in bulk
- **Failed Row Reporting** - Download error details as CSV

### Search & Filter System
- **Search** - Search by URL, short code, or title
- **Status Filters** - Active, Inactive, Protected, Public, Expired
- **Sort Options** - Newest, Oldest, Most Clicked, Least Clicked
- **Pagination** - Server-side paginated results

### User Experience
- **Toast Notifications** - Success and error feedback
- **Loading Skeletons** - Professional loading states
- **Confirmation Dialogs** - Safe destructive action confirmations
- **Responsive Layout** - Fully responsive across all devices
- **Smooth Transitions** - CSS animations and transitions
- **Keyboard Accessibility** - Escape to close modals, focus management

### Security
- **Rate Limiting** - Auth, API, and redirect rate limits
- **CORS Configuration** - Restricted to frontend origin
- **Security Headers** - Helmet.js integration
- **Input Validation** - Server-side URL, email, and data validation
- **Bot Detection** - Known bot user-agent filtering
- **JWT Expiration** - 7-day token lifetime

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router, Vite, Recharts, react-hot-toast |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL (Neon serverless driver adapter) |
| Cache | Redis (ioredis) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| CSV | csv-parse + csv-stringify |
| Upload | multer (memory storage) |
| Charts | Recharts (line, bar, pie, heatmap) |

## Architecture

```
linkpulse/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma and Redis configuration
│   │   ├── controllers/     # Auth, link, dashboard, analytics, bulk controllers
│   │   ├── middleware/       # JWT auth and error handling
│   │   ├── routes/          # API route definitions
│   │   └── utils/           # Cache, pagination, CSV helpers, bot detection
│   ├── prisma/              # Schema and migrations
│   └── server.js            # Entry point
├── frontend/
│   └── src/
│       ├── api/             # HTTP client and API functions
│       ├── components/      # Reusable UI components
│       ├── context/         # Auth context provider
│       └── pages/           # Login, Register, Dashboard, Analytics, Bulk
└── docs/
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (or a hosted instance like Neon)
- Redis (optional - caching is disabled if Redis is unavailable)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and optional REDIS_URL
npx prisma migrate deploy
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and expects the backend on `http://localhost:5000`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for signing JWT tokens | - |
| `REDIS_URL` | Redis connection URL (optional) | - |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## API Documentation

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new account |
| `POST` | `/api/auth/login` | No | Log in and receive JWT |
| `GET` | `/api/auth/profile` | JWT | Get current user profile |

### Links

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/links` | JWT | Create a short link |
| `GET` | `/api/links` | JWT | List user's links (with search/filter/pagination) |
| `GET` | `/api/links/:id` | JWT | Get single link |
| `PUT` | `/api/links/:id` | JWT | Update a link |
| `DELETE` | `/api/links/:id` | JWT | Delete a link |
| `GET` | `/api/links/:id/analytics` | JWT | Get basic analytics |
| `GET` | `/api/links/:id/qrcode` | JWT | Generate QR code PNG |
| `POST` | `/api/links/:id/verify-password` | No | Verify password for protected link |

#### Link Query Parameters

| Parameter | Description | Values |
|---|---|---|
| `search` | Search URL, short code, or title | Any text |
| `status` | Filter by status | `active`, `inactive`, `protected`, `public`, `expired` |
| `sort` | Sort order | `newest`, `oldest`, `most_clicked`, `least_clicked` |
| `page` | Page number | Number (default: 1) |
| `limit` | Items per page | Number (default: 20, max: 100) |

### Analytics

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/analytics/:id` | JWT | Get advanced analytics |

#### Analytics Query Parameters

| Parameter | Description | Values |
|---|---|---|
| `period` | Time period | `today`, `7d`, `30d`, `90d`, `all` |

### Bulk Management

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/bulk` | JWT | Bulk create links |
| `POST` | `/api/bulk/csv` | JWT | Upload CSV file |
| `GET` | `/api/bulk/export` | JWT | Export links as CSV |
| `DELETE` | `/api/bulk` | JWT | Bulk delete links |
| `PUT` | `/api/bulk/activate` | JWT | Bulk activate links |
| `PUT` | `/api/bulk/deactivate` | JWT | Bulk deactivate links |

### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | JWT | Dashboard summary |
| `GET` | `/api/dashboard/top-links` | JWT | Top 5 links by clicks |

### Other

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/:shortCode` | No | Redirect to original URL |
| `GET` | `/health` | No | Health check |

## License

MIT
