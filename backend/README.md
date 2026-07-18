# LinkPulse Backend

Backend API for LinkPulse — a smart URL shortener and link intelligence platform.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Setup

```bash
git clone https://github.com/your-username/linkpulse.git
cd linkpulse/backend
npm install
cp .env.example .env
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
| `NODE_ENV` | Environment mode | `development` |
| `MONGO_URI` | MongoDB connection string | — |
