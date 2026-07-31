# LinkPulse Deployment Guide

## Prerequisites

- Node.js 18+ (both backend and frontend build on Node 18 Alpine)
- PostgreSQL 12+
- Redis 7+ (optional — caching is disabled without it)
- npm
- Docker and Docker Compose (for containerized deployment)

---

## Docker Deployment

The `docker-compose.yml` in the project root defines three services: frontend, backend, and Redis.

### Step 1: Configure Environment

Create `backend/.env` with your settings:

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/linkpulse
JWT_SECRET=a-long-random-string-at-least-32-characters
REDIS_URL=redis://redis:6379
FRONTEND_URL=http://localhost:3000
```

In the Docker network, the Redis hostname is `redis` (the service name). The `FRONTEND_URL` should match where users access the frontend. If you are behind a reverse proxy with a domain, use that domain (e.g., `https://linkpulse.example.com`).

### Step 2: Start Services

```bash
docker compose up -d --build
```

This builds:
- **Frontend**: Vite production build served by Nginx on port 3000 (mapped from container port 80)
- **Backend**: Node.js app on port 5000
- **Redis**: Redis 7 Alpine with a health check (ping every 10s) and a persistent volume (`redis-data`)

The backend depends on Redis being healthy before starting.

### Step 3: Run Database Migrations

After the database is accessible, run Prisma migrations from the backend container or locally:

```bash
cd backend
npx prisma migrate deploy
```

This applies all migrations from `prisma/migrations/` to your PostgreSQL database.

### Step 4: Verify

```bash
curl http://localhost:5000/health
# {"status":"ok","uptime":0.5,"redis":"ready"}

curl http://localhost:3000
# HTML response from the React SPA
```

### Docker Compose Services

| Service | Image | Port | Notes |
|---|---|---|---|
| frontend | Custom build (Vite + Nginx) | 3000:80 | Serves SPA with `try_files` fallback to `index.html` |
| backend | Custom build (Node 18 Alpine) | 5000:5000 | Runs `node server.js` |
| redis | `redis:7-alpine` | 6379:6379 | Health check enabled, data persisted to `redis-data` volume |

---

## Manual Deployment

### Step 1: Set Up PostgreSQL

1. Create a PostgreSQL database
2. Note the connection string (e.g., `postgresql://user:password@localhost:5432/linkpulse`)

### Step 2: Set Up Redis (Optional)

1. Install Redis or use a hosted Redis service
2. Note the connection URL (e.g., `redis://localhost:6379`)

### Step 3: Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values.

### Step 4: Install and Build Backend

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

- `npm ci` installs production dependencies from `package-lock.json`
- `prisma generate` generates the Prisma Client (required for the PrismaPg adapter)
- `prisma migrate deploy` applies pending migrations

### Step 5: Start the Backend

```bash
# Development
npm run dev

# Production
npm start
```

The server starts on the port specified by `PORT` (default 5000).

### Step 6: Build and Serve the Frontend

```bash
cd frontend
npm ci
npm run build
```

This produces a `dist/` directory with static files. Serve it with any static file server or Nginx:

```bash
# Quick preview
npm run preview  # serves on port 4173

# Or serve dist/ with Nginx, Apache, or a CDN
```

**Important:** Configure your static server to route all requests to `index.html` for client-side routing (React Router). For Nginx:

```nginx
server {
    listen 80;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Environment Variables Reference

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `5000` | HTTP server port |
| `NODE_ENV` | no | — | Set to `production` for error message masking and production behavior |
| `DATABASE_URL` | yes | — | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| `JWT_SECRET` | yes | — | Secret key for signing JWT tokens. Use a long random string (32+ characters) |
| `REDIS_URL` | no | — | Redis connection string (e.g., `redis://localhost:6379`). If unset, caching is disabled |
| `FRONTEND_URL` | no | `http://localhost:5173` | Origin for CORS policy. Must match the URL where the frontend is served |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | no | `http://localhost:5000` | Backend API base URL for the Vite build |

Note: The frontend API client currently uses a hardcoded `BASE_URL` of `http://localhost:5000` in `src/api/client.js`. To change the backend URL, modify that value or switch to using `import.meta.env.VITE_API_URL`.

---

## Production Considerations

### CORS

The CORS origin is set to `FRONTEND_URL`. In production:

- Set `FRONTEND_URL` to your actual frontend domain (e.g., `https://linkpulse.example.com`)
- The backend only allows requests from this origin
- Credentials (cookies/auth headers) are enabled

### Rate Limiting

Rate limits are applied per IP address:

| Endpoint Group | Limit | Window |
|---|---|---|
| `/api/*` (all API routes) | 100 requests | 1 minute |
| `GET /:shortCode` (redirects) | 30 requests | 1 minute |

If you deploy behind a reverse proxy (Nginx, Cloudflare, ALB), configure it to forward the real client IP via `X-Forwarded-For` or `X-Real-IP` headers, and trust those headers in Express:

```js
app.set('trust proxy', 1); // trust first proxy
```

### HTTPS

The application does not terminate TLS. Use one of:

- **Reverse proxy** (Nginx, Caddy, Traefik) with TLS termination in front of both frontend and backend
- **Cloudflare** or similar CDN with "Full" SSL mode
- **Cloud provider load balancer** with SSL certificates

If using a reverse proxy, update `FRONTEND_URL` to use `https://`.

### Database

- Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, Supabase, Neon) for production
- Ensure the database accepts connections from your backend host
- Run `npx prisma migrate deploy` after each deployment to apply schema changes
- Prisma connection pooling is handled by the `pg` driver via `PrismaPg` adapter

### Redis

- Use a managed Redis service (AWS ElastiCache, Redis Cloud, Upstash) or self-hosted
- The backend gracefully handles Redis failures — if Redis goes down, all requests fall through to PostgreSQL
- Cache TTLs are short (60–3600 seconds), so stale data resolves quickly

### Logging

- Morgan logs all HTTP requests in `dev` format to stdout
- In production, pipe stdout to a log aggregator (CloudWatch, Datadog, etc.)
- Error handler logs stack traces to `console.error`

### Process Management

- Use a process manager like `pm2` or run inside containers (Docker/Kubernetes)
- The backend handles `SIGTERM` and `SIGINT` for graceful Redis connection cleanup
- The server exits cleanly after closing Redis

### Multi-Stage Docker Builds

Both Dockerfiles use multi-stage builds to minimize final image size:

**Backend** (`backend/Dockerfile`):
1. `deps` stage: installs dependencies, generates Prisma Client
2. `runner` stage: copies `node_modules` and source code, runs `node server.js`

**Frontend** (`frontend/Dockerfile`):
1. `build` stage: installs dependencies, runs `vite build`
2. `runner` stage: copies built files to Nginx, serves on port 80

### Nginx Configuration (Frontend Container)

The frontend Dockerfile generates an Nginx config inline:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

This serves the SPA and falls back to `index.html` for client-side routes.

---

## Full Production Checklist

1. Set `NODE_ENV=production`
2. Generate a strong `JWT_SECRET` (e.g., `openssl rand -base64 48`)
3. Set `DATABASE_URL` to your production PostgreSQL instance
4. Set `REDIS_URL` to your production Redis instance
5. Set `FRONTEND_URL` to your production frontend domain
6. Run `npx prisma migrate deploy`
7. Set up HTTPS termination (reverse proxy or CDN)
8. Configure `trust proxy` if behind a load balancer
9. Set up log aggregation for `stdout`/`stderr`
10. Monitor the `/health` endpoint
