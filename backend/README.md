# LinkPulse Backend

Backend API for LinkPulse — a smart URL shortener and link intelligence platform.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (or a hosted instance like Neon)
- Redis (optional — caching is disabled if Redis is unavailable)

## Setup

```bash
git clone https://github.com/your-username/linkpulse.git
cd linkpulse/backend
npm install
cp .env.example .env
# Edit .env with your database URL, JWT secret, and Redis URL
npx prisma migrate deploy
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server with nodemon (auto-reload) |
| `npm start` | Start server in production mode |
| `npm run lint` | Lint check (not configured yet) |

## Environment Variables

| Variable | Required | Description | Default |
|---|---|---|---|
| `PORT` | No | Server port | `5000` |
| `NODE_ENV` | No | Environment mode (`development` / `production`) | `development` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | — |
| `JWT_SECRET` | **Yes** | Secret key for signing JWT tokens | — |
| `REDIS_URL` | No | Full Redis connection URL (local or Upstash) | — |
| `REDIS_HOST` | No | Redis host (alternative to REDIS_URL) | `localhost` |
| `REDIS_PORT` | No | Redis port | `6379` |
| `REDIS_PASSWORD` | No | Redis password | — |
| `FRONTEND_URL` | No | Frontend URL for CORS | `http://localhost:5173` |

## Redis Setup

Redis is optional. The server runs without it — caching is gracefully disabled.

### Local Redis (Docker)

```bash
docker run -d --name linkpulse-redis -p 6379:6379 redis:7-alpine
```

Or use Docker Compose (includes Redis):
```bash
docker-compose up -d
```

### Upstash Redis

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy your `REDIS_URL` (starts with `rediss://`)
3. Set it in `.env`:
```env
REDIS_URL=rediss://default:your-password@your-region.upstash.io:6379
```

### Verification

The server logs the Redis connection status on startup:
```
✓ Redis Connected
Server started on port 5000 [development]
```

If Redis is unavailable:
```
Redis connection failed: ... — caching disabled
Server started on port 5000 [development]
```
