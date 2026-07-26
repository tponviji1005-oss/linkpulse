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

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret key for signing JWT tokens | — |
| `REDIS_URL` | Redis connection URL (optional) | — |
