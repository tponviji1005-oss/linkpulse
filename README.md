# LinkPulse

A production-style Smart URL Shortener and Link Intelligence Platform built with React, Node.js, Express, PostgreSQL, Redis, and JWT.

## Features

- **JWT Authentication** — Register and log in with secure token-based sessions
- **Link CRUD** — Create, read, update, and delete shortened links
- **Redirect Engine** — Fast short-code resolution with click tracking
- **Dashboard** — Overview of total links, clicks, active/inactive counts, and recent activity
- **Link Analytics** — Browser, OS, and device breakdowns with visual bar charts
- **Redis Caching** — Optional caching layer with graceful degradation
- **Rate Limiting** — Protection against brute-force and abuse
- **Bot Detection** — Automated filtering of known bot traffic

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router, Vite, react-hot-toast |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL (Neon serverless driver adapter) |
| Cache | Redis (ioredis) |
| Auth | JWT (jsonwebtoken) + bcrypt |

## Project Structure

```
linkpulse/
├── backend/
│   ├── src/
│   │   ├── config/        # Prisma and Redis configuration
│   │   ├── controllers/   # Auth, link, and dashboard controllers
│   │   ├── middleware/     # JWT auth and error handling
│   │   ├── routes/        # API route definitions
│   │   └── utils/         # Cache helpers and bot detection
│   ├── prisma/            # Schema and migrations
│   └── server.js          # Entry point
├── frontend/
│   └── src/
│       ├── api/           # HTTP client and API functions
│       ├── components/    # Reusable UI components
│       ├── context/       # Auth context provider
│       └── pages/         # Login, Register, Dashboard, Analytics
└── docs/
```

## Getting Started

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

The frontend runs on `http://localhost:5173` by default and expects the backend on `http://localhost:5000`.

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new account |
| `POST` | `/api/auth/login` | No | Log in and receive a JWT |
| `GET` | `/api/auth/profile` | JWT | Get current user profile |
| `POST` | `/api/links` | JWT | Create a short link |
| `GET` | `/api/links` | JWT | List user's links |
| `PUT` | `/api/links/:id` | JWT | Update a link |
| `DELETE` | `/api/links/:id` | JWT | Delete a link |
| `GET` | `/api/links/:id/analytics` | JWT | Get click analytics |
| `GET` | `/api/dashboard` | JWT | Dashboard summary |
| `GET` | `/api/dashboard/top-links` | JWT | Top 5 links by clicks |
| `GET` | `/:shortCode` | No | Redirect to original URL |
| `GET` | `/health` | No | Health check |

## License

MIT
