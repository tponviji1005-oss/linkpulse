const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const createRateLimiter = require('./middleware/rateLimiter');

const redis = require('./config/redis');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { redirectLink } = require('./controllers/linkController');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const apiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 100 });

const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRateLimiter, routes);

app.get('/health', (req, res) => {
  const redisStatus = redis ? redis.status : 'not configured';
  res.json({ status: 'ok', uptime: process.uptime(), redis: redisStatus });
});

app.get('/', (req, res) => {
  res.json({ message: 'LinkPulse API running' });
});

app.get('/:shortCode', redirectLimiter, redirectLink);

app.use(errorHandler);

if (redis) {
  const shutdown = async (signal) => {
    console.log(`${signal} received - closing Redis connection`);
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
